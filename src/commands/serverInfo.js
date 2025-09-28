// prefix support & prefix command required, awaiting mongoose integration to go through with process

const { SlashCommandBuilder, EmbedBuilder, GuildVerificationLevel, GuildExplicitContentFilter, ChannelType, GuildMFALevel, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
require("dotenv").config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Shows detailed information about the current server."),

  async execute(i) {
    const guild = i.guild;

    if (!guild) {
      return i.reply({ content: "<:fail:1420911452050686034> This command can only be used in a server.", ephemeral: true });
    }

    const fetchedGuild = await guild.fetch().catch(console.error);
    if (!fetchedGuild) {
        return i.reply({ content: "<:fail:1420911452050686034> Could not fetch full server information. Please try again.", ephemeral: true });
    }

    const verificationLevelMap = {
      [GuildVerificationLevel.None]: "None",
      [GuildVerificationLevel.Low]: "Low (Email Verification)",
      [GuildVerificationLevel.Medium]: "Medium (5 min on Discord)",
      [GuildVerificationLevel.High]: "High (10 min in Server)",
      [GuildVerificationLevel.VeryHigh]: "Very High (Phone Verification)",
    };

    const explicitContentFilterMap = {
      [GuildExplicitContentFilter.Disabled]: "Disabled",
      [GuildExplicitContentFilter.MembersWithoutRoles]: "Members Without Roles",
      [GuildExplicitContentFilter.AllMembers]: "All Members",
    };

    const mfaLevelMap = {
        [GuildMFALevel.None]: "None",
        [GuildMFALevel.Elevated]: "Required for Moderators/Admins",
    };

    const onlineMembers = guild.members.cache.filter(member => member.presence?.status === 'online' || member.presence?.status === 'idle' || member.presence?.status === 'dnd').size;

    const channels = guild.channels.cache;
    const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
    const forumCount = channels.filter(c => c.type === ChannelType.GuildForum).size;
    const threadCount = channels.filter(c => c.type === ChannelType.GuildPublicThread || c.type === ChannelType.GuildPrivateThread).size;
    const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const announcementCount = channels.filter(c => c.type === ChannelType.GuildAnnouncement).size;

    // Roles
    const roles = guild.roles.cache.sort((a, b) => b.position - a.position).filter(role => role.id !== guild.id); 
    const displayedRoles = roles.size
      ? roles.map(role => `<@&${role.id}>`).slice(0, 15).join(', ')
      : "None";
    const remainingRolesCount = roles.size > 15 ? ` and ${roles.size - 15} more...` : '';

    // Emojis
    const emojis = guild.emojis.cache;
    const displayedEmojis = emojis.size
      ? emojis.map(e => `<:${e.name}:${e.id}>`).slice(0, 15).join(' ')
      : "None";
    const remainingEmojisCount = emojis.size > 15 ? ` and ${emojis.size - 15} more...` : '';

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${fetchedGuild.name}`, iconURL: fetchedGuild.iconURL({ dynamic: true }) })
      .setThumbnail(fetchedGuild.iconURL({ dynamic: true, size: 256 }));

    if (fetchedGuild.description) {
      embed.setDescription(fetchedGuild.description);
    }

    // General Information
    embed.addFields(
        { name: "General Information", value: [
            `**Server ID:** ${fetchedGuild.id}`,
            `**Owner:** <@${fetchedGuild.ownerId}>`,
            `**Members:** ${fetchedGuild.memberCount}`,
            `**Created On:** <t:${Math.floor(fetchedGuild.createdTimestamp / 1000)}:F>`,
            `**Notifications:** ${fetchedGuild.defaultMessageNotifications === 0 ? "All Messages" : "Only @Mentions"}`,
            `**Server Boosts:** ${fetchedGuild.premiumSubscriptionCount || 0} (Level ${fetchedGuild.premiumTier})`
        ].join('\n'), inline: false },

        // Security
        { name: "Security", value: [
            `**2FA Settings:** ${mfaLevelMap[fetchedGuild.mfaLevel] || "Unknown"}`,
            `**Verification Level:** ${verificationLevelMap[fetchedGuild.verificationLevel] || "Unknown"}`,
            `**Explicit Content Filter:** ${explicitContentFilterMap[fetchedGuild.explicitContentFilter] || "Unknown"}`,
            `**Member Verification Gate:** ${fetchedGuild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED') ? "Enabled" : "Disabled"}`
        ].join('\n'), inline: false },

        // Configuration
        { name: "Configuration", value: [
            `**Public Updates Channel:** ${fetchedGuild.publicUpdatesChannel ? `<#${fetchedGuild.publicUpdatesChannel.id}>` : "Not Setup"}`,
            `**System Messages Channel:** ${fetchedGuild.systemChannel ? `<#${fetchedGuild.systemChannel.id}>` : "Not Setup"}`,
            `**Rules Channel:** ${fetchedGuild.rulesChannel ? `<#${fetchedGuild.rulesChannel.id}>` : "Not Setup"}`
        ].join('\n'), inline: false },

        // Channels
        {
            name: `Channels (${channels.size})`,
            value: [
                `**Categories:** ${categoryCount}`,
                `**Text:** ${textCount}`,
                `**Forum:** ${forumCount}`,
                `**Threads:** ${threadCount}`,
                `**Voice:** ${voiceCount}`,
                `**Announcement:** ${announcementCount}`,
            ].join('\n'),
            inline: false
        },

        // Roles
        {
            name: `Roles (${roles.size})`,
            value: `${displayedRoles}${remainingRolesCount || ''}`,
            inline: false
        },

        // Emojis
        {
            name: `Emojis (${Math.min(emojis.size, 15)}/${emojis.size})`,
            value: `${displayedEmojis}${remainingEmojisCount || ''}`,
            inline: false
        },

        // Features
        {
            name: "Server Features",
            value: fetchedGuild.features.length > 0
                ? fetchedGuild.features.map(f => f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(', ')
                : "None",
            inline: false
        },

        // Other Details
        {
            name: "Other Details",
            value: [
                `**Banner:** ${fetchedGuild.banner ? `[Banner Image](${fetchedGuild.bannerURL({ size: 1024 })})` : "None"}`,
                `**Vanity URL:** ${fetchedGuild.vanityURLCode ? `discord.gg/${fetchedGuild.vanityURLCode}` : "None"}`,
                `**AFK Channel:** ${fetchedGuild.afkChannel ? `<#${fetchedGuild.afkChannel.id}>` : "None"}`,
                `**AFK Timeout:** ${fetchedGuild.afkTimeout ? `${fetchedGuild.afkTimeout / 60} min` : "None"}`
            ].join('\n'),
            inline: false
        }
    )
    .setColor(embedColors.info)
    .setFooter({ text: `Requested by ${i.user.tag}`, iconURL: i.user.displayAvatarURL() })
    .setTimestamp();

    await i.reply({ embeds: [embed] });

  },

  // Prefix command handler
  async prefixHandler(message) {
    if (!message.guild || message.author.bot) return;
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config?.PrefixEnabled) return;

    const prefix = config?.Prefix || 'c-';
    const content = message.content.trim().toLowerCase();

    // Accept c-serverinfo, c-si, or <prefix>serverinfo, <prefix>si
    if (
      content === `${prefix}serverinfo` ||
      content === `${prefix}si`
    ) {
      // Simulate the slash command embed reply
      const guild = message.guild;
      const fetchedGuild = await guild.fetch().catch(() => null);
      if (!fetchedGuild) {
        await message.channel.send({ content: "<:fail:1420911452050686034> Could not fetch full server information. Please try again." });
        return;
      }

      const verificationLevelMap = {
        [GuildVerificationLevel.None]: "None",
        [GuildVerificationLevel.Low]: "Low (Email Verification)",
        [GuildVerificationLevel.Medium]: "Medium (5 min on Discord)",
        [GuildVerificationLevel.High]: "High (10 min in Server)",
        [GuildVerificationLevel.VeryHigh]: "Very High (Phone Verification)",
      };

      const explicitContentFilterMap = {
        [GuildExplicitContentFilter.Disabled]: "Disabled",
        [GuildExplicitContentFilter.MembersWithoutRoles]: "Members Without Roles",
        [GuildExplicitContentFilter.AllMembers]: "All Members",
      };

      const mfaLevelMap = {
          [GuildMFALevel.None]: "None",
          [GuildMFALevel.Elevated]: "Required for Moderators/Admins",
      };

      const onlineMembers = guild.members.cache.filter(member => member.presence?.status === 'online' || member.presence?.status === 'idle' || member.presence?.status === 'dnd').size;

      const channels = guild.channels.cache;
      const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;
      const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
      const forumCount = channels.filter(c => c.type === ChannelType.GuildForum).size;
      const threadCount = channels.filter(c => c.type === ChannelType.GuildPublicThread || c.type === ChannelType.GuildPrivateThread).size;
      const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
      const announcementCount = channels.filter(c => c.type === ChannelType.GuildAnnouncement).size;

      // Roles
      const roles = guild.roles.cache.sort((a, b) => b.position - a.position).filter(role => role.id !== guild.id);
      const displayedRoles = roles.size
        ? roles.map(role => `<@&${role.id}>`).slice(0, 15).join(', ')
        : "None";
      const remainingRolesCount = roles.size > 15 ? ` and ${roles.size - 15} more...` : '';

      // Emojis
      const emojis = guild.emojis.cache;
      const displayedEmojis = emojis.size
        ? emojis.map(e => `<:${e.name}:${e.id}>`).slice(0, 15).join(' ')
        : "None";
      const remainingEmojisCount = emojis.size > 15 ? ` and ${emojis.size - 15} more...` : '';

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${fetchedGuild.name}`, iconURL: fetchedGuild.iconURL({ dynamic: true }) })
        .setThumbnail(fetchedGuild.iconURL({ dynamic: true, size: 256 }));
      if (fetchedGuild.description) {
        embed.setDescription(fetchedGuild.description);
      }

      // General Information
      embed.addFields(
          { name: "General Information", value: [
              `**Server ID:** ${fetchedGuild.id}`,
              `**Owner:** <@${fetchedGuild.ownerId}>`,
              `**Members:** ${fetchedGuild.memberCount}`,
              `**Created On:** <t:${Math.floor(fetchedGuild.createdTimestamp / 1000)}:F>`,
              `**Notifications:** ${fetchedGuild.defaultMessageNotifications === 0 ? "All Messages" : "Only @Mentions"}`,
              `**Server Boosts:** ${fetchedGuild.premiumSubscriptionCount || 0} (Level ${fetchedGuild.premiumTier})`
          ].join('\n'), inline: false },

          // Security
          { name: "Security", value: [
              `**2FA Settings:** ${mfaLevelMap[fetchedGuild.mfaLevel] || "Unknown"}`,
              `**Verification Level:** ${verificationLevelMap[fetchedGuild.verificationLevel] || "Unknown"}`,
              `**Explicit Content Filter:** ${explicitContentFilterMap[fetchedGuild.explicitContentFilter] || "Unknown"}`,
              `**Member Verification Gate:** ${fetchedGuild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED') ? "Enabled" : "Disabled"}`
          ].join('\n'), inline: false },

          // Configuration
          { name: "Configuration", value: [
              `**Public Updates Channel:** ${fetchedGuild.publicUpdatesChannel ? `<#${fetchedGuild.publicUpdatesChannel.id}>` : "Not Setup"}`,
              `**System Messages Channel:** ${fetchedGuild.systemChannel ? `<#${fetchedGuild.systemChannel.id}>` : "Not Setup"}`,
              `**Rules Channel:** ${fetchedGuild.rulesChannel ? `<#${fetchedGuild.rulesChannel.id}>` : "Not Setup"}`
          ].join('\n'), inline: false },

          // Channels
          {
              name: `Channels (${channels.size})`,
              value: [
                  `**Categories:** ${categoryCount}`,
                  `**Text:** ${textCount}`,
                  `**Forum:** ${forumCount}`,
                  `**Threads:** ${threadCount}`,
                  `**Voice:** ${voiceCount}`,
                  `**Announcement:** ${announcementCount}`,
              ].join('\n'),
              inline: false
          },

          // Roles
          {
              name: `Roles (${roles.size})`,
              value: `${displayedRoles}${remainingRolesCount || ''}`,
              inline: false
          },

          // Emojis
          {
              name: `Emojis (${Math.min(emojis.size, 15)}/${emojis.size})`,
              value: `${displayedEmojis}${remainingEmojisCount || ''}`,
              inline: false
          },

          // Features
          {
              name: "Server Features",
              value: fetchedGuild.features.length > 0
                  ? fetchedGuild.features.map(f => f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(', ')
                  : "None",
              inline: false
          },

          // Other Details
          {
              name: "Other Details",
              value: [
                  `**Banner:** ${fetchedGuild.banner ? `[Banner Image](${fetchedGuild.bannerURL({ size: 1024 })})` : "None"}`,
                  `**Vanity URL:** ${fetchedGuild.vanityURLCode ? `discord.gg/${fetchedGuild.vanityURLCode}` : "None"}`,
                  `**AFK Channel:** ${fetchedGuild.afkChannel ? `<#${fetchedGuild.afkChannel.id}>` : "None"}`,
                  `**AFK Timeout:** ${fetchedGuild.afkTimeout ? `${fetchedGuild.afkTimeout / 60} min` : "None"}`
              ].join('\n'),
              inline: false
          }
      )
      .setColor(embedColors.info)
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    }
  },

  // Helper to check if user has permission for a command/subcommand
  async hasPermission(interaction, command, subcommand) {
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
};