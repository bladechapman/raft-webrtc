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

// const rpcPool: any = {};

// type TRpcChannel = {
//     remoteAddress: string | null,
//     remoteInterface: any,

//     localAddress: string
//     localInterface: any
// }


// // wip
// function sendRpc<T>(
//     sendingChannel: TRpcChannel,
//     method: string, // Todo, improve type safety
//     args: any[]     // todo, improve type safety
// ) {
//     const remote = rpcPool[sendingChannel.remoteAddress as string];
//     if (remote) {
//         return new Promise((res, rej) => {
//             try {
//                 const remoteResult = remote.localInterface[method].apply(null, args);
//                 setTimeout(() => {
//                     // Simulate some random network latency
//                     res(Result.okResult(remoteResult))
//                 }, Math.random() * 100)
//             } catch (e) {
//                 res(Result.failedResult(null))
//             }
//         })
//     }
//     else {
//         return new Promise((res) => res(Result.failedResult(null)));
//     }
// }

// export function connect(a: TRpcChannel, b: TRpcChannel) {
//     a.remoteAddress = b.localAddress;
//     b.remoteAddress = a.localAddress;

//     a.remoteInterface = b.localInterface;
//     b.remoteInterface = a.localInterface;
// }

// export function register(a: TRpcChannel) {
//     rpcPool[a.localAddress] = a;
// }

// async function main() {
//     const clientA = {
//         localAddress: 'A',
//         localInterface: {
//             hello (x: string) {
//                 console.log(`A: hello, ${x}`)
//                 return true;
//             }
//         },
//         remoteAddress: null,
//         remoteInterface: null
//     }

//     const clientB = {
//         localAddress: 'B',
//         localInterface: {
//             hello (x: string) {
//                 console.log(`B: hello, ${x}`)
//                 return true;
//             }
//         },
//         remoteAddress: null,
//         remoteInterface: null
//     }

//     register(clientA);
//     register(clientB);
//     connect(clientA, clientB);


//     const response = await sendRpc(clientA, 'hello', ['fromA']);
//     console.log('Response: ', response);
// }

// if (require.main === module) {
//     main();
// }


// Sketch 2
// const rpcGroup: {
//     [key: string]: {
//         delegate: any
//         handle
//     }
// } = {};
const rpcGroup: {
    [memberId: string]: {  
        memberId: string,
        delegate: any,
        callIds: {
            [callId: string]: [any /* resolve */, any /* reject */]
        }
    }
} = {};

export function rpcInvoke(invokerId, receiverId, method, args) {
    const callId = Math.random();   // TODO: improve this
    const invokePayload = {
        method,
        args: JSON.stringify(args),
        invokerId,
        callId,
        __invoke: true
    };

    let responsePromise = new Promise((res, rej) => {
        // TODO: Add timeout?
        rpcGroup[invokerId].callIds[callId] = [res, rej];
    });

    // Send to receiverId with invokePayload
    fakeSend(receiverId, invokePayload);

    return responsePromise;
}

export function rpcBroadcast(invokerId, method, args) {
    return Promise.all(
        Object.values(rpcGroup).map(rpcMember => 
            rpcInvoke(invokerId, rpcMember.memberId, method, args)
        )
    );
}

async function rpcReceive(receiverId, senderPayload) {
    const isInvocation = senderPayload.__invoke === true;
    if (isInvocation) await rpcRespond(receiverId, senderPayload);
    else rpcHandleResponse(senderPayload);
}

const delegate = {};
async function rpcRespond(receiverId, senderPayload) {
    const {
        method,
        args: argsString,
        invokerId,
        callId
    } = senderPayload;

    // invoke whatever method is requested
    const args = JSON.parse(argsString);
    const result = await rpcGroup[receiverId].delegate[method].apply(null, args);

    const responsePayload = {
        result,
        invokerId,
        callId,
        __response: true
    };

    // send to senderId with responsePayload
    fakeSend(invokerId, responsePayload);
}

function rpcHandleResponse(responsePayload) {
    const {
        result,
        invokerId,
        callId
    } = responsePayload;

    // extract the result from the payload
    const [res, rej] = rpcGroup[invokerId].callIds[callId];
    delete rpcGroup[invokerId].callIds[callId];

    // resolve the promise with the result
    res(result);
}


export function rpcRegister(delegate) {
    const id = Math.random().toString();
    rpcGroup[id] = {
        memberId: id,
        delegate,
        callIds: {}
    }

    return id;
}


function fakeSend(receiverId, payload) {
    setTimeout(() => {
        fakeReceive(receiverId, payload);
    }, Math.random() * 100 + 100);
}

function fakeReceive(id, payload) {
    rpcReceive(id, payload);
}



if (require.main === module) {
    const idA = rpcRegister({
        hello: (x) => {
            console.log(`Hello ${x}!`);
            return 'Goodbye';
        }
    });

    const idB = rpcRegister({
        speak: (y) => {
            console.log(`Bark ${y}`);
            return true;
        }
    });


    rpcInvoke(idA, idB, 'speak', ['test']).then((r) => {
        console.log(r);

        rpcInvoke(idB, idA, 'hello', ['A']).then((r) => {
            console.log(r);
        });
    });
}
