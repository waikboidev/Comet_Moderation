const mongoose = require('mongoose');

const UserConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  timezone: {
    type: String,
    default: null,
  },
  timeFormat: {
    type: String,
    default: '24HR', // '12HR' or '24HR'
  },
});

module.exports = mongoose.model('UserConfig', UserConfigSchema);
