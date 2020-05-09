import { RaftNodeId } from './raftNode';
import { TLogEntry } from './log';
import { Result, TResult } from './lib';


type Parameters<T> = T extends (...args: infer U) => any ? U : never;
type ReturnType<T> = T extends (...args: any[]) => infer U ? U : never;

type TInvokePayload<T extends { [key: string]: Function }> = {
    method: keyof T,
    args: string,
    invokerId: number,
    callId: number
};

type TRespondPayload = {
    result: string,
    invokerId: number,
    callId: number,
};

function isInvokePayload<T extends { [key: string]: Function }>(
    p: TInvokePayload<T> | TRespondPayload
): p is TInvokePayload<T> {
    return (p as TInvokePayload<T>).method !== undefined;
}

export function useRpc<T extends { [key: string]: Function }>(): [
    (delegate: T) => number,
    (i: number, r: number, m: keyof T, a: Parameters<T[keyof T]>) => Promise<ReturnType<T[keyof T]>>
]
{
    type TRpcGroupMember = {
        memberId: number,
        delegate: T,
        callIds: {
            [callId: string]: [
                (v: ReturnType<T[keyof T]>) => void,    // res
                any                                     // rej
            ]
        }
    };

    const rpcGroup: {
        [memberId: number]: TRpcGroupMember
    } = {};


    function rpcRegister(delegate: T) {
        const id = Math.random();
        rpcGroup[id] = {
            memberId: id,
            delegate,
            callIds: {}
        }

        return id;
    }

    function rpcHandleResponse(responsePayload: TRespondPayload) {
        const {
            result,
            invokerId,
            callId
        } = responsePayload;

        // extract the result from the payload
        const [res, rej] = rpcGroup[invokerId].callIds[callId];
        delete rpcGroup[invokerId].callIds[callId];

        // resolve the promise with the result
        const parsedResult = JSON.parse(result) as ReturnType<T[keyof T]>;  // TODO: make this stricter
        res(parsedResult);
    }

    async function rpcRespond(receiverId, senderPayload: TInvokePayload<T>) {
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
            result: JSON.stringify(result),
            invokerId,
            callId,
        };

        // send to senderId with responsePayload
        fakeSend(invokerId, responsePayload);
    }

    async function rpcReceive(
        receiverId: number,
        senderPayload: TInvokePayload<T> | TRespondPayload
    ) {
        
        if (isInvokePayload(senderPayload)) await rpcRespond(receiverId, senderPayload);
        else rpcHandleResponse(senderPayload);
    }

    function rpcInvoke(
        invokerId: number,
        receiverId: number,
        method: keyof T,
        args: Parameters<T[keyof T]>
    ): Promise<ReturnType<T[keyof T]>> {
        const callId = Math.random();   // TODO: improve this
        const invokePayload: TInvokePayload<T> = {
            method,
            args: JSON.stringify(args),
            invokerId,
            callId,
        };

        return new Promise((res, rej) => {
            // TODO: Add timeout?
            rpcGroup[invokerId].callIds[callId] = [res, rej];

            // Send to receiverId with invokePayload
            fakeSend(receiverId, invokePayload);
        });
    }

    function fakeSend(
        receiverId: number,
        payload: TInvokePayload<T> | TRespondPayload
    ) {
        setTimeout(() => {
            fakeReceive(receiverId, payload);
        }, Math.random() * 100 + 100);
    }

    function fakeReceive(
        id: number,
        payload: TInvokePayload<T> | TRespondPayload
    ) {
        rpcReceive(id, payload);
    }


    return [rpcRegister, rpcInvoke];
}





if (require.main === module) {
    type protocol = {
        hello: (x: string) => string,
        add: (y: number, z: number) => number
    }

    const [rpcRegister, rpcInvoke] = useRpc<protocol>();

    const idA = rpcRegister({
        hello: (x) => { return `A says ${x}`; },
        add: (x, y) => { return x + y }
    });

    const idB = rpcRegister({
        hello: (x) => { return `B says ${x}`; },
        add: (x, y) => { return x + y }
    });


    rpcInvoke(idA, idB, "hello", [3, 4]).then((v) => {
        console.log(v);
    });
}
