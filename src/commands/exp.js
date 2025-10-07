const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildXPConfig = require('../schemas/GuildXPConfig');
const UserXP = require('../schemas/UserXP');
const UserXPConfig = require('../schemas/UserXPConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

// Helper to get or create guild config
async function getGuildConfig(guildId) {
    return await GuildXPConfig.findOneAndUpdate({ guildId }, {}, { upsert: true, new: true });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exp')
        .setDescription('Configure the server\'s experience and leveling system.')
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Display a guide on how to configure the EXP module.')
        )
        .addSubcommandGroup(group => group
            .setName('settings')
            .setDescription('Manage core XP settings.')
            .addSubcommand(sub => sub
                .setName('modify-xp')
                .setDescription("Manually add or remove a user's XP.")
                .addUserOption(opt => opt.setName('user').setDescription('The user to modify.').setRequired(true))
                .addStringOption(opt => opt.setName('action').setDescription('Whether to add or remove XP.').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
                .addIntegerOption(opt => opt.setName('amount').setDescription('The amount of XP.').setRequired(true))
            )
            .addSubcommand(sub => sub
                .setName('clear-on-leave')
                .setDescription('Toggle whether a user\'s XP is reset when they leave.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Set to true to clear XP on leave.').setRequired(true))
            )
        )
        .addSubcommandGroup(group => group
            .setName('roles')
            .setDescription('Manage level-up and join roles.')
            .addSubcommand(sub => sub
                .setName('level-reward')
                .setDescription('Add or remove a role reward for reaching a certain level.')
                .addStringOption(opt => opt.setName('action').setDescription('Add or remove the role reward.').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
                .addIntegerOption(opt => opt.setName('level').setDescription('The level to configure.').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to grant. Required for "add".'))
            )
            .addSubcommand(sub => sub
                .setName('join-role')
                .setDescription('Set or clear the role new members receive upon joining.')
                .addRoleOption(opt => opt.setName('role').setDescription('The role to set. Leave blank to clear.'))
            )
        )
        .addSubcommandGroup(group => group
            .setName('blacklist')
            .setDescription('Blacklist roles or channels from gaining XP.')
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('Add a role or channel to the XP blacklist.')
                .addChannelOption(opt => opt.setName('channel').setDescription('The channel to blacklist.'))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to blacklist.'))
            )
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('Remove a role or channel from the XP blacklist.')
                .addChannelOption(opt => opt.setName('channel').setDescription('The channel to remove from the blacklist.'))
                .addRoleOption(opt => opt.setName('role').setDescription('The role to remove from the blacklist.'))
            )
        )
        .addSubcommandGroup(group => group
            .setName('announce')
            .setDescription('Configure level-up announcements.')
            .addSubcommand(sub => sub
                .setName('channel')
                .setDescription('Set the channel for level-up announcements.')
                .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send announcements in.'))
                .addStringOption(opt => opt.setName('mode').setDescription("Set to 'dm' for direct messages or 'off' to disable.").addChoices(
                    { name: 'Direct Message (DM)', value: 'dm' },
                    { name: 'Off', value: 'off' }
                ))
            )
            .addSubcommand(sub => sub
                .setName('message')
                .setDescription('Set the custom level-up message. Use variables for dynamic content.')
                .addStringOption(opt => opt.setName('message').setDescription('Variables: {user}, {user.ping}, {user.tag}, {level}, {xp}, {server.name}, {role}, {timestamp}').setRequired(true))
            )
        )
        .addSubcommand(sub => sub
            .setName('profile')
            .setDescription('Customize your personal rank card.')
            .addStringOption(opt => opt.setName('color').setDescription('Set the color of your rank card (hex code).'))
            .addStringOption(opt => opt.setName('background').setDescription('Set a background image URL for your rank card.'))
            .addIntegerOption(opt => opt.setName('opacity').setDescription('Set the overlay opacity (0-100).').setMinValue(0).setMaxValue(100))
        ),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const subCommand = interaction.options.getSubcommand();

        // The 'profile' subcommand is public
        if (subCommand === 'profile' && !group) {
            const color = interaction.options.getString('color');
            const background = interaction.options.getString('background');
            const opacity = interaction.options.getInteger('opacity');
            
            const update = {};
            if (color) update.rankCardColor = color;
            if (background) update.rankCardBackground = background;
            if (opacity !== null) update.rankCardOpacity = opacity;

            if (Object.keys(update).length === 0) {
                return interaction.reply({ content: 'You must provide at least one option to update.', ephemeral: true });
            }

            await UserXPConfig.findOneAndUpdate({ userId: interaction.user.id }, update, { upsert: true });

            const embed = new EmbedBuilder()
                .setColor(embedColors.success)
                .setDescription(`${emojis.success} Your profile card has been updated.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // All other subcommands require Administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const config = await getGuildConfig(interaction.guild.id);

        if (subCommand === 'setup' && !group) {
            const setupEmbed = new EmbedBuilder()
                .setColor(embedColors.info)
                .setTitle(`${emojis.info} EXP Module Configuration Guide`)
                .setDescription('Here are the commands to configure the leveling system for this server.')
                .addFields(
                    { name: '`/exp settings modify-xp`', value: 'Manually change a user\'s XP.', inline: false },
                    { name: '`/exp settings clear-on-leave`', value: 'Toggle if a user\'s XP is cleared when they leave.', inline: false },
                    { name: '`/exp roles level-reward`', value: 'Add or remove a role reward for a specific level.', inline: false },
                    { name: '`/exp roles join-role`', value: 'Set a role to be given to new members.', inline: false },
                    { name: '`/exp blacklist add/remove`', value: 'Prevent users in a channel or with a role from gaining XP.', inline: false },
                    { name: '`/exp announce channel`', value: 'Set where level-up messages are sent (a channel, DMs, or off).', inline: false },
                    { name: '`/exp announce message`', value: 'Customize the level-up announcement message. Variables: `{user}`, `{user.ping}`, `{user.tag}`, `{level}`, `{xp}`, `{server.name}`, `{role}`, `{timestamp}`', inline: false },
                    { name: '`/rank [user]`', value: 'View your or another user\'s rank card.', inline: false },
                    { name: '`/exp profile`', value: 'Lets users customize their own rank card (color, background, etc.).', inline: false }
                );
            return interaction.reply({ embeds: [setupEmbed], ephemeral: true });
        }

        if (group === 'announce') {
            if (subCommand === 'channel') {
                const channel = interaction.options.getChannel('channel');
                const mode = interaction.options.getString('mode');
                let setting;
                let confirmation;

                if (mode) {
                    setting = mode;
                    confirmation = mode === 'dm' ? 'Direct Messages' : 'Off';
                } else if (channel) {
                    setting = channel.id;
                    confirmation = `${channel}`;
                } else {
                    return interaction.reply({ content: 'You must provide either a channel or a mode.', ephemeral: true });
                }

                config.levelUpAnnouncementChannel = setting;
                await config.save();

                const embed = new EmbedBuilder().setColor(embedColors.success).setDescription(`${emojis.success} Level-up announcement channel set to **${confirmation}**.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (subCommand === 'message') {
                const message = interaction.options.getString('message');
                config.levelUpAnnouncementMessage = message;
                await config.save();

                const embed = new EmbedBuilder().setColor(embedColors.success).setDescription(`${emojis.success} Level-up announcement message has been updated.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        // Placeholder for other admin commands
        const embed = new EmbedBuilder()
            .setColor(embedColors.success)
            .setDescription(`${emojis.success} Configuration command received. Full implementation pending.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
