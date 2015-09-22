var async = require('async');
var MongoDBDataStore = require("./mongodb-data-store.js");
var RecordingService = require("./recording-service.js");
var AssetHandler = require("./asset-handler.js");
var CSSParser = require("./css-parser.js");
var AssetCacher = require("./asset-cacher.js");
var DeferredAssetCacher = require("./deferred-asset-cacher.js");
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');
var fs = require("fs");
var kcl = require('aws-kcl');
var util = require('util');

if(fs.existsSync(__dirname + '/' + config.log)){
  fs.renameSync(__dirname + '/' + config.log, __dirname + '/' + config.log + '.' + new Date().toISOString().replace(/-/g, "").replace("T", "_").replace(/:/g, "").replace(/\..*/, ""));
}

var log_file = fs.createWriteStream(__dirname + '/' + config.log, {
  flags: 'w'
});

console.log = function(message) {
  log_file.write(new Date().toString() + ": " + util.format(message) + '\n');
}

var recordingService;

// Kinesis Consumer 

var consumer = {
  initialize: function(initializeInput, done) {
    console.log("Initialised");
    done()
  },

  processRecords: function(processRecordsInput, done) {
    console.log("processRecords");
    if (!processRecordsInput || !processRecordsInput.records) {
      done();
      return;
    }
    var records = processRecordsInput.records;
    console.log("Processing " + records.length + " records");
    async.eachSeries(records, function(record, done) {
      var string = new Buffer(record.data, 'base64').toString();
      //var string = record.Data.toString('utf8');
      var data = JSON.parse(string);
      recordingService.handleUpdate(data, function(err) {
        done(err);
      });
    }, function(err) {
      if (err) {
        console.log("ERROR: Unable to process records");
        console.log(err);
        throw err;
      } else {
        console.log("Checkpoint");
        processRecordsInput.checkpointer.checkpoint(
          function(err, sn) {
            done();
          }
        );
      }
    });
  },

  shutdown: function(shutdownInput, done) {
    console.log("Shutdown");
    if (shutdownInput.reason !== 'TERMINATE') {
      done();
      return;
    }
    shutdownInput.checkpointer.checkpoint(function(err) {
      done();
    });
  }
};

MongoClient.connect("mongodb://" + config.db.host + ":27017/" + config.db.database, function(err, db) {
  if (err) {
    console.log("Unable to connect to db: " + err);
  } else {
    console.log("Connected to db");
    var dataStore = new MongoDBDataStore(db);
    console.log("Starting recording service");
    var assetHandler1 = new AssetHandler(config, dataStore, new AssetCacher(config, dataStore));
    var cssParser = new CSSParser(assetHandler1);
    var assetHandler2 = new AssetHandler(config, dataStore, new AssetCacher(config, dataStore, cssParser));
    recordingService = new RecordingService(config, dataStore, assetHandler2, cssParser);
    console.log("Started");
    kcl(consumer).run();
  }
});

