
export type TLogEntry<T> = {
    termReceived: number,
    command: T

    index: number,
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

function fromEntries<T>(log: TLog<T>, entries: TLogEntry<T>[]) {
    return fromLog({ ...log, entries });
}

function getLog() {
    return fromLog(null);
}


function sliceLog<T>(
    log: TLog<T>,
    fromIndex = 0,
    toIndex?: number
): TLogEntry<T>[] {
    const { entries } = log;
    return entries.slice(fromIndex, toIndex)
}

function getEntryAtIndex<T>(
    log: TLog<T>,
    index: number
): TLogEntry<T> | undefined {
    const { entries } = log;
    return entries.find(entry => entry.index === index);
}

function getLength(log: TLog<any>): number {
    const { entries } = log;
    return entries.length === 0 ? 0 : entries[entries.length - 1].index;
}

export class Log {
    static fromLog = fromLog;
    static fromEntries = fromEntries;
    static getLog = getLog;
    static getLength = getLength;

    static sliceLog = sliceLog
    static getEntryAtIndex = getEntryAtIndex
}

