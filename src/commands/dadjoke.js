const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

const forbiddenWords = ['dog', 'cat', 'penis', 'eat', 'whale'];

async function getFilteredJoke() {
    for (let i = 0; i < 10; i++) { // Try up to 10 times
        const response = await axios.get('https://icanhazdadjoke.com/', {
            headers: { 'Accept': 'application/json' }
        });
        const joke = response.data.joke;
        if (joke && !forbiddenWords.some(word => joke.toLowerCase().includes(word))) {
            return joke;
        }
    }
    return null; // Return null if no suitable joke is found
}

async function handleJokeCommand(source) {
    const user = source.user || source.author;
    try {
        const joke = await getFilteredJoke();

        if (!joke) {
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} Could not fetch a suitable joke at this time. Please try again later.`);
            if (source.isCommand && source.isCommand()) {
                return source.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                return source.channel.send({ embeds: [errorEmbed] });
            }
        }

        const embed = new EmbedBuilder()
            .setColor(embedColors.info)
            .setTitle('😂 Dad Joke')
            .setDescription(joke)
            .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });

        if (source.isCommand && source.isCommand()) {
            await source.reply({ embeds: [embed] });
        } else {
            await source.channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error fetching dad joke:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription(`${emojis.fail} Could not fetch a joke at this time. Please try again later.`);
        
        if (source.isCommand && source.isCommand()) {
            await source.reply({ embeds: [errorEmbed] });
        } else {
            await source.channel.send({ embeds: [errorEmbed] });
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dadjoke')
        .setDescription('Get a random dad joke.'),

    async execute(interaction) {
        if (!await hasPermission(interaction, 'dadjoke')) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        await handleJokeCommand(interaction);
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (commandName !== 'dadjoke') return;
        
        if (!await hasPermission(message, 'dadjoke')) return;

        await handleJokeCommand(message);
    }
};
