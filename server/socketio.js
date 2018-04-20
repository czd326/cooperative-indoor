var couchdbHandler = require('./dbHandler.js');

module.exports = function(server) {
  var io = require('socket.io')(server);

  var maps = {};

  io.on('connection', function(socket) {
    console.log("a user connected");

    function storeMapAction(data, action) {
      data.action = action;
      data.userId = socket.id;
      couchdbHandler.recordMapAction(data.mapId, data);
    }

    /**
     * Emits test commands to all clients. Used for debugging/ load tests
     * @param  {Object} data tester data for the TesterService methods
     */
    socket.on('tester', function(data) {
      console.log(data);
      io.sockets.emit('tester-commands', data);
    });

    /**
     * Login method stores the current users of a map and emits the userlist to all clients of a map
     */
    socket.on('login', function(data) {
      if (data.mapId && data.user) {
        storeMapAction(data, 'connect');
        if (maps[data.mapId]) {
          maps[data.mapId].users[socket.id] = data.user;
        } else {
          maps[data.mapId] = {
            users: {}
          };
          maps[data.mapId].users[socket.id] = data.user;
        }
        io.sockets.emit(data.mapId + '-users', maps[data.mapId]);
      }
    });

    /**
     * Receives map movements and emits the movement to all clients of the map
     */
    socket.on('mapMovement', function(data) {
      if (data.mapId && data.event) {
        storeMapAction(data, 'move');
        data.event.userId = socket.id;
        socket.broadcast.emit(data.mapId + '-mapMovement', {
          'event': data.event
        });
      }
    });

    /**
     * Receives drawn features and emits the features to all clients of the map
     */
    socket.on('mapDraw', function(data) {
      if (data.mapId && data.event) {
        storeMapAction(data, 'draw');
        couchdbHandler.saveFeature(data.mapId, data.event, function (err, res) {
          if(err) {
            console.error(err);
          } else {
            data.event.fid = data.event.fid || res.id;
            console.log(data);
            io.sockets.emit(data.mapId + '-mapDraw', {
              'event': data.event
            });
          }
        });
      }
    });

    /**
     * Receives an event if a user starts/ends the edit mode and emits the message to all clients of the map
     */
    socket.on('editFeature', function(data) {
      if (data.mapId && data.user && data.fid) {
        socket.broadcast.emit(data.mapId + '-editFeature', data);
        storeMapAction(data, 'editMode');
      }
    });

    /**
     * Receives chat messages and emits the messages to all clients of the map
     */
    socket.on('chat', function(data) {
      if (data.mapId && data.message && data.user) {
        storeMapAction(data, 'chat');
        io.sockets.emit(data.mapId + '-chat', {
          'user': data.user,
          'message': data.message
        });
      }
    });

    /**
     * Receives features which should be reverted.
     * Calls the dbHandler to revert the feature and emits the reverted feature as a new draw event
     */
    socket.on('revertFeature', function(data) {
      if (data.mapId && data.fid && data.toRev && data.user) {
        storeMapAction(data, 'revert');
        couchdbHandler.revertFeature(data.mapId, data.fid, data.toRev, data.user, function(err, res, feature) {
          if (err) {
            io.sockets.emit(data.mapId + '-mapDraw', err);
          } else {
            var drawEvent = {
              'action': 'reverted',
              'feature': feature,
              'fid': data.fid,
              'user': data.user
            };
            io.sockets.emit(data.mapId + '-mapDraw', {
              'event': drawEvent
            });
          }
        });
      }
    });

    /**
     * Receives deleted features which should be restored.
     * Calls the dbHandler to restore the feature and emits the restored feature as a new draw event
     */
    socket.on('restoreDeletedFeature', function(data) {
      if (data.mapId && data.fid && data.user) {
        storeMapAction(data, 'restored');
        couchdbHandler.restoreDeletedFeature(data.mapId, data, function(err, res) {
          if (err) {
            io.sockets.emit(data.mapId + '-mapDraw', err);
          } else {
            var drawEvent = {
              'action': 'created',
              'feature': res,
              'fid': data.fid,
              'user': data.user
            };
            io.sockets.emit(data.mapId + '-mapDraw', {
              'event': drawEvent
            });
          }

        });
      }
    });

    /**
     * Removes a user from the users list and emits the new userlist to the map clients
     */
    socket.on('disconnect', function() {
      console.log("disconnect");
      for (var key in maps) {
        if (maps[key].users && maps[key].users[socket.id]) {
          storeMapAction({'mapId': key}, 'connect');
          delete maps[key].users[socket.id];
          io.sockets.emit(key + '-users', maps[key]);
        }
      }
    });
  });
};
