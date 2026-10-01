const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const database = require('../database');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { sanitizeChannelName, buildTicketActionRow } = require('../utils/ticketManager');
const { isSupportOrAdmin } = require('../utils/permissions');

module.exports = {
  customId: 'reopen_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id);

    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This channel does not appear to be a registered ticket channel.',
        ephemeral: true
      });
    }

    if (ticket.status !== 'closed') {
      return interaction.reply({
        content: '⚠️ This ticket is not currently closed.',
        ephemeral: true
      });
    }

    // Check staff permissions
    if (!isSupportOrAdmin(interaction.member) && interaction.user.id !== ticket.creatorId) {
      return interaction.reply({
        content: '⛔ Only support staff or the ticket creator can reopen this ticket.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // Reopen in DB
    database.reopenTicket(channel.id);

    // Restore SendMessages permission for creator
    try {
      if (ticket.creatorId) {
        await channel.permissionOverwrites.edit(ticket.creatorId, {
          SendMessages: true,
          ViewChannel: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          EmbedLinks: true
        });
      }
    } catch (err) {
      Logger.warn(`Failed to restore permissions for creator ${ticket.creatorId}:`, err);
    }

    // Rename back: ticket-USERNAME
    const newName = sanitizeChannelName('ticket', ticket.creatorTag ? ticket.creatorTag.split('#')[0] : 'user');
    await channel.setName(newName).catch(err => Logger.warn('Failed to rename reopened ticket channel:', err));

    const reopenEmbed = new EmbedBuilder()
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`This ticket has been reopened by <@${interaction.user.id}>. Members can now send messages again.`)
      .setColor(config.colors.success)
      .setTimestamp();

    const actionRow = buildTicketActionRow(ticket.claimedBy !== null, ticket.claimedBy);

    await interaction.editReply({
      embeds: [reopenEmbed],
      components: [actionRow]
    });
  }
};
