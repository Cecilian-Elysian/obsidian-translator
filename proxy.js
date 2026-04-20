const http = require('http');
const https = require('https');

const PORT = 3456;
const API_HOST = 'api.minimaxi.com';
const API_PATH = '/anthropic';

const server = http.createServer((req, res) => {
    console.log(`[Proxy] ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
            'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const options = {
            hostname: API_HOST,
            port: 443,
            path: API_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': req.headers['x-api-key'],
                'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
            },
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let responseBody = '';
            proxyRes.on('data', chunk => { responseBody += chunk; });
            proxyRes.on('end', () => {
                console.log(`[Proxy] Response status: ${proxyRes.statusCode}`);
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                });
                res.end(responseBody);
            });
        });

        proxyReq.on('error', (err) => {
            console.error(`[Proxy] Error: ${err.message}`);
            res.writeHead(502);
            res.end('Bad Gateway');
        });

        proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(PORT, () => {
    console.log(`Translation Proxy running on http://localhost:${PORT}`);
    console.log(`Forwarding to https://${API_HOST}${API_PATH}`);
});