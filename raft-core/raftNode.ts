import { TLogEntry } from './log';

export type RaftNodeId = number;

/**
 * Must be updated on stable storage before responding to RPCs
 */
type TRaftNodeStatePersistent<T> = {
    currentTerm: number,
    votedFor: RaftNodeId | null,
    log: TLogEntry<T>
}

type TRaftNodeStateVolatile = {
    commitIndex: number,
    lastApplied: number
}

/**
 * Reinitialized after election
 */
type TRaftLeaderStateVolatile = {
    nextIndex: Record<RaftNodeId, number | undefined>,
    matchIndex: Record<RaftNodeId, number | undefined>
}


enum NodeMode {
    Uninitialized = 0,
    Follower = 1,
    Candidate = 2,
    Leader = 3
}

enum ModeEvent {
    Startup = 1,
    Timeout = 2,
    MajorityReceived = 3,
    LeaderDiscovered = 4
}

function transitionMode(currentState: NodeMode, event: ModeEvent): NodeMode {
    switch (currentState) {
        case NodeMode.Uninitialized:
            switch (event) {
                case ModeEvent.Startup: return NodeMode.Follower
            }
        case NodeMode.Follower:
            switch (event) {
                case ModeEvent.Timeout: return NodeMode.Candidate
            }
        case NodeMode.Candidate:
            switch (event) {
                case ModeEvent.Timeout: return NodeMode.Candidate
                case ModeEvent.LeaderDiscovered: return NodeMode.Follower
                case ModeEvent.MajorityReceived: return NodeMode.Leader
            }
        case NodeMode.Leader:
            switch (event) {
                case ModeEvent.LeaderDiscovered: return NodeMode.Follower
            }
    }

    throw new Error("raftNode: Invalid State Transition")
}
