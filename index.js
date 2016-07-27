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

let error = (...args) => {
  args.unshift('E:');
  console.error.apply(console, args);
  process.exit(1);
}

let log = (...args) => {
  args.unshift(moment().format('LLLL').blue + ' [i] ');
  console.log.apply(console, args);
}

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

let tweets = {};
let user = null;
let stlk = null;
let init = Date.now();
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

  // retreieve latest user tweets.
  (next) => {
    twit.get('statuses/user_timeline', {
      screen_name: config.stalk.handle,
      count: 200
    })
    .catch(next)
    .then(res => {
      res.data.forEach(tweet => {
        tweets[tweet.id_str] = tweet;
      })

      log('inserted', res.data.length, 'tweets into local cache');

      return next();
    })
  },

  // init streaming API.
  (next) => {
    let stream = twit.stream('statuses/filter', {
      follow: stlk.id_str
    })

    stream.on('tweet', (tweet) => {
      if(tweet.user.id_str !== stlk.id_str) return;

      log(config.stalk.handle, 'tweeted', "'"+tweet.text+"'")

      tweets[tweet.id_str] = tweet;
    });

    stream.on('delete', (tweet) => {
      tweet = tweet.delete.status;
      let twt = null;

      if(!tweets[tweet.id_str]) {
        log('tweet hasn\'t been captured. ID:', tweet.id_str);
        console.log('debug:', tweets[tweet.id_str]);
        console.log('tweet object:', tweet);
      } else {
        twt = tweets[tweet.id_str].text;
      }
      log(config.stalk.handle, 'deleted', "'"+twt+"'");
    })

    stream.on('connected', () => {
      log('stalking has begun (connected to streaming API)')
    })

    stream.on('disconnect', () => {
      log('stalking stopped, disconnected :(')
    })

    return next();
  }
], err => {
  if(err) error(err);
  log('app initialized in', (Date.now() - init)+'ms');
})
