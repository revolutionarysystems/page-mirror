include "event-handler.js"

var PageMirrorPlayer = function(config) {

	var $this = this;

	config = config || {};

	var eventHandler = new PageMirrorEventHandler({
		base: config.base
	});

	this.session;
	this.state = "Stopped";
	this.speed = 1;

	var beforeCallback;
	var updateCallback;
	var afterCallback;

	this.play = function(id, options) {
		options = options || {};
		Ajax.getJSON(config.url + "/getRecording?id=" + id + "&start=" + options.start + "&duration=" + options.duration, {
			onError: options.error,
			onSuccess: function(session) {
				eventHandler.reset();
				session.processedEvents = [];
				session.preExistingEvents = [];
				session.outstandingEvents = [];
				session.events = [];
				beforeCallback = options.before;
				updateCallback = options.update;
				afterCallback = options.after;
				var loadEvents = function() {
					var url;
					if (config.url.indexOf("http") == 0) {
						url = config.url;
					} else {
						url = window.location.pathname + "/../" + config.url;
					}
					var offset = session.preExistingEvents.length + session.events.length
					var limit = offset + 100 > session.length ? session.length - offset : 100
					url = url + "/getEvents?session=" + id + "&offset=" + offset + "&limit=" + limit;
					Ajax.getJSON(url, {
						onError: options.error,
						onSuccess: function(events) {
							var initialize = false;
							if (session.events.length == 0) {
								initialize = true;
							}
							if (initialize) {
								if (options.start) {
									for (var i = 0; i < events.length; i++) {
										var event = events[i];
										if (event.time < options.start) {
											session.preExistingEvents.push(event);
										} else {
											session.events.push(event);
										}
									}
								} else {
									session.events = session.events.concat(events);
								}
								if (session.events.length > 0) {
									session.startTime = session.events[0].time;
									var pages = [];
									var prevPage = null;
									for (var i = 0; i < session.pages.length; i++) {
										var page = session.pages[i];
										if (page.startTime <= session.startTime) {
											prevPage = page;
										} else if (page.startTime < session.endTime) {
											if (page.endTime > session.endTime) {
												page.endTime = session.endTime;
											}
											pages.push(page);
										}
									}
									if (prevPage != null) {
										prevPage.startTime = session.startTime;
										pages = [prevPage].concat(pages);
									}
									session.pages = pages;
									$this.session = session;
									if (beforeCallback) {
										beforeCallback(session);
									}
									$this.skipToEvent(0);
								}
							} else {
								session.events = session.events.concat(events);
								session.outstandingEvents = session.events.slice(events);
							}
							if ((session.preExistingEvents.length + session.events.length) < session.length) {
								loadEvents();
							} else {
								var lastEvent = session.events[session.events.length - 1];
								if (options.duration && lastEvent.time < session.startTime + options.duration) {
									lastEvent = {
										_id: "end",
										session: lastEvent.session,
										event: "end",
										time: session.startTime + options.duration,
										args: {}
									}
									session.pages[session.pages.length - 1].endTime = lastEvent.time;
									session.events.push(lastEvent);
								}
								session.endTime = lastEvent.time;
							}
						}
					});
				}
				loadEvents();
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
		var timestamp;
		if (typeof time == "number") {
			timestamp = time;
		} else {
			timestamp = time.getTime();
		}
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