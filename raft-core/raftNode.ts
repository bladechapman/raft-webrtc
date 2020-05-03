import { TLog } from './log';

export type RaftNodeId = number;

/**
 * Must be updated on stable storage before responding to RPCs
 */
type TRaftNodeStatePersistent<T> = {
    currentTerm: number,
    votedFor: RaftNodeId | null,
    log: TLog<T>,
    id: number
}

type TRaftNodeStateVolatile = {
    commitIndex: number,
    lastApplied: number
}

/**
 * Reinitialized after election
 */
type TRaftLeaderStateVolatile = {
    nextIndices: Record<RaftNodeId, number | undefined>,
    matchIndices: Record<RaftNodeId, number | undefined>
}


enum NodeMode {
    // Uninitialized = 0,
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

// function transitionMode(currentState: NodeMode, event: ModeEvent): NodeMode {
//     switch (currentState) {
//         case NodeMode.Uninitialized:
//             switch (event) {
//                 case ModeEvent.Startup: return NodeMode.Follower
//             }
//         case NodeMode.Follower:
//             switch (event) {
//                 case ModeEvent.Timeout: return NodeMode.Candidate
//             }
//         case NodeMode.Candidate:
//             switch (event) {
//                 case ModeEvent.Timeout: return NodeMode.Candidate
//                 case ModeEvent.LeaderDiscovered: return NodeMode.Follower
//                 case ModeEvent.MajorityReceived: return NodeMode.Leader
//             }
//         case NodeMode.Leader:
//             switch (event) {
//                 case ModeEvent.LeaderDiscovered: return NodeMode.Follower
//             }
//     }

//     throw new Error("raftNode: Invalid State Transition")
// }


type BaseRaftNode<T> = {
    persistentState: TRaftNodeStatePersistent<T>,
    volatileState: TRaftNodeStateVolatile,
    leaderStateVolatile: TRaftLeaderStateVolatile,
    mode: NodeMode
}

export type TFollowerNode<T> = BaseRaftNode<T> & { mode: NodeMode.Follower }
export type TCandidateNode<T> = BaseRaftNode<T> & { mode: NodeMode.Candidate }
export type TLeaderNode<T> = BaseRaftNode<T> & { mode: NodeMode.Leader }

export type TRaftNode<T> = TFollowerNode<T> | TCandidateNode<T> | TLeaderNode<T>;

function fromLog<T>(node: TRaftNode<T>, log: TLog<T>) {
    const oldPersistentState = node.persistentState;
    return {
        ...node,
        persistentState: {
            ...oldPersistentState,
            log
        }
    };
}

function fromCommitIndex(node, commitIndex) {
    const oldVolatileState = node.volatileState;
    return {
        ...node,
        volatileState: {
            ...oldVolatileState,
            commitIndex
        }
    };
}


function fromNextIndices(node, nextIndices) {
    const oldLeaderStateVolatile = node.leaderStateVolatile;
    return {
        ...node,
        leaderStateVolatile: {
            ...oldLeaderStateVolatile,
            nextIndices
        }
    };
}


export class RaftNode {
    static fromLog = fromLog;
    static fromCommitIndex = fromCommitIndex;
    static fromNextIndices = fromNextIndices;
}
