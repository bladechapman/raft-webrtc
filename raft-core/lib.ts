
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
