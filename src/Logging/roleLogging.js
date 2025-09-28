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
        .setTimestamp()
        .setAuthor({ name: 'Role Created', iconURL: getAuthorIcon(role) })
        .setDescription(`**@${user.tag}** created the **${role.name}** role.`);
    await sendRoleLog(role.guild, embed);
}

// Role Deletion
async function logRoleDelete(role, user) {
    const embed = new EmbedBuilder()
        .setColor('#ff3131')
        .setTimestamp()
        .setFooter(`Role ID: ${after.id} • User ID: ${user.id}`)
        .setAuthor({ name: 'Role Deleted', iconURL: getAuthorIcon(role) })
        .setDescription(`**@${user.tag}** deleted the **${role.name}** role.`);
    await sendRoleLog(role.guild, embed);
}

// Role Name & Permission Update
async function logRoleUpdate(before, after, user) {
    if (before.name !== after.name) {
        const embed = new EmbedBuilder()
            .setColor('#ffbd59')
            .setTimestamp()
            .setFooter(`Role ID: ${after.id} • User ID: ${user.id}`)
            .setAuthor({ name: 'Role Updated', iconURL: getAuthorIcon(after) })
            .setDescription(`The name of the **${after.name}** role was updated by **@${user.tag}**.`)
            .addFields(
                { name: 'Before', value: before.name, inline: true },
                { name: 'After', value: after.name, inline: true }
            );
        await sendRoleLog(after.guild, embed);
    }

    // Permission change
    if (!before.permissions.equals(after.permissions)) {
        const beforePerms = before.permissions.toArray();
        const afterPerms = after.permissions.toArray();
        const added = afterPerms.filter(p => !beforePerms.includes(p));
        const removed = beforePerms.filter(p => !afterPerms.includes(p));

        const embed = new EmbedBuilder()
            .setColor('#ffbd59')
            .setFooter(`Role ID: ${after.id} • User ID: ${user.id}`)
            .setTimestamp()
            .setAuthor({ name: 'Role Updated', iconURL: getAuthorIcon(after) })
            .setDescription(`The permissions of the **${after.name}** role were updated by **@${user.tag}**.`);

        if (added.length)
            embed.addFields({ name: 'Added', value: added.join('\n'), inline: true });
        if (removed.length)
            embed.addFields({ name: 'Removed', value: removed.join('\n'), inline: true });

        await sendRoleLog(after.guild, embed);
    }
}

// Role Color Change
async function logRoleColorChange(before, after, user) {
    if (before.color !== after.color) {
        const embed = new EmbedBuilder()
            .setColor(after.hexColor)
            .setFooter(`Role ID: ${after.id} • User ID: ${user.id}`)
            .setTimestamp()
            .setAuthor({ name: 'Role Updated', iconURL: getAuthorIcon(after) })
            .setDescription(`The color for the **${after.name}** role was updated by **@${user.tag}**.`)
            .addFields(
                { name: 'Before', value: `\`${before.hexColor}\` | ${before.hexColor === '#000000' ? 'None' : ''}`, inline: true },
                { name: 'After', value: `\`${after.hexColor}\` | ${after.hexColor === '#000000' ? 'None' : ''}`, inline: true }
            );
        await sendRoleLog(after.guild, embed);
    }
}

// Role Addition/Removal
async function logRoleMemberChange({ action, role, user, actor }) {
    // action: 'added' or 'removed'
    const verb = action === 'added' ? 'given' : 'removed';
    const embed = new EmbedBuilder()
        .setColor('#ffbd59')
        .setAuthor({ name: `@${user.tag}`, iconURL: user.displayAvatarURL() })
        .setDescription(`@${user.tag} was ${verb} the **${role.name}** role by @${actor.tag}.`)
        .setFooter({ text: `Role ID: ${role.id} • User ID: ${user.id}` })
        .setTimestamp();
    await sendRoleLog(role.guild, embed);
}

// Role Settings Update
async function logRoleSettingsUpdate(before, after, user) {
    const fields = [];
    if (before.hoist !== after.hoist) {
        fields.push({ name: 'Hoisted', value: after.hoist ? 'True' : 'False', inline: true });
    }
    if (before.mentionable !== after.mentionable) {
        fields.push({ name: 'Mentionable', value: after.mentionable ? 'True' : 'False', inline: true });
    }
    if (!fields.length) return;

    const embed = new EmbedBuilder()
        .setColor('#ffbd59')
        .setAuthor({ name: `@${after.name}`, iconURL: getAuthorIcon(after) })
        .setDescription(`The settings of the **${after.name}** role were updated by **@${user.tag}**`)
        .setFooter({ text: `Role ID: ${after.id} • User ID: ${user.id}` })
        .setTimestamp()
        .addFields(fields);
    await sendRoleLog(after.guild, embed);
}

module.exports = {
    logRoleCreate,
    logRoleDelete,
    logRoleUpdate,
    logRoleColorChange,
    logRoleMemberChange,
    logRoleSettingsUpdate
};