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
        new URL(targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        });

        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
            let body = await response.text();
            
            // 正規表現によるリンク書き換え（軽量・高速）
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

            // ベースURLの修正
            const baseTag = `<base href="${targetUrl}">`;
            body = body.replace('<head>', `<head>${baseTag}`);

            res.send(body);
        } else {
            // HTML以外はそのままパイプ
            response.body.pipe(res);
        }
    } catch (error) {
        res.status(500).send(`Gateway Error: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Aura Light Gateway running on port ${PORT}`);
});
