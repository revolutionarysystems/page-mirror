var InMemoryRecordingStore = function() {

  var recordings = {};

  this.persist = function(recording) {
    recordings[recording.id] = recording;
  }

  this.retrieve = function(id, callback) {
    callback(null, recordings[id]);
  }

}

module.exports = InMemoryRecordingStore;