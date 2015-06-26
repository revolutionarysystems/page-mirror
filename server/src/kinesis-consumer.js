var kcl = require('kinesis-client-library');
var async = require('async');
var MongoDBRecordingStore = require("./mongodb-recording-store.js");
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');
var fs = require("fs");
var http = require("http"); // http server core module
var https = require("https"); // https server core module
var express = require("express"); // web framework external module
var bodyParser = require('body-parser');

// Kinesis Consumer 

var consumer = {
  initialize: function(done) {
    done()
  },

  processRecords: function(records, done) {
    async.eachSeries(records, function(record, done) {
      var string = record.Data.toString('utf8');
      var data = JSON.parse(string);
      handleUpdate(data, function(err) {
        done(err);
      });
    }, function(err) {
      done(err, err == null);
    });
  },

  shutdown: function(done) {
    done();
  }
};

var recordingStore;

// Setup DB

MongoClient.connect("mongodb://" + config.db.host + ":27017/" + config.db.database, function(err, db) {
  if (err) {
    console.log("Unable to connect to db: " + err);
  } else {
    console.log("Connected to db");
    recordingStore = new MongoDBRecordingStore(db);
    kcl.AbstractConsumer.extend(consumer);
  }
});

// Web Server

var httpApp = express();
//httpApp.use(express.static(__dirname + "/static/"));
httpApp.use(bodyParser.json()); // to support JSON-encoded bodies
httpApp.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));

var webServer;
if (config.protocol == "https") {
  var options = {
    key: fs.readFileSync(config.ssl.key),
    cert: fs.readFileSync(config.ssl.cert),
    ca: fs.readFileSync(config.ssl.ca)
  };
  webServer = https.createServer(options, httpApp).listen(config.port);
} else {
  webServer = http.createServer(httpApp).listen(config.port);
}

httpApp.post("/blacklist", function(req, res) {
  recordingStore.blacklist(req.body.account);
  res.status(204).end();
});

httpApp.post("/clearBlacklist", function(req, res) {
  recordingStore.clearBlacklist();
  res.status(204).end();
});

httpApp.get("/getRecording", function(req, res) {
  recordingStore.retrieveRecording(req.query.id, function(err, recording) {
    res.set('Access-Control-Allow-Origin', '*');
    if (err) {
      res.status(500).send(err);
    } else {
      recordingStore.retrieveEvents(recording.session, function(err, events) {
        if (err) {
          res.status(500).send(err);
        } else {
          recording.events = events;
          res.send(recording);
        }
      });
    }
  });
});

httpApp.get("/searchRecordings", function(req, res) {
  recordingStore.findRecordings(JSON.parse(req.query.query), function(err, recordings) {
    res.set('Access-Control-Allow-Origin', '*');
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(recordings);
    }
  });
});

httpApp.get("/countRecordings", function(req, res) {
  recordingStore.countRecordings(JSON.parse(req.query.query), function(err, count) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(count + "");
    }
  });
});

// Process Updates

function handleUpdate(update, done) {
  //console.log("Handling update " + update.event + " for account " + update.account + ", session " + update.session);
  //console.log(update.args);
  recordUpdate(update, done);
}

function recordUpdate(update, done) {
  var recording;
  async.series([function(done) {
    recordingStore.retrieveRecording(update.session, function(err, result) {
      if (result) {
        recording = result;
        done();
      } else {
        recording = {
          id: update.session,
          account: update.account,
          session: update.session,
          startTime: update.time,
          pages: []
        }
        recordingStore.persistRecording(recording, done);
      }
    });
  }, function(done) {
    var event = {
      event: update.event,
      time: update.time,
      session: update.session,
      args: update.args
    };
    recordingStore.persistEvent(event, done);
  }, function(done) {
    if (recording.pages.length > 0) {
      recording.pages[recording.pages.length - 1].endTime = update.time;
    }
    if (update.event == "virtualPage" || (update.event == "initialize" && (recording.pages.length == 0 || update.args.new))) {
      recording.pages.push({
        url: update.args.url,
        virtual: update.event == "virtualPage",
        startTime: update.time
      });
    }
    recordingStore.persistRecording(recording, done);
  }], function(err) {
    done(err);
  });
}