var socket = io();

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

var initialized = false;

window.addEventListener("load", function() {

  socket.emit("createSession", {
    id: sessionId
  });

  socket.on("monitoringSession", function() {
    var mirrorClient = new TreeMirrorClient(document, {
      initialize: function(rootId, children) {
        console.log("Initialise");
        console.log(rootId);
        console.log(children);
        socket.emit('initialize', {
          rootId: rootId,
          children: children,
          new: !initialized
        });
        initialized = true;
      },

      applyChanged: function(removed, addedOrMoved, attributes, text) {
        console.log("applyChanged");
        console.log(removed);
        console.log(addedOrMoved);
        console.log(attributes);
        console.log(text);
        socket.emit('applyChanged', {
          removed: removed,
          addedOrMoved: addedOrMoved,
          attributes: attributes,
          text: text
        });
      }
    });
  })
});