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
					'width:18px;' +
					'height:30px;' +
					'display:block;' +
					'position:fixed;' +
					'top:0;' +
					'left:0;' +
					'background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAeCAQAAACLBYanAAABnUlEQVQ4y5XTTUjTcRzH8bfu/x/mwzwkCIMI6qKIODq0BsMWVANjB8EdgkEnFYTwYNChMNl5XoagkDBXUSjRQVSU8AEEuyjRpUTwocMOPhBUZEOtjwetTd3/F31Pvy+8+P6e+EAlDbj5Rz1BPKLCRFyE8BPmF+/JGlAgGLY3GrNulvjpiKqCr22bxUDWwyI/HM7k292U1Kvz4jEuI5L6VS16sI1IGpJXJM4+SHF+c4827C6SlBgmSVJCbvGcUiOSBlQi0o7bHVU7Tym9S58RQYwXdnk7KSOCZp5ZxBgxIoiQsmhmHMuALGKMWIR5S5lVmGzxgQM+ccM1e414AZSk82ixxxoZtpnLQxlG8XOFc/CNJHH2z9xukut0MAzcIeqhLkegGIr4zUOirA7yavT7DF6aoJ7IiW+5sHtJtrgP1LLwQNKybok3J4Owx0fqj7v4ZY1JSovPRHPoIp14/nY1TLdKWldEDDvnp9uneUmDYo2QE/LzrkPSsgJi4k9aTleGqv2bFawwzRc3U+wUnuVjDvGVl9w25foqLVTyf3UIgu+1MCS8LUUAAAAASUVORK5CYII=") no-repeat;' +
					'z-index:99999999' +
				'}' +
				'#revsys-pagemirror-mouse.hidden{' +
				    'display:none;' +
				'}' + 
				'#revsys-pagemirror-mouse.pressed{' +
				    'background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAyCAYAAABLXmvvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAu1JREFUeNrsmM9PE0EUxydT6g+MbRM0xlhAY2L8kdgGD2piohdvGn/wB1BvnKT+ASYkeMJL+xe0Xrxh9MyhVS8YD4IERKOgWINGCd0aF6XYOm+ZWWeXHfbX7HjxJS/LTmf64fvezL63RegfW5L4EL0qNYC2ib9QBcf0mqLXLPGqCjh2GFMCt4Av7t+Hdsc7lMAt4GPJJLp/7qwdribUx1Ob4CVVOTbh1HJRwLHoA4CP9mUig+OtPuzv7Y4Mjt0mRAXHXiY5wIeUgB3gBeIDSsAMnjt8iN2Ww8Cx3wW3T55A13vSoeE4yKK7p7Kh4ThoqBzgV5SABfCMEjCDQ1WjNb3qFY5lPAxG+7KksiV8waWAE9viRlHxA5cCDgKXBhbAy6IuRirYAS5soaSDGRye61v1b5GABS2UBR4Z2A3eIQMwW9dQo7mOPuk6qumrxHXy9yoZa6JXWsPes0M9L4YCj7ycQeV3C16nTxKvs5Y5FBgUUatzXzxJx6ocULOv9QRurDXRyPQMSsTjRj023/SOHkEPFmvszEIIP0grEpC/S5UnBgDCCvfM0rs6+eo0LK0slt7Oo8uVp8ZGMcdsOe3v6eabwN5QYAjt4MRzdGd6lg09pDvSUF77oZtzz+ztQqf3dLHbfGAwC+340hf+y64Rn2Ibpjj3xrLmJsk1pzrpGzy+9JkP7XuqsshNGWaqISq8aq4w5H2DucPOQjtlm/+Yqbbn+sbftjfvRbVTjlloNcGawgZ43qIaeu4DnTuZ6qtu4Bj3APhJfJD4I5c1ryGXa61WanssZoTZrErknNO9YU+RUDGE9JZDaEVm5Hps8eOmNw1aEA669dqxgE9L+Adz35vrqTQJL1QhZr9+t9Czb8uuqsOUxYLT0YJNxqk+L1sx2BzsCaJ6B68a8s6pBvg92Yo1pnpso1AYNvF1mRxL80Bc8PN24cdA5grxNnl9bZPjBD9L8l6J8reykg22QscyKGKDirRA1Q2g/yawPwIMAK1KBozS4tLzAAAAAElFTkSuQmCC");' +
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
		var mouse = document.getElementById("revsys-pagemirror-mouse");
		mouse.className = args.visibility;
		console.log('visibility:', args.visibility);

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