const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Shows how long the bot has been online.'),
  async execute(interaction) {
    const uptime = interaction.client.uptime;
    const embed = createUptimeEmbed(uptime);
    await interaction.reply({ embeds: [embed] });
  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;
    const prefix = config?.Prefix || 'c-';
    if (message.content.trim().toLowerCase() === `${prefix}uptime`) {
      const uptime = message.client.uptime;
      const embed = createUptimeEmbed(uptime);
      await message.channel.send({ embeds: [embed] });
    }
  }
};

function createUptimeEmbed(uptime) {
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor(uptime / 3600000) % 24;
  const minutes = Math.floor(uptime / 60000) % 60;
  const seconds = Math.floor(uptime / 1000) % 60;
  return new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle('Uptime')
    .setDescription(`I have been online for **${days}d ${hours}h ${minutes}m ${seconds}s**.`);
}
