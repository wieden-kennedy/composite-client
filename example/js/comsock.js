(function(base, factory) {

    // RequireJS
    if (typeof define === "function" && define.amd) {
        define(factory);

    // CommonJS
    } else if (typeof exports === "object") {
          module.exports = factory();

    // Global Space
    } else {
        base.ComSock = factory();
    }

}(this, function() {

    // Loading dependencies
    var SockJS = window.SockJS ? window.SockJS : require('sockjs'),
        Stomp = window.Stomp ? window.Stomp : require('stompjs');

    if (!SockJS || !Stomp) {
        throw new Error('SockJS and StompJS are required in order to use the Comsock library.');
    }

    var sockjs,
        client,
        mqUrl,
        di = 0,
        username = "admin",
        password = "password",
        mqInit = '/app/init',
        mqMessage = '/user/queue/device';

    function ComSock() {
        this.session = null;
        this.sessionData = null;
        this.uuid = null;
        this.deviceIndex = null;
        this.subscription = null;
        this.id = null;
    }

    ComSock.prototype.connect = function(url) {
        if (!url) {
            throw new Error('Please provide a endpoint url to the composite server.');
        } else {
            mqUrl = url;
        }
        sockjs = new SockJS(url);
        client = Stomp.over(sockjs);
        client.debug = false;
        client.heartbeat.outgoing = 10000;
        client.heartbeat.incoming = 10000;
        var onConnect = this.onConnect.bind(this);
        var onConnectError = this.onConnectError.bind(this);
        client.connect(
            username,
            password,
            onConnect,
            onConnectError
        );
    };

    ComSock.prototype.onConnect = function(message) {
        var id = this.subscribe(mqMessage);
        this.sendMessage({
            'type': 'init'
        }, mqInit, {});
        this.id = id;
        if (this.messageCallback) {
            this.messageCallback(message);
        }
    };

    ComSock.prototype.onConnectError = function(message) {
        client.disconnect();
        if (this.messageCallback) {
            this.messageCallback(message);
        }
    };

    ComSock.prototype.disconnect = function() {
        client.disconnect();
    };

    ComSock.prototype.messageHandler = function(message) {
        var msg = JSON.parse(JSON.parse(message.body));
        switch (msg.type) {
            case 'init':
                break;
            case 'subscribe':
                this.uuid = msg.uuid;
                break;
            case 'join':
                this.createSession(msg.id);
                break;
            case 'devices':
                break;
            case 'session':
                this.sessionUpdate(msg);
                break;
            case 'payload':
                if (this.onMessage) {
                    this.onMessage(msg);
                }
                break;
            default:
                break;
        }
        if (this.messageCallback) {
            this.messageCallback(message);
        }
    };

    ComSock.prototype.subscribe = function(url) {
        return client.subscribe(url, this.messageHandler.bind(this));
    };

    ComSock.prototype.sendMessage = function(message, url, headers) {
        url = typeof url !== 'undefined' ? url : this.session;
        headers = typeof headers !== 'undefined' ? headers : {};
        client.send(url, headers, JSON.stringify(message));
    };

    ComSock.prototype.createSession = function(session_id) {
        this.subscribe('/topic/' + session_id);
    };

    ComSock.prototype.checkDevice = function(link, index) {
        var i = 0;
        if (index === 0) {
            i = di++;
            if (link.deviceA.uuid === this.uuid) {
                return i;
            } else if (link.deviceB.uuid === this.uuid) {
                di++;
                return i + 1;
            } else {
                di++;
            }
        } else {
            i = di++;
            if (link.deviceB.uuid === this.uuid) {
                return i;
            }
        }

        return 0;
    };

    ComSock.prototype.sessionUpdate = function(data) {
        if (this.sessionData === null) {
            this.sessionData = data;

            var links = data.links;
            var len = links.length;
            var link;

            di = 0;
            for (var i = 0; i < len; i++) {
                link = links[i];
                var mdi = this.checkDevice(link, i);
                this.deviceIndex = mdi;
            }
        }
        this.sessionData = data;
        if (this.sessionCallback) this.sessionCallback(data);
    };

    return ComSock;
}));
