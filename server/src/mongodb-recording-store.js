var MongoDBRecordingStore = function(recordingDB, blacklistDB) {

	this.persist = function(recording) {
		recording._id = recording.id;
		recordingDB.save(recording, function(err, result) {
			if (err) {
				console.log("Unable to persist recording: " + err);
			} else {
				console.log("Recording saved to database");
			}
		});
	}

	this.retrieve = function(id, callback) {
		recordingDB.findOne({
			_id: id
		}, callback);
	}

	this.find = function(query, callback) {
		recordingDB.find(query, function(err, cursor) {
			cursor.toArray(function(err, result) {
				callback(err, result);
			});
		});
	}

	this.count = function(query, callback) {
		recordingDB.find(query, function(err, cursor) {
			cursor.count(false, callback);
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
		blacklistDB.remove({}, function(err){
			if(err){
				console.log("Unabled to clear blacklist: " + err);
			}else{
				console.log("Blacklist cleared");
			}
		});
	}
}

module.exports = MongoDBRecordingStore;