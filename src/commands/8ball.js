const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

const responses = [
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "Yes – definitely.",
    "You may rely on it.",
    "As I see it, yes.",
    "Most likely.",
    "Outlook good.",
    "Yes.",
    "Signs point to yes.",
    "Reply hazy, try again.",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now.",
    "Concentrate and ask again.",
    "Don't count on it.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Very doubtful."
];

const feelings = [
    "The 8-ball is confident in its answer.",
    "The 8-ball seems a bit unsure.",
    "The 8-ball is feeling mysterious.",
    "The 8-ball thinks you already know the answer.",
    "The 8-ball is amused by your question.",
    "The 8-ball is tired of your questions."
];

const eightBallImage = 'https://i.e-z.host/y0e407ey.png';

async function handle8Ball(source, question) {
    if (!question) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription(`${emojis.fail} You need to ask a question!`);
        
        if (source.isCommand && source.isCommand()) {
            return source.reply({ embeds: [embed], ephemeral: true });
        } else {
            return source.channel.send({ embeds: [embed] });
        }
    }

    const answer = responses[Math.floor(Math.random() * responses.length)];
    const feeling = feelings[Math.floor(Math.random() * feelings.length)];
    const user = source.user || source.author;

    const embed = new EmbedBuilder()
        .setColor(embedColors.info)
        .setAuthor({ name: `${user.username} asks...`, iconURL: user.displayAvatarURL() })
        .setTitle(question)
        .setDescription(`> ${answer}`)
        .setThumbnail(eightBallImage)
        .setFooter({ text: feeling });

    if (source.isCommand && source.isCommand()) {
        await source.reply({ embeds: [embed] });
    } else {
        await source.channel.send({ embeds: [embed] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Asks the magic 8-ball a question.')
        .addStringOption(opt =>
            opt.setName('question')
                .setDescription('The question you want to ask.')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!await hasPermission(interaction, '8ball')) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const question = interaction.options.getString('question');
        await handle8Ball(interaction, question);
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        const commandName = '8ball';
        const commandTrigger = `${prefix}${commandName}`;

        if (!message.content.toLowerCase().startsWith(commandTrigger)) return;
        
        if (!await hasPermission(message, '8ball')) return;

        const question = message.content.slice(commandTrigger.length).trim();
        await handle8Ball(message, question);
    }
};
