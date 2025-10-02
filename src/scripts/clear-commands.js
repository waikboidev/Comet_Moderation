require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { logger } = require('../utils/logger');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function clearCommands() {
  try {
    logger.info('Started clearing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.BOT_ID, process.env.GUILD_ID),
      { body: [] },
    );

    await rest.put(
      Routes.applicationCommands(process.env.BOT_ID),
      { body: [] },
    );

    

    logger.success('Successfully cleared application (/) commands.');
  } catch (error) {
    logger.error('Failed to clear application (/) commands.', error);
  }
}

clearCommands();
