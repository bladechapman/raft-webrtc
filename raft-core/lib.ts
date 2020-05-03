
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

    static majority<T>(promises: Promise<T>[]) {
        const threshold = Math.ceil(promises.length / 2);
        return RaftPromise.threshold(threshold, promises);
    }

    static threshold<T>(threshold: number, promises: Promise<T>[]): Promise<Map<Promise<T>, T>> {
        let resolutions = [];

        return new Promise((res, rej) => {
            if (promises.length === 0) res(new Map(resolutions));
            else {
                promises.forEach(promise => {
                    promise
                        .then(v => {
                            resolutions.push([promise, v]);
                            if (resolutions.length >= threshold) {
                                res(new Map(resolutions))
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
