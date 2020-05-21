import { createUUID } from './lib/uuid';
import { PEER_CONNECTION_CONFIG } from './config/ice';

var peerConnection;
var serverConnection;
var uuid;

var localChannel;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM READY');
    pageReady();
});


function pageReady() {
    console.log('PAGE READY');

    uuid = createUUID();

    serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    serverConnection.onmessage = gotMessageFromServer;
}

function start(isCaller) {
    console.log('START');

    peerConnection = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.ondatachannel = gotDataChannel
    localChannel = peerConnection.createDataChannel('test-channel');

    if (isCaller) {
        console.log('CREATE OFFER')
        peerConnection.createOffer().then(setLocalDescription).catch(function (e) {
            console.log(e);
        });
    }
}

function gotMessageFromServer(message) {
    if (!peerConnection) start(false);
    var signal = JSON.parse(message.data);
    if (signal.uuid === uuid) return;

    console.log('RECEIVED SERVER MESSAGE:', message)

    if (signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
            if (signal.sdp.type === 'offer') {
                peerConnection.createAnswer().then(setLocalDescription).catch(e => {
                    console.log(e);
                })
            }
        }).catch(function (e) {
            console.log(e);
        })
    }
    else if (signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(function (e) {
            console.log(e)
        });
    }
}

function gotIceCandidate(event) {
    console.log('got ice candidate');

    if (event.candidate !== null) {
        console.log('SENDING ICE CANDIDATE');
        serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }));
    }
}

function setLocalDescription(description) {
    peerConnection.setLocalDescription(description).then(function () {
        console.log('SENDING SDP')
        serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }));
    }).catch(function (e) {
        console.log(e)
    });
}

var remoteChannel;
function gotDataChannel(event) {
    remoteChannel = event.channel;
    remoteChannel.onopen = function (event) {
        localChannel.send('INIT');
        console.log('CHANNEL OPENED');
    }
    remoteChannel.onmessage = function (event) {
        console.log('CHANNEL RECEIVED: ', event.data);
        var newChild = document.createElement('div');
        newChild.innerHTML = event.data;
        var historyElem = document.getElementById('history');
        if (historyElem) {
            historyElem.appendChild(newChild);
        }
    }
}

function send() {
    console.log('SEND', localChannel);
    if (localChannel) {
        const submissionElem = document.getElementById('submission') as HTMLInputElement;
        if (submissionElem) {
            const text = submissionElem.value;
            localChannel.send(text);
        }
    }
}

(window as any).start = start;
(window as any).send = send;
