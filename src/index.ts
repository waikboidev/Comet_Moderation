import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { commandHandler } from './handlers/command-handler';
import { eventHandler } from './handlers/event-handler';
import { connectDB } from './handlers/database';
import { logger } from './utils/logger';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as Client & { commands: Collection<string, any> };

(async () => {
  // We need a MONGO_URL in the .env file
  if (!process.env.MONGO_URL) {
    logger.error('MONGO_URL not found in .env file. Please add it.');
    process.exit(1);
  }
  await connectDB(process.env.MONGO_URL);
  await commandHandler(client);
  await eventHandler(client);

  await client.login(process.env.TOKEN);
})();

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});