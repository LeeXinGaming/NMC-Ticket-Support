const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { config } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-info')
    .setDescription('View detailed information about the current ticket'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id);

    if (!ticket) {
      return interaction.editReply({
        content: '⚠️ This channel is not a recognized ticket channel in the database.'
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Ticket #${ticket.ticketNumber || 'N/A'} Information`)
      .setColor(config.colors.primary)
      .addFields(
        { name: 'Channel', value: `<#${ticket.channelId}> (\`${ticket.channelId}\`)`, inline: false },
        { name: 'Ticket Creator', value: `<@${ticket.creatorId}> (\`${ticket.creatorId}\`)`, inline: true },
        { name: 'Creator Tag', value: ticket.creatorTag || 'N/A', inline: true },
        { name: 'Current Status', value: `\`${ticket.status.toUpperCase()}\``, inline: true },
        { name: 'Claimed By', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : '*Unclaimed*', inline: true },
        { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt / 1000)}:F> (<t:${Math.floor(ticket.createdAt / 1000)}:R>)`, inline: true },
        { name: 'Closed At', value: ticket.closedAt ? `<t:${Math.floor(ticket.closedAt / 1000)}:F>` : '*Not closed*', inline: true }
      )
      .setFooter({ text: `Guild ID: ${ticket.guildId}` })
      .setTimestamp();

    return interaction.editReply({
      embeds: [embed]
    });
  }
};
