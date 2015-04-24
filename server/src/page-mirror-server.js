var PageMirrorServer = function(socketServer, recordingStore, options) {

  var uuid = require("node-uuid");

  // Setup default options
  options = options || {};
  options.autorecord = options.autorecord || false;
  options.recordingTimeout = options.recordingTimeout || 10000;

  var recordingSessions = {};

  socketServer.on('connection', function(socket) {

    var sessionId;

    console.log('a user connected');

    socket.on('disconnect', function() {
      console.log('user disconnected');
    });

    socket.on("createSession", function(args, callback) {
      console.log("Creating session " + args.id);
      sessionId = args.id;
      socket.join(sessionId);
      var result = null;
      if(options.autorecord == true || args.record == true){
        recordSession();
        result = recordingSessions[sessionId];
      }
      socketServer.sockets.in(sessionId).emit('monitoringSession');
      if(callback){
        callback(result);
      }
    });

    socket.on("recordSession", function(callback) {
      if (!isRecording()) {
        recordSession();
        socket.join(sessionId);
        socket.broadcast.to(sessionId).emit('monitoringSession');
        if(callback){
          callback(recordingSessions[sessionId]);
        }
      }
    })

    socket.on("stopRecordingSession", function(args, callback) {
      recordingSession = recordingSessions[sessionId];
      if (recordingSession) {
        stopRecordingSession(recordingSession);
        callback(recordingSession.id);
      }else{
        callback(null);
      }
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

    socket.on('mousemove', function(args) {
      recordEvent("mousemove", args);
      socket.broadcast.to(sessionId).emit('mousemove', args);
    });

    socket.on('mousedown', function(args) {
      recordEvent("mousedown", args);
      socket.broadcast.to(sessionId).emit('mousedown', args);
    });

    socket.on('mouseup', function(args) {
      recordEvent("mouseup", args);
      socket.broadcast.to(sessionId).emit('mouseup', args);
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
          callback(err);
        } else {
          callback(null, session);
        }
      });
    });

    socket.on('getRecordedSessions', function(callback){
      recordingStore.find(function(err, sessions){
        if(err){
          callback([]);
        }else{
          callback(sessions);
        }
      })
    })

    socket.on('getRecordingSessions', function(callback){
      callback(recordingSessions);
    })

    function recordSession(){
      if (!isRecording()) {
        console.log("Recording session " + sessionId);
        recordingSessions[sessionId] = {
          id: uuid.v4(),
          session: sessionId,
          startTime: new Date().getTime(),
          lastEventTime: new Date().getTime(),
          events: [],
          pages: []
        };
      }
    }

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
        if(event == "initialize" && (recordedSession.pages.length == 0 || args.new)){
          recordedSession.pages.push({
            url: args.url,
            index: recordedSession.events.length-1
          });
        }
      }
    }
  });

  function stopRecordingSession(recordingSession){
    console.log("Stopped recording session " + recordingSession.session);
    recordingSession.endTime = new Date().getTime();
    recordingStore.persist(recordingSession);
    delete recordingSessions[recordingSession.session];
  }

  setInterval(function(){
    var now = new Date().getTime();
    for(id in recordingSessions){
      var session = recordingSessions[id];
      if(now - session.lastEventTime >= options.recordingTimeout){
        stopRecordingSession(session);
      }
    }
  }, 10000);
}

module.exports = PageMirrorServer;