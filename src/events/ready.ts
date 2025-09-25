import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    logger.success(`${client.user!.tag} is online!`);
  },
};
