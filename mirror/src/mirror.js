var PageMirror = function(options) {
	var base;

	options = options || {};

	var socket;
	if (options.url) {
		socket = io.connect(options.url);
	} else {
		socket = io.connect();
	}

	this.mirrorSession = function(sessionId) {
		socket.emit("monitorSession", {
			id: sessionId
		});
	}

	this.recordSession = function() {
		socket.emit("recordSession");
	}

	this.stopRecordingSession = function(callback) {
		socket.emit("stopRecordingSession", {}, callback);
	}

	this.replayRecording = function(id, callback){
		socket.emit("getRecordedSession", {
			id: id
		}, function(session) {
			initialized = false;
			applyEvents(session, callback);
		});
	}

	var mirror = new TreeMirror(document, {
		createElement: function(tagName) {
			if (tagName == 'SCRIPT') {
				var node = document.createElement('NO-SCRIPT');
				node.style.display = 'none';
				return node;
			}

			if (tagName == 'HEAD') {
				var node = document.createElement('HEAD');
				node.appendChild(document.createElement('BASE'));
				node.firstChild.href = base;
				return node;
			}
		}
	});

	var initialized = false;
	var connectionTimeoutId;

	var eventListeners = {};

	eventListeners.initialize = function(args) {
		window.clearTimeout(connectionTimeoutId);
		if (initialized == false || args.new == true) {
			while (document.firstChild) {
				document.removeChild(document.firstChild);
			}
			try {
				initialized = true;
				base = args.base;
				mirror.initialize(args.rootId, args.children);
				window.scrollTo(args.pageXOffset, args.pageYOffset);
				if (window.parent && window.parent.resize) {
					window.parent.resize(args.viewportWidth, args.viewportHeight);
				}
			} catch (e) {
				console.error(e);
			}
		}
	};

	eventListeners.applyChanged = function(args) {
		mirror.applyChanged(args.removed, args.addedOrMoved, args.attributes, args.text);
	};

	eventListeners.scroll = function(args) {
		window.scrollTo(args.x, args.y);
	}

	eventListeners.resize = function(args) {
		if (window.parent && window.parent.resize) {
			window.parent.resize(args.width, args.height);
		}
	}

	eventListeners.unload = function(args) {
		var timeout = options.timeout || 10000;
		var onTimeout = options.onTimeout || function() {
			document.body.innerHTML = "Connection timed out";
		}
		connectionTimeoutId = window.setTimeout(function() {
			onTimeout(timeout);
		}, timeout);
	}

	socket.on('initialize', function(args) {
		eventListeners.initialize(args);
	});
	socket.on('applyChanged', function(args) {
		eventListeners.applyChanged(args);
	});
	socket.on('scroll', function(args) {
		eventListeners.scroll(args);
	});
	socket.on('resize', function(args) {
		eventListeners.resize(args);
	});
	socket.on('unload', function(args) {
		eventListeners.unload(args);
	});

	function applyEvents(events, callback) {
		var event = events.shift();
		if (event) {
			if (event.event == "wait") {
				console.log("Waiting " + event.args.time + "ms");
				setTimeout(function() {
					applyEvents(events, callback);
				}, event.args.time);
			} else {
				eventListeners[event.event](event.args);
				applyEvents(events, callback);
			}
		}else{
			if(callback){
				callback();
			}
		}
	}

	function forEach(array, fn) {
		for (var i in array) {
			var item = array[i];
			fn(item, i);
		}
	}
}