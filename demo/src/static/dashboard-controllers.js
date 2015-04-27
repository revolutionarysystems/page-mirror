var PageMirrorAdmin = function(options) {

	options = options || {};

	var socket;
	if (options.url) {
		socket = io.connect(options.url);
	} else {
		socket = io.connect();
	}

	this.getRecordedSessions = function(onSuccess){
		socket.emit("getRecordedSessions", onSuccess);
	}

	this.getRecordingSessions = function(onSuccess){
		socket.emit("getRecordingSessions", onSuccess);
	}

}

var ngApp = angular.module('ngApp', []);
ngApp.controller('DashboardCtrl', function($scope, $http) {

	var pageMirror = new PageMirrorAdmin();

	$scope.getRecordings = function(){
		pageMirror.getRecordedSessions(function(recordings){
			console.log(recordings);
			$scope.recordedSessions = recordings;
			$scope.$apply();
		});
		pageMirror.getRecordingSessions(function(recordings){
			console.log(recordings);
			$scope.recordingSessions = recordings;
			$scope.$apply();
		})
	}

	$scope.playRecording = function(recording){
		window.open("player.html#" + recording.id);
	}

	$scope.viewSession = function(sessionId){
		window.open("wrapper.html#" + sessionId);
	}

	$scope.getRecordings();
});