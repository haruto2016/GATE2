const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// ユーティリティ: URLの暗号化/復号化
const encodeUrl = (url) => Buffer.from(url).toString('base64');
const decodeUrl = (url) => Buffer.from(url, 'base64').toString('utf-8');

app.get('/gateway', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL required');

    try {
        if (!targetUrl.startsWith('http')) {
            targetUrl = decodeUrl(targetUrl);
        }
        const urlObj = new URL(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Referer': urlObj.origin,
                'Origin': urlObj.origin
            },
            redirect: 'manual'
        });

        // 1. リダイレクト処理の強化
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
                const absoluteLocation = new URL(location, targetUrl).href;
                return res.redirect(`/gateway?url=${encodeUrl(absoluteLocation)}`);
            }
        }

        // 2. ヘッダーのフィルタリング（セキュリティ制限を解除）
        response.headers.forEach((value, name) => {
            const lowerName = name.toLowerCase();
            if (![
                'x-frame-options', 
                'content-security-policy', 
                'cross-origin-resource-policy', 
                'content-encoding', 
                'transfer-encoding',
                'strict-transport-security'
            ].includes(lowerName)) {
                res.setHeader(name, value);
            }
        });

        // 3. CORS許可ヘッダーを追加
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', '*');

        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
            let body = await response.text();
            
            // 4. リンク書き換えの強化
            body = body.replace(/(href|src|action)=["']([^"']+)["']/g, (match, p1, p2) => {
                if (p2.startsWith('javascript:') || p2.startsWith('#') || p2.startsWith('data:')) {
                    return match;
                }
                try {
                    const absolute = new URL(p2, targetUrl).href;
                    return `${p1}="/gateway?url=${encodeUrl(absolute)}"`;
                } catch (e) {
                    return match;
                }
            });

            // 5. ヘッドへのベースタグ注入
            body = body.replace('<head>', `<head><base href="${targetUrl}">`);
            
            res.send(body);
        } else {
            // 画像、JS、CSSなどはストリームで返す
            response.body.pipe(res);
        }
    } catch (error) {
        console.error('Gateway Error:', error);
        res.status(500).send(`Gateway Error: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Aura Pro Gateway running on port ${PORT}`);
});
