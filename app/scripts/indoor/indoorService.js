'use strict';

angular.module('CooperativeIndoorMap')
  .service('IndoorHandler', ['Socket', 'ApiService', 'DrawEditHandler',
    function (Socket, ApiService, DrawEditHandler) {
      var map, mapScope;
      let indoors = {};
      let indoorId = undefined;
      let indoorLevel = null;

      /**
       * 获取当前视图下室内地图列表
       */
      function getBuildings() {
        var bounds = map.getBounds();
        ApiService.getBuildings(L.rectangle(bounds).toGeoJSON())
          .success(blds => {
            console.log("获取地图列表成功，地图数目：" + blds.length);
            if(blds.length === 0 && indoorId) {
              // 当前区域没有室内地图
              indoors[indoorId].remove();
              indoorId = null
            }
            for(let key in blds) {
              let building = blds[key];
              if (!indoorId)
                indoorId = building.id;
              if (!indoors[building.id]) {
                indoors[building.id] = L.indoor(building,{});
                loadIndoorMap(building.id);
                indoors[building.id].on("indoor:loaded", function (evt) {
                  if(evt.id === indoorId)
                    indoors[indoorId].addTo(map);
                })
                indoors[building.id].on("indoor:level", function (evt) {
                  indoorLevel = evt.level;
                  $scope.$root.$broadcast("indoor:level", {level: evt.level, id: building.id});
                })
              } else {
                if(building.id === indoorId)
                  indoors[indoorId].addTo(map);
              }
            }
          })
          .error((data, status) => {
            console.log("获取地图列表失败，错误代码" + status);
          });
      }
      /**
       * 获取室内地图
       * @param mapId 室内地图id
       */
      function loadIndoorMap(mapId) {
        ApiService.getFloors(mapId)
          .success(floors =>{
            console.log("楼层数为", floors.length)
            let indoor = indoors[mapId];
            indoor.addFloors(floors);
            for(let key in floors) {
              let floorId = floors[key].id;
              loadAreas(mapId ,floorId);
            }
            indoor.addTo(map);
          })
      }
      /**
       * 获取室内地图
       * @param mapId 室内地图id
       * @param floorId 楼层的id
       */
      function loadAreas(mapId, floorId) {
        ApiService.getAreas(floorId)
          .success(areas =>{
            console.log("区域数为", areas.length)
            indoors[mapId].addAreas(floorId, areas);
            console.log(indoors[mapId])
          })
      }

      /**
       * Creates Leaflet geojson layers with the SimpleStyle specification
       * @param  {Object} geoJsonFeature feature
       */
      function createSimpleStyleGeoJSONFeature(geoJsonFeature) {
        return L.geoJson(geoJsonFeature, {
          // style: L.mapbox.simplestyle.style,
          // pointToLayer: function(feature, latlon) {
          //   if (!feature.properties) {
          //     feature.properties = {};
          //   }
          //   return L.mapbox.marker.style(feature, latlon);
          // }
        });
      }
      /**
       * Adds GeoJSON encoded features to the map
       * @param {Object} map
       * @param {Object} event = {feature, fid //feature id}
       * @param {Object} drawnItems = layer group
       */
      function addGeoJSONFeature(map, event, drawnItems, isntEditable, color) {
        //jshint camelcase:false
        var editModeOnFeatureUpdate = editHandler && editFeatureId === event.fid
        if (editModeOnFeatureUpdate) {
          this.removeEditHandler();
        }
        if (event.action === 'edited' || event.action === 'edited geometry' || event.action === 'edited properties' || event.action === 'reverted')
          this.removeLayer(map, event, drawnItems);
        var newLayer = createSimpleStyleGeoJSONFeature(event.feature);
        var tmpLayer;
        for (var key in newLayer._layers) {
          tmpLayer = newLayer._layers[key];
          tmpLayer._leaflet_id = event.fid;
          if (!isntEditable) {
            this.addClickEvent(tmpLayer);
          }
          tmpLayer.addTo(drawnItems);
          //If action is available (edit, create, delete) highight the feature
          if (event.action && mapScope.userName !== event.user) {
            this.highlightFeature(tmpLayer, color);
          }
        }
        if (editModeOnFeatureUpdate)
          this.editFeature(tmpLayer);
      }

      return {
        /**
         * Initialize the service.
         * Patches the Leaflet LStamp Function to get more unique ids.
         * @param  {Object} m     the map
         * @param  {Object} scope Angular scope
         */
        initIndoorHandler: function(m, scope) {
          map = m;
          mapScope = scope;
          map.on('moveend', getBuildings);
          getBuildings();
          map._indoor = indoors;
        },

        enableIndoorEdit: function () {
          let indoor = indoors[indoorId]
          if(indoor) {
            let level = indoor._level;
            DrawEditHandler.enableFeatureDrawEidt(indoor._areas[level]);
            DrawEditHandler.enableFeatureDrawEidt(indoor._lines[level]);
            DrawEditHandler.enableFeatureDrawEidt(indoor._pois[level]);
          }
        },

        disableIndoorEdit: function () {
          let indoor = indoors[indoorId]
          if(indoor) {
            let level = indoor._level;
            DrawEditHandler.disableFeatureDrawEidt(indoor._areas[level]);
            DrawEditHandler.disableFeatureDrawEidt(indoor._lines[level]);
            DrawEditHandler.disableFeatureDrawEidt(indoor._pois[level]);
          }
        }
      }
    }]);