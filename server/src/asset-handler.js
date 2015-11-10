var async = require('async');
var url = require('url');

var AssetHandler = function(config, dataStore, assetCacher) {
	var $this = this;

	this.handleAsset = function(account, baseUri, href, done) {
		if (!href || href.indexOf("data:") == 0) {
			// Do not cache
			done();
		} else {
			// Assemble absolute url
			if (href.indexOf("http") == 0) {
				// leave as is
			} else if (href.indexOf("//") == 0) {
				href = "http:" + href;
			} else {
				href = baseUri + href;
			}

			// Check configured blacklist for assets to ignore
			for (var i = 0; i < config.assets.blacklist.length; i++) {
				var pattern = config.assets.blacklist[i];
				if (new RegExp(pattern).test(href)) {
					done("Blacklisted");
					return;
				}
			}

			// Get host from url
			var hostname = url.parse(href).host;

			// Retrieve asset entry from data store
			var id = account + "::" + href;
			dataStore.retrieveAssetEntry(id, function(asset) {
				// If cached recently, use existing entry
				if (asset && !asset.broken && (asset.time > new Date().getTime() - config.assets.check_interval)) {
					done(null, asset.key);
				} else {
					// If broken and not within retry interval, leave as is
					if (asset && asset.broken && asset.time > (new Date().getTime() - config.assets.broken_check_interval)) {
						done();
					} else {
						// Either a new asset, or one that needs rechecking
						// Check that host has not been blacklisted
						dataStore.retrieveAssetHost(hostname, function(host) {
							host = host || {
								name: hostname,
								failures: 0
							};
							if (host.failures >= config.assets.host_timeout_threshold && (new Date().getTime() - host.lastFailureTime) < config.assets.host_timeout_retry_period) {
								done("Temporarily blacklisted");
							} else {
								assetCacher.cacheAsset(account, baseUri, href, done);
							}
						});
					}
				}
			});
		}
	}

}

module.exports = AssetHandler;