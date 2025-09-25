import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { logger } from '../utils/logger';

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

async function clearCommands() {
  try {
    logger.info('Started clearing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.BOT_ID!, process.env.GUILD_ID!),
      { body: [] },
    );

    logger.success('Successfully cleared application (/) commands.');
  } catch (error) {
    logger.error('Failed to clear application (/) commands.', error);
  }
}

clearCommands();
