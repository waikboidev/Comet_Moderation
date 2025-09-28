const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');

async function getLockRoles(guild) {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  let roles = config?.Locks?.roles;
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    // Default to @everyone
    return [guild.id];
  }
  return roles;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (prevent sending messages).')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to lock')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const roles = await getLockRoles(interaction.guild);
    for (const roleId of roles) {
      await channel.permissionOverwrites.edit(roleId, { SendMessages: false });
    }
    await interaction.reply({ content: `🔒`, ephemeral: false });
  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;
    const prefix = config?.Prefix || 'c-';
    const args = message.content.trim().split(/\s+/);
    if (args[0].toLowerCase() === `${prefix}lock`) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
      const channel = message.mentions.channels.first() || message.channel;
      const roles = await getLockRoles(message.guild);
      for (const roleId of roles) {
        await channel.permissionOverwrites.edit(roleId, { SendMessages: false });
      }
      await message.channel.send('🔒');
    }
  }
};
