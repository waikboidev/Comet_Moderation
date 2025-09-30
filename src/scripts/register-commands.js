require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { glob } = require('glob');
const path = require('path');
const { logger } = require('../utils/logger');
const { pathToFileURL } = require('url');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands() {
  const commandFiles = await glob(path.join(__dirname, '../commands/**/*.js').replace(/\\/g, '/'));
  const commands = [];

  for (const file of commandFiles) {
    try {
      const fileUrl = pathToFileURL(file).href;
      const mod = await import(fileUrl);
      const command = mod.default || mod;
      if (command?.data?.toJSON) {
        commands.push(command.data.toJSON());
        logger.info(`Prepared command: ${command.data.name}`);
      } else {
        logger.warn(`Skipping ${file} as it doesn't export a valid command shape.`);
      }
    } catch (err) {
      logger.error(`Failed to import command file ${file}: ${String(err)}`);
    }
  }

  try {
    logger.info('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.BOT_ID),
      { body: commands },
    );

    logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error('Failed to reload application (/) commands.', error);
  }
}

registerCommands();
