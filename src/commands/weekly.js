const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildXPConfig = require('../schemas/GuildXPConfig');
const UserXP = require('../schemas/UserXP');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

const MEMBERS_PER_PAGE = 10;

async function sendPaginatedLeaderboard(interaction, members, user) {
    const totalMembers = members.length;
    const totalPages = Math.ceil(totalMembers / MEMBERS_PER_PAGE);
    let currentPage = 1;

    const generateEmbed = (page) => {
        const start = (page - 1) * MEMBERS_PER_PAGE;
        const end = start + MEMBERS_PER_PAGE;
        const currentMembers = members.slice(start, end);

        const memberList = currentMembers.map((memberData, index) => {
            const rank = start + index + 1;
            return `**${rank}.** <@${memberData.userId}> - ${memberData.weeklyXp.toLocaleString()} XP`;
        }).join('\n');

        return new EmbedBuilder()
            .setColor(embedColors.info)
            .setTitle(`${emojis.leaderboard} Weekly Leaderboard`)
            .setDescription(memberList || 'No members to display.')
            .setFooter({ text: `Page ${page}/${totalPages} | Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_page').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_page').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1)
    );

    const replyOptions = { embeds: [generateEmbed(currentPage)], components: totalPages > 1 ? [row] : [], fetchReply: true };
    const reply = await interaction.editReply(replyOptions);

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === user.id, time: 120000 });

    collector.on('collect', async i => {
        if (i.customId === 'next_page') currentPage++;
        else if (i.customId === 'prev_page') currentPage--;

        row.components[0].setDisabled(currentPage === 1);
        row.components[1].setDisabled(currentPage === totalPages);

        await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(row.components[0].setDisabled(true), row.components[1].setDisabled(true));
        reply.edit({ components: [disabledRow] }).catch(() => {});
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('Manage the weekly XP leaderboard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Toggle the weekly leaderboard on or off.')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Set to true to enable, false to disable.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('Shows the weekly XP leaderboard.')
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Resets all weekly XP for the server.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'leaderboard') {
            const guildXPConfig = await GuildXPConfig.findOne({ guildId });
            if (!guildXPConfig?.weeklyLeaderboardEnabled) {
                return interaction.reply({ content: `${emojis.fail} The weekly leaderboard is not enabled for this server.`, ephemeral: true });
            }

            await interaction.deferReply();
            const weeklyLeaderboard = await UserXP.find({ guildId }).sort({ weeklyXp: -1 }).limit(100);

            if (weeklyLeaderboard.length === 0) {
                return interaction.editReply({ content: `${emojis.info} The weekly leaderboard is empty.` });
            }

            await sendPaginatedLeaderboard(interaction, weeklyLeaderboard, interaction.user);
            return;
        }

        // Admin-only commands
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: `${emojis.fail} You do not have permission to use this command.`, ephemeral: true });
        }

        if (subcommand === 'toggle') {
            const enabled = interaction.options.getBoolean('enabled');
            await GuildXPConfig.findOneAndUpdate({ guildId }, { weeklyLeaderboardEnabled: enabled }, { upsert: true });
            return interaction.reply({ content: `${emojis.success} Weekly leaderboard has been ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
        }

        if (subcommand === 'reset') {
            await UserXP.updateMany({ guildId }, { $set: { weeklyXp: 0 } });
            return interaction.reply({ content: `${emojis.success} All weekly XP has been reset for this server.`, ephemeral: true });
        }
    },
};
