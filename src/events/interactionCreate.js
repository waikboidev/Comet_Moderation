const { Events, EmbedBuilder } = require('discord.js');
const Reminder = require('../schemas/Reminder');
const embedColors = require('../../embedColors');
const emojis = require('../../emojis');
const ms = require('ms');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error('Autocomplete error:', error);
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('remindme_edit_')) {
            const shortId = interaction.customId.split('_')[2];
            const reminder = await Reminder.findOne({ userId: interaction.user.id, shortId: shortId });
            if (!reminder) {
                return interaction.reply({ content: 'This reminder no longer exists.', ephemeral: true });
            }

            const newTime = interaction.fields.getTextInputValue('time');
            const newMessage = interaction.fields.getTextInputValue('message');
            const duration = ms(newTime);

            if (!duration || duration < 60000) {
                return interaction.reply({ content: 'Invalid time format. Please use something like "10m", "2h", or "1d". Minimum is 1 minute.', ephemeral: true });
            }

            reminder.time = new Date(Date.now() + duration);
            reminder.message = newMessage;
            await reminder.save();

            const embed = new EmbedBuilder()
                .setColor(embedColors.success)
                .setDescription(`${emojis.success} Reminder \`${shortId}\` has been updated. It will now go off <t:${Math.floor(reminder.time.getTime() / 1000)}:R>.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return;
    }

    if (interaction.isButton()) {
        // Button logic can be added here for other commands in the future
        return;
    }

    if (!interaction.isCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '<:fail:1420911452050686034> There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: '<:fail:1420911452050686034> There was an error while executing this command!', ephemeral: true });
      }
    }
  },
};
