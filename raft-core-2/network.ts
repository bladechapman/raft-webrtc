import { RaftNode, Mode } from './raftNode';
import { RaftPromise } from '../raft-draft/lib';
import { rpcInvoke } from '../raft-draft/rpc';

export function broadcastRequestVoteRpc<T>(
    getNode: () => RaftNode<T>,
    becomeFollowerCallback
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
        return rpcInvoke(id, peerId, "receiveRequestVote", [payload]).then((result: any) => {
            const { term } = result;
            const node = getNode();
            if (term > node.persistentState.currentTerm) {
                becomeFollowerCallback()
            }

            return result;
        });
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
    payload: any,
    becomeFollowerCallback  // HACK
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
        setNode(node.vote(candidateId).term(greaterTerm))
    }

    if (proposedTerm > currentTerm) {
        becomeFollowerCallback();
        // setNode(node.becomeFollower());
    }

    return {
        term: greaterTerm,
        voteGranted
    }
}

export function broadcastAppendEntriesRpc<T>(
    getNode: () => RaftNode<T>,
    setNode: (newNode: RaftNode<T>) => RaftNode<T>,
    proposedCommands: T[],
    becomeFollowerCallback
) {
    // console.log(getNode().persistentState.id, 'broadcastAppend');

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
        return sendAppendEntries(parseFloat(followerId), getNode, setNode, proposedCommands, becomeFollowerCallback);
    });

    const condition = (resolutions) => {
        const successes = Array.from(resolutions.values()).reduce((acc: number, resolution: any) => {
            if (resolution && resolution.success) return acc + 1;
            else return acc;
        }, 0);

        return (successes as number + 1) > (promises.length / 2);
    }

    return RaftPromise.threshold(condition, promises).then(v => {
    // return RaftPromise.majority(promises).then(v => {
        // TODO: We might need to be careful here. What happens
        // If the node is no longer the leader? We can probably do this by checking the term number
        //
        // DANGER: We may need to check the commit index, match index, and term here...

        // 5.3
        // A log entry is committed once the leader that created the entry has
        // replicated it on a majority of the servers.
        const node = getNode();
        setNode(
            node
            .commit(node.persistentState.log.getLastEntry().index)
        );
    }).catch(e => {
        console.log('BROADCAST APPEND ENTRIES EXCEPTION', e);
    });
}


function sendAppendEntries<T>(
    followerId: number,
    getNode: () => RaftNode<T>,
    setNode: (newNode: RaftNode<T>) => RaftNode<T>,
    proposedCommands: T[],
    becomeFollowerCallback
) {
    const node = getNode();

    if (node.mode !== Mode.Leader) return new Promise((res, rej) => res('TEMP IMPL: NO LONGER LEADER'));

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
            const currentTerm = currentNode.persistentState.currentTerm;
            const { success, term } = result;

            if (term > currentTerm) {
                becomeFollowerCallback();
                return 'TEMP IMPL: NO LONGER LEADER 2';
            }

            // TODO: I guess if we’re no longer leader, just throw out the response...
            // We’ll get back to that later, for now let’s just assume we’re still leader

            // if (Result.isOk(result)) {
                // const { data } = result;
                // const { success, term } = data;
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
                    return sendAppendEntries(followerId, getNode, setNode, proposedCommands, becomeFollowerCallback);
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
    payload: any,
    becomeFollowerCallback  // hack
) {
    console.log(getNode().persistentState.id, 'receiveAppend', getNode().mode);

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

        // console.log(getNode().persistentState.id, 'append-success', getNode().persistentState.log.entries.slice(-3))
    }

    // console.log(getNode().persistentState.id, leaderTerm, receiverTerm, getNode().mode);
    if (leaderTerm > receiverTerm) {
        becomeFollowerCallback();
        // setNode(node.becomeFollower())
    }

    return {
        success,
        term: receiverTerm  // Are we sure this is correct?
    };
}
