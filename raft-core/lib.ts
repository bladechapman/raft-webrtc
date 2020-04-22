
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
    okResult: function<T>(data: T) { return { data } as TOkResult<T> },
    failedResult: function<U>(data: U) { return { data } as TFailedResult<U> }
}
