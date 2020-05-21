const HTTPS_PORT = 8443;
const fs = require('fs');
const https = require('https');
const WS = require('ws');

const config = {
    key: fs.readFileSync('rtc/server/key.pem'),
    cert: fs.readFileSync('rtc/server/cert.pem')
};

function handleRequest(request, response) {

    if (request.url === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(fs.readFileSync('rtc/client/build/index.html'));
    }
    else if (request.url === '/main.js') {
        response.writeHead(200, { 'Content-Type': 'application/javascript' });
        response.end(fs.readFileSync('rtc/client/build/main.js'));
    }

}

const httpsServer = https.createServer(config, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// =======

const wss = new WS.Server({ server: httpsServer });
wss.on('connection', function(ws) {
    ws.on('message', function (message) {
        wss.broadcast(message)
    });
});

wss.broadcast = function (data) {
    this.clients.forEach(function (client) {
        if (client.readyState === WS.OPEN) {
            client.send(data);
        }
    });
}
