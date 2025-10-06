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

  // Register messageCreate only once
  if (!client._prefixHandlerRegistered) {
    const ping = require('../commands/ping');
    const serverInfo = require('../commands/serverInfo');
    const userInfo = require('../commands/userInfo');
    const purge = require('../commands/purge');
    const lock = require('../commands/lock');
    const unlock = require('../commands/unlock');
    const channelInfo = require('../commands/channelInfo');
    const uptime = require('../commands/uptime');
    const help = require('../commands/help');
    const timezone = require('../commands/timezone');
    const rolemembers = require('../commands/rolemembers');
    const fun = require('../commands/fun');
    const dadjoke = require('../commands/dadjoke');
    const coinflip = require('../commands/coinflip');
    const eightball = require('../commands/8ball');
    client.on('messageCreate', async (message) => {
      await ping.prefixHandler?.(message);
      await serverInfo.prefixHandler?.(message);
      await userInfo.prefixHandler?.(message);
      await purge.prefixHandler?.(message);
      await lock.prefixHandler?.(message);
      await unlock.prefixHandler?.(message);
      await channelInfo.prefixHandler?.(message);
      await uptime.prefixHandler?.(message);
      await help.prefixHandler?.(message);
      await timezone.prefixHandler?.(message);
      await rolemembers.prefixHandler?.(message);
      await fun.prefixHandler?.(message);
      await dadjoke.prefixHandler?.(message);
      await coinflip.prefixHandler?.(message);
      await eightball.prefixHandler?.(message);
      // Add more prefixHandler calls for other commands as needed
    });
    client._prefixHandlerRegistered = true;
  }
}

module.exports = { eventHandler };
