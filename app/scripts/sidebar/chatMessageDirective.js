'use strict';

angular.module('CooperativeIndoorMap')
  .directive('chatMessage', ['MapHandler', '$compile',
    function(MapHandler, $compile) {
      return {
        template: '<div></div>',
        restrict: 'E',
        scope: {
          message: '='
        },
        link: function postLink(scope, element) {
          var message = '';

          function getClassForFeature(fid) {
            var type = MapHandler.getLayerTypeFid(fid);
            if (type === 'point') {
              return 'markerFeature';
            } else if (type === 'line') {
              return 'lineFeature';
            } else if (type === 'area') {
              return 'polygonFeature';
            } else {
              return false;
            }
          }

          function createButton(fidString) {
            var fid = fidString.substring(1);
            var className = getClassForFeature(fid);
            if (className) {
              return message.replace(fidString, '<div class="featureInChat '+className+'" ng-click="panToFeature(\'' + fid + '\')"></div> ');
            } else {
              return fidString;
            }
          }

          function exchangeFid() {
            var index = message.indexOf('#');
            if (index > -1) {
              var fidString = message.substring(index).split(' ')[0];
              message = createButton(fidString);
            }
            if (message.indexOf('#') > -1) {
              exchangeFid();
            }
          }

          scope.panToFeature = function(fid) {
            MapHandler.panToFeature(fid);
            MapHandler.highlightFeatureId(fid);
          };


          if (scope.message && scope.message.message) {
            message = scope.message.message;
          }

          message = message.replace(/<script/g,'');
          message = message.replace(/<style/g,'');

          exchangeFid(message);
          element[0].innerHTML = message;
          var e = angular.element(element[0]);
          $compile(e.contents())(scope);

        }
      };
    }
  ]);
