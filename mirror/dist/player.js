var PageMirrorEventHandler = function(options) {

	options = options || {};

	var $this = this;

	var base;
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

	var eventListeners = {};

	eventListeners.initialize = function(args) {
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
				var mouse = document.createElement("div");
				mouse.id = "mouse";
				document.body.appendChild(mouse);
				var style = document.createElement('style')
				style.type = 'text/css'
				style.innerHTML = '#mouse{' +
				    'border:1px solid red;' +
				    'width:10px;' +
				    'height:10px;' +
				    'display:block;' +
				    'position:fixed;' +
				    'top:0px;' +
				    'left:0px;' +
				'}' +
				'#mouse.pressed{' +
				    'background-color:red;' +
				'}';
				document.getElementsByTagName('head')[0].appendChild(style)
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

	eventListeners.mousemove = function(args) {
		var mouse = document.getElementById("mouse");
		mouse.style.top = args.y + "px";
		mouse.style.left = args.x + "px";
	}

	eventListeners.mousedown = function(args) {
		var mouse = document.getElementById("mouse");
		mouse.style.top = args.y + "px";
		mouse.style.left = args.x + "px";
		mouse.className = "pressed";
	}

	eventListeners.mouseup = function(args) {
		var mouse = document.getElementById("mouse");
		mouse.style.top = args.y + "px";
		mouse.style.left = args.x + "px";
		mouse.className = "";
	}

	eventListeners.unload = function(args) {
		
	}

	eventListeners.end = function(args){

	}

	this.reset = function(){
		initialized = false;
	}

	this.handleEvent = function(type, args){
		eventListeners[type](args);
	}

}

var PageMirrorPlayer = function(options) {

	var $this = this;

	options = options || {};

	var socket;
	if (options.url) {
		socket = io.connect(options.url);
	} else {
		socket = io.connect();
	}

	var eventHandler = new PageMirrorEventHandler();

	this.session;
	this.state = "Stopped";
	this.speed = 1;

	var beforeCallback;
	var updateCallback;
	var afterCallback;

	this.play = function(id, options) {
		options = options || {};
		socket.emit("getRecordedSession", {
			id: id
		}, function(err, session) {
			if (err) {
				if (options.error) {
					error(err);
				}
			} else {
				eventHandler.reset();
				session.processedEvents = [];
				session.outstandingEvents = session.events;
				$this.session = session;
				beforeCallback = options.before;
				updateCallback = options.update;
				afterCallback = options.after;
				$this.state = "Loading";
				if (beforeCallback) {
					beforeCallback(session);
				}
				handleEvents(session.events.slice());
			}
		});
	}

	this.restart = function() {
		if (this.session) {
			window.clearTimeout(nextEventTimeout);
			eventHandler.reset();
			this.session.processedEvents = [];
			this.session.outstandingEvents = this.session.events;
			$this.state = "Playing";
			if (beforeCallback) {
				beforeCallback(this.session);
			}
			handleEvents(this.session.events.slice());
		}
	}

	this.setSpeed = function(speed) {
		this.speed = speed;
	}

	this.pause = function() {
		this.state = "Paused";
	}

	this.resume = function() {
		this.state = "Playing";
		handleEvents(this.session.outstandingEvents);
	}

	this.skipToPage = function(index) {
		this.state = "Loading";
		var page = this.session.pages[index];
		var eventIndex = page.index;
		this.session.processedEvents = this.session.events.slice(0, eventIndex);
		this.session.outstandingEvents = this.session.events.slice(eventIndex);
		window.clearTimeout(nextEventTimeout);
		eventHandler.reset();
		handleEvents(this.session.outstandingEvents);
	}

	this.skipToEvent = function(index) {
		this.pause();
		window.clearTimeout(nextEventTimeout);
		eventHandler.reset();
		var eventsToSkip = [];
		if(index < this.session.processedEvents.length){
			eventsToSkip = this.session.events.slice(0, index);
		}else{
			eventsToSkip = this.session.events.slice(this.session.processedEvents.length, index);
		}
		for(var i=0; i<eventsToSkip.length; i++){
			var event = eventsToSkip[i];
			if(event.event != "wait"){
				eventHandler.handleEvent(event.event, event.args);
			}
		}
		this.session.processedEvents = this.session.events.slice(0, index);
		this.session.outstandingEvents = this.session.events.slice(index);
	}

	var nextEventTimeout;

	function handleEvents(events) {
		$this.session.outstandingEvents = events;
		if ($this.state == "Playing" || $this.state == "Loading") {
			var event = events.shift();
			if (event) {
				$this.session.processedEvents.push(event);
				if (event.event == "wait") {
					if ($this.speed > 0) {
						console.log("Waiting " + event.args.time / $this.speed + "ms");
						nextEventTimeout = setTimeout(function() {
							handleEvents(events);
						}, event.args.time / $this.speed);
					} else {
						handleEvents(events);
					}
				} else {
					console.log(event.event);
					eventHandler.handleEvent(event.event, event.args);
					if($this.state == "Loading" && event.event == "initialize"){
						$this.pause();
					}
					if (updateCallback) {
						updateCallback();
					}
					handleEvents(events);
				}
			} else {
				$this.state = "Stopped";
				if (afterCallback) {
					afterCallback();
				}
			}
		}
	}
}