const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../schemas/GuildConfig');

// Helper to fetch logging channel ID for "command" logging type
async function getCommandLogChannel(guildId) {
    const config = await GuildConfig.findOne({ guildId });
    return config?.masterLogChannelId || config?.commandLogChannelId || null;
}

// Send embed to logging channel
async function sendCommandLog(guild, embed) {
    const channelId = await getCommandLogChannel(guild.id);
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) channel.send({ embeds: [embed] });
}

// Log command execution
async function logCommandExecution({ guild, channel, user, commandName, prefixUsed, messageContent, category }) {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `@${user.tag}`, iconURL: user.displayAvatarURL() })
        .setTitle(`${category} Command Executed`)
        .setDescription(`**@${user.tag}** executed a command in ${channel ? `<#${channel.id}>` : 'unknown channel'}.`)
        .addFields(
            { name: 'Command', value: prefixUsed ? `${prefixUsed}${commandName}` : `/${commandName}`, inline: false },
            { name: 'Message Content', value: messageContent || 'None', inline: false }
        )
        .setColor('#9a80fe')
        .setTimestamp();
    await sendCommandLog(guild, embed);
}

module.exports = {
    logCommandExecution
};
