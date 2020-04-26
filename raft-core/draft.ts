// import { FollowerNode, BaseRaftNode } from './raftNode';
import { rpcRegister } from './rpc';
import { receiveRequestVoteRpc, broadcastRequestVoteRpc } from './network';

function useNode() {
    let node: any = {
        persistentState: {
            currentTerm: 0,
            votedFor: null,
            log: [],
            id: null
        },
        volatileState: {
            commitIndex: null,
            lastApplied: null
        },
        leaderState: {
            nextIndex: null,
            matchIndex: null
        }
    };

    const rpcId = rpcRegister({
        'receiveRequestVote': (payload) => {
            return receiveRequestVoteRpc(node, payload);
        },
        'receiveAppendEntries': (payload) => {}
    });
    node.persistentState.id = rpcId;

    function setNode(newNode: any) {
        node = newNode;
        return node;
    }

    function getNode() {
        return node
    }

    return [getNode, setNode];
}


function useTimer() {
    let handle: any;

    function setTimer(callback: any) {
        clearTimeout(handle);
        const timeout = Math.floor(Math.random() * 100) + 100
        handle = setTimeout(callback, timeout);
    }

    function clearTimer() {
        clearTimeout(handle);
    }

    return [setTimer, clearTimer];
}

function main() {
    step(
        useNode() as [any, any],
        useTimer() as [any, any],
        useTimer() as [any, any],
        useTimer() as [any, any],
        'Startup'
    )
}

function step(
    [getNode, setNode],
    [setFollowerTimer, clearFollowerTimer],
    [setCandidateTimer, clearCandidateTimer],
    [setLeaderTimer, clearLeaderTimer],
    event
) {
    const node = getNode();

    if (node === 'Follower' && (event === 'Startup' || event === 'Heartbeat')) {
        setFollowerTimer(() => {
            step(
                [getNode, setNode],
                [setFollowerTimer, clearFollowerTimer],
                [setCandidateTimer, clearCandidateTimer],
                [setLeaderTimer, clearLeaderTimer],
                'FollowerTimeout'
            )
        })
    }

    if (node === 'Follower' && (event === 'FollowerTimeout')) {
        const newNode = setNode(candidateFrom(node));

        // // Request vote
        // broadcastRequestVoteRpc(newNode).then(majorityReceived => {
        //     if (majorityReceived) step(
        //         [getNode, setNode],
        //         [setFollowerTimer, clearFollowerTimer],
        //         [setCandidateTimer, clearCandidateTimer],
        //         [setLeaderTimer, clearLeaderTimer],
        //         'MajorityReceived'
        //     )
        // });
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


    if (node === 'Candidate' && event === 'CandidateTimeout') {
        const newNode = setNode(candidateFrom(node));
        // Request vote
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

    if (node === 'Canididate' && event === 'MajorityReceived') {
        clearCandidateTimer();
        const newNode = setNode(leaderFrom(node));
        // broadcast initial heartbeat
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            'Heartbeat'
        )
    }

    if (node === 'Candidate' && event === 'LeaderDiscovered') {
        // TODO
    }


    if (node === 'Leader' && event === 'Hearbeat') {
        // broadcast heartbeat
        setLeaderTimer(() => {
            step(
                [getNode, setNode],
                [setFollowerTimer, clearFollowerTimer],
                [setCandidateTimer, clearCandidateTimer],
                [setLeaderTimer, clearLeaderTimer],
                'Heartbeat'
            );
        });
    }

    if (node === 'Leader' && event === 'LeaderDiscovered') {
        clearLeaderTimer();
        setNode(followerFrom(node));
        step(
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            'Heartbeat'
        );
    }

}

function candidateFrom(node) { return node; }
function followerFrom(node) { return node; }
function leaderFrom(node) { return node; }
