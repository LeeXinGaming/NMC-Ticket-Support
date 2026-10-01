const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-delete')
    .setDescription('Delete the current ticket and archive transcript'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only support staff or administrators can delete tickets.',
        ephemeral: true
      });
    }

    const ticket = database.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This command can only be used inside a registered ticket channel.',
        ephemeral: true
      });
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('🗑️ Delete Ticket Confirmation')
      .setDescription('Are you sure you want to permanently delete this ticket channel? A transcript will be archived.')
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
