const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

const images = {
    flipping: 'https://i.e-z.host/34vwlhle.gif',
    heads: 'https://i.e-z.host/e930aiss.png',
    tails: 'https://i.e-z.host/oke43pl8.png'
};

async function handleCoinflip(source) {
    // Initial "flipping" embed
    const flippingEmbed = new EmbedBuilder()
        .setColor('#ffe102')
        .setTitle('Flipping a coin...')
        .setImage(images.flipping);

    let reply;
    if (source.isCommand && source.isCommand()) {
        reply = await source.reply({ embeds: [flippingEmbed], fetchReply: true });
    } else {
        reply = await source.channel.send({ embeds: [flippingEmbed] });
    }

    // Wait for a bit
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Determine result
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const resultEmbed = new EmbedBuilder()
        .setColor('#ffe102')
        .setTitle(result === 'heads' ? 'Heads!' : 'Tails!')
        .setImage(images[result]);

    // Edit the reply with the result
    if (source.isCommand && source.isCommand()) {
        await source.editReply({ embeds: [resultEmbed] });
    } else {
        await reply.edit({ embeds: [resultEmbed] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flips a coin.'),

    async execute(interaction) {
        if (!await hasPermission(interaction, 'coinflip')) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        await handleCoinflip(interaction);
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        if (message.content.trim().toLowerCase() !== `${prefix}coinflip`) return;
        
        if (!await hasPermission(message, 'coinflip')) return;

        await handleCoinflip(message);
    }
};
