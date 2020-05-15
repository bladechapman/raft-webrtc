
type TOkResult<T> = {
    type: "Ok"
    data: T
};

type TFailedResult<U> = {
    type :"Failed",
    data: U
};

export type TResult<T, U> = TOkResult<T> | TFailedResult<U>;
export const Result = {
    okResult: function<T>(data: T): TOkResult<T> { return { type: "Ok", data } },
    failedResult: function<U>(data: U): TFailedResult<U> { return { type: "Failed", data } },

    isOk: function<T, U>(result: TResult<T, U>): result is TOkResult<T> { return result.type === "Ok"; },
    isFailed: function<T, U>(result: TResult<T, U>): result is TFailedResult<U> { return result.type === "Failed"; }
}


export class RaftPromise<T> extends Promise<T> {

    static threshold<T>(
        condition: (resolutions: Map<Promise<T>, T>) => boolean,
        promises: Promise<T>[]
    ): Promise<Map<Promise<T>, T>> {
        let resolutions: [Promise<T>, T][] = [];

        return new Promise((res, rej) => {
            if (promises.length === 0) {
                res(new Map());
            }
            else {
                promises.forEach(promise => {
                    promise
                        .then(v => {
                            resolutions.push([promise, v]);
                            const candidateFinal = new Map(resolutions);

                            if (condition(candidateFinal)) {
                                res(candidateFinal)
                            }
                            else if (resolutions.length === promises.length) {
                                // Nothing more can be done to satisfy the condition.
                                rej(candidateFinal)
                            }
                        })
                        .catch((e) => {
                            rej(new Map([[promise, e]]));
                        });
                });
            }
        });
    }

}

const isDebug = true;
export function debug(condition, message) {
    if (isDebug && condition()) {
        throw new Error(message);
    }
}
