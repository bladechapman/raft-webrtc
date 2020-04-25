import { RaftNode } from "./raftNode";
import { rpcBroadcast } from './rpc';

// type TTermWin = { type: "win", winningTerm: number };
// type TTermLoss = { type: "lose", winningTerm: number };
// type TTermDraw = { type: "draw", winningTerm: number };
// type TTermResult = TTermWin | TTermLoss | TTermDraw;

// function compareTerms(a: RaftNode<any>, b: RaftNode<any>): [TTermResult, TTermResult] {
//     const aTerm = a.persistentState.currentTerm;
//     const bTerm = b.persistentState.currentTerm;

//     return (
//         aTerm > bTerm ?
//             [
//                 { winningTerm: aTerm } as TTermWin,
//                 { winningTerm: aTerm } as TTermLoss,
//             ] :
//         aTerm < bTerm ?
//             [
//                 { winningTerm: bTerm } as TTermLoss,
//                 { winningTerm: bTerm } as TTermWin,
//             ] :
//         [
//             { winningTerm: aTerm } as TTermDraw,
//             { winningTerm: bTerm } as TTermDraw,
//         ]

//     )
// }


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


export function receiveRequestVoteRpc(node: any, payload: any) {
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
            candidateLastLogIndex > (log.length - 1)
        )
    );

    return {
        term: greaterTerm,
        voteGranted
    }
}
