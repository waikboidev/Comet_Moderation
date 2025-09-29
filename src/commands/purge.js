const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages in a channel.')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to delete (max 100)')
        .setRequired(true)
    ),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    if (!await hasPermission(interaction, 'purge')) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }
    if (amount < 1 || amount > 100) {
      await interaction.reply({ content: 'Amount must be between 1 and 100.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const messages = await interaction.channel.bulkDelete(amount, true);
    await interaction.deleteReply();
  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;
    const prefix = config?.Prefix || 'c-';
    const args = message.content.trim().split(/\s+/);
    if (args[0].toLowerCase() === `${prefix}purge` && args[1]) {
      if (!await hasPermission(message, 'purge')) return;
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount < 1 || amount > 100) return;
      await message.delete();
      await message.channel.bulkDelete(amount, true);
    }
  }
};
