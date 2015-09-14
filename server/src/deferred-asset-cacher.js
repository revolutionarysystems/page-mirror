var async = require("async");
var AWS = require('aws-sdk');

var DeferredAssetCacher = function(config) {

	var kinesis = new AWS.Kinesis({region: config.assets.stream.region});

	this.cacheAsset = function(account, baseUri, href, done) {
		var data = {
			account: account,
			baseUri: baseUri,
			href: href
		};
		var params = {
			Data: JSON.stringify(data),
			PartitionKey: Math.round(Math.random() * 100000).toString(),
			StreamName: config.assets.stream.name
		};
		kinesis.putRecord(params, function(err, data) {
			if(err){
				done(err);
			}else{
				var key = "../deferred-asset?key=" + new Buffer(account + "::" + href + "::" + new Date().getTime()).toString('base64');
				done(null, key);
			}			
		});
	}

}

module.exports = DeferredAssetCacher;