const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Shows detailed information about a channel.')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to get info about')
        .setRequired(false)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const embed = createChannelInfoEmbed(channel);
    await interaction.reply({ embeds: [embed] });
  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;
    const prefix = config?.Prefix || 'c-';
    const args = message.content.trim().split(/\s+/);
    if (args[0].toLowerCase() === `${prefix}channelinfo`) {
      const channel = message.mentions.channels.first() || message.channel;
      const embed = createChannelInfoEmbed(channel);
      await message.channel.send({ embeds: [embed] });
    }
  }
};

function createChannelInfoEmbed(channel) {
  const embed = new EmbedBuilder()
    .setColor(embedColors.info)
    .setTitle(`Channel Information: #${channel.name}`)
    .addFields(
      { name: 'Name', value: channel.name, inline: true },
      { name: 'ID', value: channel.id, inline: true },
      { name: 'Type', value: ChannelType[channel.type], inline: true },
      { name: 'Created At', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`, inline: false }
    );
  if (channel.topic) {
    embed.addFields({ name: 'Topic', value: channel.topic, inline: false });
  }
  return embed;
}
