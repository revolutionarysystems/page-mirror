var AWS = require('aws-sdk');
var async = require('async');
var request = require('request');
var s3 = new AWS.S3();
var md5 = require('MD5');
var s3Stream = require('s3-upload-stream')(s3);
var url = require('url');

var AssetCacher = function(config, dataStore, cssParser) {

	this.cacheAsset = function(account, baseUri, href, done) {
		var hostname = url.parse(href).host;
		var id = account + "::" + href;
		var asset = {
			id: id,
			time: new Date().getTime(),
			broken: false
		};
		// Execute a head request to get last modified date of asset
		request.head(href, {
			headers: {
				"Referer": baseUri
			},
			timeout: config.assets.head_timeout
		}, function(error, response) {
			// If it failed to execute the request, mark asset as broken
			if (error) {
				// If request timedout, mark failure against host
				if (error.code == "ETIMEDOUT") {
					dataStore.retrieveAssetHost(hostname, function(host) {
						host = host || {
							name: hostname,
							failure: 0
						};
						host.failures = host.failures + 1;
						dataStore.saveAssetHost(host, function(err) {
							if (err) {
								console.log("ERROR: Unable to update host failures");
								console.log(err);
							}
							logAssetEntry(asset, error, done);
						});
					});
				} else {
					logAssetEntry(asset, error, done);
				}
			} else if (response.statusCode != 200) {
				console.log(response.statusCode);
				console.log(response.statusText);
				// If request did not return status 200, mark asset as broken
				logAssetEntry(asset, response.statusCode, done);
			} else {
				// Retrieve last modified date and content type from headers
				var lastModified = response.headers['last-modified'];
				var contentType = response.headers['content-type'];
				// Create S3 key
				asset.key = account + "/" + md5(href + lastModified);
				// Check S3 to see if this version has already been cached
				s3.headObject({
					Bucket: config.assets.bucket,
					Key: asset.key
				}, function(err, data) {
					// If data returned, the asset has already been cached
					if (data) {
						logAssetEntry(asset, null, done);
					} else if (err && err.code != "NotFound") {
						// If request failed due to something other than 404 Not Found, mark asset as broken
						logAssetEntry(asset, err, done);
					} else {
						// This asset requires caching
						console.log("Caching " + href);
						// Request the asset
						request(href, {
							headers: {
								"Referer": baseUri
							},
							timeout: config.assets.timeout
						}, function(err, response, body) {
							// If request fails, mark asset as broken
							if (err) {
								logAssetEntry(asset, err, done);
							} else if (response.statusCode != 200) {
								// If status code is not 200, mark asset as broken
								logAssetEntry(asset, response.statusCode, done);
							} else {
								// If the asset is a css file, parse it for more assets
								if (contentType.indexOf("text/css") == 0) {
									console.log("Caching css file");
									cssParser.parse(account, href.substring(0, href.lastIndexOf("/") + 1), '../', body, function(err, result) {
										if (err) {
											logAssetEntry(asset, err, done);
										} else {
											// Store result to S3
											storeAsset(asset.key, contentType, body, lastModified, href, function(err) {
												logAssetEntry(asset, err, done);
											});
										}
									});
								} else {
									// Store in S3
									storeAsset(asset.key, contentType, body, lastModified, href, function(err) {
										logAssetEntry(asset, err, done);
									});
								}
							}
						});
					}
				});
			}
		});
	}

	function logAssetEntry(asset, error, done) {
		if (error) {
			asset.broken = true;
			asset.error = error;
		}
		dataStore.saveAssetEntry(asset, function(err) {
			if (err) {
				console.log("ERROR: Unable to log asset");
				console.log(err);
			}
			done(error, asset.key);
		});
	}

	function storeAsset(key, contentType, content, lastModified, href, done) {
		s3.putObject({
			Bucket: config.assets.bucket,
			Key: key,
			Body: content,
			ACL: "public-read",
			ContentType: contentType,
			Metadata: {
				lastModified: lastModified || "unknown",
				source: href
			}
		}, function(err, data) {
			done(err);
		});
	}

}

module.exports = AssetCacher;