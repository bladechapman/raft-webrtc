import { Log } from '../log';
import { TRaftNode, NodeMode, RaftNode, TLeaderNode } from '../raftNode';
import {
    broadcastRequestVoteRpc,
    receiveRequestVoteRpc,
    broadcastAppendEntriesRpc,
    receiveAppendEntriesRpc
} from '../network';
import { rpcRegister } from '../rpc';

function useNode(): [
    () => TRaftNode<string>,
    (newNode: TRaftNode<string>) => TRaftNode<string>
] {
    let node: TRaftNode<string> = {
        persistentState: {
            currentTerm: 0,
            votedFor: null,
            log: Log.withCommands(
                Log.getLog(),
                0,
                ['noop']
            ),
            id: null
        },
        volatileState: {
            commitIndex: null,
            lastApplied: null
        },
        leaderStateVolatile: {
            nextIndices: {},
            matchIndices: {}
        },
        mode: NodeMode.Follower
    };

    function setNode(newNode: TRaftNode<string>) {
        node = newNode;
        return node;
    }

    function getNode() {
        return node;
    }

    const [rpcId, rpcGroup] = rpcRegister({
        'receiveRequestVote': (payload) => {
            return receiveRequestVoteRpc(
                getNode,
                setNode,
                payload
            );
        },


        'receiveAppendEntries': (payload) => {
            return receiveAppendEntriesRpc(
                getNode,
                setNode,
                payload
            );
        }
    });
    node.persistentState.id = rpcId as number;

    return [getNode, setNode];
}



if (require.main === module) {
    const [getA, setA] = useNode();
    const [getB, setB] = useNode();
    const [getC, setC] = useNode();


    // HACK in order to synchronize the node ids
    // I need to find a way to reconcile this

    const idA = getA().persistentState.id;
    const idB = getB().persistentState.id;
    const idC = getC().persistentState.id;

    getA().leaderStateVolatile.nextIndices = {
        [idB]: 1,
        [idC]: 1
    };
    getB().leaderStateVolatile.nextIndices = {
        [idA]: 1,
        [idC]: 1
    };
    getC().leaderStateVolatile.nextIndices = {
        [idA]: 1,
        [idB]: 1
    };
    
    // HACK end

    console.log('A', idA);
    console.log('B', idB);
    console.log('C', idC);

    // Fake A as leader
    getA().mode = NodeMode.Leader;

    console.log('==== C requests vote');
    requestVote(getC, setC).then(() => {

        // Assume C became leader for now
        const a = broadcastAppendEntriesRpc(getC as () => TLeaderNode<string>, setC, ['c-append']).then(() => {


        })
        .catch(e => {
            console.log(e);
        })

        // Assume C became leader for now
        const b = broadcastAppendEntriesRpc(getC as () => TLeaderNode<string>, setC, ['c-append-2']).then(() => {

//             console.log(getA());
//             console.log(getB());
//             console.log(getC());

        })
        .catch(e => {
            console.log(e);
        })


        Promise.all([a, b]).then(() => {
            // console.log(getA().persistentState.log.entries);
            // console.log(getB().persistentState.log.entries);
            // console.log(getC().persistentState.log.entries);


            // Assume C became leader for now
            broadcastAppendEntriesRpc(getC as () => TLeaderNode<string>, setC, ['c-append-3']).then(() => {

                console.log(getA().persistentState.log.entries);
                console.log(getB().persistentState.log.entries);
                console.log(getC().persistentState.log.entries);

            })
            .catch(e => {
                console.log(e);
            })
        })


//         console.log('simulate append entries')
//         setC(RaftNode.fromLog(getC(), Log.withCommands(getC().persistentState.log, getC().persistentState.currentTerm, ['noop'])));
//         setA(RaftNode.fromLog(getA(), Log.withCommands(getA().persistentState.log, getA().persistentState.currentTerm, ['noop'])));
//         setB(RaftNode.fromLog(getB(), Log.withCommands(getB().persistentState.log, getB().persistentState.currentTerm, ['noop'])));
//         getA().mode = NodeMode.Follower;

//         console.log('==== A requests vote')
//         requestVote(getA, setA).then(() => {
//             console.log('A', getA().mode);
//             console.log('B', getB().mode);
//             console.log('C', getC().mode);
//         });

    });
}

function requestVote(getNode, setNode) {
    getNode().persistentState.currentTerm += 1;
    getNode().mode = NodeMode.Candidate;
    return broadcastRequestVoteRpc(getNode, setNode).then(majorityGranted => {
        if (majorityGranted) {
            getNode().mode = NodeMode.Leader;
        }
    });
}
