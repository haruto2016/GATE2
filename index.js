const express = require('express');
const http = require('http');
const https = require('https');
const { createBareServer } = require('@tomphttp/bare-server-node');
const path = require('path');

const app = express();
const server = http.createServer(app);

// コネクションプールを制限して Railway の IP ブロックや負荷制限を回避
const agentOptions = { 
    keepAlive: true, 
    maxSockets: 50, // 同時接続数を制限
    timeout: 30000 
};

const bare = createBareServer('/bare/', {
    httpAgent: new http.Agent(agentOptions),
    httpsAgent: new https.Agent(agentOptions)
});

const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        next();
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.listen(PORT, () => {
    console.log(`Aura UV (Optimized) running on port ${PORT}`);
});
