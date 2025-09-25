import { Client, Collection, REST, Routes } from 'discord.js';
import { glob } from 'glob';
import path from 'path';
import { logger } from '../utils/logger';
import 'dotenv/config';
import { pathToFileURL } from 'url';

export async function commandHandler(client: Client & { commands: Collection<string, any> }) {
  client.commands = new Collection();
  const commandFiles = await glob(path.join(__dirname, '../commands/**/*.{ts,js}').replace(/\\/g, '/'));
  const commands = [];

  for (const file of commandFiles) {
    try {
      const fileUrl = pathToFileURL(file).href;
      const module = await import(fileUrl);
      const command = module.default || module; // Handle both default and direct exports

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

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

  try {
    logger.info('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.BOT_ID!, process.env.GUILD_ID!),
      { body: commands },
    );

    logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error(String(error));
  }
}
