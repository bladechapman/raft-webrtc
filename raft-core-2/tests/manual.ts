import { RaftNode } from '../raftNode';
import {
    broadcastRequestVoteRpc,
    receiveRequestVoteRpc,
    broadcastAppendEntriesRpc,
    receiveAppendEntriesRpc
} from '../network';
import { rpcRegister } from '../../raft-draft/rpc';

function useNode(): [
    () => RaftNode<string>,
    (newNode: RaftNode<string>) => RaftNode<string>
] {
    function setNode(newNode: RaftNode<string>) {
        node = newNode;
        return node;
    }

    function getNode() {
        return node;
    }

    const [rpcId] = rpcRegister({
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

    let node = RaftNode.default<string>(rpcId);

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

    setA(
        getA()
        .newNextIndex(idB, 1)
        .newNextIndex(idC, 1)
    );

    setB(
        getB()
        .newNextIndex(idA, 1)
        .newNextIndex(idC, 1)
    );

    setC(
        getC()
        .newNextIndex(idA, 1)
        .newNextIndex(idB, 1)
    )
    
    // HACK end

    console.log('A', idA);
    console.log('B', idB);
    console.log('C', idC);

    // Fake A as leader
    setA(getA().becomeLeader());

    console.log('==== C requests vote');
    requestVote(getC, setC).then(() => {

        // Assume C became leader for now
        const a = broadcastAppendEntriesRpc(getC, setC, ['c-append']).then(() => {


        })
        .catch(e => {
            console.log(e);
        })

        // Assume C became leader for now
        const b = broadcastAppendEntriesRpc(getC, setC, ['c-append-2']).then(() => {

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
            broadcastAppendEntriesRpc(getC, setC, ['c-append-3']).then(() => {

                console.log(getA().persistentState.log);
                console.log(getB().persistentState.log);
                console.log(getC().persistentState.log);

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
    const node = getNode();
    setNode(
        node
        .term(node.persistentState.currentTerm + 1)
        .becomeCandidate()
    );

    return broadcastRequestVoteRpc(getNode, setNode).then(majorityGranted => {
        if (majorityGranted) {
            setNode(getNode().becomeLeader());
        }
    });
}
