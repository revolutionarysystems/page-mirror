var PageMirrorClient = function(options) {

  var $this = this;

  var socket;
  if (options.url) {
    socket = io.connect(options.url);
  } else {
    socket = io.connect();
  }

  var window = options.window || window;
  options.record = options.record || false;
  options.onInit = options.onInit || function() {};

  function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
  };

  var sessionId = sessionStorage.sessionId;
  if (sessionId == undefined) {
    sessionId = generateUUID();
    sessionStorage.sessionId = sessionId;
  }
  this.sessionId = sessionId;

  var initialized = false;

  socket.emit("createSession", {
    id: sessionId,
    record: options.record
  }, options.onInit);

  var mirrorClient;

  socket.on("monitoringSession", function() {
    if (!mirrorClient) {
      mirrorClient = new TreeMirrorClient(window.document, {
        initialize: function(rootId, children) {
          socket.emit('initialize', {
            visibility: window.document.visibilityState,
            base: window.location.href.match(/^(.*\/)[^\/]*$/)[1],
            rootId: rootId,
            children: children,
            viewportWidth: window.document.documentElement.clientWidth,
            viewportHeight: window.document.documentElement.clientHeight,
            pageXOffset: window.pageXOffset,
            pageYOffset: window.pageYOffset,
            url: window.location.href,
            new: !initialized
          });
          initialized = true;
        },

        applyChanged: function(removed, addedOrMoved, attributes, text) {
          socket.emit('applyChanged', {
            removed: removed,
            addedOrMoved: addedOrMoved,
            attributes: attributes,
            text: text
          });
        }
      });
    } else {
      mirrorClient.reinitialize();
    }
  });

  var scrollTimeoutId = false;

  window.addEventListener("scroll", function(e) {
    squash("scroll", 500, function() {
      socket.emit('scroll', {
        x: window.pageXOffset,
        y: window.pageYOffset
      });
    });
  });

  var resizeTimeoutId = false;

  window.addEventListener("resize", function(e) {
    squash("resize", 1000, function() {
      socket.emit('resize', {
        width: window.document.documentElement.clientWidth,
        height: window.document.documentElement.clientHeight,
      });
    })
  });

  window.addEventListener("unload", function(e) {
    socket.emit('unload');
  });

  window.addEventListener("mousemove", function(e) {
    throttle("mousemove", 200, function() {
      if (initialized) {
        socket.emit('mousemove', {
          x: e.x,
          y: e.y
        });
      }
    });
  });

  window.addEventListener("mousedown", function(e) {
    socket.emit('mousedown', {
      x: e.x,
      y: e.y
    });
  });

  window.addEventListener("mouseup", function(e) {
    socket.emit('mouseup', {
      x: e.x,
      y: e.y
    });
  });

  window.document.addEventListener("visibilitychange", function(){
    socket.emit('visibilitychange', {
      visibility: window.document.visibilityState
    })
  });

  this.virtualPage = function(url){
    url = url || window.location.href;
    socket.emit('virtualPage', {
      url: url
    });
  }

  if(options.trackHashChange == true){
    window.addEventListener("hashchange", function(){
      $this.virtualPage();
    })
  }

  squashTimeouts = {};

  function squash(event, threshold, callback) {
    window.clearTimeout(squashTimeouts[event]);
    squashTimeouts[event] = window.setTimeout(function() {
      callback();
    }, threshold);
  }

  var throttlePeriods = {};
  var throttleTimeouts = {};

  function throttle(event, period, callback) {
    var now = new Date().getTime();
    window.clearTimeout(throttleTimeouts[event]);
    var nextEventTime = throttlePeriods[event] || now;
    var diff = nextEventTime - now;
    var f = function() {
      callback();
      throttlePeriods[event] = now + period;
    }
    if (diff <= 0) {
      f();
    } else {
      throttleTimeouts[event] = window.setTimeout(function() {
        f();
      }, diff);
    }
  }

  function forEach(obj, f) {
    for (var i = 0; i < obj.length; i++) {
      f(obj[i]);
    }
  }

  var checkedRadios = {};

  window.addEventListener("load", function() {
    forEach(window.document.getElementsByTagName("input"), function(input) {
      input.addEventListener("change", function() {
        input.setAttribute("value", input.value);
        if (input.checked) {
          input.setAttribute("checked", true);
          if (input.type == "radio") {
            var prev = checkedRadios[input.name];
            if (prev) {
              prev.removeAttribute("checked");
            }
            checkedRadios[input.name] = input;
          }
        } else {
          input.removeAttribute("checked");
        }
      });
    });
    forEach(window.document.getElementsByTagName("textarea"), function(input) {
      input.addEventListener("change", function() {
        input.innerHTML = input.value;
      });
    });
    forEach(window.document.getElementsByTagName("select"), function(input) {
      input.addEventListener("change", function() {
        forEach(input.options, function(option) {
          if (option.selected) {
            option.setAttribute("selected", true);
          } else {
            option.removeAttribute("selected");
          }
        });
      });
    });
  });
}