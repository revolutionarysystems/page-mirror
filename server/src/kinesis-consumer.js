var AWS = require('aws-sdk');
var async = require('async');
var MongoDBRecordingStore = require("./mongodb-recording-store.js");
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');
var fs = require("fs");
var request = require('request');
var s3 = new AWS.S3();
var md5 = require('MD5');
var s3Stream = require('s3-upload-stream')(s3);
var kcl = require('aws-kcl');
var util = require('util');
var url = require('url');

if(fs.existsSync(__dirname + '/' + config.log)){
  fs.renameSync(__dirname + '/' + config.log, __dirname + '/' + config.log + '.' + new Date().toISOString().replace(/-/g, "").replace("T", "_").replace(/:/g, "").replace(/\..*/, ""));
}

var log_file = fs.createWriteStream(__dirname + '/' + config.log, {
  flags: 'w'
});

console.log = function(message) {
  log_file.write(new Date().toString() + ": " + util.format(message) + '\n');
}

// Kinesis Consumer 

var consumer = {
  initialize: function(initializeInput, done) {
    done()
  },

  processRecords: function(processRecordsInput, done) {
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
      handleUpdate(data, function(err) {
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
    if (shutdownInput.reason !== 'TERMINATE') {
      done();
      return;
    }
    shutdownInput.checkpointer.checkpoint(function(err) {
      done();
    });
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
    kcl(consumer).run();
  }
});

// Process Updates

function handleUpdate(update, done) {
  //console.log("Handling update " + update.event + " for account " + update.account + ", session " + update.session);
  async.waterfall([function(done) {
    if (update.event == "initialize") {
      handleAssets(update.account, update.args.base, update.args.children, done);
    } else if (update.event == "applyChanged") {
      handleAssets(update.account, update.args.base, update.args.addedOrMoved, done);
    } else {
      done();
    }
  }], function(err) {
    recordUpdate(update, function(err) {
      if (err) {
        console.log("ERROR: Unable to save event in database");
        console.log(err);
      }
      done();
    });
  })
}

function handleAssets(account, baseUri, nodes, done) {
  if (nodes) {
    async.eachSeries(nodes, function(node, done) {
      if (node.tagName == "LINK" && node.attributes) {
        cacheAsset(account, baseUri, node.attributes.href, true, function(err, key) {
          if (!err && key) {
            node.attributes.href = key;
          } else if (err) {
            console.log("ERROR: Unable to cache " + node.attributes.href);
            console.log(err);
          }
          done();
        });
      } else if (node.tagName == "IMG" && node.attributes) {
        cacheAsset(account, baseUri, node.attributes.src, true, function(err, key) {
          if (!err && key) {
            node.attributes.src = key;
          } else if (err) {
            console.log("ERROR: Unable to cache " + node.attributes.src);
            console.log(err);
          }
          done();
        });
      } else if (node.tagName == "STYLE" && node.childNodes) {
        parseCSS(account, baseUri, '', node.childNodes[0].textContent, function(err, result) {
          if (result) {
            node.childNodes[0].textContent = result;
          } else if (err) {
            console.log("ERROR: Unable to parse inline style");
            console.log(err);
          }
          done();
        });
      } else if (node.tagName == "STYLE" && !node.childNodes) {
        var nodeId = node.id;
        var style;
        var styleNode;
        for (var i = 0; i < nodes.length; i++) {
          styleNode = nodes[i];
          if (styleNode.parentNode && styleNode.parentNode.id == nodeId) {
            style = styleNode.textContent;
            break;
          }
        }
        if (style) {
          parseCSS(account, baseUri, '', style, function(err, result) {
            if (result) {
              styleNode.textContent = result;
            } else if (err) {
              console.log("ERROR: Unable to parse inline style");
              console.log(err);
            }
            done();
          });
        } else {
          done();
        }
      } else if (node.attributes && node.attributes.style) {
        parseCSS(account, baseUri, '', node.attributes.style, function(err, result) {
          if (result) {
            node.attributes.style = result;
          }
          if (err) {
            console.log("ERROR: Unable to parse inline CSS");
            console.log(err);
          }
          handleAssets(account, baseUri, node.childNodes, done);
        });
      } else {
        handleAssets(account, baseUri, node.childNodes, done);
      }
    }, function(err) {
      if (err) {
        console.log("ERROR: Unable to cache assets");
        console.log(err);
      }
      done(err);
    });
  } else {
    done();
  }
}

function parseCSS(account, baseUri, relativeUri, body, done) {
  var assetRegex = /([\s\S]*?)(url\(([^)]+)\))(?!\s*[;,]?\s*\/\*\s*\*\/)|([\s\S]+)/img;
  var group;
  var result = "";
  async.whilst(function() {
    group = assetRegex.exec(body);
    return group != null;
  }, function(done) {
    if (group[4] == null) {
      result = result + group[1];
      var assetHref = group[3].replace(/['"]/g, "");
      if (assetHref.indexOf("data:") == 0) {
        result = result + group[2];
        done();
      } else {
        if (assetHref.indexOf("http") == 0) {
          // Leave as is
        } else if (assetHref.indexOf("//") == 0) {
          assetHref = "http:" + assetHref;
        } else {
          assetHref = baseUri + assetHref;
        }
        cacheAsset(account, null, assetHref, false, function(err, key) {
          if (!err && key) {
            result = result + 'url("' + relativeUri + key + '")';
          } else {
            result = result + group[2];
          }
          if (err) {
            console.log("ERROR: Unable to cache asset: " + assetHref);
            console.log(err);
          }
          done();
        });
      }
    } else {
      result = result + group[4];
      done();
    }
  }, function(err) {
    done(err, result);
  });
}

function cacheAsset(account, baseUri, href, recurse, complete) {
  if (href && href.indexOf("data:") != 0) {
    if (href.indexOf("http") == 0) {
      // leave as is
    } else if (href.indexOf("//") == 0) {
      href = "http:" + href;
    } else {
      href = baseUri + href;
    }
    for (var i = 0; i < config.assets.blacklist.length; i++) {
      var pattern = config.assets.blacklist[i];
      if (new RegExp(pattern).test(href)) {
        complete("Blacklisted");
        return;
      }
    }
    var hostname = url.parse(href).host;
    recordingStore.retrieveAssetHost(hostname, function(host) {
      if (!host) {
        host = {
          name: hostname,
          failures: 0
        }
      }
      if (host.failures >= config.assets.host_timeout_threshold && (new Date().getTime() - host.lastFailureTime) < config.assets.host_timeout_retry_period) {
        complete("Temporarily blacklisted");
      } else {
        var id = account + "::" + href;
        recordingStore.retrieveAssetEntry(id, function(asset) {
          var done = function(error, key) {
            async.waterfall([function(done) {
              if (!error && host.failures > 0) {
                recordingStore.deleteAssetHost(host.name, done);
              } else {
                done();
              }
            }, function(done) {
              recordingStore.saveAssetEntry({
                id: id,
                key: key,
                time: new Date().getTime(),
                broken: error != null,
                error: error
              }, done);
            }], function(err) {
              if (err) {
                console.log("ERROR: Unable to log asset");
                console.log(err);
              }
              complete(error, key);
            });
          };
          if (!asset || (asset.broken && asset.time < new Date().getTime() - config.assets.broken_check_interval) || (!asset.broken && asset.time < new Date().getTime() - config.assets.check_interval)) {
            request.head(href, {
              headers: {
                "Referer": baseUri
              },
              timeout: config.assets.head_timeout
            }, function(error, response) {
              if (error) {
                if (error.code == "ETIMEDOUT") {
                  host.failures = host.failures + 1;
                  host.lastFailureTime = new Date().getTime();
                  recordingStore.saveAssetHost(host, function() {
                    done(error);
                  });
                } else {
                  done(error);
                }
              } else if (response.statusCode != 200) {
                done(response.statusCode);
              } else {
                var lastModified = response.headers['last-modified'];
                var contentType = response.headers['content-type'];
                var key = account + "/" + md5(href + lastModified);
                s3.headObject({
                  Bucket: config.assets.bucket,
                  Key: key
                }, function(err, data) {
                  if (data) {
                    done(null, key);
                  } else {
                    if (err && err.code != "NotFound") {
                      done(err);
                    } else {
                      if (recurse && contentType.indexOf("text/css") == 0) {
                        request(href, {
                          headers: {
                            "Referer": baseUri
                          },
                          timeout: config.assets.timeout
                        }, function(err, response, body) {
                          if (err) {
                            done(err);
                          } else if (response.statusCode != 200) {
                            done(response.statusCode);
                          } else {
                            parseCSS(account, href.substring(0, href.lastIndexOf("/") + 1), '../', body, function(err, result) {
                              if (err) {
                                done(err);
                              } else {
                                s3.putObject({
                                  Bucket: config.assets.bucket,
                                  Key: key,
                                  Body: result,
                                  ACL: "public-read",
                                  ContentType: contentType,
                                  Metadata: {
                                    lastModified: lastModified || "unknown",
                                    source: href
                                  }
                                }, function(err, data) {

                                  done(err, key);
                                });
                              }
                            });
                          }
                        })
                      } else {
                        request(href, {
                          encoding: null,
                          headers: {
                            "Referer": baseUri
                          },
                          timeout: config.assets.timeout
                        }, function(err, response, body) {
                          if (err) {
                            done(err);
                          } else if (response.statusCode != 200) {
                            done(response.statusCode);
                          } else {
                            s3.putObject({
                              Bucket: config.assets.bucket,
                              Key: key,
                              Body: body,
                              ACL: "public-read",
                              ContentType: contentType,
                              Metadata: {
                                lastModified: lastModified || "unknown",
                                source: href
                              }
                            }, function(err, data) {
                              done(err, key);
                            });
                          }
                        });                        
                      }
                    }
                  }
                });
              }
            });
          } else {
            complete(null, asset.key);
          }
        });
      }
    });

  } else {
    complete();
  }
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
  }], function(error) {
    if (error && recording) {
      recording.error = error.toString();
      recordingStore.persistRecording(recording, function(err) {
        if (err) {
          console.log("ERROR: Unable to record recording failure in database");
          console.log(err);
        }
        done(error);
      });
    } else {
      done(error);
    }
  });
}