const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Gets the current latency of the bot.'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const websocketLatency = Math.max(0, Math.round(interaction.client.ws.ping));
    const roundtripLatency = Date.now() - sent.createdTimestamp;

    await interaction.editReply(`It took \`${apiLatency} ms\` to reach Discord Servers and \`${websocketLatency} ms\` to reach websocket and \`${roundtripLatency} ms\` for a roundtrip message.`);
  },
};
