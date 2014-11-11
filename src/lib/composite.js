(function(base, factory) {

    // RequireJS
    if (typeof define === "function" && define.amd) {
        define(factory);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = factory();

    // Global Space
    } else {
        base.Composite = factory();
    }

}(this, function() {

    var ComSock = window.ComSock ? window.ComSock : require('comsock');

    if (!ComSock) {
        throw new Error('The Comsock library is required in order to use the Composite library.');
    }

    /**
     * Returns an object that will allow you to connect, send messages, and 
     * listen for events upon. 
     * @constructor
     */
    function Composite() {
        var _this = this;

        /**
         * comsock Socket
         * @member {ComSock}
         * @private
         */
        this._socket = new ComSock();

        /**
         * Store values to calculate time offset
         * @member {Array}
         * @private
         */
        this._timeOffset = [];

        /**
         * Store last 10 latency values to calculate average
         * @member {Array}
         * @private
         */
        this._latencyStore = [];

        /**
         * Listener event array
         * @member {Array}
         * @private
         */
        this._events = [];

        /**
         * Empty object to avoid new allocations
         * @member {Object}
         * @private
         */
        this._object = {};

        /**
         * Data object to avoid new allocations
         * @member {Object}
         * @property {string} type
         * @private
         */
        this._dataObject = {type: 'data'};

        /**
         * Update object to avoid new allocations
         * @member {Object}
         * @property {string} type
         * @private
         */
        this._updateObject = {type: 'update'};

        // URL Endpoints
        this._joinURL = '/app/join';
        this._updateURL = '/app/update';
        this._dataURL = '/app/data';
        this._syncURL = '/app/sync';
        this._startURL = '/app/start';
        this._stopURL = '/app/stop';
        this._disconnectURL = '/app/disconnect';
        this._pingURL = '/app/ping';

        /**
         * Container indicating if the client is connected to the composite 
         * service.
         * @member {boolean}
         * @public
         */
        this.connected = false;

        /**
         * The UUID of the device given from the service, can be used as a way 
         * to find the device(s) order.
         * @member {string}
         * @public
         */
        this.uuid = null;

        /**
         * The median time difference between the client's Date.now and the 
         * services Date.now.
         * @member {number}
         * @public
         */
        this.timeDifference = null;

        /**
         * The average time it takes to send and recieve a message through 
         * composite. Updated periodically throughout the application.
         * @member {number}
         * @public
         */
        this.latency = null;

        /**
         * If the device is the host device. This is determined by order joined, 
         * and the first device to join is given host privelages. This is 
         * updated during the device_update event as it's possible for the host 
         * to drop connection. hosts can trigger the app_start and app_end 
         * events.
         * @member {boolean}
         * @public
         */
        this.host = null;

        /**
         * The container for the devices geographic position in the form of 
         * [{latitude}, {longitude}]. Location is not captured automatically, 
         * and must be implemented manually, and is used for session management
         * @member {Array}
         * @public
         */
        this.location = [];

        /**
         * The session the device is currently a part of. This is set 
         * automatically after successfully joining, and is required when 
         * broadcasting updates and data.
         * @member {string}
         * @public
         */
        this.session = null; //game uuid

        /**
         * If the app is currently in the start state. This happens 
         * automatically after the app_start event and is set to false after 
         * the app_end event.
         * @member {boolean}
         * @public
         */
        this.active = false;

        // Listen for browser close
        window.onbeforeunload = function() {
            _this._unload();
            return null;
        };
    }

    /**
     * Send a disconnect event to the server
     * @method
     * @private
     */
    Composite.prototype._unload = function() {
        this._socket.sendMessage(this._object, this._disconnectURL, this._object);
        this._socket.disconnect();
        this.connected = false;
    };

    /**
     * Send a ping to the server
     * @method
     * @private
     */
    Composite.prototype._sendPing = function() {
        this._socket.sendMessage(this._object, this._pingURL, this._object);
    };

    /**
     * Route data received from server to appropriate method
     * @method
     * @private
     * @param {Object} data - Socket payload
     */
    Composite.prototype._handleData = function(data) {
        if (this.timeDifference) data.latency = this._calculateLatency(data);
        switch (data.type) {
            case 'init': this._init(data); break;
            case 'sync': this._sync(data); break;
            case 'join': this._join(data); break;
            case 'start': this._start(data); break;
            case 'stop': this._stop(data); break;
            case 'data': this._data(data); break;
            case 'update': this._update(data); break;
            case 'devices': this._devices(data); break;
            case 'disconnect': this._disconnect(data); break;
        }
    };

    /**
     * Calculate latency from received message using timeDifference
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @returns {number}
     */
    Composite.prototype._calculateLatency = function(data) {
        if (!data.serverTime) return 0;
        var difference = Date.now() - data.serverTime;
        var latency = Math.abs(Math.abs(difference) - Math.abs(this.timeDifference));
        this._updateLatency(latency);
        return latency;
    };

    /**
     * Keep track of 10 most recent messages in order to get an average latency
     * @method
     * @private
     * @param {number} latency
     */
    Composite.prototype._updateLatency = function(latency) {
        this._latencyStore.unshift(latency);
        if (this._latencyStore.length > 10) this._latencyStore.splice(10, 1);

        this.latency = 0;
        for (var i = 0; i < this._latencyStore.length; i++) {
            this.latency += this._latencyStore[i];
        }
        this.latency = Math.floor(this.latency / this._latencyStore.length);
    };

    /**
     * Find this device in the array of all game devices
     * @method
     * @private
     * @param {Array} devices - All game devices
     * @param {boolean} index - Flag to only return the index of the device
     * @returns {number|Array}
     */
    Composite.prototype._findMe = function(devices, index) {
        for (var i = devices.length-1; i > -1; i--) {
            var device = devices[i];
            if (device.uuid === this.uuid) {
                if (index) return i;
                device.me = true;
            }
        }

        return devices;
    };

    /**
     * Received init from server, start syncing time
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#init
     */
    Composite.prototype._init = function(data) {
        this.uuid = data.uuid;
        this.syncTime();
        this._fireEvent('init', data);
    };

    /**
     * App start event from server
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#app_start
     */
    Composite.prototype._start = function(data) {
        this.active = true;
        this._fireEvent('app_start', data.latency);
    };

    /**
     * App end event from server
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#app_end
     */
    Composite.prototype._stop = function(data) {
        this.active = false;
        this._fireEvent('app_end', data.latency);
    };

    /**
     * Received response for joining a game. Either you're entering the game or 
     * receiving info about other players.
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#session_joined
     */
    Composite.prototype._join = function(data) {
        var _this = this;

        if (!this.session) {
            this.session = data.id;
            data.player = this._findMe(data.devices, true);
            if (data.player === 0) this.host = true;
            this._fireEvent('session_joined', data);

            setTimeout(function() {
                _this._socket.sendMessage({type: 'devices'}, '/app/' + _this.session, _this._object);
            }, 100);
        }
    };

    /**
     * Received updated list of devices
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#device_update
     */
    Composite.prototype._devices = function(data) {
        data.devices = this._findMe(data.devices);
        if (data.devices[0].me) this.host = true;
        else this.host = false;
        this._fireEvent('device_update', data);
    };

    /**
     * Handle when another player disconnects
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#device_disconnect
     */
    Composite.prototype._disconnect = function(data) {
        this._devices(data);
        this._fireEvent('device_disconnect');
    };

    /**
     * Received session data
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#data
     */
    Composite.prototype._data = function(data) {
        data.data.latency = data.latency;
        data.data.me = data.data.uuid === this.uuid;
        this._fireEvent('data', data.data);
    };

    /**
     * Received session update
     * @method
     * @private
     * @param {Object} data - Socket payload
     * @fires Composite#update
     */
    Composite.prototype._update = function(data) {
        if (data.data.uuid === this.uuid) data.me = true;
        this._fireEvent('update', data);
    };

    /**
     * Received response from server time sync. Calculate the difference in 
     * time, and pick the median when 11 responses are stored.
     * @method
     * @private
     * @param {Object} data - Socket payload
     */
    Composite.prototype._sync = function(data) {
        var currentTime = Date.now();
        var latency = Math.round((currentTime - data.time) * 0.5);
        var serverTime = data.serverTime;
        currentTime -= latency;
        this._updateLatency(latency);

        var difference = currentTime - serverTime;
        this._timeOffset.push(difference);

        if (this._timeOffset.length === 11) {
            this._timeOffset.sort(function(a, b) {
               return a - b;
            });

            this.timeDifference = this._timeOffset[5];
            this._timeOffset = null;
            this._fireEvent('synced');
        } else {
            this.syncTime();
        }
    };

    /**
     * Fire event to any outside listeners
     * @method
     * @private
     * @param {string} evt - The event identifier
     * @param {Object} data - Event payload
     */
    Composite.prototype._fireEvent = function(evt, data) {
        var events = this._events;
        for (var i = 0; i < events.length; i++) {
            var e = events[i];
            if (e.evt === evt) e.callback(data);
        }
    };

    /**
     * Connect to the specified server and attach the messageCallback listener
     * @method
     * @public
     * @param {string} url - The url to which the socket connects
     */
    Composite.prototype.connect = function(url) {
        var _this = this;

        this._socket.connect(url);
        this._socket.messageCallback = function(data) {

            if (data.command === 'CONNECTED') {
                this.connected = true;

                // Start ping interval
                setInterval(function() {
                    _this._sendPing();
                }, 250);
            } else if (data.body) {
                this._handleData(JSON.parse(data.body));
            }
        }.bind(this);
    };

    /**
     * Trigger the time syncing process
     * @method
     * @public
     */
    Composite.prototype.syncTime = function() {
        if (!this._timeOffset) this._timeOffset = [];
        this._socket.sendMessage({'type': 'sync', time: Date.now()}, this._syncURL, this._object);
    };

    /**
     * Attach an event listener for the specified string
     * @method
     * @public
     * @param {string} evt - The event to bind to
     * @param {Function} callback - The function to register on evt
     */
    Composite.prototype.on = function(evt, callback) {
        var e = {};
        e.evt = evt;
        e.callback = callback;
        this._events.push(e);
    };

    /**
     * Remove event listener
     * @method
     * @public
     * @param {string} evt - The event to unbind from
     * @param {function} callback - The function to unregister
     */
    Composite.prototype.off = function(evt, callback) {
        var events = this._events;
        for (var i = 0; i < events.length; i++) {
            var e = events[i];
            if (e.evt === evt && e.callback === callback) events.splice(i, 1);
        }
    };

    /**
     * Join a game
     * @method
     * @public
     * @param {Object} data - Socket payload
     */
    Composite.prototype.join = function(data) {
        if (!this.uuid) throw new Error('Must wait until connection is established before joining a game.');
        if (!this.location[0]) throw new Error('Composite::location must be set before a game can be joined.');
        data = data || {};
        data.type = data.type || 'exit';
        data.geo = data.geo || this.location;
        data.device = data.device || {};
        data.device.uuid = this.uuid;
        this._socket.sendMessage(data, this._joinURL, this._object);
    };

    /**
     * Send message through the Data channel
     * @method
     * @public
     * @param {Object} data - Socket payload
     */
    Composite.prototype.sendData = function(data) {
        if (!data || !this.session) return;
        data.uuid = this.uuid;
        this._dataObject.data = data;
        this._dataObject.type = 'data';
        this._socket.sendMessage(this._dataObject, '/app/' + this.session, this._object);
    };

    /**
     * Send message through the Update channel
     * @method
     * @public
     * @param {Object} data - Socket payload
     */
    Composite.prototype.sendUpdate = function(data) {
        if (!data || !this.session) return;
        data.uuid = this.uuid;
        this._updateObject.type = 'update';
        this._updateObject.data = data;
        this._socket.sendMessage(this._updateObject, '/app/' + this.session, this._object);
    };

    /**
     * Start the game
     * @method
     * @public
     */
    Composite.prototype.startApp = function() {
        if (this.host) this._socket.sendMessage({type: 'start'}, '/app/' + this.session, this._object);
    };

    /**
     * The game has ended, reopen it so more people can join
     * @method
     * @public
     */
    Composite.prototype.endApp = function() {
        if (this.host) this._socket.sendMessage({type: 'stop'}, '/app/' + this.session, this._object);
    };

    /**
     * Force disconnect
     * @method
     * @public
     */
    Composite.prototype.disconnect = function() {
        this._unload();
    };

    return Composite;
}));
