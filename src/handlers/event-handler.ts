import { Client } from 'discord.js';
import { glob } from 'glob';
import path from 'path';
import { logger } from '../utils/logger';
import { pathToFileURL } from 'url';

export async function eventHandler(client: Client) {
  const eventFiles = await glob(path.join(__dirname, '../events/**/*.{ts,js}').replace(/\\/g, '/'));

  for (const file of eventFiles) {
    const fileUrl = pathToFileURL(file).href;
    const module = await import(fileUrl);
    const event = module.default || module; // Handle both default and direct exports
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
