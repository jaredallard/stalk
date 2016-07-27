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
    this.redis = new Redis({
      parser: 'hiredis',
      dropBufferSupport: true
    });
  }

  getTweets(cb) {
    console.log(this.redis.get)
    console.log(this.redis.mget);
    let pipe   = this.redis.pipeline();
    let stream = this.redis.scanStream();
    stream.on('data', (resultKeys) => {
      // `resultKeys` is an array of strings representing key names
      for (var i = 0; i < resultKeys.length; i++) {
        pipe.hgetall(resultKeys[i]);
      }
    });
    stream.on('end', () => {
      pipe.exec((err, res) => {
        let parsed = [];
        res.forEach(tweetcontainer => {
          let stweet = tweetcontainer[1];

          parsed.push(stweet);
        });

        parsed.sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        })

        let final = {
          total: parsed.length,
          count: 200,
          tweets: parsed.slice(0, 200)
        }

        return cb(false, final);
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
    if(typeof tweet !== 'object') return false;
    if(tweet.deleted === undefined) tweet.deleted = false;

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

      let ftweet = {
        text: tweet.text,
        state: 'intact',
        date: tweet.created_at,
        id: tweet.id_str
      }



      let id = tweet.id_str;
      pipe.hmset("tweets:"+id,
        "text", tweet.text,
        "state", ftweet.state,
        "date", ftweet.date,
        "id", ftweet.id
      );
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

      tweet.state = 'deleted';

      this.redis.set(id, JSON.stringify(tweet));
    })
  }
}
