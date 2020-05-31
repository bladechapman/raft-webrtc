import { RaftNode, Mode } from './raftNode';
import {
    broadcastRequestVoteRpc,
    receiveRequestVoteRpc,
    broadcastAppendEntriesRpc,
    receiveAppendEntriesRpc
} from './network';
import { rpcRegister } from '../rpc/rpc';


function useTimer():
    [(callback: any) => void, () => void]
{
    let handle: any;

    function setTimer(callback: any, timeout?: number) {
        clearTimeout(handle);
        const t = timeout || Math.random() * 1000 + 5000
        handle = setTimeout(callback, t);
    }

    function clearTimer() {
        clearTimeout(handle);
    }

    return [setTimer, clearTimer];
}

export function useNode(
    uuid: string,
    sendSerialized
): [
    [
        () => RaftNode<string>,
        (newNode: RaftNode<string>) => RaftNode<string>
    ],
    [(callback: any) => void, () => void],
    [(callback: any) => void, () => void],
    [(callback: any) => void, () => void],
    [any, any]
] {
    function setNode(newNode: RaftNode<string>) {
        node = newNode;
        return node;
    }

    function getNode() {
        return node;
    }


    const [setFollowerTimer, clearFollowerTimer] = useTimer();
    const [setCandidateTimer, clearCandidateTimer] = useTimer();
    const [setLeaderTimer, clearLeaderTimer] = useTimer();

    const [rpcInvoke, rpcReceive] = rpcRegister(
        uuid,
        sendSerialized,
        {
            'receiveRequestVote': (payload) => {
                return receiveRequestVoteRpc(
                    getNode,
                    setNode,
                    payload,
                    () => {
                        step(
                            [getNode, setNode],
                            [setFollowerTimer, clearFollowerTimer],
                            [setCandidateTimer, clearCandidateTimer],
                            [setLeaderTimer, clearLeaderTimer],
                            [rpcInvoke, rpcReceive],
                            'BecomeFollower'
                        )
                    }
                );
            },


            'receiveAppendEntries': (payload) => {
                clearFollowerTimer();

                const r = receiveAppendEntriesRpc(
                    getNode,
                    setNode,
                    payload,
                    () => {
                        console.log('receive append callback invoked')
                        step(
                            [getNode, setNode],
                            [setFollowerTimer, clearFollowerTimer],
                            [setCandidateTimer, clearCandidateTimer],
                            [setLeaderTimer, clearLeaderTimer],
                            [rpcInvoke, rpcReceive],
                            'BecomeFollower',
                        )
                    }
                );

                return r;
            },

            'receiveClientRequest': (payload) => {
                const { data } = payload;

                // If we're the leader, return the result of broadcasting append entries rpc
                if (getNode().mode === Mode.Leader) {
                    return broadcastAppendEntriesRpc(
                        getNode,
                        setNode,
                        [data],
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
                        rpcInvoke
                    );
                }

                // If we're not the leader, just eject and forward the leader info
                else {
                    return { status: 'INCORRECT LEADER', data: node.volatileState.lastKnownLeader };
                }

            }
        }
    );

    let node = RaftNode.default<string>(uuid);

    return [
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
        [rpcInvoke, rpcReceive]
    ];
}

export function step(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    [rpcInvoke, rpcReceive],
    event
) {
    const { mode } = getNode();
    const args = [
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
        [rpcInvoke, rpcReceive]
    ];

    console.log('STEP', event);

    if (event === 'BecomeFollower') becomeFollower.apply(null, args);
    else if (event === 'FollowerTimeout') followerTimeout.apply(null, args);
    else if (event === 'BecomeCandidate') becomeCandidate.apply(null, args);
    else if (event === 'CandidateTimeout') candidateTimeout.apply(null, args);
    else if (event === 'BecomeLeader') becomeLeader.apply(null, args);
    else 
        throw new Error(`step: Invalid event ${event}`);
}

export function handleClientRequest(
    [getNode, setNode],
    [rpcInvoke, rpcReceive],
    becomeFollowerCallback,
    data
) {
    // Forward the client request to the expected leader
    //
    // Expected leader handles client request, responds to initial request with whether or not
    // it was actually the leader
    //
    // If not the actual leader, use the returned last known leader to try again. If no last known leader, pick a random node and try again.
    const node = getNode();
    const { volatileState, persistentState } = node;

    const maybeLastKnownLeader = volatileState.lastKnownLeader;
    if (!maybeLastKnownLeader) {
        return new Promise((res, rej) => res({ status: 'UNKNOWN LEADER' }))
    }
    else if ((window as any).online !== false) {
        if (maybeLastKnownLeader === persistentState.id) {
            // invoke append entries as leader
            return broadcastAppendEntriesRpc(
                getNode,
                setNode,
                [data],
                becomeFollowerCallback,
                rpcInvoke
            );
        }
        else {
            return rpcInvoke(maybeLastKnownLeader, 'receiveClientRequest', [{ command: 'append', data }]);
        }
    }
}

function becomeFollower(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    [rpcInvoke, rpcReceive]
) {
    const node = getNode();
    clearLeaderTimer();
    clearCandidateTimer();
    clearFollowerTimer();
    setNode(node.becomeFollower());

    setFollowerTimer(() => {
        console.log('FOLLOWER TIMEOUT EXPIRED');
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            [rpcInvoke, rpcReceive],
            'FollowerTimeout'
        )
    });
}

function followerTimeout(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    [rpcInvoke, rpcReceive]
) {
    step(
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
        [rpcInvoke, rpcReceive],
        'BecomeCandidate'
    );
}


function becomeCandidate(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    [rpcInvoke, rpcReceive]
) {
    const node = getNode();
    clearLeaderTimer();
    clearCandidateTimer();
    clearFollowerTimer();
    setNode(
        node
        .term(node.persistentState.currentTerm + 1)
        .vote(null)
        .becomeCandidate()
    );

    console.log(`NEW CANDIDATE: ${getNode().persistentState.id}`, getNode().persistentState.currentTerm);

    if ((window as any).online !== false) {
        broadcastRequestVoteRpc(
            getNode,
            setNode,
            function () {
                console.log('becomeCandidate: BECOME FOLLOWER INVOKED');
                step.apply(null, [...Array.from(arguments), 'BecomeFollower'])
            },
            rpcInvoke
        ).then(majorityGranted => {
            if (majorityGranted) {
                setNode(getNode().initializeNextIndices());

                console.log(`NEW LEADER: ${getNode().persistentState.id}`, getNode().persistentState.currentTerm);
                step(
                    [getNode, setNode],
                    [setFollowerTimer, clearFollowerTimer],
                    [setCandidateTimer, clearCandidateTimer],
                    [setLeaderTimer, clearLeaderTimer],
                    [rpcInvoke, rpcReceive],
                    'BecomeLeader'
                );
            }
        });
    }

    setCandidateTimer(() => {
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            [rpcInvoke, rpcReceive],
            'CandidateTimeout'
        )
    });
}


function candidateTimeout(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    [rpcInvoke, rpcReceive]
) {
    step(
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
        [rpcInvoke, rpcReceive],
        'BecomeCandidate'
    );
}


function becomeLeader(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    [rpcInvoke, rpcReceive]
) {
    const node = getNode();
    clearLeaderTimer();
    clearCandidateTimer();
    clearFollowerTimer();
    setNode(node.becomeLeader());

    // TODO: fix the heartbeat type
    if ((window as any).online !== false) {
        broadcastAppendEntriesRpc(
            getNode,
            setNode,
            [`heartbeat-${Date.now()}`],
            function () {
                console.log('becomeLeader: BECOME FOLLOWER INVOKED')
                step.apply(null, [...Array.from(arguments), 'BecomeFollower'])
            },
            rpcInvoke
        )
    }

    setLeaderTimer(() => {
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            [rpcInvoke, rpcReceive],
            'BecomeLeader'
        )
    }, 1000 + Math.random() * 1000);

}

