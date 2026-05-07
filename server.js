const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const { JSDOM } = require('jsdom');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.json());

// ユーティリティ: URLの暗号化/復号化 (簡易版)
const encodeUrl = (url) => Buffer.from(url).toString('base64');
const decodeUrl = (url) => Buffer.from(url, 'base64').toString('utf-8');

// プロキシエンドポイント
app.get('/gateway', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL is required');

    // Base64でエンコードされている場合はデコード
    try {
        if (!targetUrl.startsWith('http')) {
            targetUrl = decodeUrl(targetUrl);
        }
        // URLの妥当性チェック
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).send('Invalid URL format. Make sure it starts with http:// or https://');
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
        });

        const contentType = response.headers.get('content-type');
        
        // HTMLの場合のみ書き換えを行う
        if (contentType && contentType.includes('text/html')) {
            let body = await response.text();
            const dom = new JSDOM(body, { url: targetUrl });
            const doc = dom.window.document;

            // リンクの書き換え
            const rewrite = (tag, attr) => {
                doc.querySelectorAll(tag).forEach(el => {
                    const original = el.getAttribute(attr);
                    if (original && !original.startsWith('javascript:')) {
                        try {
                            const absolute = new URL(original, targetUrl).href;
                            el.setAttribute(attr, `/gateway?url=${encodeUrl(absolute)}`);
                        } catch (e) {}
                    }
                });
            };

            rewrite('a', 'href');
            rewrite('link', 'href');
            rewrite('script', 'src');
            rewrite('img', 'src');
            rewrite('iframe', 'src');
            rewrite('form', 'action');

            // 外部オリジンへのリクエストを許可するメタタグを追加
            const meta = doc.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', "upgrade-insecure-requests");
            doc.head.prepend(meta);

            res.send(dom.serialize());
        } else {
            // HTML以外（画像、CSS、JS等）はそのままパイプする
            response.body.pipe(res);
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send(`Gateway Error: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Aura Gateway running at http://localhost:${PORT}`);
});
