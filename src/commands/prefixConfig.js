const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

// Helper to check if user has permission for a command/subcommand
async function hasPermission(interaction, command, subcommand) {
  const guildId = interaction.guild.id;
  const config = await GuildConfig.findOne({ guildId });

  // Get custom permissions config
  let permConfig = config?.Permissions?.[command]?.[subcommand] || config?.Permissions?.[command] || {};
  // If config is an array, treat as role IDs (legacy support)
  let allowedRoles = Array.isArray(permConfig) ? permConfig : permConfig.roles || [];
  if (!Array.isArray(allowedRoles)) {
    allowedRoles = typeof allowedRoles === 'string' ? [allowedRoles] : [];
  }
  const allowedPerms = Array.isArray(permConfig.permissions) ? permConfig.permissions : [];

  // If any custom permissions (roles or perms) are set, ONLY use those (do not fallback to admin)
  if (allowedRoles.length > 0 || allowedPerms.length > 0) {
    // Check for role match
    const hasRole = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
    // Check for Discord permissions
    const hasPerm = allowedPerms.some(perm => interaction.member.permissions.has(PermissionFlagsBits[perm] || perm));
    return hasRole || hasPerm;
  }

  // If no custom permissions, fallback to admin
  return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View, set, reset, or configure prefix command usage.')
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
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable prefix commands for this server.')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable prefix commands?')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    // Ensure guild config exists
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.create({ guildId, Prefix: 'c-', PrefixEnabled: true });
    }

    // Permission check for set/reset
    if (sub === 'set' || sub === 'reset' || sub === 'toggle') {
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
        .setDescription(`**Server Prefix:** \`${config.Prefix}\``);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'set') {
      const newPrefix = interaction.options.getString('prefix');
      if (config.Prefix === newPrefix) {
        const embed = new EmbedBuilder()
          .setColor(embedColors.warning)
          .setDescription(`<:settingsAlert:1421727400122912859> The prefix \`${newPrefix}\` is already set as the active prefix.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      config.Prefix = newPrefix;
      await config.save();
      const embed = new EmbedBuilder()
        .setColor(embedColors.success)
        .setDescription('<:settingsSuccess:1421677722601787412> Prefix updated to: `' + newPrefix + '`');
      await interaction.reply({ embeds: [embed], ephemeral: false });
    } else if (sub === 'reset') {
      config.Prefix = 'c-';
      await config.save();
      const embed = new EmbedBuilder()
        .setColor(embedColors.success)
        .setDescription('<:settingsSuccess:1421677722601787412> Prefix reset to default: `c-`');
      await interaction.reply({ embeds: [embed], ephemeral: false });
    } else if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      config.PrefixEnabled = enabled;
      await config.save();
      const embed = new EmbedBuilder()
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setDescription(enabled
          ? '<:settingsSuccess:1421677722601787412> Prefix commands are now **enabled** for this server.'
          : '<:settingsSuccess:1421677722601787412> Prefix commands are now **disabled** for this server.');
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};

// Prefix is saved in mongoose at: GuildConfig.Prefix