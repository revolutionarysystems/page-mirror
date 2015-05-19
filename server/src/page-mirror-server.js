var PageMirrorServer = function(socketServer, httpApp, recordingStore, options) {

  var uuid = require("node-uuid");
  var bodyParser = require('body-parser')

  httpApp.use(bodyParser.json()); // to support JSON-encoded bodies
  httpApp.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
  }));

  // Setup default options
  options = options || {};
  options.autorecord = options.autorecord || false;
  options.sessionTimeout = options.sessionTimeout || 1800000;
  options.loadingTimeout = options.loadingTimeout || 30000;

  var recordings = {};
  var recordingsBySessionId = {};

  socketServer.on('connection', function(socket) {

    var sessionId;
    var accountId;

    console.log('a user connected');

    socket.on('disconnect', function() {
      console.log('user disconnected');
    });

    socket.on("createSession", function(args, callback) {
      console.log("Creating session " + args.id);
      sessionId = args.id;
      accountId = args.account;
      socket.join(sessionId);
      var result = null;
      if (options.autorecord == true || args.record == true) {
        recordSession();
        result = recordingsBySessionId[sessionId];
      }
      socketServer.sockets.in(sessionId).emit('monitoringSession');
      if (callback) {
        callback(result);
      }
    });

    socket.on("recordSession", function(callback) {
      if (!isRecording()) {
        recordSession();
        socket.join(sessionId);
        socket.broadcast.to(sessionId).emit('monitoringSession');
        if (callback) {
          callback(recordingsBySessionId[sessionId]);
        }
      }
    })

    socket.on("stopRecordingSession", function(args, callback) {
      recordingSession = recordingsBySessionId[sessionId];
      if (recordingSession) {
        stopRecordingSession(recordingSession);
        callback(recordingSession.id);
      } else {
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

    socket.on('visibilitychange', function(args) {
      recordEvent("visibilitychange", args);
      socket.broadcast.to(sessionId).emit('visibilitychange', args);
    });

    socket.on('virtualPage', function(args) {
      recordEvent('virtualPage', args);
      socket.broadcast.to(sessionId).emit('virtualPage', args);
    })

    socket.on('unload', function(args) {
      recordEvent("unload", args);
      socket.broadcast.to(sessionId).emit('unload', args);
    });

    socket.on('isRecording', function(args, callback) {
      callback(isRecording());
    });

    socket.on('getRecordedSession', function(args, callback) {
      var recording = recordings[args.id];
      if (recording) {
        callback(null, recording);
      } else {
        recordingStore.retrieve(args.id, callback);
      }
    });

    socket.on('getRecordedSessions', function(callback) {
      recordingStore.find({}, function(err, sessions) {
        if (err) {
          callback([]);
        } else {
          callback(sessions);
        }
      })
    })

    socket.on('getRecordingSessions', function(callback) {
      callback(recordingsBySessionId);
    })

    function recordSession() {
      if (!isRecording()) {
        recordingStore.isBlacklisted(accountId, function(blacklisted) {
          if (blacklisted) {
            console.log("Account blacklisted");
            return;
          } else {
            console.log("Recording session " + sessionId);
            var recording = {
              id: uuid.v4(),
              account: accountId,
              status: "recording",
              session: sessionId,
              startTime: new Date().getTime(),
              lastEventTime: new Date().getTime(),
              events: [],
              pages: []
            }
            recordingsBySessionId[sessionId] = recording;
            recordings[recording.id] = recording;
          }
        });
      }
    }

    function isRecording() {
      return recordingsBySessionId[sessionId] != null;
    }

    function recordEvent(event, args) {
      var now = new Date().getTime();
      var recordedSession = recordingsBySessionId[sessionId];
      if (recordedSession) {
        if (recordedSession.pages.length == 0 && event != "initialize") {
          return;
        }
        recordedSession.events.push({
          event: "wait",
          time: now,
          args: {
            time: now - recordedSession.lastEventTime
          }
        });
        recordedSession.lastEventTime = now;
        recordedSession.events.push({
          event: event,
          time: now,
          args: args
        });
        recordedSession.lastEvent = event;
        if (event == "virtualPage" || (event == "initialize" && (recordedSession.pages.length == 0 || args.new))) {
          if (recordedSession.pages.length > 0) {
            recordedSession.pages[recordedSession.pages.length - 1].endTime = now;
          }
          recordedSession.pages.push({
            url: args.url,
            virtual: event == "virtualPage",
            startTime: now,
            index: recordedSession.events.length - 1
          });
        }
      }
    }
  });

  function stopRecordingSession(recordingSession) {
    console.log("Stopped recording session " + recordingSession.session);
    recordingSession.events.push({
      event: "end",
      time: recordingSession.lastEventTime,
      args: {}
    });
    recordingSession.pages[recordingSession.pages.length - 1].endTime = recordingSession.lastEventTime;
    recordingSession.endTime = recordingSession.lastEventTime;
    recordingSession.status = "recorded";
    recordingStore.persist(recordingSession);
    delete recordingsBySessionId[recordingSession.session];
    delete recordings[recordingSession.id];
  }

  setInterval(function() {
    var now = new Date().getTime();
    for (id in recordingsBySessionId) {
      var session = recordingsBySessionId[id];
      if (now - session.lastEventTime >= options.sessionTimeout) {
        stopRecordingSession(session);
      }
      if (session.lastEvent == "unload" && (now - session.lastEventTime >= options.loadingTimeout)) {
        stopRecordingSession(session);
      }
    }
  }, 10000);

  httpApp.post("/blacklist", function(req, res) {
    recordingStore.blacklist(req.body.account);
    res.status(204).end();
  });

  httpApp.post("/clearBlacklist", function(req, res) {
    recordingStore.clearBlacklist();
    res.status(204).end();
  });

  httpApp.get("/searchRecordings", function(req, res) {
    recordingStore.find(JSON.parse(req.query.query), function(err, recordings) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(recordings);
      }
    });
  });

  httpApp.get("/countRecordings", function(req, res) {
    recordingStore.count(JSON.parse(req.query.query), function(err, count) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(count+"");
      }
    });
  });
}

module.exports = PageMirrorServer;