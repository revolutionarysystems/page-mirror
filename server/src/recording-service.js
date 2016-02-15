var async = require('async');
var fs = require("fs");

var RecordingService = function(config, dataStore, assetHandler, cssParser) {
  this.handleUpdate = function(update, done) {
    //console.log("Handling update " + update.event + " for account " + update.account + ", session " + update.session);
    async.waterfall([function(done) {
      if (config.assets.cache) {
        if (update.event == "initialize") {
          handleAssets(update.account, update.args.base, update.args.children, done);
        } else if (update.event == "applyChanged") {
          handleAssets(update.account, update.args.base, update.args.addedOrMoved, done);
        } else {
          done();
        }
      } else {
        done();
      }
    }], function(err) {
      persistUpdate(update, function(err) {
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
          assetHandler.handleAsset(account, baseUri, node.attributes.href, function(err, key) {
            if (!err && key) {
              node.attributes.href = key;
            } else if (err) {
              console.log("ERROR: Unable to cache " + node.attributes.href);
              console.log(err);
            }
            done();
          });
        } else if (node.tagName == "IMG" && node.attributes) {
          assetHandler.handleAsset(account, baseUri, node.attributes.src, function(err, key) {
            if (!err && key) {
              node.attributes.src = key;
            } else if (err) {
              console.log("ERROR: Unable to cache " + node.attributes.src);
              console.log(err);
            }
            done();
          });
        } else if (node.tagName == "STYLE" && node.childNodes) {
          cssParser.parse(account, baseUri, '', node.childNodes[0].textContent, function(err, result) {
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
            cssParser.parse(account, baseUri, '', style, function(err, result) {
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
          cssParser.parse(account, baseUri, '', node.attributes.style, function(err, result) {
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

  function persistUpdate(update, done) {
    var recording;
    async.series([function(done) {
      dataStore.retrieveRecording(update.session, function(err, result) {
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
          dataStore.persistRecording(recording, done);
        }
      });
    }, function(done) {
      var event = {
        event: update.event,
        time: update.time,
        session: update.session,
        args: update.args
      };
      dataStore.persistEvent(event, done);
    }, function(done) {
      if (update.event == "virtualPage" || (update.event == "initialize" && (recording.pages.length == 0 || update.args.new))) {
        if (recording.pages.length > 0) {
          recording.pages[recording.pages.length - 1].endTime = update.time;
        }
        recording.pages.push({
          url: update.args.url,
          virtual: update.event == "virtualPage",
          startTime: update.time
        });
        dataStore.persistRecording(recording, done);
      } else {
        done();
      }
    }], function(error) {
      if (error && recording) {
        recording.error = error.toString();
        dataStore.persistRecording(recording, function(err) {
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
}

module.exports = RecordingService;