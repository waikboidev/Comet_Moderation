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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
                // ... Implementation for setting announcement channel
            )
            .addSubcommand(sub => sub
                .setName('message')
                // ... Implementation for setting custom message
            )
        )
        .addSubcommand(sub => sub
            .setName('profile')
            .setDescription('Customize your personal rank card.')
            .setDefaultMemberPermissions() // Allow everyone
            .addStringOption(opt => opt.setName('color').setDescription('Set the color of your rank card (hex code).'))
            .addStringOption(opt => opt.setName('background').setDescription('Set a background image URL for your rank card.'))
            .addIntegerOption(opt => opt.setName('opacity').setDescription('Set the overlay opacity (0-100).').setMinValue(0).setMaxValue(100))
        ),

    async execute(interaction) {
        // This is a placeholder for the full implementation.
        // Each subcommand would have its own logic block here.
        // For example, the 'profile' subcommand:
        if (interaction.options.getSubcommand() === 'profile') {
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

        // Placeholder for admin commands
        const embed = new EmbedBuilder()
            .setColor(embedColors.success)
            .setDescription(`${emojis.success} Configuration command received. Full implementation pending.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
