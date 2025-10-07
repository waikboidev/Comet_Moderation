const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Reminder = require('../schemas/Reminder');
const GuildConfig = require('../schemas/GuildConfig');
const { hasPermission } = require('../utils/permissions');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');
const ms = require('ms');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 6);

async function handleSetReminder(source, time, messageContent, sendInChannel = false) {
    const user = source.user || source.author;
    const duration = ms(time);

    if (!duration || duration < 60000) { // Minimum 1 minute
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} Please provide a valid duration (e.g., "10m", "1h", "2d"). Minimum is 1 minute.`);
        if (source.reply) await source.reply({ embeds: [embed], ephemeral: true });
        else await source.channel.send({ embeds: [embed] });
        return;
    }

    const remindAt = new Date(Date.now() + duration);
    const shortId = nanoid();

    let messageLink = null;
    // Check if it's a reply for prefix commands
    if (source.reference && source.reference.messageId) {
        messageLink = `https://discord.com/channels/${source.guild.id}/${source.channel.id}/${source.reference.messageId}`;
    }

    await new Reminder({
        userId: user.id,
        guildId: source.guild.id,
        channelId: source.channel.id,
        message: messageContent,
        time: remindAt,
        dm: !sendInChannel,
        messageLink,
        shortId,
    }).save();

    const embed = new EmbedBuilder()
        .setColor(embedColors.success)
        .setDescription(`${emojis.reminder} I will remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>. Your reminder ID is \`${shortId}\`.`);
    
    if (source.reply) await source.reply({ embeds: [embed], ephemeral: true });
    else await source.channel.send({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Manage your reminders.')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set a new reminder.')
                .addStringOption(opt => opt.setName('time').setDescription('When to remind you (e.g., "1h 30m", "2 days").').setRequired(true))
                .addStringOption(opt => opt.setName('reminder').setDescription('What to remind you about.').setRequired(true))
                .addBooleanOption(opt => opt.setName('in-channel').setDescription('Send the reminder in this channel instead of a DM (default: false).'))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List your active reminders.')
        )
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit an existing reminder.')
                .addStringOption(opt => opt.setName('id').setDescription('The ID of the reminder to edit.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete an active reminder.')
                .addStringOption(opt => opt.setName('id').setDescription('The ID of the reminder to delete.').setRequired(true))
        ),

    async execute(interaction) {
        if (!await hasPermission(interaction, 'remindme')) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;

        if (subcommand === 'set') {
            const time = interaction.options.getString('time');
            const reminder = interaction.options.getString('reminder');
            const inChannel = interaction.options.getBoolean('in-channel') || false;
            await handleSetReminder(interaction, time, reminder, inChannel);
        } else if (subcommand === 'list') {
            const reminders = await Reminder.find({ userId: user.id }).sort({ time: 1 });
            if (reminders.length === 0) {
                return interaction.reply({ content: 'You have no active reminders.', ephemeral: true });
            }
            const description = reminders.map(r => 
                `**ID:** \`${r.shortId}\` - <t:${Math.floor(r.time.getTime() / 1000)}:R>\n> ${r.message}`
            ).join('\n\n');
            const embed = new EmbedBuilder()
                .setColor(embedColors.info)
                .setTitle('Your Reminders')
                .setDescription(description);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (subcommand === 'edit') {
            const reminderId = interaction.options.getString('id');
            const reminder = await Reminder.findOne({ userId: user.id, shortId: reminderId });
            if (!reminder) {
                return interaction.reply({ content: 'Could not find a reminder with that ID.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`remindme_edit_${reminder.shortId}`)
                .setTitle('Edit Reminder');
            
            const timeRemaining = ms(reminder.time.getTime() - Date.now(), { long: true });

            const timeInput = new TextInputBuilder()
                .setCustomId('time')
                .setLabel('New Time (e.g., "1h 30m")')
                .setStyle(TextInputStyle.Short)
                .setValue(timeRemaining)
                .setRequired(true);

            const messageInput = new TextInputBuilder()
                .setCustomId('message')
                .setLabel('New Reminder Message')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(reminder.message)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(timeInput), new ActionRowBuilder().addComponents(messageInput));
            await interaction.showModal(modal);
        } else if (subcommand === 'delete') {
            const reminderId = interaction.options.getString('id');
            const result = await Reminder.deleteOne({ userId: user.id, shortId: reminderId });
            if (result.deletedCount > 0) {
                await interaction.reply({ content: `Reminder \`${reminderId}\` has been deleted.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Could not find a reminder with that ID.', ephemeral: true });
            }
        }
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        if (!message.content.toLowerCase().startsWith(`${prefix}remindme`)) return;
        
        if (!await hasPermission(message, 'remindme')) return;

        const args = message.content.slice(`${prefix}remindme`.length).trim().split(/ +/);
        const subcommand = args.shift()?.toLowerCase();

        if (!subcommand || !['set', 'list', 'edit', 'delete', 'cancel', 'remove'].includes(subcommand)) {
            // This is a `c!remindme <time> <message>` command
            const time = subcommand; // The first "arg" is the time
            const reminderMessage = args.join(' ');
            if (!time || !reminderMessage) {
                 // Handle reply-based reminder
                if (message.reference && message.reference.messageId && time) {
                    await handleSetReminder(message, time, "Check this message");
                } else {
                    const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`Usage: \`${prefix}remindme <time> <message>\` or reply to a message with \`${prefix}remindme <time>\`.`);
                    return message.channel.send({ embeds: [embed] });
                }
            } else {
                 await handleSetReminder(message, time, reminderMessage, false);
            }
            return;
        }

        if (subcommand === 'list') {
            const reminders = await Reminder.find({ userId: message.author.id }).sort({ time: 1 });
            if (reminders.length === 0) {
                return message.reply('You have no active reminders.');
            }
            const description = reminders.map(r => `**ID:** \`${r.shortId}\` - <t:${Math.floor(r.time.getTime() / 1000)}:R>\n> ${r.message}`).join('\n\n');
            const embed = new EmbedBuilder().setColor(embedColors.info).setTitle('Your Reminders').setDescription(description);
            await message.channel.send({ embeds: [embed] });
        } else if (['delete', 'remove', 'cancel'].includes(subcommand)) {
            const reminderId = args[0];
            if (!reminderId) return message.reply('Please provide the ID of the reminder to delete.');
            const result = await Reminder.deleteOne({ userId: message.author.id, shortId: reminderId });
            if (result.deletedCount > 0) {
                await message.reply(`Reminder \`${reminderId}\` has been deleted.`);
            } else {
                await message.reply('Could not find a reminder with that ID.');
            }
        } else if (subcommand === 'edit') {
            await message.reply('Editing reminders is only available via the `/remindme edit` slash command.');
        }
    },
};
