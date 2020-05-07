import { Log } from '../log';
import { TRaftNode, NodeMode, RaftNode } from '../raftNode';
import { broadcastRequestVoteRpc, receiveRequestVoteRpc } from '../network';
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
        // console.log('A', getA());
        // console.log('B', getB());
        // console.log('C', getC());

        console.log('simulate append entries')
        setC(RaftNode.fromLog(getC(), Log.withCommands(getC().persistentState.log, getC().persistentState.currentTerm, ['noop'])));
        setA(RaftNode.fromLog(getA(), Log.withCommands(getA().persistentState.log, getA().persistentState.currentTerm, ['noop'])));
        setB(RaftNode.fromLog(getB(), Log.withCommands(getB().persistentState.log, getB().persistentState.currentTerm, ['noop'])));
        getA().mode = NodeMode.Follower;

        console.log('==== A requests vote')
        requestVote(getA, setA).then(() => {
            console.log('A', getA().mode);
            console.log('B', getB().mode);
            console.log('C', getC().mode);
        });

    });
    // getC().persistentState.currentTerm += 1;
    // broadcastRequestVoteRpc(getC, setC).then((v) => {
    //     console.log(v)

    //     // TODO: Actually handle mode changes
    //     console.log(getA());
    //     console.log(getB());
    //     console.log(getC());
    // });
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
