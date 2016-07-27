/**
 * Start an express Server
 **/

const logger = require('./logger.js');

const log   = logger.log;
const error = logger.error;

const Redis = require('./redis.js');

let redis   = new Redis();

module.exports = (config, events, us, them) => {
  const express = require('express');

  let app = express();

  app.get('/api/tweets', (req, res) => {
    redis.getTweets((err, tweets) => {
      if(err) {
        return res.status(501).send({
          success: false,
          error: err
        });
      }

      return res.send(tweets);
    });
  })

  app.get('/api/them', (req, res) => {
    res.send(them)
  });

  app.get('/api/us', (req, res) => {
    res.send(us);
  });

  app.use('/', express.static(__dirname + '/public'));



  app.listen(config.server.http.port);
}
