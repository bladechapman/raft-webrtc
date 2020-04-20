const Server = require('ws').Server;

const wss = new Server({ port: 1234 });
wss.on('connection', ws => {
    ws.on('message', m => {
        console.log(`received ${message}`);
        wss.broadcast(message);
    });
});

wss.broadcast = function(data) {
    for (let i in this.clients) {
        this.clients[i].send(data);
    }
}
