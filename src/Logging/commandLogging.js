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
async function logCommandExecution({ guild, channel, user, commandName, subcommand, options, prefixUsed, messageContent, category }) {
    let content;
    if (prefixUsed) {
        content = messageContent || 'None';
    } else {
        const sub = subcommand ? `${subcommand} ` : '';
        const opts = options?._hoistedOptions.map(o => `${o.name}:${o.value}`).join(' ') || '';
        content = `/${commandName} ${sub}${opts}`;
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setDescription(
            `**${user.tag}** (\`${user.id}\`) executed a command in <#${channel.id}>.\n\n` +
            `**Command**\n\`${prefixUsed ? `${prefixUsed}${commandName}` : `/${commandName}`}\`\n\n` +
            `**Message Content**\n${content}\n`
        )
        .setColor('#9a80fe')
        .setTimestamp();
    await sendCommandLog(guild, embed);
}

module.exports = {
    logCommandExecution
};
