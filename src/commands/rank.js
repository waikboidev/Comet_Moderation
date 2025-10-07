const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const UserXP = require('../schemas/UserXP');
const UserXPConfig = require('../schemas/UserXPConfig');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

// Replaced `require('hex-to-rgba')` with this helper function to fix the error.
const rgba = (hex, opacity) => {
    const hexValue = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(hexValue.substring(0, 2), 16);
    const g = parseInt(hexValue.substring(2, 4), 16);
    const b = parseInt(hexValue.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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

// --- Helper to draw rounded rectangles ---
function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    return ctx;
}

// --- Image Generation ---
async function createRankCard(user, guild, userXP) {
    const userConfig = await UserXPConfig.findOne({ userId: user.id }) || {};
    const level = calculateLevel(userXP.xp);
    const currentLevelXP = calculateXPForLevel(level);
    const nextLevelXP = calculateXPForLevel(level + 1);
    const xpNeeded = nextLevelXP - currentLevelXP;
    const xpProgress = userXP.xp - currentLevelXP;
    const rank = await getLeaderboardRank(guild.id, user.id);

    const canvas = createCanvas(800, 250);
    const ctx = canvas.getContext('2d');
    const modernFont = "'Verdana', 'Geneva', 'sans-serif'";

    // --- Draw Background ---
    const backgroundUrl = userConfig.rankCardBackground;
    if (backgroundUrl) {
        try {
            const background = await loadImage(backgroundUrl);
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.warn('Failed to load background image.', e);
        }
    }
    // No default background fill for a transparent canvas

    // --- Draw Panels ---
    const overlayOpacity = (userConfig.rankCardOpacity ?? 70) / 100;
    ctx.fillStyle = rgba('#2B2D31', overlayOpacity);
    roundRect(ctx, 20, 20, 540, 210, 20).fill(); // Main panel
    roundRect(ctx, 580, 20, 200, 100, 20).fill(); // Level panel
    roundRect(ctx, 580, 130, 200, 100, 20).fill(); // EXP panel

    // --- Draw Avatar ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(125, 125, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 45, 45, 160, 160);
    ctx.restore();

    // --- Draw Text ---
    const primaryColor = userConfig.rankCardColor || embedColors.info;
    const secondaryColor = '#B0B2B5';
    const textColor = '#FFFFFF';

    // Username
    ctx.fillStyle = primaryColor;
    ctx.font = `bold 40px ${modernFont}`;
    ctx.fillText(user.username, 240, 100);

    // Stats Labels
    ctx.fillStyle = secondaryColor;
    ctx.font = `20px ${modernFont}`;
    ctx.fillText('SERVER RANK', 240, 150);
    ctx.fillText('WEEKLY RANK', 380, 150);
    ctx.fillText('WEEKLY EXP', 510, 150);

    // Stats Values
    ctx.fillStyle = textColor;
    ctx.font = `bold 30px ${modernFont}`;
    ctx.fillText(`#${rank || 'N/A'}`, 240, 185);
    ctx.fillText('Off', 380, 185); // Placeholder for Weekly Rank
    ctx.fillText('Off', 510, 185); // Placeholder for Weekly EXP

    // Level
    ctx.textAlign = 'center';
    ctx.fillStyle = secondaryColor;
    ctx.font = `20px ${modernFont}`;
    ctx.fillText('LEVEL', 680, 60);
    ctx.fillStyle = primaryColor;
    ctx.font = `bold 35px ${modernFont}`;
    ctx.fillText(level, 680, 100);

    // EXP Label
    ctx.fillStyle = secondaryColor;
    ctx.font = `20px ${modernFont}`;
    ctx.fillText('EXP', 680, 170);

    // --- Progress Bar ---
    const progressBarX = 595;
    const progressBarY = 185;
    const progressBarWidth = 170;
    const progressBarHeight = 25;
    ctx.fillStyle = '#484b4e';
    roundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 12).fill();

    if (xpProgress > 0) {
        const progressWidth = Math.max(progressBarHeight, (xpProgress / xpNeeded) * progressBarWidth); // Ensure progress is visible
        ctx.fillStyle = primaryColor;
        roundRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, 12).fill();
    }

    // XP Text
    ctx.fillStyle = textColor;
    ctx.font = `16px ${modernFont}`;
    ctx.fillText(`${xpProgress.toFixed(0)} / ${xpNeeded.toFixed(0)}`, 680, 205);


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
