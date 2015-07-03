var MongoDBRecordingStore = function(db) {

	var recordingDB = db.collection("recordings");
	var blacklistDB = db.collection("blacklist");
	var eventDB = db.collection("events");
	eventDB.ensureIndex("session", function(err){
		if(err){
			console.log("ERROR: Unable to ensure session index on eventDB");
			console.log(err);
		}
	});
	var assetDB = db.collection("assets");

	this.persistRecording = function(recording, callback) {
		recording._id = recording.id;
		recordingDB.save(recording, function(err, result) {
			callback(err, result);
		});
	}

	this.persistEvent = function(event, callback) {
		event._id = event.id;
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
			cursor.toArray(function(err, result) {
				callback(err, result);
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
			cursor.sort({time: 1});
			cursor.toArray(function(err, result) {
				callback(err, result);
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

	this.saveAssetEntry = function(asset, callback){
		asset._id = asset.id;
		assetDB.save(asset, callback);
	}

	this.retrieveAssetEntry = function(id, callback){
		assetDB.findOne({
			_id: id
		}, function(err, doc){
			if(doc){
				callback(doc);
			}else{
				callback();
			}
		})
	}
}

module.exports = MongoDBRecordingStore;