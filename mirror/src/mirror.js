var PageMirror = function(options) {
	var base;

	options = options || {};

	var socket;
	if (options.url) {
		socket = io(options.url);
	} else {
		socket = io();
	}

	var sessionId = window.location.hash.substring(1);

	socket.emit("monitorSession", {
		id: sessionId
	});

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

	this.recordSession = function(){
		socket.emit("recordSession", {
			id: sessionId
		});
	}

	this.stopRecordingSession = function(){
		socket.emit("stopRecordingSession", {
			id: sessionId
		});
	}

	this.replaySession = function(id) {
		var id = id || sessionId;
		socket.emit("getRecordedSession", {
			id: id
		}, function(session) {
			initialized = false;
			applyEvents(session);
		});
	}

	function applyEvents(events) {
		var event = events.shift();
		if (event) {
			if (event.event == "wait") {
				console.log("Waiting " + event.args.time + "ms");
				setTimeout(function() {
					applyEvents(events);
				}, event.args.time);
			} else {
				eventListeners[event.event](event.args);
				applyEvents(events);
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