import { RaftNode } from "./raftNode";

type TTermWin = { type: "win", winningTerm: number };
type TTermLoss = { type: "lose", winningTerm: number };
type TTermDraw = { type: "draw", winningTerm: number };
type TTermResult = TTermWin | TTermLoss | TTermDraw;

function compareTerms(a: RaftNode<any>, b: RaftNode<any>): [TTermResult, TTermResult] {
    const aTerm = a.persistentState.currentTerm;
    const bTerm = b.persistentState.currentTerm;

    return (
        aTerm > bTerm ?
            [
                { winningTerm: aTerm } as TTermWin,
                { winningTerm: aTerm } as TTermLoss,
            ] :
        aTerm < bTerm ?
            [
                { winningTerm: bTerm } as TTermLoss,
                { winningTerm: bTerm } as TTermWin,
            ] :
        [
            { winningTerm: aTerm } as TTermDraw,
            { winningTerm: bTerm } as TTermDraw,
        ]

    )
}



