const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { hasPermission } = require('../utils/permissions');
const GuildConfig = require('../schemas/GuildConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

const MEMBERS_PER_PAGE = 20;

async function sendPaginatedReply(source, role, members, user) {
    const totalMembers = members.length;
    const totalPages = Math.ceil(totalMembers / MEMBERS_PER_PAGE);
    let currentPage = 1;

    const generateEmbed = (page) => {
        const start = (page - 1) * MEMBERS_PER_PAGE;
        const end = start + MEMBERS_PER_PAGE;
        const currentMembers = members.slice(start, end);

        const memberList = currentMembers.map(member => `${member.toString()} (\`${member.user.tag}\`)`).join('\n');

        return new EmbedBuilder()
            .setColor(role.color || embedColors.info)
            .setAuthor({ name: `${role.name} (${totalMembers} members)`, iconURL: role.iconURL() || role.guild.iconURL() })
            .setDescription(memberList || 'No members to display on this page.')
            .setFooter({ text: `Page ${page}/${totalPages} | Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_page').setLabel('<:left:1424293584366080115>').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_page').setLabel('<:right:1424293602120433764>').setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1)
    );

    const replyOptions = { embeds: [generateEmbed(currentPage)], components: totalPages > 1 ? [row] : [], fetchReply: true };

    let reply;
    if (source.isCommand && source.isCommand()) { // It's an interaction
        reply = source.deferred ? await source.editReply(replyOptions) : await source.reply(replyOptions);
    } else { // It's a message
        reply = await source.channel.send(replyOptions);
    }

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === user.id,
        time: 120000, // 2 minutes
    });

    collector.on('collect', async i => {
        if (i.customId === 'next_page') {
            currentPage++;
        } else if (i.customId === 'prev_page') {
            currentPage--;
        }

        row.components[0].setDisabled(currentPage === 1);
        row.components[1].setDisabled(currentPage === totalPages);

        await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            row.components[0].setDisabled(true),
            row.components[1].setDisabled(true)
        );
        reply.edit({ components: [disabledRow] }).catch(() => {});
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolemembers')
        .setDescription('Shows all members who have a specific role.')
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('The role to get members from.')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const roles = interaction.guild.roles.cache;
        const filtered = roles.filter(role => role.name.toLowerCase().startsWith(focusedValue.toLowerCase())).slice(0, 25);

        await interaction.respond(
            filtered.map(role => ({ name: role.name, value: role.id })),
        );
    },

    async execute(interaction) {
        if (!await hasPermission(interaction, 'rolemembers')) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setDescription(`${emojis.fail} You do not have permission to use this command.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const role = interaction.options.getRole('role');
        await interaction.guild.members.fetch();
        const membersWithRole = role.members.map(m => m);

        if (membersWithRole.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.warning)
                .setDescription(`${emojis.warning} There are no members with the **${role.name}** role.`);
            return interaction.reply({ embeds: [embed] });
        }
        
        // Defer reply as pagination can take time
        await interaction.deferReply();
        await sendPaginatedReply(interaction, role, membersWithRole, interaction.user);
    },

    async prefixHandler(message) {
        if (!message.guild || message.author.bot) return;
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config?.PrefixEnabled) return;

        const prefix = config.Prefix || 'c-';
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (commandName !== 'rolemembers' && commandName !== 'membersrole') return;

        if (!await hasPermission(message, 'rolemembers')) return;

        const roleQuery = args.join(' ');
        if (!roleQuery) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} Please provide a role name, ID, or mention.`);
            return message.channel.send({ embeds: [embed] });
        }

        const role = message.mentions.roles.first() ||
                     message.guild.roles.cache.get(roleQuery) ||
                     message.guild.roles.cache.find(r => r.name.toLowerCase() === roleQuery.toLowerCase());

        if (!role) {
            const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} Could not find a role matching "${roleQuery}".`);
            return message.channel.send({ embeds: [embed] });
        }

        await message.guild.members.fetch();
        const membersWithRole = role.members.map(m => m);

        if (membersWithRole.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(embedColors.warning)
                .setDescription(`${emojis.warning} There are no members with the **${role.name}** role.`);
            return message.channel.send({ embeds: [embed] });
        }

        await sendPaginatedReply(message, role, membersWithRole, message.author);
    }
};
