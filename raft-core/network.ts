import { TRaftNode, TLeaderNode, RaftNode } from "./raftNode";
import { rpcBroadcast, rpcInvoke } from './rpc';
import { Log } from './log';
import { Result, TResult, RaftPromise, debug } from './lib';


export function broadcastRequestVoteRpc(
    getNode: () => TRaftNode<any>,
    setNode: <T>(newNode: TRaftNode<T>) => TRaftNode<T>,
) {
    const node = getNode();

    const {
        currentTerm,
        id,
        log
    } = node.persistentState;

    const payload = {
        term: currentTerm,  // does this need to be incremented at this point?
        candidateId: id,
        lastLogIndex: Log.getLength(log) - 1,
        lastLogTerm: Log.getLastEntry(log).termReceived
    }

    return rpcBroadcast(id, "receiveRequestVote", [payload]).then((results: any[]) => {
        const groupSize = results.length;
        const grantedCount = results.filter(result => result.ok && result.data.voteGranted).length;
        const majorityReceived = grantedCount > groupSize / 2;

        return majorityReceived;
    });
}


export function receiveRequestVoteRpc(
    getNode: () => TRaftNode<any>,
    setNode: <T>(newNode: TRaftNode<T>) => TRaftNode<T>,
    payload: any
) {
    const node = getNode();
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

    if (voteGranted) {
        setNode(RaftNode.fromVotedFor(node, candidateId));
    }

    return {
        term: greaterTerm,
        voteGranted
    }
}


export function broadcastAppendEntriesRpc(
    getNode: () => TLeaderNode<any>,
    setNode: <T>(newNode: TRaftNode<T>) => TRaftNode<T>,
    proposedCommands: any[]
) {
    const node = getNode();
    const { nextIndices } = node.leaderStateVolatile;
    const {
        log: leaderLog,
        currentTerm
    } = node.persistentState;

    // Include the new entries in the leader’s log
    const newLeaderLog = Log.withCommands(leaderLog, currentTerm, proposedCommands)
    const newNode = RaftNode.fromLog(node, newLeaderLog);
    setNode(newNode);

    const promises = Object.keys(nextIndices).map(followerId => {
        return sendAppendEntries(followerId, getNode, setNode, proposedCommands);
    });
    RaftPromise.majority(promises).then(v => {
        // TODO: We might need to be careful here. What happens
        // If the node is no longer the leader? We can probably do this by checking the term number
        //
        // DANGER: We may need to check the commit index, match index, and term here...

        // 5.3
        // A log entry is committed once the leader that created the entry has
        // replicated it on a majority of the servers.

    });
}

function sendAppendEntries(
    followerId,
    getNode,
    setNode,
    proposedCommands
) {
    const node = getNode();

    const {
        currentTerm: term,
        id: leaderId,
        log: leaderLog
    } = node.persistentState;

    const {
        commitIndex: leaderCommit
    } = node.volatileState;

    const {
        nextIndices
    } = node.leaderStateVolatile;

    const followerNextIndex = nextIndices[followerId];

    // At this point, the leader has already included the new entries in its log
    const newEntriesForFollower = Log.sliceLog(
        leaderLog,
        followerNextIndex
    );
    const prevLogIndex = followerNextIndex - 1;
    const prevLogTerm = Log.getEntryAtIndex(leaderLog, prevLogIndex).termReceived;

    const payload = {
        term,
        leaderId,
        prevLogIndex,
        prevLogTerm,
        entries: newEntriesForFollower,
        leaderCommit
    };

    return rpcInvoke(leaderId, followerId, 'receiveAppendEntries', [payload])
        .then((result: TResult<any, any>) => {
            const currentNode = getNode();

            // TODO: I guess if we’re no longer leader, just throw out the response...
            // We’ll get back to that later, for now let’s just assume we’re still leader

            if (Result.isOk(result)) {
                const { data } = result;
                const { success, term } = data;
                if (success) {
                    // The log entry has been replicated on the follower.
                    // Update the match index for this node.
                    const matchIndices = currentNode.leaderStateVolatile.matchIndices;
                    const newMatchIndex = newEntriesForFollower[newEntriesForFollower.length - 1].index;
                    const newNode = RaftNode.fromMatchIndices(
                        currentNode,
                        {
                            ...matchIndices,
                            [followerId]: newMatchIndex
                        }
                    );
                    setNode(newNode);

                    return data;
                }
                else {
                    // 5.3
                    // After a rejection, the leader decrements nextIndex and retries
                    // the AppendEntries RPC
                    const nextIndices = currentNode.leaderStateVolatile.nextIndices;
                    const nextIndex = nextIndices[followerId];
                    const newNextIndex = nextIndex - 1;

                    debug(
                        () => newNextIndex < 0,
                        "Next index < 0"
                    );

                    setNode(
                        RaftNode.fromNextIndices(
                            currentNode,
                            {
                                ...nextIndices,
                                [followerId]: newNextIndex
                            }
                        )
                    );
                    return sendAppendEntries(followerId, getNode, setNode, proposedCommands);
                }
            }
            else {
                // 5.3 
                // If followers crash or run slowly, or if network packets are lost,
                // the leader retries AppendEntries RPCs indefinitely.
                return sendAppendEntries(followerId, getNode, setNode, proposedCommands);
            }
        });
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
        currentTerm: receiverTerm,
        log
    } = node.persistentState;

    const {
        commitIndex
    } = node.volatileState;

    const success = (
        leaderTerm >= receiverTerm &&
        Log.getEntryAtIndex(log, prevLogIndex).termReceived === prevLogTerm
    );

    if (success) {
        const newEntries = Log.sliceLog(log, prevLogIndex + 1).concat(entries);
        const newLog = Log.fromEntries(log, entries);
        const newNode = RaftNode.fromLog(node, newLog);
        setNode(newNode);

        if (receivedLeaderCommit > commitIndex) {
            const lastNewEntry = newEntries[newEntries.length - 1];
            const newCommitIndex = Math.min(receivedLeaderCommit, lastNewEntry.index);
            setNode(RaftNode.fromCommitIndex(node, newCommitIndex));
        }
    }

    return {
        success,
        term: receiverTerm  // Are we sure this is correct?
    };
}
