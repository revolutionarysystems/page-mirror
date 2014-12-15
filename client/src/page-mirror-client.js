var PageMirrorClient = function(options) {

  var socket;
  if (options.url) {
    socket = io(options.url);
  } else {
    socket = io();
  }

  var window = window;
  if (options.window) {
    window = options.window;
  }

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
    id: sessionId
  });

  socket.on("monitoringSession", function() {
    var mirrorClient = new TreeMirrorClient(window.document, {
      initialize: function(rootId, children) {
        socket.emit('initialize', {
          base: window.location.href.match(/^(.*\/)[^\/]*$/)[1],
          rootId: rootId,
          children: children,
          viewportWidth: window.document.documentElement.clientWidth,
          viewportHeight: window.document.documentElement.clientHeight,
          pageXOffset: window.pageXOffset,
          pageYOffset: window.pageYOffset,
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
  });

  var scrollTimeoutId = false;

  window.addEventListener("scroll", function(e) {
    if (scrollTimeoutId !== false) {
      window.clearTimeout(scrollTimeoutId);
    }
    scrollTimeoutId = window.setTimeout(function() {
      socket.emit('scroll', {
        x: window.pageXOffset,
        y: window.pageYOffset
      });
    }, 500);
  });

  var resizeTimeoutId = false;

  window.addEventListener("resize", function(e) {
    if (resizeTimeoutId !== false) {
      window.clearTimeout(resizeTimeoutId);
    }
    resizeTimeoutId = window.setTimeout(function() {
      socket.emit('resize', {
        width: window.document.documentElement.clientWidth,
        height: window.document.documentElement.clientHeight,
      });
    }, 1000);
  });
}