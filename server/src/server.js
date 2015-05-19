// Load required modules
var http = require("http"); // http server core module
var express = require("express"); // web framework external module
var io = require("socket.io"); // web socket external module
var PageMirrorServer = require("./page-mirror-server.js");
var InMemoryRecordingStore = require("./in-memory-recording-store.js");
var MongoDBRecordingStore = require("./mongodb-recording-store.js");
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(express.static(__dirname + "/static/"));

// Start Express http server on port 8080
var webServer = http.createServer(httpApp).listen(config.port);

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {
	"log level": 1
});

if (config.db.type == "mongo") {
	MongoClient.connect("mongodb://" + config.db.host + ":27017/" + config.db.database, function(err, db) {
		if (err) {
			console.log("Unable to connect to db: " + err);
		} else {
			console.log("Connected to db");
			new PageMirrorServer(socketServer, httpApp, new MongoDBRecordingStore(db.collection(config.db.tables.recordings), db.collection(config.db.tables.blacklist)));
		}
	});
} else {
	new PageMirrorServer(socketServer, httpApp, new InMemoryRecordingStore(), {
		autorecord: false
	});
}