const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createNewTicket } = require('../utils/ticketManager');
const Logger = require('../utils/logger');

module.exports = {
  customId: 'open_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    // Ephemeral deferral so user sees responsive state
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await createNewTicket(interaction.guild, interaction.user);

      if (!result.success) {
        if (result.error === 'DUPLICATE_TICKET') {
          return interaction.editReply({
            content: `⚠️ You already have an open ticket in <#${result.existingChannelId}>! Please resolve or close your existing ticket before opening a new one.`
          });
        }
        return interaction.editReply({
          content: '❌ Failed to create ticket channel. Please contact an administrator.'
        });
      }

      const goToButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Go to Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guild.id}/${result.channel.id}`)
      );

      return interaction.editReply({
        content: `✅ Your ticket channel has been created: ${result.channel}`,
        components: [goToButton]
      });
    } catch (error) {
      Logger.error('Error in openTicket button handler:', error);
      return interaction.editReply({
        content: '❌ An error occurred while creating your ticket. Please verify bot permissions with a server admin.'
      });
    }
  }
};
