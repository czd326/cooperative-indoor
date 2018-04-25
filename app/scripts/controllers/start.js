'use strict';

angular.module('CooperativeIndoorMap')
  .controller('StartCtrl', ['$scope', '$rootScope', '$location', 'TesterService',
    function($scope, $rootScope, $location, TesterService) {

      function loadName() {
        var oldName = localStorage.getItem('cm-user');
        if (oldName && oldName !== 'undefined') {
          $scope.userInput = oldName;
        }
      }

      function saveName() {
        var name = $scope.userInput;
        if (name !== '') {
          localStorage.setItem('cm-user', name);
        }
      }

      loadName();

      function startMap() {
        //a+  as couchdb db names can't start with a number
        var mapId = $scope.mapIdInput || 'temp';
        $rootScope.userName = $scope.userInput;
        saveName();
        $location.path('/map/' + mapId);
      }

      $scope.startClick = function() {
        startMap();
      };

      $scope.startWithKey = function(e) {
        if (e.keyCode === 13) {
          startMap();
        }
      };

      TesterService.init($scope, $location);
    }
  ]);
