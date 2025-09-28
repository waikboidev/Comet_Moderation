const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  Prefix: {
    type: String,
    default: 'c-',
  },
  PrefixEnabled: {
    type: Boolean,
    default: true,
  },
  Permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Logging channels
  roleLogChannelId: { type: String, default: null },
  messageLogChannelId: { type: String, default: null },
  moderationLogChannelId: { type: String, default: null },
  memberLogChannelId: { type: String, default: null },
  serverLogChannelId: { type: String, default: null },
  masterLogChannelId: { type: String, default: null },
  // Add other config fields as needed
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
