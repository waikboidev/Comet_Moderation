const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

const helpEmbeds = {
  main: new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Help')
    .setDescription('Use `/help <category>` or `{prefix}help <category>` for more info.')
    .addFields(
      { name: 'Moderation', value: 'Commands for server moderation.', inline: true },
      { name: 'Utility', value: 'Useful utility commands.', inline: true },
      { name: 'Information', value: 'Commands to get information.', inline: true }
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
    .setDescription('`/whois`, `/serverinfo`, `/channelinfo`, `/avatar`, `/emotes`, `/inviteinfo`, `/membercount`, `/roleinfo`, `/uptime`, `/ping`, `/rolemembers`')
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
          { name: 'Information', value: 'information' }
        )
    ),
  async execute(interaction) {
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
      const category = args[1]?.toLowerCase();
      const embed = helpEmbeds[category] || helpEmbeds.main;
      await message.channel.send({ embeds: [embed] });
    }
  }
};
