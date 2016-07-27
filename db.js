/**
 * Database controller
 **/

const logger = require('./logger.js');
const orch = require('orchestrate')

const log   = logger.log;
const error = logger.error;

class Fetcher {
  constructor(config, db) {
    this.config = config;
    this.db     = db
  }

  getRecent() {

  }
}

module.exports = (config, tweets, stream) => {
  let db = orch(config.server.database.api_key, config.server.database.api);


  return new Fetcher(config, db);
}
