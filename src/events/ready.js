const { Events, EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const axios = require("axios");
const Reminder = require('../schemas/Reminder');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');

async function checkReminders(client) {
    const reminders = await Reminder.find({ time: { $lte: new Date() } });

    for (const reminder of reminders) {
        try {
            const user = await client.users.fetch(reminder.userId);
            const embed = new EmbedBuilder()
                .setColor(embedColors.info)
                .setTitle(`${emojis.reminder} Reminder`)
                .setDescription(reminder.message)
                .setTimestamp(reminder.time)
                .setFooter({ text: `Set in server: ${client.guilds.cache.get(reminder.guildId)?.name || 'Unknown'}` });

            if (reminder.messageLink) {
                embed.addFields({ name: 'Original Message', value: `[Jump to Message](${reminder.messageLink})` });
            }

            if (reminder.dm) {
                await user.send({ embeds: [embed] });
            } else {
                const channel = await client.channels.fetch(reminder.channelId);
                if (channel) {
                    await channel.send({ content: `${user}`, embeds: [embed] });
                }
            }
        } catch (error) {
            logger.error(`Failed to send reminder ${reminder._id}:`, error);
        } finally {
            await Reminder.findByIdAndDelete(reminder._id);
        }
    }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.success(`${client.user.tag} is online!`);

    // --- Reminder System ---
    setInterval(() => checkReminders(client), 30000); // Check every 30 seconds

    // Heartbeat System for Status Page
    axios.get(`https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_HEARTBEAT}`)
      .catch(err => logger.error("Heartbeat failed to send to Better Stack. Expect automatic incident report.", err));
    setInterval(() => {
      axios.get(`https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_HEARTBEAT}`)
        .catch(err => logger.error("Heartbeat failed to send to Better Stack. Expect automatic incident report.", err));
    }, 180 * 1000); // 3 min
  },
};
