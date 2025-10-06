const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

const forbiddenWords = ['dog', 'cat', 'penis', 'eat', 'whale', 'sex', 'sexual'];

const factAPIs = {
    catfact: { url: 'https://catfact.ninja/fact', key: 'fact', title: '🐱 Cat Fact' },
    dogfact: { url: 'https://dog-api.kinduff.com/api/facts', key: 'facts', isArray: true, title: '🐶 Dog Fact' },
    worldfact: { url: 'https://uselessfacts.jsph.pl/random.json?language=en', key: 'text', title: '🌍 World Fact' }
};

async function getFilteredFact(factType) {
    const api = factAPIs[factType];
    if (!api) return null;

    for (let i = 0; i < 10; i++) { // Try up to 10 times
        try {
            const response = await axios.get(api.url);
            let fact = api.isArray ? response.data[api.key][0] : response.data[api.key];

            if (fact && typeof fact === 'string' && !forbiddenWords.some(word => fact.toLowerCase().includes(word))) {
                return fact;
            }
        } catch (error) {
            // Ignore fetch error and try again
        }
    }
    return null; // Return null if no suitable fact is found
}

async function handleFactCommand(source, factType) {
    const user = source.user || source.author;
    const api = factAPIs[factType];

    try {
        const fact = await getFilteredFact(factType);

        if (!fact) {
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} Could not fetch a suitable fact at this time. Please try again later.`);
            if (source.isCommand && source.isCommand()) {
                return source.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                return source.channel.send({ embeds: [errorEmbed] });
            }
        }

        const embed = new EmbedBuilder()
            .setColor(embedColors.info)
            .setTitle(api.title)
            .setDescription(fact)
            .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });

        if (source.isCommand && source.isCommand()) {
            await source.reply({ embeds: [embed] });
        } else {
            await source.channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`Error fetching ${factType}:`, error);
        const errorEmbed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription(`${emojis.fail} Could not fetch a fact at this time. Please try again later.`);
        
        if (source.isCommand && source.isCommand()) {
            await source.reply({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await source.channel.send({ embeds: [errorEmbed] });
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('Get random facts.')
        .addSubcommand(sub => sub.setName('catfact').setDescription('Get a random cat fact.'))
        .addSubcommand(sub => sub.setName('dogfact').setDescription('Get a random dog fact.'))
        .addSubcommand(sub => sub.setName('worldfact').setDescription('Get a random useless fact.')),

    async execute(interaction) {
        if (!await hasPermission(interaction, 'fun')) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const subcommand = interaction.options.getSubcommand();
        await handleFactCommand(interaction, subcommand);
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        if (commandName !== 'fun') return;
        if (!await hasPermission(message, 'fun')) return;

        const factType = args[0]?.toLowerCase();
        if (factAPIs[factType]) {
            await handleFactCommand(message, factType);
        }
    }
};
