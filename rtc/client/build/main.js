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
define("rtc", ["require", "exports", "config/ice", "lib/uuid"], function (require, exports, ice_1, uuid_1) {
    "use strict";
    exports.__esModule = true;
    var RtcBidirectionalDataChannel = /** @class */ (function () {
        function RtcBidirectionalDataChannel(uuid, delegate) {
            this.uuid = uuid;
            this.delegate = delegate;
            var peerConnection = this.peerConnection = new RTCPeerConnection(ice_1.PEER_CONNECTION_CONFIG);
            var serverConnection = this.serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
            peerConnection.ondatachannel = this.gotDataChannel.bind(this);
            peerConnection.onicecandidate = this.gotIceCandidate.bind(this);
            this.outgoingChannel = peerConnection.createDataChannel(uuid + ":" + uuid_1.createUUID());
            serverConnection.onmessage = this.gotMessageFromServer.bind(this);
        }
        RtcBidirectionalDataChannel.prototype.createOffer = function () {
            this.peerConnection.createOffer()
                .then(this.setLocalDescription.bind(this))["catch"](function () { });
        };
        RtcBidirectionalDataChannel.prototype.send = function (payload) {
            this.outgoingChannel.send(payload);
        };
        RtcBidirectionalDataChannel.prototype.setLocalDescription = function (description) {
            var _a = this, peerConnection = _a.peerConnection, serverConnection = _a.serverConnection, uuid = _a.uuid;
            peerConnection.setLocalDescription(description)
                .then(function () {
                serverConnection.send(JSON.stringify({ sdp: peerConnection.localDescription, uuid: uuid }));
            })["catch"](function () { });
        };
        RtcBidirectionalDataChannel.prototype.gotIceCandidate = function (e) {
            var _a = this, uuid = _a.uuid, serverConnection = _a.serverConnection;
            if (e.candidate !== null) {
                serverConnection.send(JSON.stringify({ 'ice': e.candidate, uuid: uuid }));
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
            if (signal.uuid === this.uuid)
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
define("main", ["require", "exports", "lib/uuid", "rtc"], function (require, exports, uuid_2, rtc_1) {
    "use strict";
    exports.__esModule = true;
    document.addEventListener('DOMContentLoaded', function () {
        console.log('DOM READY');
        main();
    });
    function main() {
        var uuid = uuid_2.createUUID();
        var channel = new rtc_1.RtcBidirectionalDataChannel(uuid, {
            channelOpened: function () { },
            messageReceived: function (m) { console.log(m); }
        });
        window.start = function () {
            console.log('START');
            channel.createOffer();
        };
        window.send = function () {
            var submissionElem = document.getElementById('submission');
            if (submissionElem) {
                var text = submissionElem.value;
                channel.send(text);
            }
        };
    }
});
