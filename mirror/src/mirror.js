var PageMirror = function(options) {

	options = options || {};

	var socket;
	if (options.url) {
		socket = io.connect(options.url);
	} else {
		socket = io.connect();
	}

	var eventHandler = new PageMirrorEventHandler();

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

	socket.on('initialize', function(args) {
		eventHandler.handleEvent("initialize", args);
	});
	socket.on('applyChanged', function(args) {
		eventHandler.handleEvent("applyChanged", args);
	});
	socket.on('scroll', function(args) {
		eventHandler.handleEvent("scroll", args);
	});
	socket.on('resize', function(args) {
		eventHandler.handleEvent("resize", args);
	});
	socket.on('unload', function(args) {
		eventHandler.handleEvent("unload", args);
	});
	socket.on('mousemove', function(args){
		eventHandler.handleEvent("mousemove", args);
	})

}