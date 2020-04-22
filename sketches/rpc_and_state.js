
/**

currentState = Uninitialized

newState = transitionMode(currentState, Startup) // Follower

**/


/**

useNode = configureRaft({
    rpcConfig
    _randomSeed
})


raftNode = FollowerNode
useNode(raftNode, (oldNode, event) => {
    if oldState === Follower && event === Timeout {
        useNode(candidateFrom(oldNode)
    }
})

function nodeCallback(oldNode, event) => {
    if (oldState === Follower && event === Timeout) {
        const candidate = candidateFrom(oldNode);
        useNode(candidate, nodeCallback);
        invokeRequestVote(candidate);
    }

    if (oldState === Candidate && event === Timeout) {
        const candidate = candidateFrom(oldNode);
        useNode(candidate, nodeCallback);
        invokeRequestVote(candidate);
    }

    if (oldState === Candidate && event === LeaderDiscovered) {
        const follower = followerFrom(oldNode);
        useNode(follower, nodeCallback)
    }

    if (oldState === Candidate && event === MajorityReceived) {
        const leader = leaderFrom(oldNode);
        useNode(leader, nodeCallback)
    }
}



useNode needs to
- Handle setting timeouts
- Receiving RPCs

candidateFrom needs to
- Handle incrementing term counts
**/

/**

useNode(newNode, callback) {
    if (newNode type === Leader) 
        broadcastHeartbeat(newNode, callback)

}

**/


/**


/**

function broadcastHeartbeat(node, group) {
    group.map(async member => await requestVote(node, member))

}





useNode(() => {

})


function initNode() {
    let node = FollowerNode
    let followerTimeout
    let candidateTimeout
    let leaderHeartbeat


    [requestVote, sendHeartbeat] = registerRpc(callback) {
        function requestVote() {
            sendSomeRequest.then(response => {
                event = // use node and response type to determine event
                callback(event)
            });
        }

        function sendHearbeat() {
            sendSomeRequest.then(response => {
                event = // use node and response type to determine event
                callback(event)
            });
        }

        function setUpSomeListeners(configuration) {
            doSomeWork(() => {
                event = // use node and response type to determine event
                callback(event)
            })
        }


        return [requestVote, sendHeartbeat]
    }


    function step(event) {
        if node === FollowerNode && (event === Startup || event === Heartbeat)
            followerTimeout = setTimeout(() => {
                step(FollowerTimeout)
            }, followerTimeout)
        if node === FollowerNode && event === FollowerTimeout
            // start election
            node = candidateFrom(node)
            requestVote(node, step)
            candidateTimeout = setTimeout(() => {
                step(CandidateTimeout)
            }, candidateTimeout)
        if node === FollowerNode && event === ReceivedHeartbeat
            clearTimeout(followerTimeout)
            step(Heartbeat)


        if node === Candidate && event === CandidateTimeout
            node = candidateFrom(node)
            requestVote(node, step)
            candidateTimeout = setTimeout(() => {
                step(CandidateTimeout)
            }, candidateTimeout)
        if node === Candidate && event === LeaderDiscovered
            clearTimeout(candidateTimeout)
            node = followerFrom(node)
            step(Heartbeat)
        if node === Candidate && event === MajorityReceived
            clearTimeout(candidateTimeout)
            node = leaderFrom(node)
            step(Heartbeat)


        if node === Leader && event === Heartbeat
            leaderTimeout = setTimeout(() => {
                step(Heartbeat)
                sendHeartbeat(node, step)
            }, leaderTimeout)
        if node === Leader && event === LeaderDiscovered
            clearTimeout(leaderTimeout)
            node = followerFrom(node)
            step(Heartbeat)
    }

    step(Startup)
    registerRpc(step)   // this will invoke step with remote incoming events
}


**/
