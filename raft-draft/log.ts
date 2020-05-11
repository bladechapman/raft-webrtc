
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

function getLog<T>() {
    return fromLog<T>(null);
}


function sliceLog<T>(
    log: TLog<T>,
    fromIndex?: number,
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

function hasEntryAtIndex<T>(
    log: TLog<T>,
    index: number
): boolean {
    return Boolean(getEntryAtIndex(log, index));
}

function getLastEntry<T>(
    log: TLog<T>,
) {
    const length = log.entries.length;
    return Log.getEntryAtIndex(log, length - 1);
}

function getLength(log: TLog<any>): number {
    const { entries } = log;
    return entries.length === 0 ? 0 : entries[entries.length - 1].index + 1;
}

function withCommands<T>(log: TLog<T>, term: number, commands: T[]) {
    const lastEntry = Log.getLastEntry(log);
    const lastIndex = !!lastEntry ? lastEntry.index : -1;

    const newEntries = commands.map((command, i) => {
        return {
            termReceived: term,
            command,
            index: lastIndex + i + 1
        };
    });

    return Log.fromEntries(log, log.entries.concat(newEntries));
}

export class Log {
    static fromLog = fromLog;
    static fromEntries = fromEntries;
    static getLog = getLog;
    static getLength = getLength;

    static sliceLog = sliceLog
    static getEntryAtIndex = getEntryAtIndex
    static hasEntryAtIndex = hasEntryAtIndex
    static getLastEntry = getLastEntry

    static withCommands = withCommands
}

