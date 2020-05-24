import { PEER_CONNECTION_CONFIG } from './config/ice';

export interface RtcBidirectionalDataChannelDelegate {

    channelOpened: () => void

    messageReceived: (e: MessageEvent) => void

}

export class RtcBidirectionalDataChannel {

    private readonly localUuid: string;
    private readonly peerUuid: string;
    private readonly delegate: RtcBidirectionalDataChannelDelegate;
    private readonly peerConnection: RTCPeerConnection;
    private readonly serverConnection: WebSocket;
    private outgoingChannel: RTCDataChannel;
    private incomingChannel: RTCDataChannel | undefined;

    constructor(
        localUuid: string,
        peerUuid: string,
        serverConnection: WebSocket,
        delegate: RtcBidirectionalDataChannelDelegate
    ) {
        this.localUuid = localUuid;
        this.peerUuid = peerUuid;
        this.delegate = delegate;
        this.serverConnection = serverConnection;
        const peerConnection = this.peerConnection = new RTCPeerConnection(PEER_CONNECTION_CONFIG);

        peerConnection.ondatachannel = this.gotDataChannel.bind(this);
        peerConnection.onicecandidate = this.gotIceCandidate.bind(this);
        this.outgoingChannel = peerConnection.createDataChannel(`${localUuid}:${peerUuid}`)
    }

    createOffer() {
        this.peerConnection.createOffer()
            .then(this.setLocalDescription.bind(this))
            .catch(() => {})
    }

    send(payload: any) {
        console.log('SENDING', payload);
        this.outgoingChannel.send(payload);
    }

    private setLocalDescription(description: RTCSessionDescription) {
        const {
            peerConnection,
            serverConnection,
            localUuid,
            peerUuid
        } = this;

        peerConnection.setLocalDescription(description)
            .then(() => {
                serverConnection.send(
                    JSON.stringify({
                        sdp: peerConnection.localDescription,
                        uuid: localUuid,
                        target: peerUuid
                    })
                );
            })
            .catch(() => {});
        
    }

    private gotIceCandidate(e: RTCPeerConnectionIceEvent) {
        const {
            localUuid,
            peerUuid,
            serverConnection
        } = this;

        if (e.candidate !== null) {
            serverConnection.send(
                JSON.stringify({
                    ice: e.candidate,
                    uuid: localUuid,
                    target: peerUuid
                })
            );
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

    gotMessageFromServer(message: MessageEvent) {
        var signal = JSON.parse(message.data);
        if (signal.uuid === this.localUuid) return;

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
