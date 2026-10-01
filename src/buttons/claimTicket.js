const { EmbedBuilder } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { buildTicketActionRow } = require('../utils/ticketManager');

module.exports = {
  customId: 'claim_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only authorized support staff or administrators can claim tickets.',
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

    if (ticket.claimedBy) {
      return interaction.reply({
        content: `⚠️ This ticket is already claimed by <@${ticket.claimedBy}>.`,
        ephemeral: true
      });
    }

    // Save claim in database
    database.claimTicket(channel.id, interaction.user.id);

    // Update topic with claimed staff
    await channel.setTopic(
      `Support Ticket for ${ticket.creatorTag || 'User'} (${ticket.creatorId}) | Claimed by: ${interaction.user.tag}`
    ).catch(() => {});

    // Send Claim Notification Embed
    const claimEmbed = new EmbedBuilder()
      .setTitle('🔐 Ticket Claimed')
      .setDescription(`<@${interaction.user.id}> has claimed this ticket and will be your primary support representative.`)
      .setColor(config.colors.warning)
      .setTimestamp();

    const actionRow = buildTicketActionRow(true, interaction.user.id);

    await interaction.reply({
      embeds: [claimEmbed],
      components: [actionRow]
    });

    // Send Audit Log
    await Logger.logTicketEvent(interaction.guild, 'CLAIM', {
      channelId: channel.id,
      staffId: interaction.user.id,
      creatorId: ticket.creatorId
    });
  }
};
