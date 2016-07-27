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
    let ntweet = {
      text: tweet.text,
      id: tweet.id_str,
      date: tweet.date,
      state: 'intact'
    }

    server.broadcast(ntweet);
  })

  events.on('delete', (tweet) => {
    let ntweet = {
      text: tweet.text,
      id: tweet.id_str
      date: tweet.date,
      state: 'deleted'
    }

    server.broadcast(ntweet);
  })
}
