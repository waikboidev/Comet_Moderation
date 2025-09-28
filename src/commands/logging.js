const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

// Predefined logging types
const LOGGING_TYPES = [
  'role',
  'message',
  'moderation',
  'member',
  'server',
  'master'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logging')
    .setDescription('Configure logging channels and disable logging types.')
    .addSubcommand(sub =>
      sub.setName('channels')
        .setDescription('Set logging channel for a specific type or all types.')
        .addStringOption(opt =>
          opt.setName('logging-type')
            .setDescription('Type of logging to configure')
            .setRequired(true)
            .addChoices(
              ...LOGGING_TYPES.map(type => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value: type }))
            )
        )
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send logs to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable logging for specific types or all types.')
        .addStringOption(opt =>
          opt.setName('logging-type')
            .setDescription('Type(s) of logging to disable (comma separated or "master")')
            .setRequired(true)
            .addChoices(
              ...LOGGING_TYPES.map(type => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value: type }))
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('settingsshow')
        .setDescription('Show all logging types and their current settings.')
    ),

  async execute(interaction) {
    // Only allow admins to configure logging
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(embedColors.error)
        .setDescription('<:fail:1420911452050686034> You do not have permission to use this command.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const guildId = interaction.guild.id;
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.create({ guildId, Prefix: 'c-' });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'channels') {
      const loggingType = interaction.options.getString('logging-type');
      const channel = interaction.options.getChannel('channel');

      if (loggingType === 'master') {
        // Set master logging channel for all types
        LOGGING_TYPES.filter(t => t !== 'master').forEach(type => {
          config[`${type}LogChannelId`] = channel.id;
        });
        config.masterLogChannelId = channel.id;
        await config.save();
        const embed = new EmbedBuilder()
          .setColor(embedColors.success)
          .setTitle('Master Logging Channel Set')
          .setDescription(`<:settingsSuccess:1421677722601787412> All logging types will now use <#${channel.id}>.`);
        await interaction.reply({ embeds: [embed], ephemeral: false });
      } else {
        // Set channel for specific logging type
        config[`${loggingType}LogChannelId`] = channel.id;
        await config.save();
        const embed = new EmbedBuilder()
          .setColor(embedColors.success)
          .setTitle('Logging Channel Set')
          .setDescription(`<:settingsSuccess:1421677722601787412> Logging for **${loggingType}** will now use <#${channel.id}>.`);
        await interaction.reply({ embeds: [embed], ephemeral: false });
      }
    } else if (sub === 'disable') {
      const loggingType = interaction.options.getString('logging-type');

      if (loggingType === 'master') {
        // Disable all logging types
        LOGGING_TYPES.filter(t => t !== 'master').forEach(type => {
          config[`${type}LogChannelId`] = null;
        });
        config.masterLogChannelId = null;
        await config.save();
        const embed = new EmbedBuilder()
          .setColor(embedColors.warning)
          .setTitle('All Logging Disabled')
          .setDescription(`<:settingsSuccess:1421677722601787412> All logging types have been disabled.`);
        await interaction.reply({ embeds: [embed], ephemeral: false });
      } else {
        // Disable specific logging type
        config[`${loggingType}LogChannelId`] = null;
        await config.save();
        const embed = new EmbedBuilder()
          .setColor(embedColors.warning)
          .setTitle('Logging Disabled')
          .setDescription(`<:settingsSuccess:1421677722601787412> Logging for **${loggingType}** has been disabled.`);
        await interaction.reply({ embeds: [embed], ephemeral: false });
      }
    } else if (sub === 'settingsshow') {
      let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
      if (!config) {
        config = await GuildConfig.create({ guildId: interaction.guild.id, Prefix: 'c-' });
      }

      let desc = LOGGING_TYPES
        .filter(type => type !== 'master')
        .map(type => {
          const channelId = config[`${type}LogChannelId`];
          return `**${type.charAt(0).toUpperCase() + type.slice(1)}:** ${channelId ? `<#${channelId}>` : '`Disabled`'}`;
        }).join('\n');

      desc += `\n**Master:** ${config.masterLogChannelId ? `<#${config.masterLogChannelId}>` : '`Disabled`'}`;

      const embed = new EmbedBuilder()
        .setColor(embedColors.info)
        .setTitle('Logging Settings')
        .setDescription(desc);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
