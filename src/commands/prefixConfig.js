const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

// Helper to check if user has permission for a command/subcommand
async function hasPermission(interaction, command, subcommand) {
  const guildId = interaction.guild.id;
  const config = await GuildConfig.findOne({ guildId });
  let allowedRoles = config?.Permissions?.[command]?.[subcommand] || config?.Permissions?.[command] || null;
  if (!allowedRoles) {
    // Default to admin if not set
    return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  }
  // allowedRoles can be array of role IDs
  return interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View, set, or reset the server command prefix.')
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View the current prefix')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a new prefix')
        .addStringOption(opt =>
          opt.setName('prefix')
            .setDescription('The new prefix')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset the prefix to default')
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    // Ensure guild config exists
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.create({ guildId, Prefix: 'c-' });
    }

    // Permission check for set/reset
    if (sub === 'set' || sub === 'reset') {
      const allowed = await hasPermission(interaction, 'prefix', sub);
      if (!allowed) {
        const embed = new EmbedBuilder()
          .setColor(embedColors.error)
          .setDescription('<:fail:1420911452050686034> You do not have permission to use this command.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setColor(embedColors.info)
        .setTitle('Current Prefix')
        .setDescription(`\`${config.Prefix}\``);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'set') {
      const newPrefix = interaction.options.getString('prefix');
      config.Prefix = newPrefix;
      await config.save();
      const embed = new EmbedBuilder()
        .setColor(embedColors.success)
        .setTitle('Prefix Updated')
        .setDescription('<:settingsSuccess:1421677722601787412> Prefix updated to: `' + newPrefix + '`');
      await interaction.reply({ embeds: [embed], ephemeral: false });
    } else if (sub === 'reset') {
      config.Prefix = 'c-';
      await config.save();
      const embed = new EmbedBuilder()
        .setColor(embedColors.success)
        .setTitle('Prefix Reset')
        .setDescription('<:settingsSuccess:1421677722601787412> Prefix reset to default: `c-`');
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};

// Prefix is saved in mongoose at: GuildConfig.Prefix