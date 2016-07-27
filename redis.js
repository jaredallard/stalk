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
    let pipe = this.redis.pipeline();
    pipe.hgetall('tweets:'+id);
    pipe.exec((err, tweetcontainer) => {
      let tweet = tweetcontainer[0][1];
      console.log('hash store:', tweet);
      return cb(false, tweet);
    });
  }

  addTweet(tweet, cb) {
    if(!cb) {
      cb = (err) => {
        if(err) return console.log(err);
      }
    }
    return this.addTweets([tweet], cb)
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
        "text", ftweet.text,
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
    console.log('fetch deleted:', id);

    let hgetall = this.redis.pipeline();
    hgetall.hgetall('tweets:'+id);
    hgetall.exec((err, tweetcontainer) => {
      if(err) return cb(err);

      let tweet = tweetcontainer[0][1];

      if(!tweet.text) return cb(true);

      console.log(tweetcontainer);
      console.log('hash set:', tweet);

      let pipe = this.redis.pipeline();

      pipe.hmset("tweets:"+id,
        "text", tweet.text,
        "state", 'deleted',
        "date", tweet.date,
        "id", tweet.id
      );

      pipe.exec(err => {
        if(err) return cb(err);;

        log('finished executing pipeline')
      })
    })
  }
}
