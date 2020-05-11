
import { RaftNode } from '../raftNode';
import {
    broadcastRequestVoteRpc,
    receiveRequestVoteRpc,
    broadcastAppendEntriesRpc,
    receiveAppendEntriesRpc
} from '../network';
import { rpcRegister } from '../../raft-draft/rpc';

function useNode(): [
    () => RaftNode<string>,
    (newNode: RaftNode<string>) => RaftNode<string>
] {
    function setNode(newNode: RaftNode<string>) {
        node = newNode;
        return node;
    }

    function getNode() {
        return node;
    }

    const [rpcId] = rpcRegister({
        'receiveRequestVote': (payload) => {
            return receiveRequestVoteRpc(
                getNode,
                setNode,
                payload
            );
        },


        'receiveAppendEntries': (payload) => {
            return receiveAppendEntriesRpc(
                getNode,
                setNode,
                payload
            );
        }
    });

    let node = RaftNode.default<string>(rpcId);

    return [getNode, setNode];
}



if (require.main === module) {
    const [getA, setA] = useNode();
    const [getB, setB] = useNode();
    const [getC, setC] = useNode();


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

    if (event === 'BecomeFollower') becomeFollower.apply(null, args);
    if (event === 'FollowerTimeout') followerTimeout.apply(null, args);
    if (event === 'BecomeCandidate') becomeCandidate.apply(null, args);
    if (event === 'CandidateTimeout') candidateTimeout.apply(null, args);
    if (event === 'BecomeLeader') becomeLeader.apply(null, args);

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
        .becomeCandidate()
    );

    broadcastRequestVoteRpc(getNode).then(majorityGranted => {
        if (majorityGranted) {
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
    broadcastAppendEntriesRpc(getNode, setNode, ['hearbeat'])

    setLeaderTimer(() => {
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            'BecomeLeader'
        )
    });

}
