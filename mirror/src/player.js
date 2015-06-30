include "event-handler.js"

var PageMirrorPlayer = function(config) {

	var $this = this;

	config = config || {};

	var eventHandler = new PageMirrorEventHandler({base: config.base});

	this.session;
	this.state = "Stopped";
	this.speed = 1;

	var beforeCallback;
	var updateCallback;
	var afterCallback;

	this.play = function(id, options) {
		options = options || {};
		Ajax.getJSON(config.url + "/getRecording?id=" + id, {
			onError: options.error,
			onSuccess: function(session) {
				eventHandler.reset();
				session.processedEvents = [];
				session.preExistingEvents = options.event ? session.events.slice(0, options.event) : [];
				session.events = options.event ? session.events.slice(options.event) : session.events;
				var diff = session.events[0].time - session.startTime;
				session.startTime = session.events[0].time;
				session.outstandingEvents = session.events.slice();
				if (options.event) {
					var pages = [];
					var prevPage = null;
					for (var i = 0; i < session.pages.length; i++) {
						var page = session.pages[i];
						if (page.index < options.event) {
							prevPage = page;
						} else {
							page.index = page.index - options.event;
							pages.push(page);
						}
					}
					if (prevPage != null) {
						prevPage.index = 0;
						prevPage.startTime = session.startTime;
						pages = [prevPage].concat(pages);
					}
					session.pages = pages;
				}
				var lastEvent = session.events[session.events.length-1];
				session.endTime = lastEvent.time;
				$this.session = session;
				beforeCallback = options.before;
				updateCallback = options.update;
				afterCallback = options.after;
				if (beforeCallback) {
					beforeCallback(session);
				}
				$this.skipToEvent(0);
			}
		});
	}

	this.restart = function() {
		this.state = "Playing";
		this.skipToEvent(0);
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
		var page = this.session.pages[index];
		this.skipToTimestamp(new Date(page.startTime));
	}

	this.skipToEvent = function(index) {
		window.clearTimeout(nextEventTimeout);
		eventHandler.reset();
		var eventsToSkip = [];
		index = index * 1;
		if (index <= this.session.processedEvents.length) {
			eventsToSkip = this.session.events.slice(0, index + 1);
		} else {
			eventsToSkip = this.session.events.slice(this.session.processedEvents.length, index + 1);
		}
		skipEvents(this.session.preExistingEvents);
		skipEvents(eventsToSkip);
		this.session.processedEvents = this.session.events.slice(0, index + 1);
		this.session.outstandingEvents = this.session.events.slice(index + 1);
		if (updateCallback) {
			updateCallback();
		}
		handleEvents(this.session.outstandingEvents);
	}

	function skipEvents(events) {
		for (var i = 0; i < events.length; i++) {
			var event = events[i];
			eventHandler.handleEvent(event.event, event.args);
		}
	}

	this.skipToTime = function(time) {
		this.skipToTimestamp(new Date(this.session.startTime + time * 1));
	}

	this.skipToTimestamp = function(time) {
		var timestamp = time.getTime();
		var event = this.session.events[0];
		for (var i = 1; i < this.session.events.length; i++) {
			var e = this.session.events[i];
			if (e.time > timestamp) {
				this.skipToEvent(i);
				break;
			}
		}
	}

	var nextEventTimeout;

	function handleEvents(events, waitNext) {
		var wait = true;
		if (waitNext != undefined) {
			wait = waitNext;
		}
		$this.session.outstandingEvents = events;
		if ($this.state == "Playing") {
			var event = events.shift();
			if (event) {
				if (wait && $this.session.processedEvents.length > 0) {
					var lastEvent = $this.session.processedEvents[$this.session.processedEvents.length - 1];
					var waitTime = event.time - lastEvent.time;
					console.log("Waiting " + waitTime / $this.speed + "ms");
					events.unshift(event);
					nextEventTimeout = setTimeout(function() {
						handleEvents(events, false);
					}, waitTime / $this.speed);
					if (updateCallback) {
						updateCallback({
							event: "wait",
							args: {
								time: waitTime
							}
						});
					}
				} else {
					$this.session.processedEvents.push(event);
					console.log(event.event);
					eventHandler.handleEvent(event.event, event.args);
					forceRedraw();
					if (updateCallback) {
						updateCallback(event);
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

	function forceRedraw() {
		var sel = document.getElementById('revsys-redraw-fix');
		if (sel) {
			sel.style.display = 'none';
			sel.offsetHeight; // no need to store this anywhere, the reference is enough
			sel.style.display = 'block';
		}
	}
}