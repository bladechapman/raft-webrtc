import { createUUID } from './lib/uuid';
import { RtcBidirectionalDataChannel, RtcBidirectionalDataChannelDelegate } from './rtc';

import { useNode, step  } from '../../../raft-core-2/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM READY');
    main();
});


function main() {
    const uuid = createUUID();
    const serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    const dataChannels = new Map();

    serverConnection.onmessage = (message) => {
        const parsed = JSON.parse(message.data);

        if (parsed.discover) {
            // Create a RtcBidirectionalDataChannel for each discovered peer
            // Send offers to each new peer via the signaling server
            const peerUuids = parsed.discover;
            peerUuids.forEach(peerUuid => {
                const channel = new RtcBidirectionalDataChannel(
                    uuid,
                    peerUuid,
                    serverConnection,
                    {
                        channelOpened: () => { console.log(`Opened channel for ${peerUuid}`) },
                        messageReceived: (m) => { console.log(`Message received from ${peerUuid} - ${m}`) },
                    }
                )

                dataChannels.set(peerUuid, channel);
                channel.createOffer();
            });
        }

        else if (parsed.sdp && parsed.sdp.type === 'offer') {
            // Create a new RtcBidirectionalDataChannel for the offering peer and
            // forward this message to that new channel.
            //
            // This will send answer to offering peer via the signaling server
            // Once the offer is answered, the peers should have everything
            // they need to establish a peer connection.

            const peerUuid = parsed.uuid;
            const channel = new RtcBidirectionalDataChannel(
                uuid,
                peerUuid,
                serverConnection,
                {
                    channelOpened: () => { console.log(`Opened channel for ${peerUuid}`) },
                    messageReceived: (m) => { console.log(`Message received from ${peerUuid} - ${m}`) },
                }
            )
            dataChannels.set(peerUuid, channel);
            channel.gotMessageFromServer(message);
        }

        else if (
            parsed.sdp ||
            parsed.ice
        ) {
            // At this point, the RtcBidirectionalDataChannel should be created,
            // so simply forward message handling to RtcBidirectionalDataChannel

            const channel = dataChannels.get(parsed.uuid);
            if (!channel) throw new Error('No channel exists!');

            channel.gotMessageFromServer(message);
        }

    }


    // ===========
    // ===========
    // ===========


    (window as any).call = () => {
        serverConnection.send(JSON.stringify({ 'register': true, uuid }));
    }

    (window as any).send = () => {
        const submissionElem = document.getElementById('submission') as HTMLInputElement;
        if (submissionElem) {
            const text = submissionElem.value;
            Array.from(dataChannels.values()).forEach(channel => {
                channel.send(text);
            });
        }
    }

    (window as any).beginRaft = () => {
        console.log('BEGIN RAFT');
    }
}
