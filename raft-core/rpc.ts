import { RaftNodeId } from './raftNode';
import { TLogEntry } from './log';
import { Result, TResult } from './lib';

type TAppendEntriesPayload<T> = {
    term: number,
    leaderId: RaftNodeId,
    prevLogIndex: number,
    prevLogTerm: number,
    entries: TLogEntry<T>[],
    leaderCommit: number
}

type TAppendEntriesResult = {
    term: number,
    success: boolean
}

type TRequestVotePayload<T> = {
    term: number,
    candidateId: RaftNodeId,
    lastLogIndex: number,
    lastLogTerm: number
}

type TRequestVoteResult = {
    term: number,
    voteGranted: boolean
}


type TRpcPayload<T> = { method: string, args: T[] };
function rpcEncode<T>(payload: TRpcPayload<T>) { return JSON.stringify(payload); }
function rpcDecode<T>(
    payload: string,
    validateArg: (candidate: any) => candidate is T
): TResult<T, null> {
    try {
        const parsed = JSON.parse(payload);
        const { method, args } = parsed;
        const isValid = (
            typeof method === "string" &&
            Array.isArray(args) &&
            args.every(validateArg)
        );

        return isValid ? Result.okResult(parsed) : Result.failedResult(null);
    }
    catch(e) {
        return Result.failedResult(null);
    }
}
function sendRpc() {}
function receiveRpc() {}


function invokeAppendEntries() {}
function receiveAppendEntries() {}

function invokeRequestVote() {}
function receiveRequestVote() {}
