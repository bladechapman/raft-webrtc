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

function invokeAppendEntries() {}
function receiveAppendEntries() {}

function invokeRequestVote() {}
function receiveRequestVote() {}



// Sketches below

const rpcPool: any = {};

type TRpcChannel = {
    remoteAddress: string | null,
    remoteInterface: any,

    localAddress: string
    localInterface: any
}


// wip
function sendRpc<T>(
    sendingChannel: TRpcChannel,
    method: string, // Todo, improve type safety
    args: any[]     // todo, improve type safety
) {
    const remote = rpcPool[sendingChannel.remoteAddress as string];
    if (remote) {
        return new Promise((res, rej) => {
            try {
                const remoteResult = remote.localInterface[method].apply(null, args);
                res(Result.okResult(remoteResult))
            } catch (e) {
                res(Result.failedResult(null))
            }
        })
    }
    else {
        return new Promise((res) => res(Result.failedResult(null)));
    }
}

function connect(a: TRpcChannel, b: TRpcChannel) {
    a.remoteAddress = b.localAddress;
    b.remoteAddress = a.localAddress;

    a.remoteInterface = b.localInterface;
    b.remoteInterface = a.localInterface;
}

function register(a: TRpcChannel) {
    rpcPool[a.localAddress] = a;
}

async function main() {
    const clientA = {
        localAddress: 'A',
        localInterface: {
            hello (x: string) {
                console.log(`A: hello, ${x}`)
                return true;
            }
        },
        remoteAddress: null,
        remoteInterface: null
    }

    const clientB = {
        localAddress: 'B',
        localInterface: {
            hello (x: string) {
                console.log(`B: hello, ${x}`)
                return true;
            }
        },
        remoteAddress: null,
        remoteInterface: null
    }

    register(clientA);
    register(clientB);
    connect(clientA, clientB);


    const response = await sendRpc(clientA, 'hello', ['fromA']);
    console.log('Response: ', response);
}

if (require.main === module) {
    main();
}

