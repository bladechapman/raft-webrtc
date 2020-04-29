import { TRaftNode, TLeaderNode, RaftNode } from "./raftNode";
import { rpcBroadcast, rpcInvoke } from './rpc';
import { Log } from './log';
import { Result } from './lib';


export function broadcastRequestVoteRpc(node: any) {
    const {
        currentTerm,
        id,
        log
    } = node.persistentState;

    const payload = {
        term: currentTerm,  // does this need to be incremented at this point?
        candidateId: id,
        lastLogIndex: log.length - 1,
        lastLogTerm: log[log.length - 1].termReceived
    }

    return rpcBroadcast(id, "receiveRequestVote", [payload]).then((results: any[]) => {
        const groupSize = results.length;
        const grantedCount = results.filter(result => result.ok && result.data.voteGranted).length;
        const majorityReceived = grantedCount > groupSize / 2;

        return majorityReceived;
    });
}


export function receiveRequestVoteRpc(node: TRaftNode<any>, payload: any) {
    const {
        currentTerm,
        votedFor,
        log
    } = node.persistentState;
    const {
        term: proposedTerm,
        candidateId,
        lastLogIndex: candidateLastLogIndex,
        lastLogTerm: candidateLastLogTerm
    } = payload;

    const greaterTerm = currentTerm > proposedTerm ? currentTerm : proposedTerm;
    const voteGranted = (
        (votedFor === null || votedFor === candidateId) &&
        candidateLastLogTerm > currentTerm ||
        (
            candidateLastLogTerm === currentTerm &&
            candidateLastLogIndex > (Log.getLength(log) - 1)
        )
    );

    return {
        term: greaterTerm,
        voteGranted
    }
}


export function broadcastAppendEntriesRpc(
    getNode: () => TLeaderNode<any>,
    proposedEntries: any[]
) {
    const node = getNode();

    const {
        currentTerm: term,
        id: leaderId,
        log
    } = node.persistentState;

    const {
        commitIndex: leaderCommit
    } = node.volatileState;

    const {
        nextIndices
    } = node.leaderStateVolatile;


    Object.entries(nextIndices).map((followerId, followerNextIndex) => {
        const newEntriesForFollower = Log.sliceLog(log, followerNextIndex);
        const prevLogIndex = followerNextIndex - 1;
        const prevLogTerm = Log.getEntryAtIndex(log, prevLogIndex).termReceived;

        const payload = {
            term,
            leaderId,
            prevLogIndex,
            prevLogTerm,
            entries: newEntriesForFollower,
            leaderCommit
        };

        return rpcInvoke(leaderId, followerId, 'receiveAppendEntries', [payload])
            .then(result => {
                const currentNode = getNode();
                // What happens if we’re not longer the leader?

                if (Result.isOk(result)) {

                }
                else {
                    // TODO: more work to be done here... we need to figure out how to handle retries...

                }
            });
    });
}

export function sendAppendEntries(
    followerId,
    getNode,
    proposedEntries
) {
    // Should be recursive to handle rebroadcast
    // Wrapper function will abstract broadcasting
}

export function receiveAppendEntriesRpc(
    getNode: () => TRaftNode<any>,
    setNode: <T>(newNode: TRaftNode<T>) => TRaftNode<T>,
    payload: any
) {
    const node = getNode();

    const {
        term: leaderTerm,
        leaderId,
        prevLogIndex,
        prevLogTerm,
        entries,
        leaderCommit: receivedLeaderCommit
    } = payload;

    const {
        term: receiverTerm,
        log
    } = node.persistentState;

    const {
        commitIndex: knownLeaderCommit
    } = node.leaderStateVolatile;

    const success = (
        leaderTerm >= receiverTerm &&
        Log.getEntryAtIndex(log, prevLogIndex).termReceived === prevLogTerm
    );

    if (success) {
        const newEntries = Log.sliceLog(log, prevLogIndex + 1).concat(entries);
        const newLog = Log.fromEntries(log, entries);
        const newNode = RaftNode.fromLog(node, newLog);
        setNode(newNode);
        // setNode(setLogForNode(node, newLog));

        if (receivedLeaderCommit > knownLeaderCommit) {
            // TODO: I'm not entirely sure what this is...
            // const newLeaderCommit = Math.min(receivedLeaderCommit, newLog[newLog.length - 1].index);
            // setNode(setLeaderCommitForNode(node, newLeaderCommit))
        }
    }

    return {
        success,
        term: receiverTerm  // Are we sure this is correct?
    };
}
