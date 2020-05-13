
import { RaftNode } from '../raftNode';
import {
    broadcastRequestVoteRpc,
    receiveRequestVoteRpc,
    broadcastAppendEntriesRpc,
    receiveAppendEntriesRpc
} from '../network';
import { rpcRegister } from '../../raft-draft/rpc';

function useTimer():
    [(callback: any) => void, () => void]
{
    let handle: any;

    function setTimer(callback: any, timeout?: number) {
        clearTimeout(handle);
        const t = timeout || Math.random() * 700 + 5000
        handle = setTimeout(callback, t);
    }

    function clearTimer() {
        clearTimeout(handle);
    }

    return [setTimer, clearTimer];
}

function useNode(): [
    [
        () => RaftNode<string>,
        (newNode: RaftNode<string>) => RaftNode<string>
    ],
    [(callback: any) => void, () => void],
    [(callback: any) => void, () => void],
    [(callback: any) => void, () => void]
] {
    function setNode(newNode: RaftNode<string>) {
        // console.log(
        //     newNode.persistentState.id,
        //     newNode.persistentState.log.entries
        // );

        node = newNode;
        return node;
    }

    function getNode() {
        return node;
    }


    const [setFollowerTimer, clearFollowerTimer] = useTimer();
    const [setCandidateTimer, clearCandidateTimer] = useTimer();
    const [setLeaderTimer, clearLeaderTimer] = useTimer();


    const [rpcId] = rpcRegister({
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
                        'BecomeFollower'
                    )
                }
            );

            // console.log(
            //     getNode().persistentState.id,
            //     getNode().persistentState.currentTerm,
            //     getNode().persistentState.log.entries
            // )

            return r;
        }
    });

    let node = RaftNode.default<string>(rpcId);

    return [
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer]
    ];
}


function step(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    event
) {
    const { mode } = getNode();
    const args = [
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
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
            'FollowerTimeout'
        )
    });
}

function followerTimeout(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
) {
    step(
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
        'BecomeCandidate'
    );
}


function becomeCandidate(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
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

    broadcastRequestVoteRpc(getNode, () => step.apply(null, [...arguments, 'BecomeFollower'])).then(majorityGranted => {
        if (majorityGranted) {
            setNode(getNode().initializeNextIndices());

            console.log(`NEW LEADER: ${getNode().persistentState.id}`, getNode().persistentState.currentTerm);
            step(
                [getNode, setNode],
                [setFollowerTimer, clearFollowerTimer],
                [setCandidateTimer, clearCandidateTimer],
                [setLeaderTimer, clearLeaderTimer],
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
            'CandidateTimeout'
        )
    });
}


function candidateTimeout(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
) {
    step(
        [getNode, setNode],
        [setFollowerTimer, clearFollowerTimer],
        [setCandidateTimer, clearCandidateTimer],
        [setLeaderTimer, clearLeaderTimer],
        'BecomeCandidate'
    );
}


function becomeLeader(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
) {
    const node = getNode();
    clearLeaderTimer();
    clearCandidateTimer();
    clearFollowerTimer();
    setNode(node.becomeLeader());

    // TODO: fix the heartbeat type
    broadcastAppendEntriesRpc(getNode, setNode, ['hearbeat'], () => step.apply(null, [...arguments, 'BecomeFollower']))

    setLeaderTimer(() => {
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            'BecomeLeader'
        )
    }, 1300 + Math.random() * 200);

}



if (require.main === module) {
    const A = useNode();
    const B = useNode();
    const C = useNode();

    const [[getA, setA]] = A;
    const [[getB, setB]] = B;
    const [[getC, setC]] = C;

    // HACK in order to synchronize the node ids
    // I need to find a way to reconcile this

    const idA = getA().persistentState.id;
    const idB = getB().persistentState.id;
    const idC = getC().persistentState.id;

    setA(
        getA()
        .newNextIndex(idB, 1)
        .newNextIndex(idC, 1)
    );

    setB(
        getB()
        .newNextIndex(idA, 1)
        .newNextIndex(idC, 1)
    );

    setC(
        getC()
        .newNextIndex(idA, 1)
        .newNextIndex(idB, 1)
    )
    
    // HACK end


    console.log('A', idA);
    console.log('B', idB);
    console.log('C', idC);

    setTimeout(() => { step.apply(null, [...A, 'BecomeFollower']) }, 2500);
    setTimeout(() => { step.apply(null, [...B, 'BecomeFollower']) }, 2000);
    step.apply(null, [...C, 'BecomeFollower']);
}
