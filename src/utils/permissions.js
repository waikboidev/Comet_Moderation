const { PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');

/**
 * Checks if a user has permission to run a command.
 * Works for both slash command interactions and prefix command messages.
 * @param {import('discord.js').Interaction | import('discord.js').Message} source - The interaction or message object.
 * @param {string} commandName - The name of the command.
 * @param {string|null} subcommandName - The name of the subcommand, if any.
 * @returns {Promise<boolean>} - True if the user has permission, false otherwise.
 */
async function hasPermission(source, commandName, subcommandName = null) {
  const member = source.member;
  const guild = source.guild;

  if (!member || !guild) return false;

  // Bot owner and server owner always have permission.
  if (member.id === process.env.OWNER_ID || member.id === guild.ownerId) {
    return true;
  }

  const config = await GuildConfig.findOne({ guildId: guild.id });

  // Determine the permission configuration to use.
  // Priority: Subcommand -> Command -> Default (Admin)
  let permConfig = null;
  if (subcommandName && config?.Permissions?.[commandName]?.[subcommandName]) {
    permConfig = config.Permissions[commandName][subcommandName];
  } else if (config?.Permissions?.[commandName]) {
    permConfig = config.Permissions[commandName];
  }

  const allowedRoles = permConfig?.roles || [];
  const allowedPerms = permConfig?.permissions || [];

  // If any custom permissions are set, they are the ONLY source of truth.
  if (allowedRoles.length > 0 || allowedPerms.length > 0) {
    const hasRole = allowedRoles.some(roleId => member.roles.cache.has(roleId));
    const hasPerm = allowedPerms.some(perm => member.permissions.has(PermissionFlagsBits[perm] || perm));
    return hasRole || hasPerm;
  }

  // If no custom permissions are set, fall back to default permissions.
  // For configuration commands, default to Administrator.
  if (commandName === 'configuration') {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }
  // For moderation commands, default to ManageChannels/ManageMessages.
  if (['lock', 'unlock', 'purge'].includes(commandName)) {
      return member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.ManageChannels);
  }

  // If no specific default, allow usage.
  return true;
}

module.exports = { hasPermission };
