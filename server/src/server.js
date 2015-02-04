// Load required modules
var http = require("http"); // http server core module
var express = require("express"); // web framework external module
var io = require("socket.io"); // web socket external module

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(express.static(__dirname + "/static/"));

// Start Express http server on port 8080
var webServer = http.createServer(httpApp).listen(8070);

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {
  "log level": 1
});

var recordingSessions = {};
var recordedSessions = {};

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
    socketServer.to(sessionId).emit('monitoringSession');
  });

  socket.on("recordSession", function(args) {
    console.log("Recording session " + args.id);
    sessionId = args.id;
    recordingSessions[sessionId] = {startTime: new Date().getTime(), lastEventTime: new Date().getTime(), events: []};
    socket.join(sessionId);
    socket.broadcast.to(sessionId).emit('monitoringSession');
  })

  socket.on("stopRecordingSession", function(args){
    console.log("Stopped recording session " + args.id);
    sessionId = args.id;
    recordingSession = recordingSessions[sessionId];
    recordingSession.endTime = new Date().getTime();
    recordedSessions[sessionId] = recordingSession;
    delete recordingSessions[sessionId];
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

  socket.on('getRecordedSession', function(args, callback) {
    var session = recordedSessions[args.id] || {events: []};
    callback(session.events);
  });

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