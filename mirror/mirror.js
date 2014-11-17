var base;

socket.emit("monitorSession", {
	id: window.location.hash.substring(1)
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

while (document.firstChild) {
	document.removeChild(document.firstChild);
}

var initialized = false;

socket.on('initialize', function(args) {
	console.log("initialize");
	console.log(args);
	if (initialized == false) {
		try {
			initialized = true;
			mirror.initialize(args.rootId, args.children);
			console.log("init done");
		} catch (e) {
			console.log(e);
		}
	} else {
		if (args.new == true) {
			window.location.reload();
		}
	}
});
socket.on('applyChanged', function(args) {
	console.log("applyChanged");
	console.log(args);
	mirror.applyChanged(args.removed, args.addedOrMoved, args.attributes, args.text);
	console.log("apply done");
});