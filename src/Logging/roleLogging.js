const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig'); // adjust path as needed

// Helper to fetch logging channel ID from mongoose schema
async function getRoleLogChannel(guildId) {
    const config = await GuildConfig.findOne({ guildId });
    return config?.roleLogChannelId || null;
}

// Logging channel embed sender
async function sendRoleLog(guild, embed) {
    const channelId = await getRoleLogChannel(guild.id);
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) channel.send({ embeds: [embed] });
}


function getAuthorIcon(role) {
    return role.iconURL() || role.guild.iconURL();
}

// Role Creation
async function logRoleCreate(role, user) {
    const embed = new EmbedBuilder()
        .setColor('#00bf63')
        .setAuthor({ name: 'Role Created', iconURL: getAuthorIcon(role) })
        .setDescription(`**@${user.tag}** created the **${role.name}** role.`);
    await sendRoleLog(role.guild, embed);
}

// Role Deletion
async function logRoleDelete(role, user) {
    const embed = new EmbedBuilder()
        .setColor('#ff3131')
        .setAuthor({ name: 'Role Deleted', iconURL: getAuthorIcon(role) })
        .setDescription(`**@${user.tag}** deleted the **${role.name}** role.`);
    await sendRoleLog(role.guild, embed);
}

// Role Name Update
async function logRoleUpdate(before, after, user) {
    if (before.name !== after.name) {
        const embed = new EmbedBuilder()
            .setColor('#ffbd59')
            .setAuthor({ name: 'Role Updated', iconURL: getAuthorIcon(after) })
            .setDescription(`The name of the **${after.name}** role was updated by **@${user.tag}**.`)
            .addFields(
                { name: 'Before', value: before.name, inline: true },
                { name: 'After', value: after.name, inline: true }
            );
        await sendRoleLog(after.guild, embed);
    }
}

// Role Color Change
async function logRoleColorChange(before, after, user) {
    if (before.color !== after.color) {
        const embed = new EmbedBuilder()
            .setColor(after.hexColor)
            .setAuthor({ name: 'Role Updated', iconURL: getAuthorIcon(after) })
            .setDescription(`The color for the **${after.name}** role was updated by **@${user.tag}**.`)
            .addFields(
                { name: 'Before', value: `\`${before.hexColor}\` | ${before.hexColor === '#000000' ? 'None' : ''}`, inline: true },
                { name: 'After', value: `\`${after.hexColor}\` | ${after.hexColor === '#000000' ? 'None' : ''}`, inline: true }
            );
        await sendRoleLog(after.guild, embed);
    }
}

module.exports = {
    logRoleCreate,
    logRoleDelete,
    logRoleUpdate,
    logRoleColorChange
};
