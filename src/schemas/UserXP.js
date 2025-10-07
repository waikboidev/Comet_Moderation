const { Schema, model } = require('mongoose');

const userXPSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  weeklyXp: { type: Number, default: 0 },
});

// Create a compound index to ensure a user only has one XP document per guild
userXPSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('UserXP', userXPSchema);
