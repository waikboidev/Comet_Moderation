const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const rgba = require('hex-to-rgba');
const UserXP = require('../schemas/UserXP');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

// --- XP & Level Helpers ---
const calculateLevel = (xp) => Math.floor(0.1 * Math.sqrt(xp));
const calculateXPForLevel = (level) => Math.pow(level / 0.1, 2);

// --- Database Helpers ---
async function getUserXP(guildId, userId) {
  let userXP = await UserXP.findOne({ guildId, userId });
  if (!userXP) {
    // For demonstration, let's create a user with some random XP if they don't exist.
    // In a real scenario, you'd have a system to grant XP on messages.
    userXP = await UserXP.create({ guildId, userId, xp: Math.floor(Math.random() * 5000) });
  }
  return userXP;
}

async function getLeaderboardRank(guildId, userId) {
    const leaderboard = await UserXP.find({ guildId }).sort({ xp: -1 });
    const rank = leaderboard.findIndex(entry => entry.userId === userId);
    return rank === -1 ? null : rank + 1;
}

// --- Image Generation ---
async function createRankCard(user, guild, userXP) {
    const level = calculateLevel(userXP.xp);
    const currentLevelXP = calculateXPForLevel(level);
    const nextLevelXP = calculateXPForLevel(level + 1);
    const xpNeeded = nextLevelXP - currentLevelXP;
    const xpProgress = userXP.xp - currentLevelXP;
    const rank = await getLeaderboardRank(guild.id, user.id);

    const canvas = createCanvas(934, 282);
    const ctx = canvas.getContext('2d');

    // --- Load Assets ---
    let rankIcon, levelIcon;
    try {
        rankIcon = await loadImage(path.join(__dirname, '../../assets/rank.png'));
    } catch (e) {
        console.warn('Could not load rank.png, skipping icon.');
    }
    try {
        levelIcon = await loadImage(path.join(__dirname, '../../assets/level.png'));
    } catch (e) {
        console.warn('Could not load level.png, skipping icon.');
    }

    // --- Draw Background ---
    const backgroundUrl = userConfig.rankCardBackground || 'default_background_url';
    ctx.fillStyle = '#23272A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // User Info
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(user.username, 270, 164);

    // Rank & Level
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';

    // Draw Rank with Icon
    const rankText = `Rank #${rank}`;
    const rankTextWidth = ctx.measureText(rankText).width;
    ctx.fillText(rankText, 870, 80);
    if (rankIcon) {
        ctx.drawImage(rankIcon, 870 - rankTextWidth - 40, 55, 30, 30);
    }

    // Draw Level with Icon
    const levelText = `Level ${level}`;
    const levelTextWidth = ctx.measureText(levelText).width;
    ctx.fillText(levelText, 870, 120);
    if (levelIcon) {
        ctx.drawImage(levelIcon, 870 - levelTextWidth - 40, 95, 30, 30);
    }

    // Progress Bar
    ctx.fillStyle = '#484b4e';
    ctx.fillRect(270, 180, 600, 40);
    
    const progressWidth = (xpProgress / xpNeeded) * 600;
    ctx.fillStyle = embedColors.info; // Use a color from your theme
    ctx.fillRect(270, 180, progressWidth, 40);

    // XP Text
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`${xpProgress.toFixed(0)} / ${xpNeeded.toFixed(0)} XP`, 570, 210);

    // Avatar
    ctx.beginPath();
    ctx.arc(141, 141, 110, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 31, 31, 220, 220);

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'rank-card.png' });
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check your or another user's rank.")
    .addUserOption(opt => opt.setName('user').setDescription('The user to check the rank of.')),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    if (targetUser.bot) {
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} Bots do not have ranks.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply();

    try {
        const userXP = await getUserXP(interaction.guild.id, targetUser.id);
        const attachment = await createRankCard(targetUser, interaction.guild, userXP);
        await interaction.editReply({ files: [attachment] });
    } catch (error) {
        console.error('Failed to create rank card:', error);
        const embed = new EmbedBuilder().setColor(embedColors.error).setDescription(`${emojis.fail} An error occurred while generating the rank card.`);
        await interaction.editReply({ embeds: [embed] });
    }
  },
};
