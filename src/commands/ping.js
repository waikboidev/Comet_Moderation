const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const { hasPermission } = require('../utils/permissions');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Gets the current latency of the bot.'),
  async execute(interaction) {
    if (!await hasPermission(interaction, 'ping')) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription(`${emojis.fail} You do not have permission to use this command.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const websocketLatency = Math.max(0, Math.round(interaction.client.ws.ping));
    const roundtripLatency = Date.now() - sent.createdTimestamp;

    await interaction.editReply(`It took \`${apiLatency} ms\` to reach Discord Servers, \`${websocketLatency} ms\` to reach websocket, and \`${roundtripLatency} ms\` for a roundtrip message.`);
  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;

    const prefix = config?.Prefix || 'c-';
    const content = message.content.trim().toLowerCase();

    // Accept c-ping or <prefix>ping
    if (content === `${prefix}ping`) {
      if (!await hasPermission(message, 'ping')) return;
      const sent = await message.channel.send('Pinging...');
      const apiLatency = sent.createdTimestamp - message.createdTimestamp;
      const websocketLatency = Math.max(0, Math.round(message.client.ws.ping));
      const roundtripLatency = Date.now() - sent.createdTimestamp;

      await sent.edit(`It took \`${apiLatency} ms\` to reach Discord Servers, \`${websocketLatency} ms\` to reach websocket, and \`${roundtripLatency} ms\` for a roundtrip message.`);
    }
  }
};
