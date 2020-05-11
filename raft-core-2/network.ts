import { RaftNode } from './raftNode';
import { RaftPromise } from '../raft-draft/lib';
import { rpcInvoke } from '../raft-draft/rpc';

export function broadcastRequestVoteRpc<T>(
    getNode: () => RaftNode<T>
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
        lastLogIndex: log.getLastEntry().index,
        lastLogTerm: log.getLastEntry().termReceived
    }

    const group = Object.keys(node.leaderState.nextIndices);
    const promises = group.map(peerId => {
        return rpcInvoke(id, peerId, "receiveRequestVote", [payload]);
    });

    const condition = (mapping) => {
        const results = Array.from(mapping.values()) as any[];
        const grantedCount = results.filter(result => result.voteGranted).length;
        return (grantedCount + 1) > Math.floor(group.length / 2);
    };

    return RaftPromise.threshold(
        condition,
        promises
    )
        .then(() => true)
        .catch(() => false)
}

export function receiveRequestVoteRpc<T>(
    getNode: () => RaftNode<T>,
    setNode: (newNode: RaftNode<T>) => RaftNode<T>,
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
            candidateLastLogIndex >= log.getLastEntry().index
        )
    );

    if (voteGranted) {
        if (proposedTerm > currentTerm) {
            setNode(node.becomeFollower());
        }

        setNode(node.vote(candidateId).term(greaterTerm))
    }

    return {
        term: greaterTerm,
        voteGranted
    }
}

export function broadcastAppendEntriesRpc<T>(
    getNode: () => RaftNode<T>,
    setNode: (newNode: RaftNode<T>) => RaftNode<T>,
    proposedCommands: T[]
) {
    const node = getNode();
    const { nextIndices } = node.leaderState;
    const {
        log: leaderLog,
        currentTerm
    } = node.persistentState;

    // Include the new entries in the leader’s log
    const newNode = proposedCommands.reduce((acc, c) => acc.command(c), node);
    setNode(newNode);

    const promises = Object.keys(nextIndices).map(followerId => {
        return sendAppendEntries(parseFloat(followerId), getNode, setNode, proposedCommands);
    });

    return RaftPromise.majority(promises).then(v => {
        // TODO: We might need to be careful here. What happens
        // If the node is no longer the leader? We can probably do this by checking the term number
        //
        // DANGER: We may need to check the commit index, match index, and term here...

        // 5.3
        // A log entry is committed once the leader that created the entry has
        // replicated it on a majority of the servers.

    });
}


function sendAppendEntries<T>(
    followerId: number,
    getNode: () => RaftNode<T>,
    setNode: (newNode: RaftNode<T>) => RaftNode<T>,
    proposedCommands: T[]
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
    } = node.leaderState;


    const followerNextIndex = nextIndices[followerId] || 1;
    // At this point, the leader has already included the new entries in its log
    const candidateNextIndex = leaderLog.length();
    const prevLogIndex = followerNextIndex - 1;

    const prevLogTerm = prevLogIndex === -1
        ? null
        : leaderLog.getEntryAtIndex(prevLogIndex).termReceived;
    const newEntriesForFollower = leaderLog.slice(followerNextIndex, leaderLog.length()).entries

    const payload = {
        term,
        leaderId,
        prevLogIndex,
        prevLogTerm,
        entries: newEntriesForFollower,
        leaderCommit
    };

    return rpcInvoke(leaderId, followerId, 'receiveAppendEntries', [payload])
        .then((result: any) => {
            const currentNode = getNode();

            // TODO: I guess if we’re no longer leader, just throw out the response...
            // We’ll get back to that later, for now let’s just assume we’re still leader

            // if (Result.isOk(result)) {
                // const { data } = result;
                // const { success, term } = data;
                const { success, term } = result;
                if (success) {
                    // The log entry has been replicated on the follower.
                    // Update the match index for this node.
                    const matchIndices = currentNode.leaderState.matchIndices;
                    const newMatchIndex = newEntriesForFollower[newEntriesForFollower.length - 1].index;
                    const newNode = currentNode
                        .newMatchIndex(followerId, newMatchIndex)
                        .newNextIndex(followerId, candidateNextIndex)
                    setNode(newNode);

                    return result;
                }
                else {
                    // 5.3
                    // After a rejection, the leader decrements nextIndex and retries
                    // the AppendEntries RPC
                    const nextIndices = currentNode.leaderState.nextIndices;
                    const nextIndex = nextIndices[followerId] || 2; 
                    const newNextIndex = nextIndex - 1; // the lowest possible nextIndex is 1

                    // debug(
                    //     () => newNextIndex < 0,
                    //     "Next index < 0"
                    // );

                    setNode(
                        currentNode.newNextIndex(followerId, newNextIndex)
                    );
                    return sendAppendEntries(followerId, getNode, setNode, proposedCommands);
                }
            // }
            // else {
            //     // 5.3 
            //     // If followers crash or run slowly, or if network packets are lost,
            //     // the leader retries AppendEntries RPCs indefinitely.
            //     return sendAppendEntries(followerId, getNode, setNode, proposedCommands);
            // }
        });
}

export function receiveAppendEntriesRpc<T>(
    getNode: () => RaftNode<T>,
    setNode: (newNode: RaftNode<T>) => RaftNode<T>,
    payload: any
) {
    const node = getNode();

    const {
        term: leaderTerm,
        prevLogIndex,
        prevLogTerm,
        entries,
        leaderCommit: receivedLeaderCommit
    } = payload;

    const {
        currentTerm: receiverTerm,
        log,
        id
    } = node.persistentState;

    const {
        commitIndex
    } = node.volatileState;

    const success = (
        leaderTerm >= receiverTerm &&
        log.hasEntryAtIndex(prevLogIndex) && log.getEntryAtIndex(prevLogIndex).termReceived === prevLogTerm
    )

    if (success) {
        let newNode = node.sliceLog(0, prevLogIndex + 1)
        newNode = entries.reduce((node, entry) => {
            const { termReceived, command } = entry;
            return node.command(command, termReceived);
        }, newNode)

        setNode(newNode);

        if (receivedLeaderCommit > commitIndex) {
            const newCommitIndex = newNode.persistentState.log.getLastEntry().index;
            setNode(newNode.commit(newCommitIndex));
        }
    }

    if (leaderTerm > receiverTerm) {
        setNode(node.becomeFollower())
    }

    return {
        success,
        term: receiverTerm  // Are we sure this is correct?
    };
}
