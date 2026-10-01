const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { buildTicketActionRow } = require('../utils/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-claim')
    .setDescription('Claim the current ticket as a support representative'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
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
        content: '⚠️ This command can only be used inside a registered ticket channel.',
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

    // Update topic
    await channel.setTopic(
      `Support Ticket for ${ticket.creatorTag || 'User'} (${ticket.creatorId}) | Claimed by: ${interaction.user.tag}`
    ).catch(() => {});

    const claimEmbed = new EmbedBuilder()
      .setTitle('🔐 Ticket Claimed')
      .setDescription(`<@${interaction.user.id}> has claimed this ticket via slash command.`)
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
