import { RaftNodeId } from './raftNode';
import { TLogEntry } from './log';

type TAppendEntriesRPCPayload<T> = {
    term: number,
    leaderId: RaftNodeId,
    prevLogIndex: number,
    prevLogTerm: number,
    entries: TLogEntry<T>[],
    leaderCommit: number
}

type TAppendEntriesRPCResult = {
    term: number,
    success: boolean
}

type TRequestVotePayload<T> = {
    term: number,
    candidateId: RaftNodeId,
    lastLogIndex: number,
    lastLogTerm: number
}

type TRequestVodeResult = {
    term: number,
    voteGranted: boolean
}
