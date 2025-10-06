const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

// Enhanced response lists
const responses = {
    affirmative: [
        "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes – definitely.", "You may rely on it.",
        "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes."
    ],
    nonCommittal: [
        "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "I'll tell you when you're older."
    ],
    negative: [
        "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful.", "Not positive.", "I wouldn't bet on it."
    ],
    // Special responses for certain types of questions
    personal: [
        "However you want me to be.", "I am but a vessel for the whims of fate... and code.", "I'm doing great, thanks for asking!",
        "Beyond your mortal comprehension.", "I'm feeling... spherical."
    ],
    existential: [
        "That is a question for the ages, not for a plastic ball.", "The answer lies within you.", "42.",
        "Some things are not meant to be known.", "The universe is a mystery. Enjoy the ride."
    ]
};

const feelings = [
    "The 8-ball is confident in its answer.", "The 8-ball seems a bit unsure.", "The 8-ball is feeling mysterious.",
    "The 8-ball thinks you already know the answer.", "The 8-ball is amused by your question.", "The 8-ball is tired of your questions."
];

const eightBallImage = 'https://i.e-z.host/y0e407ey.png';

function getSmartAnswer(question) {
    const q = question.toLowerCase();

    if (q.includes('how are you') || q.includes('how do you feel')) {
        return responses.personal[Math.floor(Math.random() * responses.personal.length)];
    }
    if (q.startsWith('who') || q.startsWith('what') || q.startsWith('when') || q.startsWith('where') || q.startsWith('why') || q.startsWith('how')) {
        if (Math.random() < 0.5) { // 50% chance for a non-committal answer on WH-questions
            return responses.nonCommittal[Math.floor(Math.random() * responses.nonCommittal.length)];
        }
    }
    if (q.includes('life') || q.includes('universe') || q.includes('everything')) {
        return responses.existential[Math.floor(Math.random() * responses.existential.length)];
    }

    // Default to a random classic response
    const allResponses = [...responses.affirmative, ...responses.nonCommittal, ...responses.negative];
    return allResponses[Math.floor(Math.random() * allResponses.length)];
}

async function handle8Ball(source, question) {
    if (!question) {
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} You need to ask a question!`);
        if (source.isCommand && source.isCommand()) {
            return source.reply({ embeds: [embed], ephemeral: true });
        } else {
            return source.channel.send({ embeds: [embed] });
        }
    }

    const answer = getSmartAnswer(question);
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
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} You do not have permission to use this command.`);
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
        const commandTrigger = `${prefix}8ball`;

        if (!message.content.toLowerCase().startsWith(commandTrigger)) return;
        
        if (!await hasPermission(message, '8ball')) return;

        const question = message.content.slice(commandTrigger.length).trim();
        await handle8Ball(message, question);
    }
};
async function updateGame(interaction, aki) {
    if (aki.progress >= 85 && aki.currentStep < 80) {
        await aki.win();
        const winEmbed = createWinEmbed(aki, interaction.user);
        const winComponents = getGameComponents(true);
        await interaction.update({ embeds: [winEmbed], components: [winComponents] });
    } else {
        const gameEmbed = createGameEmbed(aki, interaction.user);
        await interaction.update({ embeds: [gameEmbed], components: getGameComponents() });
    }
}

async function handleAkinator(interaction) {
    if (games.has(interaction.user.id)) {
        const embed = new EmbedBuilder().setColor(embedColors.warning).setDescription(`${emojis.warning} You already have an active game. Please stop it before starting a new one.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    await interaction.deferReply();
    try {
        const aki = new Aki({ region: 'en' });
        await aki.start();
        games.set(interaction.user.id, { aki, message: null });
        const gameEmbed = createGameEmbed(aki, interaction.user);
        const components = getGameComponents();
        const message = await interaction.editReply({ embeds: [gameEmbed], components });
        games.get(interaction.user.id).message = message;
    } catch (error) {
        console.error('Akinator start error:', error);
        games.delete(interaction.user.id);
        await interaction.editReply({ content: `${emojis.fail} Could not start the Akinator game. The API might be down.`, embeds: [], components: [] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Fun commands: 8ball and Akinator.')
        .addSubcommand(sub =>
            sub.setName('ask')
                .setDescription('Asks the magic 8-ball a question.')
                .addStringOption(opt =>
                    opt.setName('question')
                        .setDescription('The question you want to ask.')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('akinator')
                .setDescription('Starts a game of Akinator.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (!await hasPermission(interaction, '8ball', subcommand)) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'ask') {
            const question = interaction.options.getString('question');
            await handle8Ball(interaction, question);
        } else if (subcommand === 'akinator') {
            await handleAkinator(interaction);
        }
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        const commandTrigger = `${prefix}8ball`;

        if (!message.content.toLowerCase().startsWith(commandTrigger)) return;
        
        const args = message.content.slice(commandTrigger.length).trim().split(/ +/);
        const firstArg = args[0]?.toLowerCase();

        if (firstArg === 'akinator') {
            // Prefix command for akinator is not supported due to its complexity
            const embed = new EmbedBuilder().setColor(embedColors.warning).setDescription(`${emojis.warning} The Akinator command is only available as a slash command (\`/8ball akinator\`).`);
            return message.channel.send({ embeds: [embed] });
        }

        if (!await hasPermission(message, '8ball', 'ask')) return;
        const question = message.content.slice(commandTrigger.length).trim();
        await handle8Ball(message, question);
    },

    async handleButton(interaction) {
        const game = games.get(interaction.user.id);
        if (!game) {
            return interaction.reply({ content: `${emojis.fail} This is not your game, or the game has ended.`, ephemeral: true });
        }
        const { aki } = game;
        const [_, action] = interaction.customId.split('_');
        try {
            if (action === 'stop') {
                games.delete(interaction.user.id);
                await interaction.update({ content: 'Game stopped.', embeds: [], components: [] });
                return;
            }
            if (action === 'back') {
                await aki.back();
                await updateGame(interaction, aki);
                return;
            }
            if (action.startsWith('win')) {
                if (action === 'win_yes') {
                    games.delete(interaction.user.id);
                    await interaction.update({ content: 'Great! I guessed it right. Thanks for playing!', embeds: [], components: [] });
                } else {
                    await aki.step(1); // Continue playing
                    await updateGame(interaction, aki);
                }
                return;
            }
            const answer = answerButtons.find(btn => btn.customId === interaction.customId)?.value;
            if (answer !== undefined) {
                await aki.step(answer);
                await updateGame(interaction, aki);
            }
        } catch (error) {
            console.error('Akinator step error:', error);
            games.delete(interaction.user.id);
            await interaction.update({ content: `${emojis.fail} An error occurred during the game. It has been stopped.`, embeds: [], components: [] });
        }
    }
};
