var PageMirrorClient = function(updateHandler, options) {

  var $this = this;

  options = options || {};

  var window = options.window || window;
  options.record = options.record || false;
  options.onInit = options.onInit || function() {};
  options.onUpdate = options.onUpdate || function() {};
  options.account = options.account || "";
  options.ignoreAttribute = options.ignoreAttribute || "mirrorIgnore";

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

  function sendUpdate(event, args) {
    if (initialized || event == "initialize") {
      var eventIndex = sessionStorage.eventIndex;
      if (eventIndex == undefined) {
        eventIndex = -1;
      }
      eventIndex = eventIndex * 1 + 1;
      sessionStorage.eventIndex = eventIndex;
      var now = new Date().getTime();
      if (initialized) {
        options.onUpdate(event, eventIndex, args);
      } else {
        options.onInit(event, eventIndex, args);
      }
      updateHandler.send({
        account: options.account,
        session: sessionId,
        time: now,
        index: eventIndex,
        event: event,
        args: args
      });
    }
  }

  var mirrorClient = new TreeMirrorClient(window.document, {
    initialize: function(rootId, children) {
      sendUpdate('initialize', {
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
      sendUpdate('applyChanged', {
        base: window.location.href.match(/^(.*\/)[^\/]*$/)[1],
        removed: removed,
        addedOrMoved: addedOrMoved,
        attributes: attributes,
        text: text
      });
    }
  });

  var scrollTimeoutId = false;

  window.addEventListener("scroll", function(e) {
    squash("scroll", 500, function() {
      sendUpdate('scroll', {
        x: window.pageXOffset,
        y: window.pageYOffset
      });
    });
  });

  var resizeTimeoutId = false;

  window.addEventListener("resize", function(e) {
    squash("resize", 1000, function() {
      sendUpdate('resize', {
        width: window.document.documentElement.clientWidth,
        height: window.document.documentElement.clientHeight,
      });
    })
  });

  window.addEventListener("unload", function(e) {
    sendUpdate('unload');
  });

  window.addEventListener("mousemove", function(e) {
    throttle("mousemove", 200, function() {
      if (initialized) {
        sendUpdate('mousemove', {
          x: e.clientX,
          y: e.clientY
        });
      }
    });
  });

  window.addEventListener("mousedown", function(e) {
    sendUpdate('mousedown', {
      x: e.clientX,
      y: e.clientY
    });
  });

  window.addEventListener("mouseup", function(e) {
    sendUpdate('mouseup', {
      x: e.clientX,
      y: e.clientY
    });
  });

  window.document.addEventListener("visibilitychange", function() {
    sendUpdate('visibilitychange', {
      visibility: window.document.visibilityState
    })
  });

  this.virtualPage = function(url) {
    url = url || window.location.href;
    sendUpdate('virtualPage', {
      url: url
    });
  }

  if (options.trackHashChange == true) {
    window.addEventListener("hashchange", function() {
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
      if (!input.hasAttribute(options.ignoreAttribute)) {
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
      }
    });
    forEach(window.document.getElementsByTagName("textarea"), function(input) {
      if (!input.hasAttribute(options.ignoreAttribute)) {
        input.addEventListener("change", function() {
          input.innerHTML = input.value;
        });
      }
    });
    forEach(window.document.getElementsByTagName("select"), function(input) {
      if (!input.hasAttribute(options.ignoreAttribute)) {
        input.addEventListener("change", function() {
          forEach(input.options, function(option) {
            if (option.selected) {
              option.setAttribute("selected", true);
            } else {
              option.removeAttribute("selected");
            }
          });
        });
      }
    });
  });

}

PageMirrorClient.KinesisUpdateHandler = function(kinesisClient) {
  this.send = function(update) {
    kinesisClient.put(JSON.stringify(update), {
      onSuccess: function() {},
      onError: function() {}
    });
  }
};

PageMirrorClient.DebugUpdateHandler = function(updateHandler) {
  this.send = function(update) {
    console.log(update);
    updateHandler.send(update);
  }
};