var async = require('async');
var MongoDBRecordingStore = require("./mongodb-data-store.js");
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');
var fs = require("fs");
var http = require("http"); // http server core module
var https = require("https"); // https server core module
var express = require("express"); // web framework external module
var bodyParser = require('body-parser');

var recordingStore;

// Setup DB

MongoClient.connect("mongodb://" + config.db.host + ":27017/" + config.db.database, function(err, db) {
  if (err) {
    console.log("Unable to connect to db: " + err);
  } else {
    console.log("Connected to db");
    recordingStore = new MongoDBRecordingStore(db);

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
        } else if (!recording) {
          res.status(404).send();
        } else {
          recordingStore.countEvents(recording.session, (req.query.start * 1) + (req.query.duration * 1), function(err, result) {
            if (err) {
              res.status(500).send(err);
            } else {
              recording.length = result;
              recording.endTime = (req.query.start * 1) + (req.query.duration * 1);
              res.send(recording);
            }
          });
        }
      });
    });

    httpApp.get("/getEvents", function(req, res) {
      recordingStore.retrieveEvents(req.query.session, req.query.offset * 1, req.query.limit * 1, function(err, events) {
        res.set('Access-Control-Allow-Origin', '*');
        if (err) {
          res.status(500).send(err);
        } else {
          res.send(events);
        }
      });
    });

    httpApp.get("/deferred-asset", function(req, res) {
      console.log("deferred asset: " + req.query.key);
      var key = new Buffer(req.query.key, 'base64').toString();
      console.log("key = " + key);
      var tokens = key.split("::");
      var account = tokens[0];
      var href = tokens[1];
      var time = tokens[2] * 1;
      console.log(account);
      console.log(href);
      console.log(time);
      recordingStore.retrieveAsset({
        id: account + "::" + href,
        time: time
      }, function(err, asset) {
        if (asset) {
          href = asset.key;
        }
        res.status(500).send("Not Yet Implemented");
      });
    });

    httpApp.get("/searchRecordings", function(req, res) {
      var query;
      try {
        query = JSON.parse(req.query.query);
      } catch (err) {
        res.status(400).send(err);
      }
      if (query) {
        recordingStore.findRecordings(query, function(err, recordings) {
          res.set('Access-Control-Allow-Origin', '*');
          if (err) {
            res.status(500).send(err);
          } else {
            res.send(recordings);
          }
        });
      }
    });

    httpApp.get("/countRecordings", function(req, res) {
      var query;
      try {
        query = JSON.parse(req.query.query);
      } catch (err) {
        res.status(400).send(err);
      }
      if (query) {
        recordingStore.countRecordings(query, function(err, count) {
          if (err) {
            res.status(500).send(err);
          } else {
            res.send(count + "");
          }
        });
      }
    });
  }
});