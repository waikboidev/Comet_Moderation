import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder } from 'discord.js';

export function createEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor('Blurple');
}

export function createButton(customId: string, label: string, style: any) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style);
}

export function createSelectMenu(customId: string, placeholder: string, options: any[]) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(options);
}

export function createModal(customId: string, title: string, components: any[]) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(components);
}

export function createTextInput(customId: string, label: string, style: any) {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style);
}

export function createActionRow(...components: any[]) {
  return new ActionRowBuilder().addComponents(components);
}
