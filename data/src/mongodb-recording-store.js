var MongoDBRecordingStore = function(db) {

	var recordingDB = db.collection("recordings");
	var blacklistDB = db.collection("blacklist");
	var eventDB = db.collection("events");
	eventDB.ensureIndex("session", function(err) {
		if (err) {
			console.log("ERROR: Unable to ensure session index on eventDB");
			console.log(err);
		}
	});
	var assetDB = db.collection("assets");
	var hostDB = db.collection("hosts");

	this.persistRecording = function(recording, callback) {
		recording._id = recording.id;
		recordingDB.save(recording, function(err, result) {
			callback(err, result);
		});
	}

	this.persistEvent = function(event, callback) {
		event._id = event.id;
		event.args = JSON.stringify(event.args);
		eventDB.save(event, function(err, result) {
			callback(err, result);
		})
	}

	this.retrieveRecording = function(id, callback) {
		recordingDB.findOne({
			_id: id
		}, callback);
	}

	this.findRecordings = function(query, callback) {
		recordingDB.find(query, function(err, cursor) {
			cursor.toArray(function(err, results) {
				callback(err, results);
			});
		});
	}

	this.countRecordings = function(query, callback) {
		recordingDB.find(query, function(err, cursor) {
			cursor.count(false, callback);
		});
	}

	this.retrieveEvents = function(session, callback) {
		eventDB.find({
			session: session
		}, function(err, cursor) {
			cursor.sort({
				time: 1
			});
			cursor.toArray(function(err, results) {
				if (results) {
					for (var i = 0; i < results.length; i++) {
						var result = results[i];
						if (typeof result.args == "string") {
							result.args = JSON.parse(result.args);
						}
					}
				}
				callback(err, results);
			});
		});
	}

	this.blacklist = function(id) {
		blacklistDB.save({
			_id: id
		}, function(err, result) {
			if (err) {
				console.log("Unable to blacklist " + id + ": " + err);
			} else {
				console.log("Account " + id + " blacklisted");
			}
		});
	}

	this.isBlacklisted = function(id, callback) {
		blacklistDB.findOne({
			_id: id
		}, function(err, doc) {
			if (err) {
				callback(false);
			} else {
				callback(!!doc);
			}
		});
	}

	this.clearBlacklist = function() {
		blacklistDB.remove({}, function(err) {
			if (err) {
				console.log("Unabled to clear blacklist: " + err);
			} else {
				console.log("Blacklist cleared");
			}
		});
	}

	this.saveAssetEntry = function(asset, callback) {
		asset._id = asset.id;
		assetDB.save(asset, callback);
	}

	this.retrieveAssetEntry = function(id, callback) {
		assetDB.findOne({
			_id: id
		}, function(err, doc) {
			if (doc) {
				callback(doc);
			} else {
				callback();
			}
		})
	}

	this.saveAssetHost = function(host, callback) {
		host._id = host.name;
		hostDB.save(host, callback);
	}

	this.retrieveAssetHost = function(name, callback) {
		hostDB.findOne({
			_id: name
		}, function(err, doc) {
			if (doc) {
				callback(doc);
			} else {
				callback();
			}
		});
	}

	this.deleteAssetHost = function(name, callback) {
		hostDB.remove({
			_id: name
		}, callback);
	}

}

module.exports = MongoDBRecordingStore;