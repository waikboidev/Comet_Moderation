const { Schema, model } = require('mongoose');

const userXPConfigSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  rankCardColor: { type: String, default: '#3498db' }, // Default color
  rankCardBackground: { type: String, default: null }, // URL to image
  rankCardOpacity: { type: Number, default: 50 }, // Percentage 0-100
});

module.exports = model('UserXPConfig', userXPConfigSchema);
