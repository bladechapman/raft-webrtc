import { createUUID } from './lib/uuid';
import { RtcBidirectionalDataChannel, RtcBidirectionalDataChannelDelegate } from './rtc';
import { rpcRegister } from '../../../rpc/rpc';
import { useNode, step  } from '../../../raft-core-2/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM READY');
    main();
});


function main() {
    const uuid = createUUID();
    const serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    const dataChannels = new Map();

    const [rpcInvoke, rpcReceive] = rpcRegister(
        uuid, 
        (payload) => {
            const target = payload.target;
            const channel = dataChannels.get(target);
            channel.send(JSON.stringify(payload));
        },
        {
            printAndAcknowledge: function(p) {
                console.log(`RECEIVED, ${p}`);
                return `ACK ${uuid}`;
            }
        }
    )

    serverConnection.onmessage = (message) => {
        const parsed = JSON.parse(message.data);

        if (parsed.discover) {
            // Create a RtcBidirectionalDataChannel for each discovered peer
            // Send offers to each new peer via the signaling server
            registerDataChannels(
                uuid,
                parsed.discover,
                dataChannels,
                serverConnection,
                rpcReceive
            ).forEach(channel => {
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
            const channel = registerDataChannels(
                uuid,
                [peerUuid],
                dataChannels,
                serverConnection,
                rpcReceive
            ).forEach(channel => {
                channel.gotMessageFromServer(message);
            });
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

            Array.from(dataChannels.keys()).forEach(peerUuid => {
                const t = rpcInvoke(peerUuid, 'printAndAcknowledge', [text]);
                (t as Promise<any>).then(r => {
                    console.log(r);
                });
            });
        }

        // const submissionElem = document.getElementById('submission') as HTMLInputElement;
        // if (submissionElem) {
        //     const text = submissionElem.value;
        //     Array.from(dataChannels.values()).forEach(channel => {
        //         channel.send(text);
        //     });
        // }
    }

    (window as any).beginRaft = () => {
        console.log('BEGIN RAFT');
    }
}

function registerDataChannels(
    uuid,
    peerUuids,
    dataChannels,
    serverConnection,
    rpcReceive
) {
    // Create a RtcBidirectionalDataChannel for each discovered peer
    // Send offers to each new peer via the signaling server
    return peerUuids.map(peerUuid => {
        const channel = new RtcBidirectionalDataChannel(
            uuid,
            peerUuid,
            serverConnection,
            {
                channelOpened: () => { console.log(`Opened channel for ${peerUuid}`) },
                messageReceived: (m) => { rpcReceive(JSON.parse(m.data)) },
            }
        )

        dataChannels.set(peerUuid, channel);
        return channel;
    });
}


// function configureRpcForPeer(uuid, peerUuid, dataChannels, delegate) {
//     // const [rpcInvoke, rpcReceive]
// }
