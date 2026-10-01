const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const database = require('../database');

module.exports = {
  customId: 'delete_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only authorized support staff or administrators can delete tickets.',
        ephemeral: true
      });
    }

    const ticket = database.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This channel is not a recognized ticket channel.',
        ephemeral: true
      });
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('🗑️ Delete Ticket Confirmation')
      .setDescription(
        'Are you sure you want to permanently delete this ticket channel?\n\n' +
        '**A complete HTML transcript will be generated and archived in the audit logs before deletion.**'
      )
      .setColor(config.colors.danger);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_delete_ticket')
        .setLabel('Confirm Delete')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('cancel_close_ticket')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✖️')
    );

    return interaction.reply({
      embeds: [confirmEmbed],
      components: [actionRow]
    });
  }
};
