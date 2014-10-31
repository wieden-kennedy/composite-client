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
        username = "guest",
        password = "guest",
        mqInit = '/app/init',
        mqMessage = '/user/queue/device';

    /**
     * Creates a socket using SockJS and Stomp
     * @constructor
     */
    function ComSock() {

        /**
         * @member {null}
         * @public
         */
        this.session = null;

        /**
         * Data currently representing the session
         * @member {Object}
         * @public
         */
        this.sessionData = null;

        /**
         * The UUID of this connection
         * @member {string}
         * @public
         */
        this.uuid = null;

        /**
         * @member {number}
         * @public
         */
        this.deviceIndex = null;

        /**
         * @member {null}
         * @public
         */
        this.subscription = null;

        /**
         * ID of Stomp subscription
         * @member {string}
         * @public
         */
        this.id = null;
    }

    /**
     * Connect to Stomp client
     * @method
     * @public
     * @param {string} url - Composite endpoint url
     */
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

    /**
     * Handler for Stomp connect event
     * @method
     * @public
     * @param {Object} message - Event payload
     */
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

    /**
     * Handler for Stomp connection error
     * @method
     * @public
     * @param {Object} message - Event payload
     */
    ComSock.prototype.onConnectError = function(message) {
        client.disconnect();
        if (this.messageCallback) {
            this.messageCallback(message);
        }
    };

    /**
     * Calls disconnect on the Stomp client
     * @method
     * @public
     */
    ComSock.prototype.disconnect = function() {
        client.disconnect();
    };

    /**
     * Handler for Stomp client subscription events
     * @method
     * @public
     * @param {Object} message - Event payload
     */
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

    /**
     * Subscribes to the Stomp client, and bind our message handler
     * @method
     * @public
     * @param {string} url - Subscription url
     * @returns {string}
     */
    ComSock.prototype.subscribe = function(url) {
        return client.subscribe(url, this.messageHandler.bind(this));
    };

    /**
     * Wrapper around Stomp's send method - Sends a given message to the
     * specified endpoint
     * @method
     * @public
     * @param {Object} message - Message payload
     * @param {string} url - Message endpoint
     * @param {Object} [headers={}] - HTTP Headers
     */
    ComSock.prototype.sendMessage = function(message, url, headers) {
        url = typeof url !== 'undefined' ? url : this.session;
        headers = typeof headers !== 'undefined' ? headers : {};
        client.send(url, headers, JSON.stringify(message));
    };

    /**
     * Creates a new subscriber session given a session id
     * @method
     * @public
     * @param {string} session_id - Unique indentifier of the client session
     */
    ComSock.prototype.createSession = function(session_id) {
        this.subscribe('/topic/' + session_id);
    };

    /**
     * Returns the the device index
     * @method
     * @public
     * @param {Object} link - Updated session data links
     * @param {number} index - Index of link in session data links
     * @returns {number}
     */
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

    /**
     * Handler for Stomp session update message - checks device links and
     * updates session data
     * @method
     * @public
     * @param {Object} data - Stomp message payload
     */
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