const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');

// Helper to check if user has permission for a command/subcommand
async function hasPermission(interaction, command, subcommand) {
  const guildId = interaction.guild.id;
  const config = await GuildConfig.findOne({ guildId });

  let permConfig = config?.Permissions?.[command]?.[subcommand] || config?.Permissions?.[command] || {};
  let allowedRoles = Array.isArray(permConfig) ? permConfig : permConfig.roles || [];
  if (!Array.isArray(allowedRoles)) {
    allowedRoles = typeof allowedRoles === 'string' ? [allowedRoles] : [];
  }
  const allowedPerms = Array.isArray(permConfig.permissions) ? permConfig.permissions : [];

  if (allowedRoles.length > 0 || allowedPerms.length > 0) {
    const hasRole = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
    const hasPerm = allowedPerms.some(perm => interaction.member.permissions.has(PermissionFlagsBits[perm] || perm));
    return hasRole || hasPerm;
  }

  return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configuration')
    .setDescription('Configure command permissions.')
    .addSubcommand(sub =>
      sub.setName('commandpermissions')
        .setDescription('Set allowed roles and/or permissions for a command/subcommand.')
        .addStringOption(opt =>
          opt.setName('command')
            .setDescription('Command name (e.g. prefix)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('subcommand')
            .setDescription('Subcommand name (optional)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('roles')
            .setDescription('Mention roles or type role names (comma separated)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('permissions')
            .setDescription('Discord permissions (comma separated, e.g. ManageChannels, ManageMessages)')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    // Permission check for configuration command
    const allowed = await hasPermission(interaction, 'configuration', 'commandpermissions');
    if (!allowed) {
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

    const command = interaction.options.getString('command');
    const subcommand = interaction.options.getString('subcommand');
    const rolesInput = interaction.options.getString('roles');
    const permsInput = interaction.options.getString('permissions');

    // Parse roles: mentions or names
    let roleIds = [];
    let failedRoles = [];
    if (rolesInput) {
      const roleNames = rolesInput.split(',').map(r => r.trim());
      for (const r of roleNames) {
        const match = r.match(/^<@&(\d+)>$/);
        if (match) {
          roleIds.push(match[1]);
        } else {
          const found = interaction.guild.roles.cache.find(role => role.name === r);
          if (found) roleIds.push(found.id);
          else failedRoles.push(r);
        }
      }
    }

    // Parse permissions
    let permissions = [];
    if (permsInput) {
      permissions = permsInput.split(',').map(p => p.trim()).filter(Boolean);
    }

    if (rolesInput && !roleIds.length) {
      const embed = new EmbedBuilder()
        .setColor(embedColors.error)
        .setTitle('Invalid Role(s)')
        .setDescription(`<:settingsFail:1421677704008302734> No valid roles found: ${failedRoles.map(n => `\`${n}\``).join(', ')}.\nPlease mention or type exact role names.`);
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    // Save to config
    if (!config.Permissions) config.Permissions = {};
    let target = config.Permissions;
    if (subcommand) {
      if (!target[command]) target[command] = {};
      target = target[command];
      target[subcommand] = target[subcommand] || {};
      target = target[subcommand];
    } else {
      target[command] = target[command] || {};
      target = target[command];
    }
    // Always save as arrays
    target.roles = Array.isArray(roleIds) ? roleIds : [];
    target.permissions = Array.isArray(permissions) ? permissions : [];
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(embedColors.success)
      .setTitle('Permissions Updated')
      .setDescription([
        `<:settingsSuccess:1421677722601787412> Permissions for \`${command}${subcommand ? ' ' + subcommand : ''}\` updated.`,
        roleIds.length ? `**Roles:** ${roleIds.map(id => `<@&${id}>`).join(', ')}` : '',
        permissions.length ? `**Permissions:** ${permissions.map(p => `\`${p}\``).join(', ')}` : ''
      ].filter(Boolean).join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};

// Permissions are saved in mongoose at: GuildConfig.Permissions[command][subcommand] or GuildConfig.Permissions[command]
