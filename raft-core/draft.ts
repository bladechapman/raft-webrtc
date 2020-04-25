// import { FollowerNode, BaseRaftNode } from './raftNode';
import { rpcRegister } from './rpc';

function useNode() {
    let node: any = {};
    const rpcId = rpcRegister({
        'receiveRequestVote': () => {},
        'receiveAppendEntries': () => {}
    });
    node.id = rpcId;

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
        // requestVote(node).then(step)
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
}

function candidateFrom(node) { return node; }
function followerFrom(node) { return node; }
function leaderFrom(node) { return node; }
