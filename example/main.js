(function() {

	/**
     * requestAnimationFrame polyfill
     */
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback, element) {
            _id = window.setTimeout(callback, (1e3 / 60) | 0);
    };

    window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame || window.msCancelAnimationFrame ||
        function(_id) {
            window.clearTimeout(_id);
    };

	// Check to see if Compsite is exposed
	if (!window.Composite) {
		throw new Error('The composite client library is needed to run this example');
	}

	// Private Variables
	var comp = new Composite,
		compUrl = 'http://localhost:8080/composite',
		deviceDimensions = [window.innerWidth, window.innerHeight],
		connectButton,
		introMessage,
		waitingMessage,
		playerSlot = -1,
		nyanOffset = 150,
		screenOffset = 60,
		numberOfPlayers = 0,
		yOffset = -65,
		yPosition = 0,
		animationStarted = false,
		touchStartY = 0,
		nyanCat,
		self = undefined,
		stage,
		compositeDimensions = {};


	//Animation variables and functions
	var animationStartTime = 0,
		startPosition = 0, 
		endPosition = 0,
		passedToNextScreen = false,
		animationDurationMilli = 2000;


	function time() {
		var now = (!window.performance) ? Date.now() : window.performance.now();
		return now;
	}

	//A linear straight forward "tween"
	function  linearTween(t, b, c, d) {
            return c*t/d + b;
    }

	// Constructor
	function Nyan() {
		self = this;
	}

	// Attach document handlers, event handlers, and then connect
	Nyan.prototype.start = function() {
		window.addEventListener('orientationchange', function(event) {
			if (window.orientation == -90) {
				window.scrollTo(0,0);
			}
		});

		connectButton = document.getElementById('connect-button');
		connectButton.style.display = "none";

		waitingMessage = document.getElementById('waiting');
		introMessage = document.getElementById('intro');

		nyanCat = document.getElementById('nyanCat');
		
		stage = document.getElementById('stage');

		this.attachHandlers();
		this.attachEvents();

		if (!navigator.geolocation) {
			console.log('Geolocation is not supported for this Browser/OS version yet.');
			return;
		}

		this.connect();
		
	};

	// Wrapper to conenct to the Composite service
	Nyan.prototype.connect = function() {
		comp.connect(compUrl);
	};

	Nyan.prototype.join = function(){
		comp.join();
	};

	// Bind all the events so Nyan can handle them
	Nyan.prototype.attachEvents = function() {
		var me = this;
		comp.on('init', me.handleInit);
		comp.on('sync', me.handleSync);
		
		//comp.on('join', me.handleJoin);
		comp.on('session_joined', me.handleJoin);

		comp.on('start', me.handleStart);
		comp.on('stop', me.handleStop);

		comp.on('data', me.handleData);
		comp.on('update', me.handleData);

		//comp.on('devices', me.handleDevices);
		comp.on('device_update', me.handleDevices);

		comp.on('disconnect', me.handleDisconnect);
	};

	// Attach touch events, handle device orientations
	Nyan.prototype.attachHandlers = function() {

		navigator.geolocation.getCurrentPosition(function(data) {
			comp.location = [data.coords.latitude, data.coords.longitude];
			self.allowJoin();
		});
		document.body.addEventListener('touchmove', this.touchMove.bind(this), false);
		document.body.addEventListener('touchstart', this.touchStart.bind(this), false);
		document.body.addEventListener('touchend', this.touchEnd.bind(this), false);
	};


	Nyan.prototype.touchStart = function(event) {
		var touch = event.targetTouches[0];
		if (!animationStarted) return;
        yPosition = touch.pageY;
		yPosition = Math.max(50, Math.min(265, yPosition));
		yPosition += yOffset;
	};

	Nyan.prototype.touchMove = function(event) {
		event.preventDefault();
		if (!animationStarted) return;
		var touch = event.targetTouches[0];

		yPosition = touch.pageY;
		yPosition = Math.max(50, Math.min(265, yPosition));
		yPosition += yOffset;

		data = {};
		data.messageType = 'ypos';
		data.playerSlot = playerSlot;
		data.yPosition = yPosition;
		comp.sendData(data);
	};

	Nyan.prototype.touchEnd = function(event) {
		//var touch = event.targetTouches[0];
		//yOffset = touch.pageY - touchStartY;
		//yOffset = Math.max(0, Math.min(270, yOffset));
	};

	Nyan.prototype.allowJoin = function() {

		connectButton.style.display = "inline-block";
		connectButton.addEventListener('click', function() {
			self.join();
		});
	};

	// Log that we've connected
	Nyan.prototype.handleInit = function(data) {
		console.log('Init recieved! We\'re connected!');
	};

	// Log that we've synced
	Nyan.prototype.handleSync = function() {
		console.log('Sync recieved!');
	};

	// Log that we've Joined
	Nyan.prototype.handleJoin = function(data) {
		console.log('Join recieved!', data);

		numberOfPlayers = data.devices.length;
		playerSlot = data.player;
		if (data.devices.length < 2 && data.player === 0) {
			introMessage.style.display = 'none';
			waitingMessage.style.display = 'block';
		} else {
			introMessage.style.display = 'none';
		}

	};

	// Log that we've started
	Nyan.prototype.handleStart = function() {
		console.log('Start recieved!');
	};

	// Log that we've stopped
	Nyan.prototype.handleStop = function() {
		console.log('Stop recieved!');
	};

	// Log that we've gotten Data
	Nyan.prototype.handleData = function(data) {
		console.log('Data received!', data);

		if ( !data.me && data.messageType === "passed" && data.playerSlot === (playerSlot-1)) {
			nyanCat.style.display = 'block';
			startPosition = -nyanOffset;
			nyanCat.style.webkitTransform = "translate3d("+startPosition+"px, 0, 0)";
			self.startAnimation();
		}

		if ( !data.me && data.messageType === "ypos") {
			yPosition = data.yPosition;
		}
	};

	// Log that we've gotten Device Data
	Nyan.prototype.handleDevices = function(data) {
		console.log('Devices received!');
		console.log(data.devices.length);
		
		if (data.devices.length < 3) return;

		if (comp.host) {
			waitingMessage.style.display = 'none';
			nyanCat.style.display = 'block';

			setTimeout(function() {
				self.startAnimation();
			}, 500);
		}
	};

	Nyan.prototype.startAnimation = function() {
		console.log("start animation");
		animationStarted = true;

		if (comp.host) {
			startPosition = 0;
			endPosition = window.innerWidth + screenOffset;
		} else {
			endPosition = window.innerWidth + screenOffset;
		}

		animationStartTime = time();
		this.runAnimation();
	};

	Nyan.prototype.runAnimation = function() {
		var now = time();
		var delta = (now - animationStartTime);
		var targetValue = linearTween(delta, startPosition, endPosition, animationDurationMilli);

		if (targetValue >= (window.innerWidth - nyanOffset)) {
			if (!passedToNextScreen) {
				console.log('passed');
				passedToNextScreen = true;
				data = {};
				data.messageType = 'passed';
				data.playerSlot = playerSlot;
				comp.sendData(data);
			}
		}

		if (delta > animationDurationMilli) {
			nyanCat.style.webkitTransform = "translate3d("+endPosition+"px, "+yPosition+"px, 0)";
		} else {
			nyanCat.style.webkitTransform = "translate3d("+targetValue+"px, "+yPosition+"px, 0)";
		}

		requestAnimationFrame( this.runAnimation.bind(this) );
	};

	// Log that we've gotten Disconnect Data
	Nyan.prototype.handleDisconnect = function() {
		console.log('Disconnect recieved!');
	};

	// Let's do this
	var nyan = new Nyan();
	nyan.start();

})();
