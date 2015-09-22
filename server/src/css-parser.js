var async = require('async');

var CSSParser = function(assetHandler) {

	var assetRegex = /([\s\S]*?)(url\(([^)]+)\))(?!\s*[;,]?\s*\/\*\s*\*\/)|([\s\S]+)/img;

	this.parse = function(account, baseUri, relativeUri, body, done) {
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
					assetHandler.handleAsset(account, null, assetHref, function(err, key) {
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

}

module.exports = CSSParser;