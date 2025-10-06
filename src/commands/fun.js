const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

async function getFact(type) {
    try {
        let response;
        let fact;
        let title;

        switch (type) {
            case 'cat':
                response = await axios.get('https://catfact.ninja/fact');
                fact = response.data.fact;
                title = '🐱 Cat Fact';
                break;
            case 'dog':
                response = await axios.get('https://dog-api.kinduff.com/api/facts');
                fact = response.data.facts[0];
                title = '🐶 Dog Fact';
                break;
            case 'world':
                response = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
                fact = response.data.text;
                title = '🌍 World Fact';
                break;
            default:
                return null;
        }
        return { title, fact };
    } catch (error) {
        console.error(`Error fetching ${type} fact:`, error);
        return null;
    }
}

async function handleFactCommand(source, type) {
    const factData = await getFact(type);
    const user = source.user || source.author;

    if (!factData) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription(`${emojis.fail} Could not fetch a fact at this time. Please try again later.`);
        return source.reply({ embeds: [errorEmbed] });
    }

    const embed = new EmbedBuilder()
        .setColor(embedColors.info)
        .setTitle(factData.title)
        .setDescription(factData.fact)
        .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });

    if (source.isCommand && source.isCommand()) {
        await source.reply({ embeds: [embed] });
    } else {
        await source.channel.send({ embeds: [embed] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('facts')
        .setDescription('Get random facts.')
        .addSubcommand(sub => sub.setName('catfact').setDescription('Get a random cat fact.'))
        .addSubcommand(sub => sub.setName('dogfact').setDescription('Get a random dog fact.'))
        .addSubcommand(sub => sub.setName('worldfact').setDescription('Get a random world fact.')),

    async execute(interaction) {
        if (!await hasPermission(interaction, 'facts')) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const subcommand = interaction.options.getSubcommand();
        let type;
        if (subcommand === 'catfact') type = 'cat';
        if (subcommand === 'dogfact') type = 'dog';
        if (subcommand === 'worldfact') type = 'world';
        
        await handleFactCommand(interaction, type);
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const factCommands = ['catfact', 'dogfact', 'worldfact'];
        if (!factCommands.includes(commandName)) return;
        
        if (!await hasPermission(message, 'facts')) return;

        let type;
        if (commandName === 'catfact') type = 'cat';
        if (commandName === 'dogfact') type = 'dog';
        if (commandName === 'worldfact') type = 'world';

        await handleFactCommand(message, type);
    }
};
