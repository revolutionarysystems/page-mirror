var PageMirrorEventHandler = function(options) {

	options = options || {};

	var $this = this;

	var base = options.base;
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
				base = base || args.base;
				mirror.initialize(args.rootId, args.children);
				window.scrollTo(args.pageXOffset, args.pageYOffset);
				if (window.parent && window.parent.resize) {
					window.parent.resize(args.viewportWidth, args.viewportHeight);
				}
				var mouse = document.createElement("div");
				mouse.id = "revsys-pagemirror-mouse";
				document.body.appendChild(mouse);
				var redraw = document.createElement("div");
				redraw.id = "revsys-redraw-fix";
				document.body.appendChild(redraw);
				var style = document.createElement('style')
				style.type = 'text/css'
				style.innerHTML = '#revsys-pagemirror-mouse{' +
				    'border:1px solid red;' +
				    'width:10px;' +
				    'height:10px;' +
				    'display:block;' +
				    'position:fixed;' +
				    'top:0px;' +
				    'left:0px;' +
				'}' +
				'#revsys-pagemirror-mouse.pressed{' +
				    'background-color:red;' +
				'}' + 
				'div#revsys-redraw-fix {' + 
				    'position: fixed;' + 
				    'top: 0;' + 
				    'right: 0;' + 
				    'bottom: 0;' + 
				    'left: 0;' + 
				    'z-index: 9999;' + 
				    'pointer-events: none;' + 
				    'display: block;' + 
				'};';
				document.getElementsByTagName('head')[0].appendChild(style);
				eventListeners.visibilitychange({visibility: args.visibility});
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
		var mouse = document.getElementById("revsys-pagemirror-mouse");
		mouse.style.top = args.y + "px";
		mouse.style.left = args.x + "px";
	}

	eventListeners.mousedown = function(args) {
		var mouse = document.getElementById("revsys-pagemirror-mouse");
		mouse.style.top = args.y + "px";
		mouse.style.left = args.x + "px";
		mouse.className = "pressed";
	}

	eventListeners.mouseup = function(args) {
		var mouse = document.getElementById("revsys-pagemirror-mouse");
		mouse.style.top = args.y + "px";
		mouse.style.left = args.x + "px";
		mouse.className = "";
	}

	eventListeners.unload = function(args) {
		
	}

	eventListeners.virtualPage = function(args) {
		
	}

	eventListeners.end = function(args){

	}

	eventListeners.visibilitychange = function(args){
		if (window.parent && window.parent.visibilitychange) {
			window.parent.visibilitychange(args.visibility);
		}
	}

	this.setListener = function(type, listener){
		eventListeners[type] = listener;
	}

	this.reset = function(){
		initialized = false;
	}

	this.handleEvent = function(type, args){
		eventListeners[type](args);
	}

}