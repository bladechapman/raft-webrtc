var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
define("rtc/client/src/lib/uuid", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    // Taken from http://stackoverflow.com/a/105074/515584
    function createUUID() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }
    exports.createUUID = createUUID;
});
define("rtc/client/src/config/ice", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    exports.PEER_CONNECTION_CONFIG = Object.freeze({
        'iceServers': [
            { 'urls': 'stun:stun.stunprotocol.org:3478' },
            { 'urls': 'stun:stun.l.google.com:19302' },
        ]
    });
});
define("rtc/client/src/rtc", ["require", "exports", "rtc/client/src/config/ice"], function (require, exports, ice_1) {
    "use strict";
    exports.__esModule = true;
    var RtcBidirectionalDataChannel = /** @class */ (function () {
        function RtcBidirectionalDataChannel(localUuid, peerUuid, serverConnection, delegate) {
            this.localUuid = localUuid;
            this.peerUuid = peerUuid;
            this.delegate = delegate;
            this.serverConnection = serverConnection;
            var peerConnection = this.peerConnection = new RTCPeerConnection(ice_1.PEER_CONNECTION_CONFIG);
            peerConnection.ondatachannel = this.gotDataChannel.bind(this);
            peerConnection.onicecandidate = this.gotIceCandidate.bind(this);
            this.outgoingChannel = peerConnection.createDataChannel(localUuid + ":" + peerUuid);
        }
        RtcBidirectionalDataChannel.prototype.createOffer = function () {
            this.peerConnection.createOffer()
                .then(this.setLocalDescription.bind(this))["catch"](function () { });
        };
        RtcBidirectionalDataChannel.prototype.send = function (payload) {
            this.outgoingChannel.send(payload);
        };
        RtcBidirectionalDataChannel.prototype.setLocalDescription = function (description) {
            var _a = this, peerConnection = _a.peerConnection, serverConnection = _a.serverConnection, localUuid = _a.localUuid, peerUuid = _a.peerUuid;
            peerConnection.setLocalDescription(description)
                .then(function () {
                serverConnection.send(JSON.stringify({
                    sdp: peerConnection.localDescription,
                    uuid: localUuid,
                    target: peerUuid
                }));
            })["catch"](function () { });
        };
        RtcBidirectionalDataChannel.prototype.gotIceCandidate = function (e) {
            var _a = this, localUuid = _a.localUuid, peerUuid = _a.peerUuid, serverConnection = _a.serverConnection;
            if (e.candidate !== null) {
                serverConnection.send(JSON.stringify({
                    ice: e.candidate,
                    uuid: localUuid,
                    target: peerUuid
                }));
            }
        };
        RtcBidirectionalDataChannel.prototype.gotDataChannel = function (e) {
            var _this = this;
            var incomingChannel = this.incomingChannel = e.channel;
            incomingChannel.onopen = function () {
                _this.delegate.channelOpened();
            };
            incomingChannel.onmessage = function (e) {
                _this.delegate.messageReceived(e);
            };
        };
        RtcBidirectionalDataChannel.prototype.gotMessageFromServer = function (message) {
            var _this = this;
            var signal = JSON.parse(message.data);
            if (signal.uuid === this.localUuid)
                return;
            if (signal.sdp) {
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(function () {
                    if (signal.sdp.type === 'offer') {
                        _this.peerConnection.createAnswer()
                            .then(_this.setLocalDescription.bind(_this))["catch"](function (e) { });
                    }
                })["catch"](function (e) { });
            }
            else if (signal.ice) {
                this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice))["catch"](function (e) { });
            }
        };
        return RtcBidirectionalDataChannel;
    }());
    exports.RtcBidirectionalDataChannel = RtcBidirectionalDataChannel;
});
define("rpc/rpc", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    function rpcRegister(uuid, send, delegate) {
        console.log('---- RPC REGISTER');
        var callIds = {};
        function rpcReceive(senderPayload) {
            if (window.online === false)
                return;
            // console.log('RPC RECEIVE', senderPayload);
            var isInvocation = senderPayload.__invoke === true;
            if (isInvocation)
                rpcRespond(senderPayload);
            else
                rpcHandleResponse(senderPayload);
        }
        function rpcHandleResponse(responsePayload) {
            var result = responsePayload.result, callId = responsePayload.callId;
            // extract the result from the payload
            var _a = callIds[callId], res = _a[0], rej = _a[1];
            delete callIds[callId];
            // resolve the promise with the result
            res(result);
        }
        function rpcRespond(senderPayload) {
            return __awaiter(this, void 0, void 0, function () {
                var method, argsString, invokerId, targetId, callId, args, result, responsePayload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            method = senderPayload.method, argsString = senderPayload.args, invokerId = senderPayload.invokerId, targetId = senderPayload.target, callId = senderPayload.callId;
                            args = JSON.parse(argsString);
                            return [4 /*yield*/, delegate[method].apply(null, args)];
                        case 1:
                            result = _a.sent();
                            responsePayload = {
                                result: result,
                                invokerId: targetId,
                                target: invokerId,
                                callId: callId,
                                __response: true,
                                rpc: true
                            };
                            send(responsePayload);
                            return [2 /*return*/];
                    }
                });
            });
        }
        function rpcInvoke(targetId, method, args) {
            var callId = Math.random(); // TODO: improve this
            var invokePayload = {
                method: method,
                args: JSON.stringify(args),
                invokerId: uuid,
                target: targetId,
                callId: callId,
                __invoke: true,
                rpc: true
            };
            // console.log('RPC INVOKE', args);
            var responsePromise = new Promise(function (res, rej) {
                // TODO: Add timeout?
                callIds[callId] = [res, rej];
            });
            // Send to receiverId with invokePayload
            send(invokePayload);
            return responsePromise;
        }
        return [rpcInvoke, rpcReceive];
    }
    exports.rpcRegister = rpcRegister;
});
define("raft-core/raftNode", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    var Mode;
    (function (Mode) {
        Mode[Mode["Follower"] = 1] = "Follower";
        Mode[Mode["Candidate"] = 2] = "Candidate";
        Mode[Mode["Leader"] = 3] = "Leader";
    })(Mode = exports.Mode || (exports.Mode = {}));
    var RaftNode = /** @class */ (function () {
        function RaftNode(persistentState, volatileState, leaderState, mode) {
            this.persistentState = persistentState;
            this.volatileState = volatileState;
            this.leaderState = leaderState;
            this.mode = mode;
        }
        RaftNode["default"] = function (id) {
            var baseEntry = new LogEntry(null, 0, 0);
            var log = new Log([baseEntry]);
            var persistentState = new PersistentState(log, 0, null, id);
            var volatileState = new VolatileState(0, 0);
            var leaderState = new LeaderState({}, {});
            return new RaftNode(persistentState, volatileState, leaderState, Mode.Follower);
        };
        RaftNode.prototype.term = function (newTerm) {
            return new RaftNode(this.persistentState.term(newTerm), this.volatileState, this.leaderState, this.mode);
        };
        RaftNode.prototype.vote = function (candidateId) {
            return new RaftNode(this.persistentState.vote(candidateId), this.volatileState, this.leaderState, this.mode);
        };
        RaftNode.prototype.discoverNewLeader = function (id) {
            return new RaftNode(this.persistentState, this.volatileState.discoverNewLeader(id), this.leaderState, this.mode);
        };
        RaftNode.prototype.command = function (newCommand, term) {
            return new RaftNode(this.persistentState.command(newCommand, term), this.volatileState, this.leaderState, this.mode);
        };
        RaftNode.prototype.sliceLog = function (startIndex, endIndex) {
            return new RaftNode(this.persistentState.sliceLog(startIndex, endIndex), this.volatileState, this.leaderState, this.mode);
        };
        RaftNode.prototype.commit = function (newIndex) {
            // console.log(this.persistentState.id, 'newCommit', newIndex);
            if (window.newCommit) {
                window.newCommit(this.persistentState.log.slice(0, newIndex + 1).entries);
            }
            return new RaftNode(this.persistentState, this.volatileState.commit(newIndex), this.leaderState, this.mode);
        };
        RaftNode.prototype.apply = function (newIndex) {
            return new RaftNode(this.persistentState, this.volatileState.apply(newIndex), this.leaderState, this.mode);
        };
        RaftNode.prototype.newNextIndex = function (peerId, newNextIndex) {
            return new RaftNode(this.persistentState, this.volatileState, this.leaderState.newNextIndex(peerId, newNextIndex), this.mode);
        };
        RaftNode.prototype.initializeNextIndices = function () {
            var nextIndices = this.leaderState.nextIndices;
            var lastLogIndex = this.persistentState.log.getLastEntry().index;
            return Object.keys(nextIndices).reduce(function (acc, peerId) {
                return acc.newNextIndex(peerId, lastLogIndex);
            }, this);
        };
        RaftNode.prototype.newMatchIndex = function (peerId, newMatchIndex) {
            return new RaftNode(this.persistentState, this.volatileState, this.leaderState.newMatchIndex(peerId, newMatchIndex), this.mode);
        };
        RaftNode.prototype.becomeLeader = function () {
            // console.log('BECOMING LEADER');
            return new RaftNode(this.persistentState, this.volatileState, this.leaderState, Mode.Leader).discoverNewLeader(this.persistentState.id);
        };
        RaftNode.prototype.becomeCandidate = function () {
            return new RaftNode(this.persistentState, this.volatileState, this.leaderState, Mode.Candidate);
        };
        RaftNode.prototype.becomeFollower = function () {
            return new RaftNode(this.persistentState, this.volatileState, this.leaderState, Mode.Follower);
        };
        return RaftNode;
    }());
    exports.RaftNode = RaftNode;
    var LogEntry = /** @class */ (function () {
        function LogEntry(command, termReceived, index) {
            this.termReceived = termReceived;
            this.command = command;
            this.index = index;
        }
        ;
        return LogEntry;
    }());
    ;
    var Log = /** @class */ (function () {
        function Log(entries) {
            this.entries = entries;
        }
        Log.prototype.length = function () {
            var entries = this.entries;
            return entries[entries.length - 1].index + 1;
        };
        Log.prototype.hasEntryAtIndex = function (index) {
            var candidate = this.entries.find(function (e) { return e.index === index; });
            return Boolean(candidate);
        };
        Log.prototype.getEntryAtIndex = function (index) {
            var candidate = this.entries.find(function (e) { return e.index === index; });
            if (!candidate)
                throw new Error('Log#getEntryAtIndex: out of bounds');
            return candidate;
        };
        Log.prototype.getLastEntry = function () {
            var length = this.length();
            return this.getEntryAtIndex(length - 1);
        };
        Log.prototype.slice = function (startIndex, endIndex) {
            // TODO: This will need to be fixed when log compaction is implemented
            var entries = this.entries;
            // const sliceStartIndex = Math.max(0, entries.findIndex(e => e.index === startIndex));
            // const sliceEndIndex = entries.findIndex(e => e.index === endIndex);
            // // const sliceEndIndex = Math.max(entries.length, entries.findIndex(e => e.index === endIndex));
            // if (sliceStartIndex >= sliceEndIndex) {
            //     console.log(sliceStartIndex, sliceEndIndex, startIndex, endIndex);
            //     throw new Error("Log#slice: invalid slice bounds");
            // }
            var newEntries = // WARNING: Runtime type coersion
             this.entries.slice(startIndex, endIndex);
            // this.entries.slice(sliceStartIndex, sliceEndIndex) as unknown as ReadonlyArrayAtLeastOne<LogEntry<T>>;
            return new Log(newEntries);
        };
        Log.prototype.command = function (newCommand, term) {
            var length = this.length();
            var entries = this.entries;
            var lastIndex = length === 0 ? -1 : entries[entries.length - 1].index;
            var newEntry = new LogEntry(newCommand, term, lastIndex + 1);
            var newEntries = // WARNING: Runtime type coersion
             this.entries.concat(newEntry);
            return new Log(newEntries);
        };
        return Log;
    }());
    ;
    var PersistentState = /** @class */ (function () {
        function PersistentState(log, term, vote, id) {
            this.currentTerm = term;
            this.votedFor = vote;
            this.id = id;
            this.log = log;
        }
        PersistentState.prototype.term = function (newTerm) {
            return new PersistentState(this.log, newTerm, this.votedFor, this.id);
        };
        PersistentState.prototype.vote = function (candidateId) {
            return new PersistentState(this.log, this.currentTerm, candidateId, this.id);
        };
        PersistentState.prototype.command = function (newCommand, term) {
            return new PersistentState(this.log.command(newCommand, term || this.currentTerm), this.currentTerm, this.votedFor, this.id);
        };
        PersistentState.prototype.sliceLog = function (startIndex, endIndex) {
            return new PersistentState(this.log.slice(startIndex, endIndex), this.currentTerm, this.votedFor, this.id);
        };
        return PersistentState;
    }());
    var VolatileState = /** @class */ (function () {
        function VolatileState(commitIndex, lastApplied, lastKnownLeader) {
            this.commitIndex = commitIndex;
            this.lastApplied = lastApplied;
            this.lastKnownLeader = lastKnownLeader;
        }
        VolatileState.prototype.commit = function (newIndex) {
            return new VolatileState(newIndex, this.lastApplied, this.lastKnownLeader);
        };
        VolatileState.prototype.apply = function (newIndex) {
            return new VolatileState(this.commitIndex, newIndex, this.lastKnownLeader);
        };
        VolatileState.prototype.discoverNewLeader = function (id) {
            return new VolatileState(this.commitIndex, this.lastApplied, id);
        };
        return VolatileState;
    }());
    var LeaderState = /** @class */ (function () {
        function LeaderState(nextIndices, matchIndices) {
            this.nextIndices = nextIndices;
            this.matchIndices = matchIndices;
        }
        LeaderState.prototype.newNextIndex = function (peerId, newNextIndex) {
            var _a;
            return new LeaderState(__assign(__assign({}, this.nextIndices), (_a = {}, _a[peerId] = newNextIndex, _a)), this.matchIndices);
        };
        LeaderState.prototype.newMatchIndex = function (peerId, newMatchIndex) {
            var _a;
            return new LeaderState(this.nextIndices, __assign(__assign({}, this.matchIndices), (_a = {}, _a[peerId] = newMatchIndex, _a)));
        };
        return LeaderState;
    }());
});
define("raft-core/lib", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    exports.Result = {
        okResult: function (data) { return { type: "Ok", data: data }; },
        failedResult: function (data) { return { type: "Failed", data: data }; },
        isOk: function (result) { return result.type === "Ok"; },
        isFailed: function (result) { return result.type === "Failed"; }
    };
    var RaftPromise = /** @class */ (function (_super) {
        __extends(RaftPromise, _super);
        function RaftPromise() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        RaftPromise.threshold = function (condition, promises) {
            var resolutions = [];
            return new Promise(function (res, rej) {
                if (promises.length === 0) {
                    res(new Map());
                }
                else {
                    promises.forEach(function (promise) {
                        promise
                            .then(function (v) {
                            resolutions.push([promise, v]);
                            var candidateFinal = new Map(resolutions);
                            if (condition(candidateFinal)) {
                                res(candidateFinal);
                            }
                            else if (resolutions.length === promises.length) {
                                // Nothing more can be done to satisfy the condition.
                                rej(candidateFinal);
                            }
                        })["catch"](function (e) {
                            rej(new Map([[promise, e]]));
                        });
                    });
                }
            });
        };
        return RaftPromise;
    }(Promise));
    exports.RaftPromise = RaftPromise;
    var isDebug = true;
    function debug(condition, message) {
        if (isDebug && condition()) {
            throw new Error(message);
        }
    }
    exports.debug = debug;
});
define("raft-core/network", ["require", "exports", "raft-core/raftNode", "raft-core/lib"], function (require, exports, raftNode_1, lib_1) {
    "use strict";
    exports.__esModule = true;
    function broadcastRequestVoteRpc(getNode, setNode, becomeFollowerCallback, rpcInvoke) {
        var node = getNode();
        var _a = node.persistentState, currentTerm = _a.currentTerm, id = _a.id, log = _a.log;
        var payload = {
            term: currentTerm,
            candidateId: id,
            lastKnownLeader: node.volatileState.lastKnownLeader,
            lastLogIndex: log.getLastEntry().index,
            lastLogTerm: log.getLastEntry().termReceived
        };
        var group = Object.keys(node.leaderState.nextIndices);
        var promises = group.map(function (peerId) {
            return rpcInvoke(peerId, "receiveRequestVote", [payload]).then(function (result) {
                var term = result.term, lastKnownLeader = result.lastKnownLeader;
                var node = getNode();
                if (term > node.persistentState.currentTerm) {
                    setNode(node.term(term).discoverNewLeader(lastKnownLeader));
                    becomeFollowerCallback();
                }
                return result;
            });
        });
        var condition = function (mapping) {
            var results = Array.from(mapping.values());
            var grantedCount = results.filter(function (result) { return result.voteGranted; }).length;
            return (grantedCount + 1) > Math.floor(group.length / 2);
        };
        return lib_1.RaftPromise.threshold(condition, promises)
            .then(function () { return true; })["catch"](function () { return false; });
    }
    exports.broadcastRequestVoteRpc = broadcastRequestVoteRpc;
    function receiveRequestVoteRpc(getNode, setNode, payload, becomeFollowerCallback // HACK
    ) {
        var node = getNode();
        var _a = node.persistentState, currentTerm = _a.currentTerm, votedFor = _a.votedFor, log = _a.log;
        var proposedTerm = payload.term, candidateId = payload.candidateId, candidateLastLogIndex = payload.lastLogIndex, candidateLastLogTerm = payload.lastLogTerm;
        var greaterTerm = currentTerm > proposedTerm ? currentTerm : proposedTerm;
        var voteGranted = ((votedFor === null || votedFor === candidateId) &&
            (proposedTerm >= currentTerm) &&
            (candidateLastLogTerm > log.getLastEntry().termReceived ||
                (candidateLastLogTerm === log.getLastEntry().termReceived &&
                    candidateLastLogIndex >= log.getLastEntry().index)));
        if (voteGranted) {
            setNode(node.vote(candidateId).term(greaterTerm));
        }
        if (proposedTerm > currentTerm) {
            setNode(node.term(greaterTerm));
            becomeFollowerCallback();
            // setNode(node.becomeFollower());
        }
        if (!voteGranted) {
            console.log('VOTE REJECTED', votedFor, candidateId);
            console.log(candidateLastLogTerm, log.getLastEntry().termReceived);
            console.log(candidateLastLogIndex, log.getLastEntry().index);
        }
        return {
            term: greaterTerm,
            voteGranted: voteGranted,
            lastKnownLeader: getNode().volatileState.lastKnownLeader
        };
    }
    exports.receiveRequestVoteRpc = receiveRequestVoteRpc;
    function broadcastAppendEntriesRpc(getNode, setNode, proposedCommands, becomeFollowerCallback, rpcInvoke) {
        var node = getNode();
        var nextIndices = node.leaderState.nextIndices;
        var _a = node.persistentState, leaderLog = _a.log, currentTerm = _a.currentTerm;
        // Include the new entries in the leader’s log
        var newNode = proposedCommands.reduce(function (acc, c) { return acc.command(c); }, node);
        setNode(newNode);
        var promises = Object.keys(nextIndices).map(function (followerId) {
            return sendAppendEntries(followerId, getNode, setNode, proposedCommands, becomeFollowerCallback, rpcInvoke);
        });
        var condition = function (resolutions) {
            var successes = Array.from(resolutions.values()).reduce(function (acc, resolution) {
                if (resolution && resolution.success)
                    return acc + 1;
                else
                    return acc;
            }, 0);
            return (successes + 1) > (promises.length / 2);
        };
        return lib_1.RaftPromise.threshold(condition, promises).then(function (v) {
            // return RaftPromise.majority(promises).then(v => {
            // TODO: We might need to be careful here. What happens
            // If the node is no longer the leader? We can probably do this by checking the term number
            //
            // DANGER: We may need to check the commit index, match index, and term here...
            // 5.3
            // A log entry is committed once the leader that created the entry has
            // replicated it on a majority of the servers.
            var node = getNode();
            setNode(node
                .commit(node.persistentState.log.getLastEntry().index));
        })["catch"](function (e) {
            console.log('BROADCAST APPEND ENTRIES EXCEPTION', e);
        });
    }
    exports.broadcastAppendEntriesRpc = broadcastAppendEntriesRpc;
    function sendAppendEntries(followerId, getNode, setNode, proposedCommands, becomeFollowerCallback, rpcInvoke) {
        var node = getNode();
        if (node.mode !== raftNode_1.Mode.Leader)
            return new Promise(function (res, rej) { return res('TEMP IMPL: NO LONGER LEADER'); });
        var _a = node.persistentState, term = _a.currentTerm, leaderId = _a.id, leaderLog = _a.log;
        var leaderCommit = node.volatileState.commitIndex;
        var nextIndices = node.leaderState.nextIndices;
        var followerNextIndex = nextIndices[followerId] || 1;
        // At this point, the leader has already included the new entries in its log
        var candidateNextIndex = leaderLog.length();
        var prevLogIndex = followerNextIndex - 1;
        var prevLogTerm = prevLogIndex === -1
            ? null
            : leaderLog.getEntryAtIndex(prevLogIndex).termReceived;
        var newEntriesForFollower = leaderLog.slice(followerNextIndex, leaderLog.length()).entries;
        var payload = {
            term: term,
            leaderId: leaderId,
            prevLogIndex: prevLogIndex,
            prevLogTerm: prevLogTerm,
            entries: newEntriesForFollower,
            leaderCommit: leaderCommit
        };
        return rpcInvoke(followerId, 'receiveAppendEntries', [payload])
            .then(function (result) {
            var currentNode = getNode();
            var currentTerm = currentNode.persistentState.currentTerm;
            var success = result.success, term = result.term, lastKnownLeader = result.lastKnownLeader;
            if (term > currentTerm) {
                setNode(currentNode.term(term).discoverNewLeader(lastKnownLeader));
                becomeFollowerCallback();
                // TODO: I guess if we’re no longer leader, just throw out the response...
                return 'TEMP IMPL: NO LONGER LEADER 2';
            }
            // if (Result.isOk(result)) {
            // const { data } = result;
            // const { success, term } = data;
            if (success) {
                // The log entry has been replicated on the follower.
                // Update the match index for this node.
                var matchIndices = currentNode.leaderState.matchIndices;
                var newMatchIndex = newEntriesForFollower[newEntriesForFollower.length - 1].index;
                var newNode = currentNode
                    .newMatchIndex(followerId, newMatchIndex)
                    .newNextIndex(followerId, candidateNextIndex);
                setNode(newNode);
                return result;
            }
            else {
                // 5.3
                // After a rejection, the leader decrements nextIndex and retries
                // the AppendEntries RPC
                var nextIndices_1 = currentNode.leaderState.nextIndices;
                var nextIndex = nextIndices_1[followerId] || 2;
                var newNextIndex = nextIndex - 1; // the lowest possible nextIndex is 1
                // debug(
                //     () => newNextIndex < 0,
                //     "Next index < 0"
                // );
                setNode(currentNode.newNextIndex(followerId, newNextIndex));
                return sendAppendEntries(followerId, getNode, setNode, proposedCommands, becomeFollowerCallback, rpcInvoke);
            }
            // }
            // else {
            //     // 5.3 
            //     // If followers crash or run slowly, or if network packets are lost,
            //     // the leader retries AppendEntries RPCs indefinitely.
            //     return sendAppendEntries(followerId, getNode, setNode, proposedCommands);
            // }
        });
    }
    function receiveAppendEntriesRpc(getNode, setNode, payload, becomeFollowerCallback // hack
    ) {
        var node = getNode();
        var leaderTerm = payload.term, prevLogIndex = payload.prevLogIndex, prevLogTerm = payload.prevLogTerm, entries = payload.entries, receivedLeaderCommit = payload.leaderCommit, leaderId = payload.leaderId;
        var _a = node.persistentState, receiverTerm = _a.currentTerm, log = _a.log, id = _a.id;
        var commitIndex = node.volatileState.commitIndex;
        var success = (leaderTerm >= receiverTerm &&
            log.hasEntryAtIndex(prevLogIndex) && log.getEntryAtIndex(prevLogIndex).termReceived === prevLogTerm);
        if (success) {
            var newNode = node.sliceLog(0, prevLogIndex + 1);
            newNode = entries.reduce(function (node, entry) {
                var termReceived = entry.termReceived, command = entry.command;
                return node.command(command, termReceived);
            }, newNode);
            setNode(newNode);
            if (receivedLeaderCommit > commitIndex) {
                var newCommitIndex = newNode.persistentState.log.getLastEntry().index;
                setNode(newNode.commit(newCommitIndex));
            }
            setNode(newNode.discoverNewLeader(leaderId));
            becomeFollowerCallback();
        }
        if (leaderTerm > receiverTerm) {
            setNode(node.term(leaderTerm));
        }
        return {
            success: success,
            term: getNode().persistentState.currentTerm,
            lastKnownLeader: getNode().volatileState.lastKnownLeader
        };
    }
    exports.receiveAppendEntriesRpc = receiveAppendEntriesRpc;
});
define("raft-core/api", ["require", "exports", "raft-core/raftNode", "raft-core/network", "rpc/rpc"], function (require, exports, raftNode_2, network_1, rpc_1) {
    "use strict";
    exports.__esModule = true;
    function useTimer() {
        var handle;
        function setTimer(callback, timeout) {
            clearTimeout(handle);
            var t = timeout || Math.random() * 1000 + 5000;
            handle = setTimeout(callback, t);
        }
        function clearTimer() {
            clearTimeout(handle);
        }
        return [setTimer, clearTimer];
    }
    function useNode(uuid, sendSerialized) {
        function setNode(newNode) {
            node = newNode;
            return node;
        }
        function getNode() {
            return node;
        }
        var _a = useTimer(), setFollowerTimer = _a[0], clearFollowerTimer = _a[1];
        var _b = useTimer(), setCandidateTimer = _b[0], clearCandidateTimer = _b[1];
        var _c = useTimer(), setLeaderTimer = _c[0], clearLeaderTimer = _c[1];
        var _d = rpc_1.rpcRegister(uuid, sendSerialized, {
            'receiveRequestVote': function (payload) {
                return network_1.receiveRequestVoteRpc(getNode, setNode, payload, function () {
                    step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeFollower');
                });
            },
            'receiveAppendEntries': function (payload) {
                clearFollowerTimer();
                var r = network_1.receiveAppendEntriesRpc(getNode, setNode, payload, function () {
                    step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeFollower');
                });
                return r;
            },
            'receiveClientRequest': function (payload) {
                var data = payload.data;
                // If we're the leader, return the result of broadcasting append entries rpc
                if (getNode().mode === raftNode_2.Mode.Leader) {
                    return network_1.broadcastAppendEntriesRpc(getNode, setNode, [data], function () {
                        step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeFollower');
                    }, rpcInvoke);
                }
                // If we're not the leader, just eject and forward the leader info
                else {
                    return { status: 'INCORRECT LEADER', data: node.volatileState.lastKnownLeader };
                }
            }
        }), rpcInvoke = _d[0], rpcReceive = _d[1];
        var node = raftNode_2.RaftNode["default"](uuid);
        return [
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            [rpcInvoke, rpcReceive]
        ];
    }
    exports.useNode = useNode;
    function step(_a, _b, _c, _d, _e, event) {
        var getNode = _a[0], setNode = _a[1];
        var setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var rpcInvoke = _e[0], rpcReceive = _e[1];
        var mode = getNode().mode;
        var args = [
            [getNode, setNode],
            [setFollowerTimer, clearFollowerTimer],
            [setCandidateTimer, clearCandidateTimer],
            [setLeaderTimer, clearLeaderTimer],
            [rpcInvoke, rpcReceive]
        ];
        // console.log('STEP', event);
        if (event === 'BecomeFollower')
            becomeFollower.apply(null, args);
        else if (event === 'FollowerTimeout')
            followerTimeout.apply(null, args);
        else if (event === 'BecomeCandidate')
            becomeCandidate.apply(null, args);
        else if (event === 'CandidateTimeout')
            candidateTimeout.apply(null, args);
        else if (event === 'BecomeLeader')
            becomeLeader.apply(null, args);
        else
            throw new Error("step: Invalid event " + event);
    }
    exports.step = step;
    function handleClientRequest(_a, _b, becomeFollowerCallback, data) {
        var getNode = _a[0], setNode = _a[1];
        var rpcInvoke = _b[0], rpcReceive = _b[1];
        // Forward the client request to the expected leader
        //
        // Expected leader handles client request, responds to initial request with whether or not
        // it was actually the leader
        //
        // If not the actual leader, use the returned last known leader to try again. If no last known leader, pick a random node and try again.
        var node = getNode();
        var volatileState = node.volatileState, persistentState = node.persistentState;
        var maybeLastKnownLeader = volatileState.lastKnownLeader;
        if (!maybeLastKnownLeader) {
            return new Promise(function (res, rej) { return res({ status: 'UNKNOWN LEADER' }); });
        }
        else if (window.online !== false) {
            if (maybeLastKnownLeader === persistentState.id) {
                console.log('HANDLING AS LEADER');
                // invoke append entries as leader
                return network_1.broadcastAppendEntriesRpc(getNode, setNode, [data], becomeFollowerCallback, rpcInvoke);
            }
            else {
                console.log('FORWARDING');
                return rpcInvoke(maybeLastKnownLeader, 'receiveClientRequest', [{ command: 'append', data: data }]);
            }
        }
        else {
            return new Promise(function (res, rej) { return 'offline'; });
        }
    }
    exports.handleClientRequest = handleClientRequest;
    function becomeFollower(_a, _b, _c, _d, _e) {
        var getNode = _a[0], setNode = _a[1];
        var setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var rpcInvoke = _e[0], rpcReceive = _e[1];
        var node = getNode();
        clearLeaderTimer();
        clearCandidateTimer();
        clearFollowerTimer();
        setNode(node.becomeFollower());
        setFollowerTimer(function () {
            console.log('FOLLOWER TIMEOUT EXPIRED');
            step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'FollowerTimeout');
        });
    }
    function followerTimeout(_a, _b, _c, _d, _e) {
        var getNode = _a[0], setNode = _a[1];
        var setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var rpcInvoke = _e[0], rpcReceive = _e[1];
        step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeCandidate');
    }
    function becomeCandidate(_a, _b, _c, _d, _e) {
        var getNode = _a[0], setNode = _a[1];
        var setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var rpcInvoke = _e[0], rpcReceive = _e[1];
        var node = getNode();
        clearLeaderTimer();
        clearCandidateTimer();
        clearFollowerTimer();
        setNode(node
            .term(node.persistentState.currentTerm + 1)
            .vote(null)
            .becomeCandidate());
        console.log("NEW CANDIDATE: " + getNode().persistentState.id, getNode().persistentState.currentTerm);
        if (window.online !== false) {
            network_1.broadcastRequestVoteRpc(getNode, setNode, function () {
                console.log('becomeCandidate: BECOME FOLLOWER INVOKED');
                step.apply(null, [
                    [getNode, setNode],
                    [setFollowerTimer, clearFollowerTimer],
                    [setCandidateTimer, clearCandidateTimer],
                    [setLeaderTimer, clearLeaderTimer],
                    [rpcInvoke, rpcReceive],
                    'BecomeFollower'
                ]);
            }, rpcInvoke).then(function (majorityGranted) {
                if (majorityGranted) {
                    setNode(getNode().initializeNextIndices());
                    console.log("NEW LEADER: " + getNode().persistentState.id, getNode().persistentState.currentTerm);
                    step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeLeader');
                }
            });
        }
        setCandidateTimer(function () {
            step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'CandidateTimeout');
        });
    }
    function candidateTimeout(_a, _b, _c, _d, _e) {
        var getNode = _a[0], setNode = _a[1];
        var setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var rpcInvoke = _e[0], rpcReceive = _e[1];
        step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeCandidate');
    }
    function becomeLeader(_a, _b, _c, _d, _e) {
        var getNode = _a[0], setNode = _a[1];
        var setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var rpcInvoke = _e[0], rpcReceive = _e[1];
        var node = getNode();
        clearLeaderTimer();
        clearCandidateTimer();
        clearFollowerTimer();
        setNode(node.becomeLeader());
        // TODO: fix the heartbeat type
        if (window.online !== false) {
            network_1.broadcastAppendEntriesRpc(getNode, setNode, ["heartbeat-" + Date.now()], function () {
                console.log('becomeLeader: BECOME FOLLOWER INVOKED');
                step.apply(null, [
                    [getNode, setNode],
                    [setFollowerTimer, clearFollowerTimer],
                    [setCandidateTimer, clearCandidateTimer],
                    [setLeaderTimer, clearLeaderTimer],
                    [rpcInvoke, rpcReceive],
                    'BecomeFollower'
                ]);
            }, rpcInvoke);
        }
        setLeaderTimer(function () {
            step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeLeader');
        }, 1000 + Math.random() * 1000);
    }
});
define("rtc/client/src/main", ["require", "exports", "rtc/client/src/lib/uuid", "rtc/client/src/rtc", "raft-core/api"], function (require, exports, uuid_1, rtc_1, api_1) {
    "use strict";
    exports.__esModule = true;
    document.addEventListener('DOMContentLoaded', function () {
        console.log('DOM READY');
        main();
    });
    window.online = true;
    window.takeOffline = function () {
        window.online = false;
        document.getElementById('offline').disabled = true;
        document.getElementById('online').disabled = false;
    };
    window.takeOnline = function () {
        window.online = true;
        document.getElementById('online').disabled = true;
        document.getElementById('offline').disabled = false;
    };
    function main() {
        var _this = this;
        document.getElementById('online').disabled = true;
        var uuid = uuid_1.createUUID();
        var serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
        var dataChannels = new Map();
        var nodeFns = api_1.useNode(uuid, function (payload) {
            var target = payload.target;
            var channel = dataChannels.get(target);
            channel.send(JSON.stringify(payload));
        });
        var _a = nodeFns[0], getNode = _a[0], setNode = _a[1];
        var _b = nodeFns[1], setFollowerTimer = _b[0], clearFollowerTimer = _b[1];
        var _c = nodeFns[2], setCandidateTimer = _c[0], clearCandidateTimer = _c[1];
        var _d = nodeFns[3], setLeaderTimer = _d[0], clearLeaderTimer = _d[1];
        var _e = nodeFns[4], rpcInvoke = _e[0], rpcReceive = _e[1];
        serverConnection.onmessage = function (message) {
            var parsed = JSON.parse(message.data);
            if (parsed.discover) {
                // Create a RtcBidirectionalDataChannel for each discovered peer
                // Send offers to each new peer via the signaling server
                registerDataChannels(uuid, parsed.discover, dataChannels, serverConnection, rpcReceive).forEach(function (channel) {
                    channel.createOffer();
                });
            }
            else if (parsed.sdp && parsed.sdp.type === 'offer') {
                // Create a new RtcBidirectionalDataChannel for the offering peer and
                // forward this message to that new channel.
                //
                // This will send answer to offering peer via the signaling server
                // Once the offer is answered, the peers should have everything
                // they need to establish a peer connection.
                var peerUuid = parsed.uuid;
                var channel = registerDataChannels(uuid, [peerUuid], dataChannels, serverConnection, rpcReceive).forEach(function (channel) {
                    channel.gotMessageFromServer(message);
                });
            }
            else if (parsed.sdp ||
                parsed.ice) {
                // At this point, the RtcBidirectionalDataChannel should be created,
                // so simply forward message handling to RtcBidirectionalDataChannel
                var channel = dataChannels.get(parsed.uuid);
                if (!channel)
                    throw new Error('No channel exists!');
                channel.gotMessageFromServer(message);
            }
        };
        // ===========
        // ===========
        // ===========
        window.call = function () {
            serverConnection.send(JSON.stringify({ 'register': true, uuid: uuid }));
            document.getElementById('call').disabled = true;
            document.getElementById('begin').disabled = false;
        };
        window.send = function () {
            var submissionElem = document.getElementById('submission');
            if (submissionElem) {
                var text = submissionElem.value;
                var r = api_1.handleClientRequest([getNode, setNode], [rpcInvoke, rpcReceive], function () {
                    api_1.step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeFollower');
                }, text);
                r.then(function (e) { return console.log('COMPLETE', e); });
            }
        };
        window.beginRaft = function () {
            window.handleBegin();
            window.broadcastBegin();
        };
        window.broadcastBegin = function () {
            Array.from(dataChannels.values()).forEach(function (channel) {
                channel.send(JSON.stringify({ raftBegin: true }));
            });
        };
        window.handleBegin = function () {
            document.getElementById('begin').disabled = true;
            document.getElementById('send').disabled = false;
            Array.from(dataChannels.keys()).forEach(function (peerId) {
                setNode(getNode().newNextIndex(peerId, 1));
            });
            setTimeout(function () { api_1.step.apply(null, __spreadArrays(nodeFns, ['BecomeFollower'])); }, 2500);
        };
        window.newCommit = function (commits) {
            var elems = commits
                .map(function (e) { return e.command; })
                .filter(function (e) { return e !== null && e.indexOf('heartbeat') === -1; })
                .map(function (e) { return "<div>" + e + "</div>"; }).join('');
            document.getElementById('history').innerHTML = elems;
        };
        window.benchmark = function () { return __awaiter(_this, void 0, void 0, function () {
            var on, counter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        on = true;
                        counter = 0;
                        setTimeout(function () { on = false; }, 1000 * 10);
                        _a.label = 1;
                    case 1:
                        if (!on) return [3 /*break*/, 3];
                        return [4 /*yield*/, api_1.handleClientRequest([getNode, setNode], [rpcInvoke, rpcReceive], function () {
                                api_1.step([getNode, setNode], [setFollowerTimer, clearFollowerTimer], [setCandidateTimer, clearCandidateTimer], [setLeaderTimer, clearLeaderTimer], [rpcInvoke, rpcReceive], 'BecomeFollower');
                            }, "" + counter).then(function () { return (counter = counter + 1); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        console.log('BENCHMARK COMPLETE');
                        window.lastBench = counter;
                        return [2 /*return*/];
                }
            });
        }); };
    }
    function registerDataChannels(uuid, peerUuids, dataChannels, serverConnection, rpcReceive) {
        // Create a RtcBidirectionalDataChannel for each discovered peer
        // Send offers to each new peer via the signaling server
        return peerUuids.map(function (peerUuid) {
            var channel = new rtc_1.RtcBidirectionalDataChannel(uuid, peerUuid, serverConnection, {
                channelOpened: function () { console.log("Opened channel for " + peerUuid); },
                messageReceived: function (m) {
                    var parsed = JSON.parse(m.data);
                    if (parsed.raftBegin) {
                        window.handleBegin();
                    }
                    else
                        rpcReceive(JSON.parse(m.data));
                }
            });
            dataChannels.set(peerUuid, channel);
            return channel;
        });
    }
});
