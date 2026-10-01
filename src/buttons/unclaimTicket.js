const { EmbedBuilder } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { buildTicketActionRow } = require('../utils/ticketManager');

module.exports = {
  customId: 'unclaim_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only authorized support staff or administrators can unclaim tickets.',
        ephemeral: true
      });
    }

    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id);

    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This channel is not a recognized ticket channel.',
        ephemeral: true
      });
    }

    if (!ticket.claimedBy) {
      return interaction.reply({
        content: '⚠️ This ticket is not currently claimed.',
        ephemeral: true
      });
    }

    // Only claiming staff or administrator can unclaim
    const isAdmin = interaction.member.permissions.has('Administrator');
    if (ticket.claimedBy !== interaction.user.id && !isAdmin) {
      return interaction.reply({
        content: `⛔ You cannot unclaim a ticket claimed by <@${ticket.claimedBy}> unless you are an administrator.`,
        ephemeral: true
      });
    }

    const previousClaimant = ticket.claimedBy;

    // Reset claim in database
    database.unclaimTicket(channel.id);

    // Reset channel topic
    await channel.setTopic(
      `Support Ticket for ${ticket.creatorTag || 'User'} (${ticket.creatorId}) | Unclaimed`
    ).catch(() => {});

    const unclaimEmbed = new EmbedBuilder()
      .setTitle('🔓 Ticket Unclaimed')
      .setDescription(`This ticket has been unclaimed by <@${interaction.user.id}> and is now open for any support staff to assist.`)
      .setColor(config.colors.primary)
      .setTimestamp();

    const actionRow = buildTicketActionRow(false);

    await interaction.reply({
      embeds: [unclaimEmbed],
      components: [actionRow]
    });

    // Send Audit Log
    await Logger.logTicketEvent(interaction.guild, 'UNCLAIM', {
      channelId: channel.id,
      staffId: interaction.user.id,
      previousStaffId: previousClaimant
    });
  }
};
