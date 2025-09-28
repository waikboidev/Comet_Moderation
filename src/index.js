require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { commandHandler } = require('./handlers/commandHandler');
const { eventHandler } = require('./handlers/eventHandler');
const { connectDB } = require('./handlers/database');
const { logger } = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
client.commands = new Collection();

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
