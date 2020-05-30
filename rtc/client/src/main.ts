import { createUUID } from './lib/uuid';
import { RtcBidirectionalDataChannel, RtcBidirectionalDataChannelDelegate } from './rtc';
import { rpcRegister } from '../../../rpc/rpc';
import { useNode, step, handleClientRequest } from '../../../raft-core-2/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM READY');
    main();
});


function main() {
    const uuid = createUUID();
    const serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    const dataChannels = new Map();

    const nodeFns = useNode(
        uuid,
        (payload) => {
            const target = payload.target;
            const channel = dataChannels.get(target);
            channel.send(JSON.stringify(payload));
        }
    )

    const [getNode, setNode] = nodeFns[0];
    const [setFollowerTimer, clearFollowerTimer] = nodeFns[1];
    const [setCandidateTimer, clearCandidateTimer] = nodeFns[2];
    const [setLeaderTimer, clearLeaderTimer] = nodeFns[3];
    const [rpcInvoke, rpcReceive] = nodeFns[4];

    // const [rpcInvoke, rpcReceive] = rpcRegister(
    //     uuid, 
    //     (payload) => {
    //         const target = payload.target;
    //         const channel = dataChannels.get(target);
    //         channel.send(JSON.stringify(payload));
    //     },
    //     {
    //         printAndAcknowledge: function(p) {
    //             console.log(`RECEIVED, ${p}`);
    //             return `ACK ${uuid}`;
    //         }
    //     }
    // )

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

            const r = handleClientRequest(
                [getNode, setNode],
                [rpcInvoke, rpcReceive],
                function () {
                    step(
                        [getNode, setNode],
                        [setFollowerTimer, clearFollowerTimer],
                        [setCandidateTimer, clearCandidateTimer],
                        [setLeaderTimer, clearLeaderTimer],
                        [rpcInvoke, rpcReceive],
                        'BecomeFollower'
                    );
                },
                text
            );

            console.log(r);

            // Array.from(dataChannels.keys()).forEach(peerUuid => {
            //     const t = rpcInvoke(peerUuid, 'printAndAcknowledge', [text]);
            //     (t as Promise<any>).then(r => {
            //         console.log(r);
            //     });
            // });
        }
    }

    (window as any).beginRaft = () => {
        (window as any).call = () => {}

        console.log('BEGIN RAFT');
        (window as any).handleBegin();
        (window as any).broadcastBegin();
    }

    (window as any).broadcastBegin = () => {
        Array.from(dataChannels.values()).forEach(channel => {
            channel.send(JSON.stringify({ raftBegin: true }));
        });
    }

    (window as any).handleBegin = () => {
        console.log('BEGINNING');
        Array.from(dataChannels.keys()).forEach(peerId => {
            setNode(getNode().newNextIndex(peerId, 1))
        });

        setTimeout(() => { step.apply(null, [...nodeFns, 'BecomeFollower']) }, 2500);
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
                messageReceived: (m) => {
                    const parsed = JSON.parse(m.data);
                    if (parsed.raftBegin) { (window as any).handleBegin() }
                    else rpcReceive(JSON.parse(m.data))
                },
            }
        )

        dataChannels.set(peerUuid, channel);
        return channel;
    });
}

