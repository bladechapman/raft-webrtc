import { PEER_CONNECTION_CONFIG } from './config/ice';
import { createUUID } from './lib/uuid';

export interface RtcBidirectionalDataChannelDelegate {

    channelOpened: () => void

    messageReceived: (e: MessageEvent) => void

}

export class RtcBidirectionalDataChannel {

    private readonly uuid: string;
    private readonly delegate: RtcBidirectionalDataChannelDelegate;
    private readonly peerConnection: RTCPeerConnection;
    private readonly serverConnection: WebSocket;
    private outgoingChannel: RTCDataChannel;
    private incomingChannel: RTCDataChannel | undefined;

    constructor(uuid: string, delegate: RtcBidirectionalDataChannelDelegate) {
        this.uuid = uuid;
        this.delegate = delegate;
        const peerConnection = this.peerConnection = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
        const serverConnection = this.serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');

        peerConnection.ondatachannel = this.gotDataChannel.bind(this);
        peerConnection.onicecandidate = this.gotIceCandidate.bind(this);
        this.outgoingChannel = peerConnection.createDataChannel(`${uuid}:${createUUID()}`)

        serverConnection.onmessage = this.gotMessageFromServer.bind(this);
    }

    createOffer() {
        this.peerConnection.createOffer()
            .then(this.setLocalDescription.bind(this))
            .catch(() => {})
    }

    send(payload: any) {
        this.outgoingChannel.send(payload);
    }

    private setLocalDescription(description: RTCSessionDescription) {
        const {
            peerConnection,
            serverConnection,
            uuid
        } = this;

        peerConnection.setLocalDescription(description)
            .then(() => {
                serverConnection.send(JSON.stringify({ sdp: peerConnection.localDescription, uuid, target: 'all' }));
            })
            .catch(() => {});
        
    }

    private gotIceCandidate(e: RTCPeerConnectionIceEvent) {
        const {
            uuid,
            serverConnection
        } = this;

        if (e.candidate !== null) {
            serverConnection.send(JSON.stringify({ 'ice': e.candidate, uuid, target: 'all' }));
        }
    }

    private gotDataChannel(e: RTCDataChannelEvent) { 
        const incomingChannel = this.incomingChannel = e.channel;
        incomingChannel.onopen = () => {
            this.delegate.channelOpened();
        }

        incomingChannel.onmessage = (e) => {
            this.delegate.messageReceived(e);
        }
    }

    private gotMessageFromServer(message: MessageEvent) {
        var signal = JSON.parse(message.data);
        if (signal.uuid === this.uuid) return;

        if (signal.sdp) {
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === 'offer') {
                        this.peerConnection.createAnswer()
                            .then(this.setLocalDescription.bind(this))
                            .catch(e => {})
                    }
                })
                .catch((e) => {})
        }
        else if (signal.ice) {
            this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) => {});
        }
    }
}
