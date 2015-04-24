var scope;

var ngApp = angular.module('ngApp', []);
ngApp.controller('PlayerCtrl', function($scope, $http) {

	scope = $scope;

	$scope.init = function(){
		$scope.player = document.getElementById('frame').contentWindow.player;
		$scope.$apply();
	}

	$scope.before = function(){
		$scope.$apply();
	}

	$scope.update = function(){
		$scope.$apply();
	}

	$scope.after = function(){
		$scope.$apply();
	}

});