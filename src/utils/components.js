const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder } = require('discord.js');

function createEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor('Blurple');
}

function createButton(customId, label, style) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style);
}

function createSelectMenu(customId, placeholder, options) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(options);
}

function createModal(customId, title, components) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(components);
}

function createTextInput(customId, label, style) {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style);
}

function createActionRow(...components) {
  return new ActionRowBuilder().addComponents(components);
}

module.exports = {
  createEmbed,
  createButton,
  createSelectMenu,
  createModal,
  createTextInput,
  createActionRow,
};
