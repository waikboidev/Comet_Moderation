const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment-timezone');
const UserConfig = require('../schemas/UserConfig');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');
const { hasPermission } = require('../utils/permissions');

// --- Database Helpers ---
async function getUserSettings(userId) {
  let userConfig = await UserConfig.findOne({ userId });
  if (!userConfig) {
    userConfig = await UserConfig.create({ userId });
  }
  return userConfig;
}

async function setUserTimezone(userId, location) {
  const zone = findTimezone(location);
  if (!zone) return null;
  await UserConfig.findOneAndUpdate({ userId }, { timezone: zone }, { upsert: true });
  return zone;
}

async function setUserFormat(userId, format) {
  await UserConfig.findOneAndUpdate({ userId }, { timeFormat: format }, { upsert: true });
}

async function clearUserTimezone(userId) {
  await UserConfig.findOneAndUpdate({ userId }, { timezone: null });
}

// --- Timezone Logic ---
function findTimezone(input) {
  const normalizedInput = input.trim().toLowerCase();
  // Exact IANA match
  if (moment.tz.zone(input)) return input;
  // Find by city/region
  const found = moment.tz.names().find(z => z.toLowerCase().includes(normalizedInput));
  if (found) return found;
  return null;
}

function getCurrentTime(settings) {
  if (!settings.timezone) return null;
  const format = settings.timeFormat === '12HR' ? 'MMMM DD, h:mm A' : 'MMMM DD, HH:mm';
  return moment().tz(settings.timezone).format(format);
}

// --- Logging ---
async function logCommand(guild, channel, user, commandName, messageContent) {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  const logChannelId = config?.commandLogChannelId || config?.masterLogChannelId;
  if (!logChannelId) return;
  const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `@${user.tag}`, iconURL: user.displayAvatarURL() })
    .setTitle('Utility Command Executed')
    .setDescription(`**${user}** executed a command in ${channel}.`)
    .addFields(
      { name: 'Command', value: `\`${commandName}\``, inline: false },
      { name: 'Message Content', value: `\`${messageContent}\``, inline: false }
    )
    .setColor(embedColors.info)
    .setTimestamp();
  await logChannel.send({ embeds: [embed] });
}

// --- Main Command ---
module.exports = {
  data: new SlashCommandBuilder()
    .setName('timezone')
    .setDescription('Manage your timezone settings.')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set your timezone.')
        .addStringOption(opt => opt.setName('location').setDescription('Your city, region, or timezone (e.g., "New York", "PST", "GMT-7")').setRequired(true))
        .addBooleanOption(opt => opt.setName('global').setDescription('Save this setting for all servers (default: true)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show your current time.')
    )
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription("Show another user's current time.")
        .addUserOption(opt => opt.setName('user').setDescription('The user to check.').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Clear your timezone setting.')
    )
    .addSubcommand(sub =>
      sub.setName('settings').setDescription('Open your timezone settings panel.')
    )
    .addSubcommand(sub =>
      sub.setName('convert')
        .setDescription('Convert a time from your timezone to another.')
        .addStringOption(opt => opt.setName('time').setDescription('The time to convert (e.g., "10:30pm", "22:30").').setRequired(true))
        .addStringOption(opt => opt.setName('target').setDescription('The target timezone (e.g., "Tokyo", "GMT+9").').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'set') {
      const location = interaction.options.getString('location');
      const zone = await setUserTimezone(userId, location);
      if (!zone) {
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Invalid timezone. Please use a valid city, region, or IANA timezone name.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const settings = await getUserSettings(userId);
      const currentTime = getCurrentTime(settings);
      const embed = new EmbedBuilder().setColor(embedColors.success).setDescription(`${emojis.timezoneSuccess} Your timezone has been set to **${zone}**. Your current time is **${currentTime}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'show') {
      const settings = await getUserSettings(userId);
      if (!settings.timezone) {
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} You haven't set your timezone yet. Use \`/timezone set\`.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const currentTime = getCurrentTime(settings);
      const embed = new EmbedBuilder().setColor(embedColors.info).setDescription(`${emojis.clock} Your current time is **${currentTime}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
    
    if (sub === 'user') {
        const targetUser = interaction.options.getUser('user');
        const settings = await getUserSettings(targetUser.id);
        if (!settings.timezone) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} ${targetUser} has not set their timezone.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const currentTime = getCurrentTime(settings);
        const embed = new EmbedBuilder().setColor(embedColors.info).setDescription(`${emojis.clock} ${targetUser}'s current time is **${currentTime}**.`);
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'clear') {
      await clearUserTimezone(userId);
      const embed = new EmbedBuilder().setColor(embedColors.success).setDescription(`${emojis.timezoneSuccess} Your timezone has been cleared.`);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'settings') {
      const settings = await getUserSettings(userId);
      const embed = new EmbedBuilder()
        .setColor(embedColors.fail)
        .setTitle('Timezone Settings')
        .addFields(
          { name: `${emojis.timezoneLocation} Your Timezone`, value: settings.timezone || 'Not Set', inline: true },
          { name: `${settings.timeFormat === '12HR' ? emojis.timezone12 : emojis.timezone24} Time Format`, value: settings.timeFormat, inline: true }
        );
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tz_toggle_format').setLabel(`Switch to ${settings.timeFormat === '12HR' ? '24HR' : '12HR'}`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tz_close').setLabel('Close').setStyle(ButtonStyle.Danger)
      );
      const reply = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5 minutes
      collector.on('collect', async i => {
        if (i.user.id !== userId) {
          return i.reply({ content: `${emojis.fail} This is not your settings panel.`, ephemeral: true });
        }
        if (i.customId === 'tz_toggle_format') {
          const currentSettings = await getUserSettings(userId);
          const newFormat = currentSettings.timeFormat === '12HR' ? '24HR' : '12HR';
          await setUserFormat(userId, newFormat);
          embed.setFields(
            { name: `${emojis.timezoneLocation} Your Timezone`, value: currentSettings.timezone || 'Not Set', inline: true },
            { name: `${newFormat === '12HR' ? emojis.timezone12 : emojis.timezone24} Time Format`, value: newFormat, inline: true }
          );
          row.components[0].setLabel(`Switch to ${newFormat === '12HR' ? '24HR' : '12HR'}`);
          await i.update({ embeds: [embed], components: [row] });
        }
        if (i.customId === 'tz_close') {
          collector.stop();
        }
      });
      collector.on('end', () => interaction.deleteReply().catch(() => {}));
    }
    
    if (sub === 'convert') {
        const timeInput = interaction.options.getString('time');
        const targetLocation = interaction.options.getString('target');
        const userSettings = await getUserSettings(userId);
        if (!userSettings.timezone) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} You must set your timezone first with \`/timezone set\`.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const targetZone = findTimezone(targetLocation);
        if (!targetZone) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Invalid target timezone.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const time = moment.tz(timeInput, ['h:mm A', 'h:mmA', 'H:mm', 'HH:mm'], userSettings.timezone);
        if (!time.isValid()) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Invalid time format. Use formats like "10:30pm" or "22:30".`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const convertedTime = time.clone().tz(targetZone);
        const format = userSettings.timeFormat === '12HR' ? 'h:mm A' : 'HH:mm';
        const embed = new EmbedBuilder().setColor(embedColors.info).setDescription(`\`${time.format(format)}\` in your timezone is \`${convertedTime.format(format)}\` in **${targetZone}**.`);
        return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  },

  async prefixHandler(message) {
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled || !message.content.startsWith('-tz')) return;

    // Example of securing a prefix-only command/subcommand
    // Let's say 'set' and 'clear' should be restricted
    const args = message.content.slice('-tz'.length).trim().split(/ +/);
    const command = args[0]?.toLowerCase();

    if (['set', 'clear', 'global'].includes(command)) {
        if (!await hasPermission(message, 'timezone', command)) {
            // Silently fail or send an error message
            return;
        }
    }

    await logCommand(message.guild, message.channel, message.author, '-tz', message.content);

    // Reset args for logic below
    const fullArgs = message.content.slice('-tz'.length).trim().split(/ +/);
    const subCommand = fullArgs.shift()?.toLowerCase();
    const userId = message.author.id;

    if (!subCommand) { // -tz
      const settings = await getUserSettings(userId);
      if (!settings.timezone) {
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} You haven't set your timezone yet. Use \`-tz set <location>\`.`);
        return message.channel.send({ embeds: [embed] });
      }
      const currentTime = getCurrentTime(settings);
      const embed = new EmbedBuilder().setColor(embedColors.info).setDescription(`${emojis.clock} Your current time is **${currentTime}**.`);
      return message.channel.send({ embeds: [embed] });
    }

    if (subCommand === 'set' || (subCommand === 'global' && fullArgs[0]?.toLowerCase() === 'set')) {
      if (subCommand === 'global') fullArgs.shift(); // remove 'set'
      const location = fullArgs.join(' ');
      if (!location) {
        const embed = new EmbedBuilder().setColor(embedColors.warning).setDescription(`${emojis.timezoneAlert} Please provide a location.`);
        return message.channel.send({ embeds: [embed] });
      }
      const zone = await setUserTimezone(userId, location);
      if (!zone) {
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Invalid timezone.`);
        return message.channel.send({ embeds: [embed] });
      }
      const settings = await getUserSettings(userId);
      const currentTime = getCurrentTime(settings);
      const embed = new EmbedBuilder().setColor(embedColors.success).setDescription(`${emojis.timezoneSuccess} Your timezone has been set to **${zone}**. Your current time is **${currentTime}**.`);
      return message.channel.send({ embeds: [embed] });
    }
    
    if (subCommand === 'convert') {
        if (fullArgs.length < 2) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Usage: \`-tz convert <time> <target_timezone>\``);
            return message.channel.send({ embeds: [embed] });
        }
        const timeInput = fullArgs[0];
        const targetLocation = fullArgs.slice(1).join(' ');
        const userSettings = await getUserSettings(userId);
        if (!userSettings.timezone) {
            const embed = new EmbedBuilder().setColor(embedColors.warning).setDescription(`${emojis.timezoneAlert} You must set your timezone first with \`-tz set\`.`);
            return message.channel.send({ embeds: [embed] });
        }
        const targetZone = findTimezone(targetLocation);
        if (!targetZone) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Invalid target timezone.`);
            return message.channel.send({ embeds: [embed] });
        }
        const time = moment.tz(timeInput, ['h:mm A', 'h:mmA', 'H:mm', 'HH:mm'], userSettings.timezone);
        if (!time.isValid()) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} Invalid time format. Use formats like "10:30pm" or "22:30".`);
            return message.channel.send({ embeds: [embed] });
        }
        const convertedTime = time.clone().tz(targetZone);
        const format = userSettings.timeFormat === '12HR' ? 'h:mm A' : 'HH:mm';
        const embed = new EmbedBuilder().setColor(embedColors.info).setDescription(`\`${time.format(format)}\` in your timezone is \`${convertedTime.format(format)}\` in **${targetZone}**.`);
        return message.channel.send({ embeds: [embed] });
    }

    // Handle -tz <user>
    const member = message.mentions.members.first() || message.guild.members.cache.get(subCommand) || message.guild.members.cache.find(m => m.user.username.toLowerCase() === subCommand || m.displayName.toLowerCase() === subCommand);
    if (member) {
        const settings = await getUserSettings(member.id);
        if (!settings.timezone) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.timezoneFail} ${member.user} has not set their timezone.`);
            return message.channel.send({ embeds: [embed] });
        }
        const currentTime = getCurrentTime(settings);
        const embed = new EmbedBuilder().setColor(embedColors.info).setDescription(`${emojis.clock} ${member.user}'s current time is **${currentTime}**.`);
        return message.channel.send({ embeds: [embed] });
    }
  }
};

/*
Etc/GMT explanation:
- "Etc/GMT+7" means GMT-7 (US Mountain Time, Denver).
- "Etc/GMT-7" means GMT+7 (Bangkok).
- The sign is reversed from what you expect.
- Use offsetMap above for correct city mapping.

How to use -tz convert:

1. Set your timezone first:
   - Example: `-tz set America/New_York`
   - Example: `-tz set GMT-7`
   - Example: `-tz set los angeles`

2. Convert a time to another timezone:
   - Format: `-tz convert <time> <target timezone/city>`
   - Examples:
     - `-tz convert 11am GMT+1`
     - `-tz convert 3:30pm los angeles`
     - `-tz convert 14:30 Asia/Bangkok`
     - `-tz convert 12pm new york`
     - `-tz convert 8:00 Europe/London`
     - `-tz convert 7pm tokyo`
     - `-tz convert 9:15am GMT-5`

// 3. The bot will reply:
   - `**<your time>** in **<your city/GMT>** → **<converted time>** in **<target city/GMT>**`

Notes:
// - You must set your timezone before using convert.
- Time can be in 12hr (`3:30pm`) or 24hr (`14:30`) format.
- Target can be a city, IANA timezone (e.g. `America/New_York`), or GMT offset (`GMT+1`, `GMT-7`).
- If you get an error, check your time and location format.
*/
