const { Events, EmbedBuilder } = require('discord.js');
const Logger = require('../utils/logger');
const { config } = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  /**
   * @param {import('discord.js').Interaction} interaction 
   */
  async execute(interaction) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        Logger.warn(`Slash command not found: ${interaction.commandName}`);
        return interaction.reply({
          content: '⚠️ This command is no longer registered or available.',
          ephemeral: true
        }).catch(() => {});
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        Logger.error(`Error executing slash command /${interaction.commandName}:`, error);

        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Command Execution Error')
          .setDescription('An unexpected error occurred while executing this command.')
          .setColor(config.colors.danger);

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const buttonHandler = interaction.client.buttons.get(interaction.customId);

      if (!buttonHandler) {
        Logger.warn(`No handler registered for button customId: ${interaction.customId}`);
        return interaction.reply({
          content: '⚠️ This button action is unrecognized or expired.',
          ephemeral: true
        }).catch(() => {});
      }

      try {
        await buttonHandler.execute(interaction);
      } catch (error) {
        Logger.error(`Error executing button action [${interaction.customId}]:`, error);

        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Action Error')
          .setDescription('An error occurred while processing this button action.')
          .setColor(config.colors.danger);

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }
  }
};
