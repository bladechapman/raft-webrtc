import { RaftNodeId } from './raftNode';
import { TLogEntry } from './log';
import { Result, TResult } from './lib';


type Parameters<T> = T extends (...args: infer U) => any ? U : never;
type ReturnType<T> = T extends (...args: any[]) => infer U ? U : never;

type TInvokePayload<T extends { [key: string]: Function }> = {
    method: keyof T,
    args: string,
    callId: number
};

type TRespondPayload = {
    result: string,
    callId: number,
};

function isInvokePayload<T extends { [key: string]: Function }>(
    p: TInvokePayload<T> | TRespondPayload
): p is TInvokePayload<T> {
    return (p as TInvokePayload<T>).method !== undefined;
}

export function useRpc/*<T extends { [key: string]: Function }>*/()/*: [
    // (delegate: T) => number,
    // (i: number, r: number, m: keyof T, a: Parameters<T[keyof T]>) => Promise<ReturnType<T[keyof T]>>
] */
{
    // type TRpcGroupMember = {
    //     memberId: number,
    //     delegate: T,
    //     callIds: {
    //         [callId: string]: [
    //             (v: ReturnType<T[keyof T]>) => void,    // res
    //             any                                     // rej
    //         ]
    //     }
    // };

    // const rpcGroup: {
    //     [memberId: number]: TRpcGroupMember
    // } = {};

//     const rpcGroup: {
//         [memberId: number]: any
//     } = {};

    const callIds = {};

    function rpcRegister<T extends { [key: string]: Function }>(
        memberId: number,
        delegate: T
    ) {
        // const member = {
        //     memberId,
        //     delegate
        // };

        // rpcGroup[memberId] = {
        //     memberId,
        //     delegate
        // }

        function rpcHandleResponse(responsePayload: TRespondPayload) {
            const {
                result,
                callId
            } = responsePayload;

            // extract the result from the payload
            const [res, rej] = callIds[callId];
            delete callIds[callId];

            // resolve the promise with the result
            const parsedResult = JSON.parse(result) as ReturnType<T[keyof T]>;  // TODO: make this stricter
            res(parsedResult);
        }

        async function rpcRespond(senderPayload: TInvokePayload<T>) {
            const {
                method,
                args: argsString,
                callId
            } = senderPayload;

            // invoke whatever method is requested
            const args = JSON.parse(argsString);
            const result = await delegate[method].apply(null, args);

            const responsePayload = {
                result: JSON.stringify(result),
                callId,
            };

            // send to senderId with responsePayload
            fakeSend(responsePayload);
        }

        async function rpcReceive(
            senderPayload: TInvokePayload<T> | TRespondPayload
        ) {
            
            if (isInvokePayload(senderPayload)) await rpcRespond(senderPayload);
            else rpcHandleResponse(senderPayload);
        }

        function rpcInvoke(
            method: keyof T,
            args: Parameters<T[keyof T]>
        ) {
            const fn = delegate[method]


            const callId = Math.random();   // TODO: improve this
            const invokePayload: TInvokePayload<T> = {
                method,
                args: JSON.stringify(args),
                callId,
            };

            return new Promise((res, rej) => {
                // TODO: Add timeout?
                callIds[callId] = [res, rej];

                // Send to receiverId with invokePayload
                fakeSend(invokePayload);
            });
        }

        function fakeSend(
            payload: TInvokePayload<T> | TRespondPayload
        ) {
            setTimeout(() => {
                fakeReceive(payload);
            }, Math.random() * 100 + 100);
        }

        function fakeReceive(
            payload: TInvokePayload<T> | TRespondPayload
        ) {
            rpcReceive(payload);
        }

        return rpcInvoke;
    }



    return rpcRegister;
}





if (require.main === module) {

    const bD = {
        hello: (x) => { return `B says ${x}`; },
        add: (x: number, y: number) => { return x + y }
    }
    const rpcRegister = useRpc();
    const bInvoke = rpcRegister(1, bD);

    // const [rpcRegister, rpcInvoke] = useRpc<protocol>();

    // const idA = rpcRegister({
    //     hello: (x) => { return `A says ${x}`; },
    //     add: (x, y) => { return x + y }
    // });

    const cD = {
        goodbye: (x) => { return `C says ${x}`; },
        subtract: (x: number, y: number) => { return x - y }
    }
    const cInvoke = rpcRegister(2, cD);

    bInvoke("hello", [3, 4]).then((v) => {
        console.log(v)
    });

    // aInvoke(idB, "hello", [3, 4]).then((v) => {
    //     console.log(v);
    // });
}
