/**
 * Stalker
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.0.0
 * @license MIT
 **/

const Twit  = require('twit');
const async = require('async');

let error = (...args) => {
  args.unshift('E:');
  console.error.apply(console, args);
  process.exit(1);
}

let log = (...args) => {
  args.unshift('[i]');
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

  // init streaming API.
  (next) => {
    let stream = twit.stream('statuses/filter', {
      follow: stlk.id_str
    })

    stream.on('tweet', (tweet) => {
      if(tweet.user.id_str !== stlk.id_str) return;

      log(config.stalk.handle, 'tweeted', "'"+tweet.text+"'")
    });

    stream.on('delete', (tweet) => {
      log(config.stalk.handle, 'deleted', "'"+tweet.text+"'");
    })

    stream.on('connected', () => {
      log('stalking has begun (connected to streaming API)')
    })

    stream.on('disconnect', () => {
      log('stalking stopped, disconnected :(')
    })
  }
], err => {
  if(err) error(err);
  log('app initialized in', (Date.now() - init)+'ms');
})
