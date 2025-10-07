const { Schema, model } = require('mongoose');

const reminderSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true }, // The channel where the reminder was created
  message: { type: String, required: true },
  time: { type: Date, required: true },
  dm: { type: Boolean, default: true }, // Default to sending in DMs
  messageLink: { type: String, default: null }, // Link to a replied-to message
  shortId: { type: String, required: true, unique: true },
});

reminderSchema.index({ time: 1 });
reminderSchema.index({ userId: 1 });

module.exports = model('Reminder', reminderSchema);
