const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const { hasPermission } = require('../utils/permissions');
const emojis = require('../../emojis');

const helpEmbeds = {
  main: new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Help')
    .addFields(
      { name: 'Comet Support', value: 'Looking for help or guidance? We are always ready to assist you. Join our [support server here.](https://discord.gg/comet).', inline: false },
      { name: 'Moderation', value: 'c-help moderation', inline: false },
      { name: 'Utility', value: 'c-help utility', inline: false },
      { name: 'Information', value: 'c-help information', inline: false },
      { name: 'Fun', value: 'c-help fun', inline: false }
    ),
  moderation: new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Moderation Commands')
    .setDescription('`/purge`, `/lock`, `/unlock`'),
  utility: new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Utility Commands')
    .setDescription('`/say`, `/remindme`, `/quote`, `/enlarge`'),
  information: new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Information Commands')
    .setDescription('`/whois`, `/serverinfo`, `/channelinfo`, `/avatar`, `/emotes`, `/inviteinfo`, `/membercount`, `/roleinfo`, `/uptime`, `/ping`, `/rolemembers`'),
  fun: new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Fun Commands')
    .setDescription('`/fun catfact`, `/fun dogfact`, `/fun worldfact`, `/fun randomfact`, `/dadjoke`, `/coinflip`, `/8ball`')
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows a list of commands.')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Command category to get help for')
        .setRequired(false)
        .addChoices(
          { name: 'Moderation', value: 'moderation' },
          { name: 'Utility', value: 'utility' },
          { name: 'Information', value: 'information' },
          { name: 'Fun', value: 'fun' }
        )
    ),
  async execute(interaction) {
    if (!await hasPermission(interaction, 'help')) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription(`${emojis.fail} You do not have permission to use this command.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const category = interaction.options.getString('category');
    const embed = helpEmbeds[category] || helpEmbeds.main;
    await interaction.reply({ embeds: [embed] });
  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;
    const prefix = config?.Prefix || 'c-';
    const args = message.content.trim().split(/\s+/);
    if (args[0].toLowerCase() === `${prefix}help`) {
      if (!await hasPermission(message, 'help')) return;
      const category = args[1]?.toLowerCase();
      const embed = helpEmbeds[category] || helpEmbeds.main;
      await message.channel.send({ embeds: [embed] });
    }
  }
};
