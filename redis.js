/**
 * Redis Lib
 **/

'use strict';

const Redis = require('ioredis');

const logger = require('./logger.js');

const log   = logger.log;
const error = logger.error;

module.exports = class AbstractedRedis {
  constructor() {
    this.redis = new Redis();
  }

  getTweets(cb) {
    log('redis: fetch tweets')
    this.redis.keys('*').then(keys => {
      let pipe = this.redis.pipeline();
      keys.forEach(key => {
        pipe.get(key);
      })

      pipe.exec((err, res) => {
        let parsed = [];
        res.forEach(tweetcontainer => {
          let stweet = tweetcontainer[1];

          let tweet;
          try {
            tweet = JSON.parse(stweet);
          } catch(e) {
            return cb(e);
          }

          let state = 'intact';

          if(tweet.deleted) {
            state = 'deleted';
          }

          parsed.push({
            text: tweet.text,
            state: state,
            date: tweet.created_at,
            id: tweet.id_str
          });

          parsed.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
          })
        });

        return cb(false, parsed);
      });
    });
  }

  getTweet(id, cb) {
    this.redis.get(id, (err, stweet) => {
      if(err) return cb(err);

      let tweet;
      try {
        tweet = JSON.parse(stweet);
      } catch(e) {
        return cb(e);
      }

      return cb(false, tweet);
    });
  }

  addTweet(tweet) {
    let stweet;
    try {
      stweet = JSON.stringify(tweet);
    } catch(e) {
      log('failed to parse tweet:', id);
      return false;
    }

    let id = tweet.id_str;

    this.redis.set(id, stweet);
  }

  addTweets(tweets, cb) {
    let pipe = this.redis.pipeline();
    tweets.forEach(tweet => {
      let stweet;

      if(typeof tweet !== 'object') return false;
      if(tweet.deleted === undefined) tweet.deleted = false;

      try {
        stweet = JSON.stringify(tweet);
      } catch(e) {
        log('failed to parse tweet:', id);
        return false;
      }

      let id = tweet.id_str;

      log('inserted tweet', id, 'into redis');

      pipe.set(id, stweet);
    });

    pipe.exec(err => {
      if(err) return cb(err);

      log('finished executing pipeline')
    })
  }

  markDeleted(id, cb) {
    this.redis.get(id, (err, stweet) => {
      if(err) return cb(err);

      let tweet;
      try {
        tweet = JSON.parse(stweet);
      } catch(e) {
        return cb(e);
      }

      tweet.deleted = true;

      this.redis.set(id, JSON.stringify(tweet));
    })
  }
}
