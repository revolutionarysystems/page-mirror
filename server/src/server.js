// Load required modules
var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
var io      = require("socket.io");         // web socket external module

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(express.static(__dirname + "/static/"));

// Start Express http server on port 8080
var webServer = http.createServer(httpApp).listen(8070);

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {"log level":1});

socketServer.on('connection', function(socket){
  var sessionId;
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on("createSession", function(args){
  	console.log("Creating session " + args.id);
  	sessionId = args.id;
  	socket.join(sessionId);
  	socketServer.to(sessionId).emit('monitoringSession');
  });
  socket.on("monitorSession", function(args){
  	console.log("Monitoring session " + args.id);
  	sessionId = args.id;
  	socket.join(sessionId);
  	socket.broadcast.to(sessionId).emit('monitoringSession');
  })
  socket.on('initialize', function(args){
    socket.broadcast.to(sessionId).emit('initialize', args);
  });
  socket.on('applyChanged', function(args){
    socket.broadcast.to(sessionId).emit('applyChanged', args);
  });
  socket.on('scroll', function(args){
    socket.broadcast.to(sessionId).emit('scroll', args);
  });
});
