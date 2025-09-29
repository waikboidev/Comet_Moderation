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
        return interaction.reply({ content: `${emojis.timezoneFail} Invalid timezone. Please use a valid city, region, or IANA timezone name.`, ephemeral: true });
      }
      const settings = await getUserSettings(userId);
      const currentTime = getCurrentTime(settings);
      return interaction.reply({ content: `${emojis.timezoneSuccess} Your timezone has been set to **${zone}**. Your current time is **${currentTime}**.`, ephemeral: false });
    }

    if (sub === 'show') {
      const settings = await getUserSettings(userId);
      if (!settings.timezone) {
        return interaction.reply({ content: `${emojis.timezoneFail} You haven't set your timezone yet. Use \`/timezone set\`.`, ephemeral: true });
      }
      const currentTime = getCurrentTime(settings);
      return interaction.reply({ content: `${emojis.clock} Your current time is **${currentTime}**.`, ephemeral: false });
    }
    
    if (sub === 'user') {
        const targetUser = interaction.options.getUser('user');
        const settings = await getUserSettings(targetUser.id);
        if (!settings.timezone) {
            return interaction.reply({ content: `${emojis.timezoneFail} ${targetUser} has not set their timezone.`, ephemeral: true });
        }
        const currentTime = getCurrentTime(settings);
        return interaction.reply({ content: `${emojis.clock} ${targetUser}'s current time is **${currentTime}**.`, ephemeral: false });
    }

    if (sub === 'clear') {
      await clearUserTimezone(userId);
      return interaction.reply({ content: `${emojis.timezoneSuccess} Your timezone has been cleared.`, ephemeral: false });
    }

    if (sub === 'settings') {
      const settings = await getUserSettings(userId);
      const embed = new EmbedBuilder()
        .setColor(embedColors.info)
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
            return interaction.reply({ content: `${emojis.timezoneFail} You must set your timezone first with \`/timezone set\`.`, ephemeral: true });
        }
        const targetZone = findTimezone(targetLocation);
        if (!targetZone) {
            return interaction.reply({ content: `${emojis.timezoneFail} Invalid target timezone.`, ephemeral: true });
        }
        const time = moment.tz(timeInput, ['h:mm A', 'h:mmA', 'H:mm', 'HH:mm'], userSettings.timezone);
        if (!time.isValid()) {
            return interaction.reply({ content: `${emojis.timezoneFail} Invalid time format. Use formats like "10:30pm" or "22:30".`, ephemeral: true });
        }
        const convertedTime = time.clone().tz(targetZone);
        const format = userSettings.timeFormat === '12HR' ? 'h:mm A' : 'HH:mm';
        return interaction.reply({ content: `\`${time.format(format)}\` in your timezone is \`${convertedTime.format(format)}\` in **${targetZone}**.`, ephemeral: false });
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
        return message.channel.send(`${emojis.timezoneFail} You haven't set your timezone yet. Use \`-tz set <location>\`.`);
      }
      const currentTime = getCurrentTime(settings);
      return message.channel.send(`${emojis.clock} Your current time is **${currentTime}**.`);
    }

    if (subCommand === 'set' || (subCommand === 'global' && fullArgs[0]?.toLowerCase() === 'set')) {
      if (subCommand === 'global') fullArgs.shift(); // remove 'set'
      const location = fullArgs.join(' ');
      if (!location) return message.channel.send(`${emojis.timezoneAlert} Please provide a location.`);
      const zone = await setUserTimezone(userId, location);
      if (!zone) {
        return message.channel.send(`${emojis.timezoneFail} Invalid timezone.`);
      }
      const settings = await getUserSettings(userId);
      const currentTime = getCurrentTime(settings);
      return message.channel.send(`${emojis.timezoneSuccess} Your timezone has been set to **${zone}**. Your current time is **${currentTime}**.`);
    }
    
    if (subCommand === 'convert') {
        if (fullArgs.length < 2) return message.channel.send(`${emojis.timezoneFail} Usage: \`-tz convert <time> <target_timezone>\``);
        const timeInput = fullArgs[0];
        const targetLocation = fullArgs.slice(1).join(' ');
        const userSettings = await getUserSettings(userId);
        if (!userSettings.timezone) {
            return message.channel.send(`${emojis.timezoneAlert} You must set your timezone first with \`-tz set\`.`);
        }
        const targetZone = findTimezone(targetLocation);
        if (!targetZone) {
            return message.channel.send(`${emojis.timezoneFail} Invalid target timezone.`);
        }
        const time = moment.tz(timeInput, ['h:mm A', 'h:mmA', 'H:mm', 'HH:mm'], userSettings.timezone);
        if (!time.isValid()) {
            return message.channel.send(`${emojis.timezoneFail} Invalid time format. Use formats like "10:30pm" or "22:30".`);
        }
        const convertedTime = time.clone().tz(targetZone);
        const format = userSettings.timeFormat === '12HR' ? 'h:mm A' : 'HH:mm';
        return message.channel.send(`\`${time.format(format)}\` in your timezone is \`${convertedTime.format(format)}\` in **${targetZone}**.`);
    }

    // Handle -tz <user>
    const member = message.mentions.members.first() || message.guild.members.cache.get(subCommand) || message.guild.members.cache.find(m => m.user.username.toLowerCase() === subCommand || m.displayName.toLowerCase() === subCommand);
    if (member) {
        const settings = await getUserSettings(member.id);
        if (!settings.timezone) {
            return message.channel.send(`${emojis.timezoneFail} ${member.user} has not set their timezone.`);
        }
        const currentTime = getCurrentTime(settings);
        return message.channel.send(`${emojis.clock} ${member.user}'s current time is **${currentTime}**.`);
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

    // --- TZ OFFSETMAP ---
    if (
        args[0].toLowerCase() === '-tz' &&
        args.length === 2 &&
        args[1].toLowerCase() === 'offsetmap'
    ) {
        // Dynamically list all IANA timezones with their current offsets
        const entries = moment.tz.names()
            .map(zone => {
                const city = zone.includes('/') ? zone.split('/')[1].replace(/_/g, ' ') : zone;
                const offsetMinutes = moment().tz(zone).utcOffset();
                const offsetHours = offsetMinutes / 60;
                const offsetStr = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
                return `\`${zone}\` → **${city}** (${offsetStr})`;
            })
            .join('\n');
        const embed = new EmbedBuilder()
            .setColor('#285536')
            .setTitle('Timezone Offset Map')
            .setDescription(
                "Use these locations for `-tz set <location>` or as targets for conversion.\n\n" +
                entries
            );
        await message.channel.send({ embeds: [embed] });
        return;
    }

    // --- TZ SET <location> ---
    if (
        args[0] === '-tz' &&
        args.length > 2 &&
        args[1].toLowerCase() === 'set'
    ) {
        const location = args.slice(2).join(' ');
        const zone = setTimezone(userId, location);
        if (!zone) {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(`<:cross:1417385054442750034> Invalid timezone: \`${location}\`\nUse format like: \`new york\`, \`los angeles\`, \`EST\`, \`GMT+1\`, \`colorado\`, \`America/New_York\`, \`Europe/London\``)
                ]
            });
            return;
        }
        const currentTime = getCurrentTime(userId);
        // Show canonical city/country for the zone
        const locationDisplay = getCanonicalCityAndOffset(zone);
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#285536')
                    .setDescription(`<:clock:1417394803347292272> <@${userId}>: Your timezone has been set to \`${locationDisplay}\`.\nCurrent time: **${currentTime}**`)
            ]
        });
        return;
    }

    // --- TZ CLEAR ---
    if (
        args[0] === '-tz' &&
        args.length > 1 &&
        args[1].toLowerCase() === 'clear'
    ) {
        clearTimezone(userId);
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(GREEN_COLOR)
                    .setDescription(`<:check:1417385032762523678> Your timezone has been cleared.`)
            ]
        });
        return;
    }

    // --- TZ SETTINGS ---
    if (
        args[0].toLowerCase() === '-tz' &&
        ((args.length === 2 && args[1].toLowerCase() === 'settings') ||
         (message.content.trim().toLowerCase() === '-tz settings'))
    ) {
        const settings = loadUserTzSettings(userId);
        const tz = settings.timezone;
        const format = settings.format;
        let currentTime = tz ? moment().tz(tz).format(format === '12HR' ? 'MMMM DD, h:mm A' : 'MMMM DD, HH:mm') : 'Not set';
        const locationDisplay = tz ? getCanonicalCityAndOffset(tz) : 'Not set';
        const embed = new EmbedBuilder()
            .setColor('#285536')
            .addFields(
                { name: '<:timezone:1417394842291404800> Current Timezone', value: locationDisplay, inline: false },
                { name: '<:clock:1417394803347292272> Current Time', value: currentTime, inline: false },
                { name: '<:clock12:1417394884624515153> Time Format', value: format, inline: false }
            );
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('change_timezone')
                .setLabel('Change Timezone')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('toggle_format')
                .setLabel(`Format: ${format}`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('close_settings')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
        );
        const sent = await message.channel.send({ embeds: [embed], components: [row] });
        // Listen for button interactions (only allow the user who requested)
        const filter = i => i.user.id === userId;
        const collector = sent.createMessageComponentCollector({ filter, time: 120000 });
        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                await i.reply({ content: 'This is not your settings panel. Please use `-tz settings` to view and interact with your own settings.', ephemeral: true });
                return;
            }
            if (i.customId === 'change_timezone') {
                await i.reply({ content: 'Please use `-tz set <timezone>` to change your timezone.', ephemeral: true });
            } else if (i.customId === 'toggle_format') {
                // Always get latest format from DB
                const currentSettings = loadUserTzSettings(userId);
                const newFormat = currentSettings.format === '24HR' ? '12HR' : '24HR';
                setTimeFormat(userId, newFormat);
                const updatedSettings = loadUserTzSettings(userId);
                const updatedTime = updatedSettings.timezone ? moment().tz(updatedSettings.timezone).format(newFormat === '12HR' ? 'MMMM DD, h:mm A' : 'MMMM DD, HH:mm') : 'Not set';
                const updatedLocationDisplay = updatedSettings.timezone ? getCanonicalCityAndOffset(updatedSettings.timezone) : 'Not set';
                const updatedEmbed = EmbedBuilder.from(embed)
                    .spliceFields(0, 3,
                        { name: '<:timezone:1417394842291404800> Current Timezone', value: updatedLocationDisplay, inline: false },
                        { name: '<:clock:1417394803347292272> Current Time', value: updatedTime, inline: false },
                        { name: '<:clock12:1417394884624515153> Time Format', value: newFormat, inline: false }
                    );
                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('change_timezone')
                        .setLabel('Change Timezone')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('toggle_format')
                        .setLabel(`Format: ${newFormat}`)
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('close_settings')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                );
                await i.update({ embeds: [updatedEmbed], components: [updatedRow] });
            } else if (i.customId === 'close_settings') {
                await i.message.delete().catch(() => {});
            }
        });
        return;
    }

    // --- TZ @user or username or partial username or user ID ---
    if (
        args[0] === '-tz' &&
        args.length === 2 &&
        (
            /^\d{17,}$/.test(args[1]) ||
            message.mentions.users.size > 0 ||
            true // always allow username/displayname search
        )
    ) {
        let targetUser = null;
        if (message.guild) {
            // Try user ID first
            if (/^\d{17,}$/.test(args[1])) {
                targetUser = message.guild.members.cache.get(args[1]);
                if (targetUser) targetUser = targetUser.user;
            }
            // Try mention
            if (!targetUser && message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            }
            // Try username/displayName search
            if (!targetUser) {
                targetUser = message.guild.members.cache.find(m => m.user.username.toLowerCase() === args[1].toLowerCase());
                if (!targetUser) {
                    targetUser = message.guild.members.cache.find(m => m.displayName && m.displayName.toLowerCase() === args[1].toLowerCase());
                }
                if (!targetUser) {
                    targetUser = message.guild.members.cache.find(m => m.user.username.toLowerCase().includes(args[1].toLowerCase()));
                }
                if (!targetUser) {
                    targetUser = message.guild.members.cache.find(m => m.displayName && m.displayName.toLowerCase().includes(args[1].toLowerCase()));
                }
                if (targetUser) targetUser = targetUser.user;
            }
        }
        if (!targetUser) {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(`<:cross:1417385054442750034> User not found.`)
                ]
            });
            return;
        }
        const tz = getTimezone(targetUser.id);
        if (!tz || typeof tz !== 'string') {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(`<:cross:1417385054442750034> ${targetUser} hasn't set their timezone yet.`)
                ]
            });
            return;
        }
        // Use the requesting user's format for display
        const formatOverride = loadUserTzSettings(message.author.id).format;
        const currentTime = getCurrentTimeWithFormat(targetUser.id, formatOverride);
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#285536')
                    .setDescription(`<:clock:1417394803347292272> <@${targetUser.id}>: Their current time is **${currentTime}**`)
            ]
        });
        return;
    }

    // --- TZ @user or username or partial username ---
    if (args[0] === '-tz' && args.length > 1 && args[1]) {
        let targetUser = null;
        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
        } else if (message.guild) {
            // Try exact username match (case-insensitive)
            targetUser = message.guild.members.cache.find(m => m.user.username.toLowerCase() === args[1].toLowerCase());
            if (!targetUser) {
                targetUser = message.guild.members.cache.find(m => m.displayName && m.displayName.toLowerCase() === args[1].toLowerCase());
            }
            if (!targetUser) {
                targetUser = message.guild.members.cache.find(m => m.user.username.toLowerCase().includes(args[1].toLowerCase()));
                if (!targetUser) {
                    targetUser = message.guild.members.cache.find(m => m.displayName && m.displayName.toLowerCase().includes(args[1].toLowerCase()));
                }
            }
            // Try by user ID (if not already handled above)
            if (!targetUser && /^\d+$/.test(args[1])) {
                targetUser = message.guild.members.cache.get(args[1]);
            }
            if (targetUser) targetUser = targetUser.user;
        }
        if (!targetUser) {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(`<:cross:1417385054442750034> User not found.`)
                ]
            });
            return;
        }
        const tz = getTimezone(targetUser.id);
        if (!tz || typeof tz !== 'string') {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(`<:cross:1417385054442750034> ${targetUser} hasn't set their timezone yet.`)
                ]
            });
            return;
        }
        // Use the requesting user's format for display
        const formatOverride = loadUserTzSettings(message.author.id).format;
        const currentTime = getCurrentTimeWithFormat(targetUser.id, formatOverride);
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#285536')
                    .setDescription(`<:clock:1417394803347292272> <@${targetUser.id}>: Their current time is **${currentTime}**`)
            ]
        });
        return;
    }

    // --- TZ (show own timezone) ---
    if (args[0] === '-tz' && args.length === 1) {
        const tz = getTimezone(userId);
        if (!tz || typeof tz !== 'string') {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(`<:cross:1417385054442750034> You haven't set your timezone yet.`)
                ]
            });
            return;
        }
        // Use user's own format
        const currentTime = getCurrentTimeWithFormat(userId);
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#285536')
                    .setDescription(`<:clock:1417394803347292272> <@${userId}>: Your current time is **${currentTime}**`)
            ]
        });
        return;
    }

    // --- TZ CONVERT ---
    if (args[0].toLowerCase() === '-tz' && args[1]?.toLowerCase() === 'convert' && args.length >= 4) {
        const inputTime = args[2];
        const targetLocation = args.slice(3).join(' ');
        const tzDb = loadDb(TZ_DB_PATH);
        const userTz = loadUserTzSettings(userId).timezone;
        if (!userTz) {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription("<:cross:1417385054442750034> You haven't set your timezone yet. Use `tz set <timezone>` or `tz settings` first.")
                ]
            });
            return;
        }

        // Try to parse inputTime in user's timezone
        let parsed = null;
        try {
            // Try parsing with both 12hr and 24hr formats
            parsed = moment.tz(inputTime, ['h:mma', 'h:mm a', 'h a', 'H:mm', 'H:mm a', 'h:mm', 'hmm', 'HHmm'], userTz);
            if (!parsed.isValid()) {
                // Try with today's date
                parsed = moment.tz(moment().format('YYYY-MM-DD') + ' ' + inputTime, ['YYYY-MM-DD h:mma', 'YYYY-MM-DD H:mm'], userTz);
            }
            if (!parsed.isValid()) {
                // Try parsing as UTC then convert to userTz
                parsed = moment.utc(inputTime, ['h:mma', 'h:mm a', 'h a', 'H:mm', 'H:mm a', 'h:mm', 'hmm', 'HHmm']);
                if (parsed.isValid()) parsed = parsed.tz(userTz);
            }
        } catch {
            parsed = null;
        }

        // Find target timezone
        let targetTz = null;
        if (typeof targetLocation === 'string' && moment.tz.zone(targetLocation)) {
            targetTz = targetLocation;
        } else {
            // Try GMT/UTC offset
            const normalized = normalizeOffsetInput(targetLocation);
            if (normalized && moment.tz.zone(normalized)) {
                targetTz = normalized;
            } else {
                // Try abbreviation
                const abbrZone = findZoneByAbbreviation(targetLocation);
                if (abbrZone) {
                    targetTz = abbrZone;
                } else {
                    // Try partial name search
                    const found = moment.tz.names().find(z => z.toLowerCase().includes(targetLocation.toLowerCase()));
                    if (found) targetTz = found;
                }
            }
        }

        if (!parsed || !parsed.isValid() || !targetTz) {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(RED_COLOR)
                        .setDescription(
                            "<:cross:1417385054442750034> Invalid time format or timezone. Use formats like:\n" +
                            "• `11am pst`\n" +
                            "• `12pm GMT-7`\n" +
                            "• `3:30pm los angeles`\n" +
                            "• `14:30 Asia/Bangkok`"
                        )
                ]
            });
            return;
        }

        // Convert time
        const converted = parsed.clone().tz(targetTz);
        const userRegion = getCanonicalCityAndOffset(userTz);
        const targetRegion = getCanonicalCityAndOffset(targetTz);
        // Use user's preferred format for both times
        const userFormat = loadUserTzSettings(userId).format === '12HR' ? 'h:mm A' : 'HH:mm';
        const userTimeStr = parsed.format(userFormat);
        const targetTimeStr = converted.format(userFormat);

        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(GREEN_COLOR)
                    .setDescription(`**${userTimeStr}** in **${userRegion}** → **${targetTimeStr}** in **${targetRegion}**`)
            ]
        });
        return;
    }

async function handleTzButton(interaction) {
    // Example: handle timezone setting button
    if (interaction.customId.startsWith('timezone_set')) {
        // Extract timezone from customId, e.g. "timezone_set_EST"
        const tz = interaction.customId.split('_')[2];
        // Save timezone for user, reply, etc.
        await interaction.reply({ content: `Timezone set to ${tz}.`, ephemeral: true });
    }
    // Add more button logic as needed
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Manage your timezone')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set your timezone')
                .addStringOption(opt => opt.setName('location').setDescription('Timezone location').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Clear your timezone')
        )
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Show your timezone')
        )
        .addSubcommand(sub =>
            sub.setName('user')
                .setDescription('Show another user\'s timezone')
                .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
        ),
    async execute(interaction) {
        ensureCommandPermissions('tz');
        const userId = interaction.user.id;
        if (interaction.options.getSubcommand() === 'set') {
            const location = interaction.options.getString('location');
            const zone = setTimezone(userId, location);
            if (!zone) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(RED_COLOR)
                            .setDescription(`<:cross:1417385054442750034>Invalid timezone: ${location}\nUse format like: \`new york\`, \`los angeles\`, \`EST\`, \`GMT+1\`, \`colorado\`, \`ksa/jeddah\`, \`America/New_York\`, \`Europe/London\``)
                    ],
                    ephemeral: true
                });
                return;
            }
            const currentTime = getCurrentTime(userId);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(`#285536`)
                        .setDescription(`<:clock:1417394803347292272> <@${userId}>: Your current time is **${currentTime}**`)
                ],
                ephemeral: false
            });
            return;
        }
        if (interaction.options.getSubcommand() === 'clear') {
            clearTimezone(userId);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(GREEN_COLOR)
                        .setDescription(`<:check:1417385032762523678> Your timezone has been cleared.`)
                ],
                ephemeral: false
            });
            return;
        }
        if (interaction.options.getSubcommand() === 'show') {
            const tz = getTimezone(userId);
            if (!tz || typeof tz !== 'string') {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(RED_COLOR)
                            .setDescription('<:cross:1417385054442750034> You have not set a timezone.')
                    ],
                    ephemeral: true
                });
                return;
            }
            // Use user's own format
            const currentTime = getCurrentTimeWithFormat(userId);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(`#285536`)
                        .setDescription(`<:clock:1417394803347292272> <@${userId}>: Your current time is **${currentTime}**`)
                ],
                ephemeral: false
            });
            return;
        }
        if (interaction.options.getSubcommand() === 'user') {
            const targetUser = interaction.options.getUser('user');
            const tz = getTimezone(targetUser.id);
            if (!tz || typeof tz !== 'string') {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(RED_COLOR)
                            .setDescription(`<:cross:1417385054442750034> ${targetUser} hasn't set their timezone yet.`)
                    ],
                    ephemeral: true
                });
                return;
            }
            // Use the requesting user's format for display
            const formatOverride = loadUserTzSettings(userId).format;
            const currentTime = getCurrentTimeWithFormat(targetUser.id, formatOverride);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(`#285536`)
                        .setDescription(`<:clock:1417394803347292272> <@${targetUser.id}>: Their current time is **${currentTime}**`)
                ],
                ephemeral: false
            });
            return;
        }
    },
    handleTzMessage,
    handleTzButton,
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
