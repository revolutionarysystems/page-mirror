var PageMirrorServer = function(socketServer, httpApp, recordingStore, options) {

  var bodyParser = require('body-parser')

  httpApp.use(bodyParser.json()); // to support JSON-encoded bodies
  httpApp.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
  }));

  // Setup default options
  options = options || {};
  options.autorecord = options.autorecord || false;

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
        recordSession(function(recording) {
          socketServer.sockets.in(sessionId).emit('monitoringSession');
          if (callback) {
            callback(recording);
          }
        });
      } else {
        socketServer.sockets.in(sessionId).emit('monitoringSession');
      }
    });

    socket.on("recordSession", function(callback) {
      recordSession(function(recording) {
        socket.join(sessionId);
        socket.broadcast.to(sessionId).emit('monitoringSession');
        if (callback) {
          callback(recording);
        }
      });
    })

    socket.on("monitorSession", function(args) {
      console.log("Monitoring session " + args.id);
      sessionId = args.id;
      socket.join(sessionId);
      socket.broadcast.to(sessionId).emit('monitoringSession');
    })

    socket.on('initialize', function(args, callback) {
      recordEvent("initialize", args, callback);
      socket.broadcast.to(sessionId).emit('initialize', args);
    });

    socket.on('applyChanged', function(args, callback) {
      recordEvent("applyChanged", args, callback);
      socket.broadcast.to(sessionId).emit('applyChanged', args);
    });

    socket.on('scroll', function(args, callback) {
      recordEvent("scroll", args, callback);
      socket.broadcast.to(sessionId).emit('scroll', args);
    });

    socket.on('resize', function(args, callback) {
      recordEvent("resize", args, callback);
      socket.broadcast.to(sessionId).emit('resize', args);
    });

    socket.on('mousemove', function(args, callback) {
      recordEvent("mousemove", args, callback);
      socket.broadcast.to(sessionId).emit('mousemove', args);
    });

    socket.on('mousedown', function(args, callback) {
      recordEvent("mousedown", args, callback);
      socket.broadcast.to(sessionId).emit('mousedown', args);
    });

    socket.on('mouseup', function(args, callback) {
      recordEvent("mouseup", args, callback);
      socket.broadcast.to(sessionId).emit('mouseup', args);
    });

    socket.on('visibilitychange', function(args, callback) {
      recordEvent("visibilitychange", args, callback);
      socket.broadcast.to(sessionId).emit('visibilitychange', args);
    });

    socket.on('virtualPage', function(args, callback) {
      recordEvent('virtualPage', args, callback);
      socket.broadcast.to(sessionId).emit('virtualPage', args);
    })

    socket.on('unload', function(args, callback) {
      recordEvent("unload", args, callback);
      socket.broadcast.to(sessionId).emit('unload', args);
    });

    socket.on('getRecordedSession', function(args, callback) {
      recordingStore.retrieve(args.id, callback);
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

    function recordSession(callback) {
      recordingStore.isBlacklisted(accountId, function(blacklisted) {
        if (blacklisted) {
          console.log("Account blacklisted");
          return;
        } else {
          recordingStore.retrieve(sessionId, function(err, recording) {
            if (!recording) {
              console.log("Recording session " + sessionId);
              var recording = {
                id: sessionId,
                account: accountId,
                session: sessionId,
                startTime: new Date().getTime(),
                lastEventTime: new Date().getTime(),
                events: [],
                pages: []
              }
              recordingStore.persist(recording);
            }
            callback(recording);
          });
        }
      });
    }

    function recordEvent(event, args, callback) {
      var now = new Date().getTime();
      recordingStore.retrieve(sessionId, function(err, recordedSession) {
        if (recordedSession) {
          if (recordedSession.pages.length == 0 && event != "initialize") {
            return;
          }
          if (recordedSession.pages.length > 0) {
            recordedSession.events.push({
              event: "wait",
              time: now,
              args: {
                time: now - recordedSession.lastEventTime
              }
            });
          }
          recordedSession.lastEventTime = now;
          recordedSession.events.push({
            event: event,
            time: now,
            args: args
          });
          recordedSession.lastEvent = event;
          if (recordedSession.pages.length > 0) {
            recordedSession.pages[recordedSession.pages.length - 1].endTime = now;
          }
          if (event == "virtualPage" || (event == "initialize" && (recordedSession.pages.length == 0 || args.new))) {
            recordedSession.pages.push({
              url: args.url,
              virtual: event == "virtualPage",
              startTime: now,
              index: recordedSession.events.length - 1
            });
          }
          recordingStore.persist(recordedSession);
          callback(recordedSession);
        }
      })
    }
  });

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
        res.send(count + "");
      }
    });
  });
}

module.exports = PageMirrorServer;