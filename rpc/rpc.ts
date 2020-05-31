
export function rpcRegister(
    uuid: string,
    send,
    delegate
) {
    console.log('---- RPC REGISTER');
    const callIds = {};

    function rpcReceive(senderPayload) {
        if ((window as any).online === false) return;

        console.log('RPC RECEIVE', senderPayload);

        const isInvocation = senderPayload.__invoke === true;
        if (isInvocation) rpcRespond(senderPayload);
        else rpcHandleResponse(senderPayload);
    }

    function rpcHandleResponse(responsePayload) {
        const {
            result,
            callId
        } = responsePayload;

        // extract the result from the payload
        const [res, rej] = callIds[callId];
        delete callIds[callId];

        // resolve the promise with the result
        res(result);
    }

    function rpcRespond(senderPayload) {
        const {
            method,
            args: argsString,
            invokerId,
            target: targetId,
            callId
        } = senderPayload;

        // invoke whatever method is requested
        const args = JSON.parse(argsString);
        const result = delegate[method].apply(null, args);

        const responsePayload = {
            result,
            invokerId: targetId,
            target: invokerId,
            callId,
            __response: true,
            rpc: true
        };

        send(responsePayload)
    }

    function rpcInvoke(targetId, method, args) {
        const callId = Math.random();   // TODO: improve this
        const invokePayload = {
            method,
            args: JSON.stringify(args),
            invokerId: uuid,
            target: targetId,
            callId,
            __invoke: true,
            rpc: true
        };

        console.log('RPC INVOKE', args);

        let responsePromise = new Promise((res, rej) => {
            // TODO: Add timeout?
            callIds[callId] = [res, rej];
        });

        // Send to receiverId with invokePayload
        send(invokePayload);

        return responsePromise;
    }

    return [rpcInvoke, rpcReceive]
}
