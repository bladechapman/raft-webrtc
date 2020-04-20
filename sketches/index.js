const config = {
    'iceServers': [
        {'url': 'stun:stun.services.mozilla.com'},
        {'url': 'stun:stun.l.google.com:19302'}
    ]
};

window.addEventListener('DOMContentLoaded', () => main());
function main() {
    const serverConnection = new WebSocket('ws://127.0.0.1:3434');
    serverConnection.onmessage = messageReceived;
}

function messageReceived(e) {
    console.log(e);
}

function start() {
    console.log('Start clicked')
}
