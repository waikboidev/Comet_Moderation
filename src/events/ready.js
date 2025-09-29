const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const axios = require("axios");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.success(`${client.user.tag} is online!`);

    // Heartbeat System for Status Page
    axios.get(`https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_HEARTBEAT}`)
      .then(() => logger.info("Heartbeat was sent to Better Stack."))
      .catch(err => logger.error("Heartbeat failed to send to Better Stack. Expect automatic incident report.", err));
    setInterval(() => {
      axios.get(`https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_HEARTBEAT}`)
        .then(() => logger.info("Heartbeat was sent to Better Stack."))
        .catch(err => logger.error("Heartbeat failed to send to Better Stack. Expect automatic incident report.", err));
    }, 180 * 1000); // 3 min
  },
};
