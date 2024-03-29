export enum Mode {
    Follower = 1,
    Candidate = 2,
    Leader = 3
}


export class RaftNode<T> {
    readonly persistentState: PersistentState<T>;
    readonly volatileState: VolatileState;
    readonly leaderState: LeaderState;
    readonly mode: Mode;

    constructor(
        persistentState: PersistentState<T>,
        volatileState: VolatileState,
        leaderState: LeaderState,
        mode: Mode
    ) {
        this.persistentState = persistentState;
        this.volatileState = volatileState;
        this.leaderState = leaderState;
        this.mode = mode;
    }

    static default<T>(id: string) {
        const baseEntry = new LogEntry<T>(null, 0, 0);
        const log = new Log<T>([baseEntry]);
        const persistentState = new PersistentState<T>(log, 0, null, id);
        const volatileState = new VolatileState(0, 0);
        const leaderState = new LeaderState({}, {});

        return new RaftNode<T>(
            persistentState,
            volatileState,
            leaderState,
            Mode.Follower
        )
    }

    term(newTerm: number) {
        return new RaftNode(
            this.persistentState.term(newTerm),
            this.volatileState,
            this.leaderState,
            this.mode
        );
    }

    vote(candidateId: string) {
        return new RaftNode(
            this.persistentState.vote(candidateId),
            this.volatileState,
            this.leaderState,
            this.mode
        );
    }

    discoverNewLeader(id: string) {
        return new RaftNode(
            this.persistentState,
            this.volatileState.discoverNewLeader(id),
            this.leaderState,
            this.mode
        )
    }

    command(newCommand: T, term?: number) {
        return new RaftNode(
            this.persistentState.command(newCommand, term),
            this.volatileState,
            this.leaderState,
            this.mode
        );
    }

    sliceLog(startIndex: number, endIndex: number) {
        return new RaftNode(
            this.persistentState.sliceLog(startIndex, endIndex),
            this.volatileState,
            this.leaderState,
            this.mode
        );
    }

    commit(newIndex: number) {
        // console.log(this.persistentState.id, 'newCommit', newIndex);

        if ((window as any).newCommit) {
            (window as any).newCommit(
                this.persistentState.log.slice(0, newIndex + 1).entries
            );
        }

        return new RaftNode(
            this.persistentState,
            this.volatileState.commit(newIndex),
            this.leaderState,
            this.mode
        );
    }

    apply(newIndex: number) {
        return new RaftNode(
            this.persistentState,
            this.volatileState.apply(newIndex),
            this.leaderState,
            this.mode
        );
    }

    newNextIndex(peerId: string, newNextIndex: number) {
        return new RaftNode(
            this.persistentState,
            this.volatileState,
            this.leaderState.newNextIndex(peerId, newNextIndex),
            this.mode
        );
    }

    initializeNextIndices() {
        const nextIndices = this.leaderState.nextIndices;
        const lastLogIndex = this.persistentState.log.getLastEntry().index;

        return Object.keys(nextIndices).reduce((acc, peerId) => {
            return acc.newNextIndex(peerId, lastLogIndex);
        }, this)
    }

    newMatchIndex(peerId: string, newMatchIndex: number) {
        return new RaftNode(
            this.persistentState,
            this.volatileState,
            this.leaderState.newMatchIndex(peerId, newMatchIndex),
            this.mode
        );
    }

    becomeLeader() {

        if ((window as any).becameLeader) {
            (window as any).becameLeader();
        }

        return new RaftNode(
            this.persistentState,
            this.volatileState,
            this.leaderState,
            Mode.Leader
        ).discoverNewLeader(this.persistentState.id);
    }

    becomeCandidate() {

        if ((window as any).becameCandidate) {
            (window as any).becameCandidate();
        }

        return new RaftNode(
            this.persistentState,
            this.volatileState,
            this.leaderState,
            Mode.Candidate
        );
    }

    becomeFollower() {

        if ((window as any).becameFollower) {
            (window as any).becameFollower();
        }

        return new RaftNode(
            this.persistentState,
            this.volatileState,
            this.leaderState,
            Mode.Follower
        );
    }
}

class LogEntry<T> {
    readonly termReceived: number;
    readonly command: T | null;
    readonly index: number;

    constructor(
        command: T | null,
        termReceived: number,
        index: number
    ) {
        this.termReceived = termReceived;
        this.command = command;
        this.index = index;
    };
};

type ReadonlyArrayAtLeastOne<T> = {
    0: T
} & ReadonlyArray<T>

class Log<T> {
    readonly entries: ReadonlyArrayAtLeastOne<LogEntry<T>>

    constructor(
        entries: ReadonlyArrayAtLeastOne<LogEntry<T>>,
    ) {
        this.entries = entries;
    }

    length() {
        const entries = this.entries;
        return entries[entries.length - 1].index + 1
    }

    hasEntryAtIndex(index: number) {
        const candidate = this.entries.find(e => e.index === index);
        return Boolean(candidate);
    }

    getEntryAtIndex(index: number) {
        const candidate = this.entries.find(e => e.index === index);
        if (!candidate) throw new Error('Log#getEntryAtIndex: out of bounds');
        return candidate;
    }

    getLastEntry() {
        const length = this.length();
        return this.getEntryAtIndex(length - 1);
    }

    slice(startIndex: number, endIndex: number) {
        // TODO: This will need to be fixed when log compaction is implemented
        const entries = this.entries;
        // const sliceStartIndex = Math.max(0, entries.findIndex(e => e.index === startIndex));
        // const sliceEndIndex = entries.findIndex(e => e.index === endIndex);
        // // const sliceEndIndex = Math.max(entries.length, entries.findIndex(e => e.index === endIndex));

        // if (sliceStartIndex >= sliceEndIndex) {
        //     console.log(sliceStartIndex, sliceEndIndex, startIndex, endIndex);
        //     throw new Error("Log#slice: invalid slice bounds");
        // }
        const newEntries =  // WARNING: Runtime type coersion
            this.entries.slice(startIndex, endIndex) as unknown as ReadonlyArrayAtLeastOne<LogEntry<T>>;
            // this.entries.slice(sliceStartIndex, sliceEndIndex) as unknown as ReadonlyArrayAtLeastOne<LogEntry<T>>;

        return new Log(
            newEntries,
        );
    }

    command(newCommand: T, term: number) {
        const length = this.length();
        const entries = this.entries;
        const lastIndex = length === 0 ? -1 : entries[entries.length - 1].index;

        const newEntry = new LogEntry(
            newCommand,
            term,
            lastIndex + 1
        );

        const newEntries =  // WARNING: Runtime type coersion
            this.entries.concat(newEntry) as unknown as ReadonlyArrayAtLeastOne<LogEntry<T>>;

        return new Log(
            newEntries,
        );
    }
};


class PersistentState<T> {
    readonly currentTerm: number;
    readonly votedFor: string | null;
    readonly id: string;
    readonly log: Log<T>;

    constructor(
        log: Log<T>,
        term: number,
        vote: string | null,
        id: string,
    ) {
        this.currentTerm = term;
        this.votedFor = vote;
        this.id = id;
        this.log = log;
    }

    term(newTerm: number) {

        if ((window as any).newTerm) {
            (window as any).newTerm(newTerm);
        }

        return new PersistentState(
            this.log,
            newTerm,
            this.votedFor,
            this.id
        );
    }

    vote(candidateId: string) {
        return new PersistentState(
            this.log,
            this.currentTerm,
            candidateId,
            this.id
        )
    }

    command(newCommand: T, term?: number) {
        return new PersistentState(
            this.log.command(newCommand, term || this.currentTerm),
            this.currentTerm,
            this.votedFor,
            this.id
        )
    }

    sliceLog(startIndex: number, endIndex: number) {
        return new PersistentState(
            this.log.slice(startIndex, endIndex),
            this.currentTerm,
            this.votedFor,
            this.id
        );
    }
}


class VolatileState {
    readonly commitIndex: number;
    readonly lastApplied: number;
    readonly lastKnownLeader?: string;

    constructor(
        commitIndex: number,
        lastApplied: number,
        lastKnownLeader?: string
    ) {
        this.commitIndex = commitIndex;
        this.lastApplied = lastApplied;
        this.lastKnownLeader = lastKnownLeader;
    }

    commit(newIndex: number) {
        return new VolatileState(
            newIndex,
            this.lastApplied,
            this.lastKnownLeader
        );
    }

    apply(newIndex: number) {
        return new VolatileState(
            this.commitIndex,
            newIndex,
            this.lastKnownLeader
        );
    }

    discoverNewLeader(id: string) {
        return new VolatileState(
            this.commitIndex,
            this.lastApplied,
            id
        );
    }
}


class LeaderState {
    readonly nextIndices: Record<string, number | undefined>;
    readonly matchIndices: Record<string, number | undefined>;

    constructor(nextIndices, matchIndices) {
        this.nextIndices = nextIndices;
        this.matchIndices = matchIndices;
    }

    newNextIndex(peerId: string, newNextIndex: number) {
        return new LeaderState(
            { ...this.nextIndices, [peerId]: newNextIndex },
            this.matchIndices
        );
    }

    newMatchIndex(peerId: string, newMatchIndex: number) {
        return new LeaderState(
            this.nextIndices,
            { ...this.matchIndices, [peerId]: newMatchIndex }
        );
    }
}

