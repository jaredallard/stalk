/**
 * Stalker
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.0.0
 * @license MIT
 **/

const Twit   = require('twit');
const async  = require('async');
const moment = require('moment');
const colors = require('colors');
const logger = require('./logger.js');

const log   = logger.log;
const error = logger.error;

const Redis = require('./redis.js');


let config;

try {
  config = require('./config/config.json');
} catch(e) {
  error('Config not found');
}

// instance Twit.
let twit   = new Twit({
  consumer_key:        config.app.consumer_key,
  consumer_secret:     config.app.consumer_secret,
  access_token:        config.user.access_token,
  access_token_secret: config.user.access_secret
});
let redis = new Redis();

let user = null;
let stlk = null;
let init = Date.now();

const EventEmitter = require('events')
const events = new EventEmitter();
async.waterfall([
  /**
   * Get info about us.
   **/
  (next) => {
    twit.get('account/verify_credentials', { skip_status: true })
      .catch(next)
      .then(res => {
        user = res.data;

        return next();
      })
  },

  (next) => {
    log('running as:', user.screen_name);

    return next();
  },

  (next) => {
    log('stalking:', '@'+config.stalk.handle);
    twit.get('users/show', {
      screen_name: config.stalk.handle
    })
      .catch(next)
      .then(res => {
        stlk = res.data;
        return next();
      })
  },

  // retreieve latest user global.tweets.
  (next) => {
    let count = 0;
    let loop = (last_id, cb) => {
      twit.get('statuses/user_timeline', {
        screen_name: config.stalk.handle,
        count: 200,
        max_id: last_id
      })
      .catch(cb)
      .then(res => {
        redis.addTweets(res.data);

        count += res.data.length;

        log('inserted', res.data.length, 'tweets into local cache');

        return cb(false, res.data[res.data.length-1].id_str);
      })
    }

    let it = (err, last_id) => {
      if(err) return error(err);

      log('last_id:', last_id);
      if(count < 1200) {
        return loop(last_id, it);
      }

      log('inserted', count, 'total tweets into redis db.');
      return next();
    }
    loop(undefined, it)

  },

  // init streaming API.
  (next) => {
    let stream = twit.stream('statuses/filter', {
      follow: stlk.id_str
    })

    stream.on('tweet', (tweet) => {
      if(tweet.user.id_str !== stlk.id_str) return;

      log(config.stalk.handle, 'tweeted', "'"+tweet.text+"'")

      redis.addTweet(tweet)

      events.emit('tweet', tweet);
    });

    stream.on('delete', (tweet) => {
      tweet = tweet.delete.status;

      redis.getTweet(tweet.id_str, (err, tweet) => {
        if(err || tweet === null) {
          log(config.stalk.handle, 'deleted a tweet we don\'t have archived.')
          return false;
        }

        redis.markDeleted(tweet.id_str, (err) => {
          console.log('DELETEION EVENT ERROR: ', err);
        })

        log(config.stalk.handle, 'deleted', "'"+tweet.text+"'");
        events.emit('delete', tweet);
      })
    })

    stream.on('connected', () => {
      log('stalking has begun (connected to streaming API)')
    })

    stream.on('disconnect', () => {
      log('stalking stopped, disconnected :(')
    })

    return next(false);
  },

  // load addons
  (next) => {
    let http = require('./express.js')(config, events, user, stlk);
  }
], err => {
  if(err) error(err);
  log('app initialized in', (Date.now() - init)+'ms');
})
