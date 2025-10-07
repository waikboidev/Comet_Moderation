const { Schema, model } = require('mongoose');

const guildXPConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  
  // Core Customization
  levelRoles: { type: Map, of: String, default: new Map() }, // Map<level, roleId>
  xpBlacklistedRoles: { type: [String], default: [] },
  xpBlacklistedChannels: { type: [String], default: [] },
  weeklyLeaderboardEnabled: { type: Boolean, default: false },
  joinRole: { type: String, default: null },
  clearXPOnLeave: { type: Boolean, default: true },

  // Announcement Customization
  levelUpAnnouncementChannel: { type: String, default: null }, // channelId, 'dm', or 'off'
  levelUpAnnouncementMessage: { type: String, default: 'GG {user.ping}, you reached Level {level}!' },
  levelUpAnnouncementPing: { type: Boolean, default: true },
  levelSpecificAnnouncements: { type: Map, of: String, default: new Map() }, // Map<level, message>
});

module.exports = model('GuildXPConfig', guildXPConfigSchema);
