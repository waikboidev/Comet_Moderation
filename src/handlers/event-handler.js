const { glob } = require('glob');
const path = require('path');
const { logger } = require('../utils/logger');
const { pathToFileURL } = require('url');

async function eventHandler(client) {
  client.removeAllListeners();

  const eventFiles = await glob(path.join(__dirname, '../events/**/*.js').replace(/\\/g, '/'));

  for (const file of eventFiles) {
    const fileUrl = pathToFileURL(file).href;
    const module = await import(fileUrl);
    const event = module.default || module;
    const eventName = event.name;
    const execute = event.execute;
    const once = event.once;

    if (once) {
      client.once(eventName, (...args) => execute(...args, client));
    } else {
      client.on(eventName, (...args) => execute(...args, client));
    }
    logger.info(`Loaded event: ${eventName}`);
  }
}

module.exports = { eventHandler };
