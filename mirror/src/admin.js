var PageMirrorAdmin = function(options) {

	options = options || {};

	var socket;
	if (options.url) {
		socket = io.connect(options.url);
	} else {
		socket = io.connect();
	}

	this.getRecordedSessions = function(onSuccess){
		socket.emit("getRecordedSessions", onSuccess);
	}

	this.getRecordingSessions = function(onSuccess){
		socket.emit("getRecordingSessions", onSuccess);
	}

}