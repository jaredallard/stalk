/**
 * Start a web socket listener.
 **/

const logger = require('./logger.js');
const ws = require('ws').Server;

const log   = logger.log;
const error = logger.error;

module.exports = (config, tweets, events) => {
  let server = new ws({
    port: config.server.websocket.port
  });

  server.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
      client.send(data);
    });
  };

  events.on('tweet', (tweet) => {
    server.broadcast(tweet);
  })

  events.on('delete', (tweet) => {
    server.broadcast(tweet);
  })
}
