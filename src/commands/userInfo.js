// src/commands/whois.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, UserFlags, Colors } = require("discord.js");
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
require("dotenv").config();

// Map Discord User Flags (Badges) to their names and custom emojis (replace with your server's emojis or Unicode)
const userBadges = {
    [UserFlags.Staff]: '<:discordstaff:1421715872845791283>',
    [UserFlags.Partner]: '<:discordpartner:1421715860875247750>', 
    [UserFlags.Hypesquad]: '<:events:1421715893750206494>',
    [UserFlags.BugHunterLevel1]: '<:bughunter1:1421715797704704051>',
    [UserFlags.BugHunterLevel2]: '<:bughunter2:1421715807834214420>',
    [UserFlags.HypeSquadOnlineHouse1]: '<:bravery:1421715773206036590>', // Bravery
    [UserFlags.HypeSquadOnlineHouse2]: '<:brilliance:1421715784715206749>', // Brilliance
    [UserFlags.HypeSquadOnlineHouse3]: '<:balance:1421715759020904448>', // Balance
    [UserFlags.PremiumEarlySupporter]: '<:earlysupporter:1421715884887642162>',
    [UserFlags.TeamPseudoUser]: '👨‍💻',
    [UserFlags.CertifiedModerator]: '<:certifiedmoderator:1421715818722492467>', 
    [UserFlags.VerifiedBot]: '<:verifiedapp:1421715905594790038>', 
    [UserFlags.VerifiedDeveloper]: '<:verifieddeveloper:1421715916236001370>',
    [UserFlags.BotHTTPInteractions]: '🤖',
    [UserFlags.ActiveDeveloper]: '<:developer:1421715831691153520>'

    // Add more if Discord introduces new flags
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("whois")
        .setDescription("Shows detailed information about a user.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User whos info to view.")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false }); // Defer reply as we might fetch data

        const targetUser = interaction.options.getUser("user");
        // We will attempt to fetch the member, but proceed even if null (user not in server)
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Fetch the user to get banner and flags which might not be cached
        const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

        // --- General User Information ---
        const userId = fullUser.id;
        const userTag = fullUser.tag; // Get the user's tag (e.g., Username#1234)
        const userMention = fullUser.toString(); // Get the user's mention string (<@ID>)
        const createdAt = `<t:${Math.floor(fullUser.createdTimestamp / 1000)}:f> (<t:${Math.floor(fullUser.createdTimestamp / 1000)}:R>)`; // Full date and relative time

        const userBadgesArray = [];
        if (fullUser.flags) {
            for (const flagName in userBadges) {
                // Ensure the flagName is correctly parsed if it's a string representation of the enum value
                // In our case, userBadges keys are already the integer values from UserFlags due to [] syntax
                // And I've corrected some of the userBadges definitions that had placeholders in previous outputs.
                if (fullUser.flags.has(parseInt(flagName))) {
                    userBadgesArray.push(userBadges[flagName]);
                }
            }
        }

        // Add Nitro badge if applicable (using premiumType for better detection)
        if (fullUser.premiumType > 0) { // Check if user has any type of Nitro subscription (0 = none)
            userBadgesArray.push('<:nitrodiamond:1421720341994143856>'); // Your Nitro emoji ID
        }

        const displayBadges = userBadgesArray.length > 0 ? userBadgesArray.join(' ') : 'None';

        const avatarURL = fullUser.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
        const bannerURL = fullUser.bannerURL({ size: 1024, extension: 'png', forceStatic: false });

        // Corrected bannerColor handling
        let bannerColorDisplay = 'Not set';
        if (fullUser.hexAccentColor) {
            // Ensure hexAccentColor itself doesn't start with '#' to avoid '##'
            const cleanedColor = fullUser.hexAccentColor.startsWith('#') ? fullUser.hexAccentColor.substring(1) : fullUser.hexAccentColor;
            bannerColorDisplay = `#${cleanedColor}`; // Add '#' for display string
        }

        // embedColor uses the raw hexAccentColor, which Discord.js handles correctly
        let embedColor = fullUser.hexAccentColor || embedColors.info;

        // General Info
        let generalInfo = `> <:member:1421719521957380148> **User:** ${userTag}\n`; // Display user's tag, not mention
        generalInfo += `> <:mention:1421718140395454575> **Mention:** ${userMention}\n`; // Mention is here
        if (targetMember?.nickname) {
            generalInfo += `> <:nickname:1421718131545608302> **Nickname:** ${targetMember.nickname}\n`;
        }
        generalInfo += `> <:id:1421718731800838207> **ID:** \`${userId}\`\n`;
        generalInfo += `> <:servermembernew:1421717673024426054> **Badges:** ${displayBadges}\n`;
        generalInfo += `> <:discordicon:1421718163141431336> **Created:** ${createdAt}\n`;
        generalInfo += `> <:edit:1421718153460711444> **Banner Color:** ${bannerColorDisplay}\n`;
        generalInfo += `> [**Avatar URL**](${avatarURL})\n`;
        if (bannerURL) {
            generalInfo += `> [**Banner URL**](${bannerURL})\n`;
        }
        

        // --- Server Specific Information (excluding roles for now) ---
        let serverInfo = '';
        let rolesInfo = ''; // New variable for roles field content

        if (targetMember) {
            const joinedAt = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:f> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`; // Full date and relative time
            const topRole = targetMember.roles.highest.name === '@everyone' ? 'None' : targetMember.roles.highest.toString();


            // --- Roles Information (for a separate field) ---
            const allMemberRoles = [...targetMember.roles.cache.values()].filter(r =>
                r
                && typeof r === 'object'
                && r.id
                && typeof r.id === 'string'
                && r.name
                && typeof r.name === 'string'
                && r.id !== interaction.guild.id
                && typeof r.position === 'number'
            )
            .sort((a, b) => b.position - a.position); // Sort by position, highest first

            const maxRolesToShow = 10; // <<-- Adjust this number as needed for roles field
            let memberRolesDisplay = allMemberRoles
                .slice(0, maxRolesToShow)
                .map(r => `<@&${r.id}>`)
                .join('\n> ') || 'None';

            if (allMemberRoles.length > maxRolesToShow) {
                const remainingRolesCount = allMemberRoles.length - maxRolesToShow;
                memberRolesDisplay += `\n> ...and ${remainingRolesCount} more roles.`;
            }

            // Build serverInfo (without roles)
            serverInfo += `> <:discordicon:1421718163141431336> **Joined:** ${joinedAt}\n`;
            serverInfo += `> <:role:1421718177863176202> **Main Role:** ${topRole}\n`;            

            // Build rolesInfo for the new field
            rolesInfo = `> ${memberRolesDisplay}\n`; // Only roles in this string

        } else {
            // User is NOT in this server. No server-specific info.
            serverInfo = '> User is not in this server.';
            rolesInfo = '> User is not in this server.'; // Also set for roles field
        }


        const embed = new EmbedBuilder()
            .setAuthor({ name: fullUser.tag, iconURL: avatarURL })
            .setTitle(`User Information`)
            .setThumbnail(avatarURL)
            .setColor(embedColor)
            .addFields(
                { name: '**General**', value: generalInfo, inline: false },
                { name: '**Server Info**', value: serverInfo, inline: false }
            );

        // Conditionally add the Roles field only if the user is in the server
        if (targetMember) {
            embed.addFields(
                { name: '**Roles**', value: rolesInfo, inline: false }
            );
        }

        embed.setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // Set the image to the user's banner if available. If not, do NOT set an image.
        if (bannerURL) {
            embed.setImage(bannerURL);
        }

        await interaction.editReply({ embeds: [embed] });

        /*
        UPDATE LOGGING SYSTEM TO MATCH NEW FORMAT!
        // --- Logging (existing logic) ---
        const logChId = customizedserverlogging;
        if (logChId) {
            try {
                const logCh = await interaction.client.channels.fetch(logChId);
                if (logCh?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle("User Info Viewed")
                        .setColor('#083b47')
                        .addFields(
                            { name: "<:oasis_highrankuser:1388371828287733780> Target User", value: `<@${fullUser.id}> \`(${fullUser.id})\``, inline: false },
                            { name: "<:oasis_user:1388375408084254911> Used By", value: `<@${interaction.user.id}>`, inline: true },
                        )
                        .setTimestamp();
                    logCh.send({ embeds: [logEmbed] });
                }
            } catch (logError) {
                    console.error("Failed to send user-info log:", logError);
            }
        }
            */
    },


    // Prefix command handler
    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config?.Prefix || 'c-';
        const content = message.content.trim().toLowerCase();

        // Accept {prefix}whois or {prefix}userinfo
        if (content === `${prefix}whois` || content === `${prefix}userinfo`) {
            // Get user from mention or fallback to author
            let userId = message.mentions.users.first()?.id || message.author.id;
            let fullUser, targetMember;
            try {
                fullUser = await message.client.users.fetch(userId, { force: true });
            } catch {
                const errorEmbed = new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setTitle('User Not Found')
                    .setDescription(`<:fail:1420911452050686034> Could not fetch user information. Please mention a valid user or try again.`);
                await message.channel.send({ embeds: [errorEmbed] });
                return;
            }
            try {
                targetMember = await message.guild.members.fetch(userId);
            } catch {
                targetMember = null;
            }

            // --- General User Information ---
            const userIdStr = fullUser.id;
            const userTag = fullUser.tag;
            const userMention = fullUser.toString();
            const createdAt = `<t:${Math.floor(fullUser.createdTimestamp / 1000)}:f> (<t:${Math.floor(fullUser.createdTimestamp / 1000)}:R>)`;

            const userBadgesArray = [];
            if (fullUser.flags) {
                for (const flagName in userBadges) {
                    if (fullUser.flags.has(parseInt(flagName))) {
                        userBadgesArray.push(userBadges[flagName]);
                    }
                }
            }
            if (fullUser.premiumType > 0) {
                userBadgesArray.push('<:nitrodiamond:1421720341994143856>');
            }
            const displayBadges = userBadgesArray.length > 0 ? userBadgesArray.join(' ') : 'None';

            const avatarURL = fullUser.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            const bannerURL = fullUser.bannerURL({ size: 1024, extension: 'png', forceStatic: false });

            let bannerColorDisplay = 'Not set';
            if (fullUser.hexAccentColor) {
                const cleanedColor = fullUser.hexAccentColor.startsWith('#') ? fullUser.hexAccentColor.substring(1) : fullUser.hexAccentColor;
                bannerColorDisplay = `#${cleanedColor}`;
            }
            let embedColor = fullUser.hexAccentColor || embedColors.info;

            let generalInfo = `> <:member:1421719521957380148> **User:** ${userTag}\n`;
            generalInfo += `> <:mention:1421718140395454575> **Mention:** ${userMention}\n`;
            if (targetMember?.nickname) {
                generalInfo += `> <:nickname:1421718131545608302> **Nickname:** ${targetMember.nickname}\n`;
            }
            generalInfo += `> <:id:1421718731800838207> **ID:** \`${userIdStr}\`\n`;
            generalInfo += `> <:servermembernew:1421717673024426054> **Badges:** ${displayBadges}\n`;
            generalInfo += `> <:discordicon:1421718163141431336> **Created:** ${createdAt}\n`;
            generalInfo += `> <:edit:1421718153460711444> **Banner Color:** ${bannerColorDisplay}\n`;
            generalInfo += `> [**Avatar URL**](${avatarURL})\n`;
            if (bannerURL) {
                generalInfo += `> [**Banner URL**](${bannerURL})\n`;
            }

            let serverInfo = '';
            let rolesInfo = '';
            if (targetMember) {
                const joinedAt = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:f> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`;
                const topRole = targetMember.roles.highest.name === '@everyone' ? 'None' : targetMember.roles.highest.toString();

                serverInfo += `> <:discordicon:1421718163141431336> **Joined:** ${joinedAt}\n`;
                serverInfo += `> <:role:1421718177863176202> **Main Role:** ${topRole}\n`;

                const allMemberRoles = [...targetMember.roles.cache.values()]
                    .filter(r => r && typeof r === 'object' && r.id && typeof r.id === 'string' && r.name && typeof r.name === 'string' && r.id !== message.guild.id && typeof r.position === 'number')
                    .sort((a, b) => b.position - a.position);

                const maxRolesToShow = 10;
                let memberRolesDisplay = allMemberRoles
                    .slice(0, maxRolesToShow)
                    .map(r => `<@&${r.id}>`)
                    .join('\n> ') || 'None';

                if (allMemberRoles.length > maxRolesToShow) {
                    const remainingRolesCount = allMemberRoles.length - maxRolesToShow;
                    memberRolesDisplay += `\n> ...and ${remainingRolesCount} more roles.`;
                }
                rolesInfo = `> ${memberRolesDisplay}\n`;
            } else {
                serverInfo = '> User is not in this server.';
                rolesInfo = '> User is not in this server.';
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: fullUser.tag, iconURL: avatarURL })
                .setTitle(`User Information`)
                .setThumbnail(avatarURL)
                .setColor(embedColor)
                .addFields(
                    { name: '**General**', value: generalInfo, inline: false },
                    { name: '**Server Info**', value: serverInfo, inline: false }
                );

            if (targetMember) {
                embed.addFields(
                    { name: '**Roles**', value: rolesInfo, inline: false }
                );
            }

            embed.setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            if (bannerURL) {
                embed.setImage(bannerURL);
            }

            await message.channel.send({ embeds: [embed] });
        }
    }
};