var ngApp = angular.module('ngApp', []);
ngApp.controller('DashboardCtrl', function($scope, $http) {

	$scope.getRecordings = function() {
		$http({
			method: 'GET',
			url: 'http://localhost:8070/searchRecordings?query={}'
		}).success(function(recordings) {
			console.log(recordings);
			$scope.recordedSessions = recordings;
		}).error(function() {
			console.log("Failed to get recordings");
		});
	}

	$scope.playRecording = function(recording) {
		window.open("player.html#" + recording.id);
	}

	$scope.viewSession = function(sessionId) {
		window.open("wrapper.html#" + sessionId);
	}

	$scope.getRecordings();
});