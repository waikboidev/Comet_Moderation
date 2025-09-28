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
  Permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Add other config fields as needed, e.g.:
  roleLogChannelId: {
    type: String,
    default: null,
  },
  // ...more fields as needed
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
