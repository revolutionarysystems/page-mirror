var InMemoryRecordingStore = function() {

  var recordings = {};
  var blacklist = [];

  this.persist = function(recording) {
    recordings[recording.id] = recording;
  }

  this.retrieve = function(id, callback) {
    callback(null, recordings[id]);
  }

  this.find = function(query, callback){
    var result = [];
    for(id in recordings){
      result.push(recordings[id]);
    }
  	callback(null, result);
  }

  this.count = function(query, callback){
    this.find(query, function(err, result){
      callback(err, result.length);
    });
  }

  this.blacklist = function(id){
    blacklist.push(id);
  }

  this.isBlacklisted = function(id, callback){
    callback(id in blacklist);
  }

  this.clearBlacklist = function(){
    blacklist = [];
  }

}

module.exports = InMemoryRecordingStore;