var PageMirror = function(options) {
	var base;

	options = options || {};

	var socket;
	if (options.url) {
		socket = io(options.url);
	} else {
		socket = io();
	}

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
	var connectionTimeoutId;

	socket.on('initialize', function(args) {
		window.clearTimeout(connectionTimeoutId);
		if (initialized == false) {
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
		} else {
			if (args.new == true) {
				window.location.reload();
			}
		}
	});
	socket.on('applyChanged', function(args) {
		mirror.applyChanged(args.removed, args.addedOrMoved, args.attributes, args.text);
	});
	socket.on('scroll', function(args) {
		window.scrollTo(args.x, args.y);
	});
	socket.on('resize', function(args) {
		if (window.parent && window.parent.resize) {
			window.parent.resize(args.width, args.height);
		}
	});
	socket.on('unload', function(args) {
		var timeout = options.timeout || 10000;
		var onTimeout = options.onTimeout || function(){
			document.body.innerHTML = "Connection timed out";
		}
		connectionTimeoutId = window.setTimeout(function() {
			onTimeout(timeout);
		}, timeout);
	});
}