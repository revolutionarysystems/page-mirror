// Load required modules
var http = require("http"); // http server core module
var https = require("https"); // https server core module
var express = require("express"); // web framework external module
var config = require('./config.js');

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(express.static(__dirname + "/static/"));

// Start Express http server on port 8080
var webServer;
if (config.protocol == "https") {
	var options = {
		key: fs.readFileSync(config.ssl.key),
		cert: fs.readFileSync(config.ssl.cert),
		ca: fs.readFileSync(config.ssl.ca)
	};
	webServer = https.createServer(options, httpApp).listen(config.port);
} else {
	webServer = http.createServer(httpApp).listen(config.port);
}