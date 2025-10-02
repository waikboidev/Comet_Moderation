const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasPermission } = require('../utils/permissions');
const { logCommandExecution } = require('../Logging/commandLogging');
const embedColors = require('../../embedColors');

const data = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message or embed to a channel')
    .addSubcommand(sub =>
        sub.setName('message')
            .setDescription('Send a plain message')
            .addChannelOption(opt =>
                opt.setName('channel')
                    .setDescription('Channel to send the message to')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('content')
                    .setDescription('Message content')
                    .setRequired(true)
            )
    )
    .addSubcommand(sub =>
        sub.setName('embed')
            .setDescription('Send a custom embed')
            .addChannelOption(opt =>
                opt.setName('channel')
                    .setDescription('Channel to send the embed to')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('content')
                    .setDescription('Message content (sent with embed)')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('author')
                    .setDescription('Embed author text')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('author_icon')
                    .setDescription('Embed author icon URL')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('title')
                    .setDescription('Embed title')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('description')
                    .setDescription('Embed description')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('color')
                    .setDescription('Embed color (hex, defaults to #882935)')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('footer')
                    .setDescription('Embed footer text')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('footer_icon')
                    .setDescription('Embed footer icon URL')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('image')
                    .setDescription('Embed image URL')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('thumbnail')
                    .setDescription('Embed thumbnail URL')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('url')
                    .setDescription('Embed URL')
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt.setName('add_timestamp')
                    .setDescription('Add current timestamp to embed')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('timestamp')
                    .setDescription('Embed timestamp (ISO format or "now")')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('field1_name')
                    .setDescription('Field 1 name')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('field1_value')
                    .setDescription('Field 1 value')
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt.setName('field1_inline')
                    .setDescription('Field 1 inline')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('field2_name')
                    .setDescription('Field 2 name')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('field2_value')
                    .setDescription('Field 2 value')
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt.setName('field2_inline')
                    .setDescription('Field 2 inline')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('field3_name')
                    .setDescription('Field 3 name')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('field3_value')
                    .setDescription('Field 3 value')
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt.setName('field3_inline')
                    .setDescription('Field 3 inline')
                    .setRequired(false)
            )
    );

async function execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (!await hasPermission(interaction, 'say', sub)) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.error)
            .setDescription('<:fail:1420911452050686034> You do not have permission to use this command.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await logCommandExecution({
        guild: interaction.guild,
        channel: interaction.channel,
        user: interaction.user,
        commandName: 'say',
        subcommand: sub,
        options: interaction.options,
        category: 'Utility'
    });

    const channel = interaction.options.getChannel('channel');

    if (sub === 'message') {
        const content = interaction.options.getString('content') || '';
        await channel.send({ content });
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(embedColors.success)
                    .setDescription('Message sent successfully.')
            ],
            ephemeral: false
        });
    } else if (sub === 'embed') {
        const embed = new EmbedBuilder();
        const color = interaction.options.getString('color');
        if (color) embed.setColor(color);

        const author = interaction.options.getString('author');
        const author_icon = interaction.options.getString('author_icon');
        if (author) embed.setAuthor({ name: author, iconURL: author_icon || undefined });

        const title = interaction.options.getString('title');
        if (title) embed.setTitle(title);

        const description = interaction.options.getString('description');
        if (description) embed.setDescription(description);

        const footer = interaction.options.getString('footer');
        const footer_icon = interaction.options.getString('footer_icon');
        if (footer) embed.setFooter({ text: footer, iconURL: footer_icon || undefined });

        const image = interaction.options.getString('image');
        if (image) embed.setImage(image);

        const thumbnail = interaction.options.getString('thumbnail');
        if (thumbnail) embed.setThumbnail(thumbnail);

        const url = interaction.options.getString('url');
        if (url) embed.setURL(url);

        // Timestamp options
        const addTimestamp = interaction.options.getBoolean('add_timestamp');
        const timestamp = interaction.options.getString('timestamp');
        if (addTimestamp) {
            embed.setTimestamp(new Date());
        } else if (timestamp) {
            if (timestamp.toLowerCase() === 'now') {
                embed.setTimestamp(new Date());
            } else {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) embed.setTimestamp(date);
            }
        }

        // Add up to 3 fields (inline or not)
        for (let i = 1; i <= 3; i++) {
            const name = interaction.options.getString(`field${i}_name`);
            const value = interaction.options.getString(`field${i}_value`);
            const inline = interaction.options.getBoolean(`field${i}_inline`) || false;
            if (name && value) {
                embed.addFields({ name, value, inline });
            }
        }

        const content = interaction.options.getString('content') || undefined;
        await channel.send({ content, embeds: [embed] });
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(embedColors.success)
                    .setDescription('Embed sent successfully.')
            ],
            ephemeral: false
        });
    }
}

module.exports = {
    data,
    execute
};
