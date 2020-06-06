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

const wss = new WS.Server({
    server: httpsServer,
    concurrencyLimit: 100
});


const registeredConnections = new Map();

wss.on('connection', function(ws) {

    ws.on('message', function (message) {
        const parsedMessage = JSON.parse(message);
        const target = parsedMessage.target;

        if (parsedMessage.register) {
            ws.send(JSON.stringify({ 'discover': Array.from(registeredConnections.keys()) }))

            const uuid = parsedMessage.uuid;
            registeredConnections.set(uuid, ws);
            console.log('registered', uuid);
        }

        else if (
            parsedMessage.sdp ||
            parsedMessage.ice ||
            parsedMessage.rpc
        ) {
            wss.forward(message);
        }
    });
});

wss.forward = function (data) {
    const parsedMessage = JSON.parse(data);
    if (parsedMessage.target) {
        const targetWs = registeredConnections.get(parsedMessage.target);
        if (!targetWs) throw new Error('Forwarding target does not exist!');
        targetWs.send(data);
    }
}
