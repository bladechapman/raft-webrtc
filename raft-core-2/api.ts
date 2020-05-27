import { RaftNode } from './raftNode';
import {
    broadcastRequestVoteRpc,
    receiveRequestVoteRpc,
    broadcastAppendEntriesRpc,
    receiveAppendEntriesRpc
} from './network';
// import { rpcRegister } from '../raft-draft/rpc';
import { rpcRegister } from '../rpc/rpc';


function useTimer():
    [(callback: any) => void, () => void]
{
    let handle: any;

    function setTimer(callback: any, timeout?: number) {
        clearTimeout(handle);
        const t = timeout || Math.random() * 500 + 1400
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

    console.log(getNode().persistentState.id, event);

    if (event === 'BecomeFollower') becomeFollower.apply(null, args);
    else if (event === 'FollowerTimeout') followerTimeout.apply(null, args);
    else if (event === 'BecomeCandidate') becomeCandidate.apply(null, args);
    else if (event === 'CandidateTimeout') candidateTimeout.apply(null, args);
    else if (event === 'BecomeLeader') becomeLeader.apply(null, args);
    else 
        throw new Error(`step: Invalid event ${event}`);
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

    broadcastRequestVoteRpc(
        getNode,
        setNode,
        function () { step.apply(null, [...Array.from(arguments), 'BecomeFollower']) },
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
    broadcastAppendEntriesRpc(
        getNode,
        setNode,
        ['hearbeat'],
        function () { step.apply(null, [...Array.from(arguments), 'BecomeFollower']) },
        rpcInvoke
    )

    setLeaderTimer(() => {
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            [rpcInvoke, rpcReceive],
            'BecomeLeader'
        )
    }, 1300 + Math.random() * 200);

}

