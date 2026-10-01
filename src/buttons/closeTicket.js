const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { config } = require('../config');

module.exports = {
  customId: 'close_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    const ticket = database.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This channel does not appear to be a registered ticket channel.',
        ephemeral: true
      });
    }

    if (ticket.status === 'closed') {
      return interaction.reply({
        content: '⚠️ This ticket is already marked as closed.',
        ephemeral: true
      });
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('🔒 Close Ticket Confirmation')
      .setDescription('Are you sure you want to close this ticket? Members will lose permission to send new messages.')
      .setColor(config.colors.warning);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_close_ticket')
        .setLabel('Confirm Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
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
