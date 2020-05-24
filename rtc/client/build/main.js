define("lib/uuid", ["require", "exports"], function (require, exports) {
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
define("config/ice", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    exports.PEER_CONNECTION_CONFIG = Object.freeze({
        'iceServers': [
            { 'urls': 'stun:stun.stunprotocol.org:3478' },
            { 'urls': 'stun:stun.l.google.com:19302' },
        ]
    });
});
define("rtc", ["require", "exports", "config/ice"], function (require, exports, ice_1) {
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
            console.log('SENDING', payload);
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
define("main", ["require", "exports", "lib/uuid", "rtc"], function (require, exports, uuid_1, rtc_1) {
    "use strict";
    exports.__esModule = true;
    document.addEventListener('DOMContentLoaded', function () {
        console.log('DOM READY');
        main();
    });
    function main() {
        var uuid = uuid_1.createUUID();
        // const channel = new RtcBidirectionalDataChannel(uuid, {
        //     channelOpened: () => {},
        //     messageReceived: (m) => { console.log(m) }
        // });
        // (window as any).start = () => {
        //     console.log('START')
        //     channel.createOffer();
        // }
        var serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
        var dataChannels = new Map();
        window.start = function () {
            serverConnection.send(JSON.stringify({ 'register': true, uuid: uuid }));
        };
        serverConnection.onmessage = function (message) {
            var parsed = JSON.parse(message.data);
            if (parsed.discover) {
                // Create a RtcBidirectionalDataChannel for each discovered peer
                // Send offers to each new peer via the signaling server
                var peerUuids = parsed.discover;
                peerUuids.forEach(function (peerUuid) {
                    var channel = new rtc_1.RtcBidirectionalDataChannel(uuid, peerUuid, serverConnection, {
                        channelOpened: function () { console.log("Opened channel for " + peerUuid); },
                        messageReceived: function (m) { console.log("Message received from " + peerUuid + " - " + m); }
                    });
                    dataChannels.set(peerUuid, channel);
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
                var peerUuid_1 = parsed.uuid;
                var channel = new rtc_1.RtcBidirectionalDataChannel(uuid, peerUuid_1, serverConnection, {
                    channelOpened: function () { console.log("Opened channel for " + peerUuid_1); },
                    messageReceived: function (m) { console.log("Message received from " + peerUuid_1 + " - " + m); }
                });
                dataChannels.set(peerUuid_1, channel);
                channel.gotMessageFromServer(message);
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
        window.send = function () {
            var submissionElem = document.getElementById('submission');
            if (submissionElem) {
                var text_1 = submissionElem.value;
                // console.log(dataChannels);
                // console.log(Array.from(dataChannels.values()));
                Array.from(dataChannels.values()).forEach(function (channel) {
                    channel.send(text_1);
                });
            }
        };
        // serverConnection.onmessage = (message) => {
        //     const parsed = JSON.parse(message.data);
        //     if (parsed.discovery || parsed.offer) {
        //         // Create new RTC channels for 
        //     }
        // }
    }
});
