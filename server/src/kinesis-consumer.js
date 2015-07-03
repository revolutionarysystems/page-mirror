var AWS = require('aws-sdk');
var kcl = require('kinesis-client-library');
var async = require('async');
var MongoDBRecordingStore = require("./mongodb-recording-store.js");
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');
var fs = require("fs");
var request = require('request');
var s3 = new AWS.S3();
var md5 = require('MD5');
var s3Stream = require('s3-upload-stream')(s3);

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

// Process Updates

function handleUpdate(update, done) {
  //console.log("Handling update " + update.event + " for account " + update.account + ", session " + update.session);
  if (update.event == "initialize") {
    handleAssets(update.account, update.args.base, update.args.children, function() {
      recordUpdate(update, done);
    });
  } else if (update.event == "applyChanged") {
    handleAssets(update.account, update.args.base, update.args.addedOrMoved, function() {
      recordUpdate(update, done);
    });
  } else {
    recordUpdate(update, done);
  }
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
    var id = account + "::" + href;
    recordingStore.retrieveAssetEntry(id, function(asset) {
      var done = function(error, key) {
        recordingStore.saveAssetEntry({
          id: id,
          key: key,
          time: new Date().getTime(),
          broken: error != null,
          error: error
        }, function(err) {
          if (err) {
            console.log("ERROR: Unable to log asset");
            console.log(err);
          }
          complete(error, key);
        });
      };
      if (!asset || (asset.broken && asset.time < new Date().getTime() - config.assets.broken_check_interval) || (!asset.broken && asset.time < new Date().getTime() - config.assets.check_interval)) {
        //console.log("Cache asset: " + href);
        request.head(href, function(error, response) {
          if (error) {
            done(error);
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
                    request(href, function(err, response, body) {
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
                    var upload = s3Stream.upload({
                      Bucket: config.assets.bucket,
                      Key: key,
                      ACL: "public-read",
                      ContentType: contentType,
                      Metadata: {
                        lastModified: lastModified || "unknown",
                        source: href
                      }
                    }).on('error', function(err) {
                      done(err);
                    }).on('uploaded', function(details) {
                      done(null, key);
                    });
                    request.get(href).on('error', function(err) {
                      done(err);
                    }).pipe(upload);
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
  }], function(err) {
    done(err);
  });
}