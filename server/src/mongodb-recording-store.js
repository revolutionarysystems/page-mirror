var MongoDBRecordingStore = function(db) {

	this.persist = function(recording) {
		db.save({
			_id: recording.id,
			data: recording
		}, function(err, result) {
			if (err) {
				console.log("Unable to persist recording: " + err);
			} else {
				console.log("Recording saved to database");
			}
		});
	}

	this.retrieve = function(id, callback) {
		db.findOne({
			_id: id
		}, function(err, doc){
			if(err){
				console.log("Unable to retrieve recording: " + err);
				callback(err);
			}else{
				callback(null, doc.data);
			}
		});
	}
}

module.exports = MongoDBRecordingStore;