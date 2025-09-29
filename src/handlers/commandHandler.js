const { Collection, REST, Routes } = require('discord.js');
const { glob } = require('glob');
const path = require('path');
const { logger } = require('../utils/logger');
require('dotenv').config();
const { pathToFileURL } = require('url');

async function commandHandler(client) {
  client.commands?.clear?.();
  client.commands = new Collection();

  const commandFiles = await glob(path.join(__dirname, '../commands/**/*.js').replace(/\\/g, '/'));
  const commands = [];

  for (const file of commandFiles) {
    try {
      const fileUrl = pathToFileURL(file).href;
      const module = await import(fileUrl);
      const command = module.default || module;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command in file ${file} is missing "data" or "execute" property.`);
      }
    } catch (error) {
      logger.error(`Error loading command from file ${file}: ${String(error)}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    logger.info('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.BOT_ID),
      { body: commands },
    );

    logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error(String(error));
  }
}

module.exports = { commandHandler };
