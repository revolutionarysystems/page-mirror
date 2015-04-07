var PageMirrorServer = function(socketServer, recordingStore) {

  var uuid = require("node-uuid");

  var recordingSessions = {};

  socketServer.on('connection', function(socket) {

    var sessionId;
    var lastEventTime;

    console.log('a user connected');

    socket.on('disconnect', function() {
      console.log('user disconnected');
    });

    socket.on("createSession", function(args) {
      console.log("Creating session " + args.id);
      sessionId = args.id;
      socket.join(sessionId);
      socketServer.sockets.in(sessionId).emit('monitoringSession');
    });

    socket.on("recordSession", function() {
      if (!isRecording()) {
        console.log("Recording session " + sessionId);
        recordingSessions[sessionId] = {
          startTime: new Date().getTime(),
          lastEventTime: new Date().getTime(),
          events: []
        };
        socket.join(sessionId);
        socket.broadcast.to(sessionId).emit('monitoringSession');
      }
    })

    socket.on("stopRecordingSession", function(args, callback) {
      recordingSession = recordingSessions[sessionId];
      if (recordingSession) {
        console.log("Stopped recording session " + sessionId);
        recordingSession.endTime = new Date().getTime();
        recordingSession.session = sessionId;
        var id = uuid.v4();
        recordingSession.id = id;
        recordingStore.persist(recordingSession);
        delete recordingSessions[sessionId];
        callback(id);
      }
      callback(null);
    });

    socket.on("monitorSession", function(args) {
      console.log("Monitoring session " + args.id);
      sessionId = args.id;
      socket.join(sessionId);
      socket.broadcast.to(sessionId).emit('monitoringSession');
    })

    socket.on('initialize', function(args) {
      recordEvent("initialize", args);
      socket.broadcast.to(sessionId).emit('initialize', args);
    });

    socket.on('applyChanged', function(args) {
      recordEvent("applyChanged", args);
      socket.broadcast.to(sessionId).emit('applyChanged', args);
    });

    socket.on('scroll', function(args) {
      recordEvent("scroll", args);
      socket.broadcast.to(sessionId).emit('scroll', args);
    });

    socket.on('resize', function(args) {
      recordEvent("resize", args);
      socket.broadcast.to(sessionId).emit('resize', args);
    });

    socket.on('unload', function(args) {
      recordEvent("unload", args);
      socket.broadcast.to(sessionId).emit('unload', args);
    });

    socket.on('isRecording', function(args, callback) {
      callback(isRecording());
    });

    socket.on('getRecordedSession', function(args, callback) {
      recordingStore.retrieve(args.id, function(err, session) {
        if (err) {
          callback([]);
        } else {
          session = session || {
            events: []
          };
          callback(session.events);
        }
      });
    });

    function isRecording() {
      return recordingSessions[sessionId] != null;
    }

    function recordEvent(event, args) {
      var now = new Date().getTime();
      var recordedSession = recordingSessions[sessionId];
      if (recordedSession) {
        recordedSession.events.push({
          event: "wait",
          args: {
            time: now - recordedSession.lastEventTime
          }
        });
        recordedSession.lastEventTime = now;
        recordedSession.events.push({
          event: event,
          args: args
        });
      }
    }
  });
}

module.exports = PageMirrorServer;