
export type TLogEntry<T> = {
    termReceived: number,
    command: T
};

export type TLog<T> = {
    entries: TLogEntry<T>[],
    commitIndex: number,
    lastApplied: number
};

function fromLog<T>(log: TLog<T> | null): TLog<T> {
    if (log === null) {
        return {
            entries: [],
            commitIndex: 0,
            lastApplied: 0
        };
    }
    else {
        return {
            ...log,
            entries: log.entries.slice(),
        };
    }
}

function getLog() {
    return fromLog(null);
}

export class Log {
    static fromLog = fromLog;
    static getLog = getLog;
}
