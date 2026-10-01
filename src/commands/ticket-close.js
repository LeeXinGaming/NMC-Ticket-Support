const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { sanitizeChannelName } = require('../utils/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Close the current ticket')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id);

    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This command can only be used inside a registered ticket channel.',
        ephemeral: true
      });
    }

    if (ticket.status === 'closed') {
      return interaction.reply({
        content: '⚠️ This ticket is already closed.',
        ephemeral: true
      });
    }

    // Check permissions (ticket creator or support staff)
    if (!isSupportOrAdmin(interaction.member) && interaction.user.id !== ticket.creatorId) {
      return interaction.reply({
        content: '⛔ You do not have permission to close this ticket.',
        ephemeral: true
      });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply();

    // Close in DB
    database.closeTicket(channel.id, interaction.user.id);

    // Remove SendMessages from creator
    try {
      if (ticket.creatorId) {
        await channel.permissionOverwrites.edit(ticket.creatorId, {
          SendMessages: false,
          ViewChannel: true,
          ReadMessageHistory: true
        });
      }
    } catch (err) {
      Logger.warn(`Failed to update permissions for creator ${ticket.creatorId}:`, err);
    }

    // Rename channel
    const newName = sanitizeChannelName('closed', ticket.creatorTag ? ticket.creatorTag.split('#')[0] : 'ticket');
    await channel.setName(newName).catch(() => {});

    const closedEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket was closed by <@${interaction.user.id}>.`)
      .setColor(config.colors.danger)
      .addFields(
        { name: '👤 Closed By', value: `<@${interaction.user.id}>`, inline: true },
        { name: '🕒 Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '📝 Reason', value: reason, inline: false }
      )
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('reopen_ticket')
        .setLabel('Reopen Ticket')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('transcript_ticket')
        .setLabel('Transcript')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('delete_ticket')
        .setLabel('Delete')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      embeds: [closedEmbed],
      components: [actionRow]
    });

    // Send log
    await Logger.logTicketEvent(interaction.guild, 'CLOSE', {
      channelId: channel.id,
      channelName: newName,
      closedBy: interaction.user.id,
      creatorId: ticket.creatorId,
      reason
    });
  }
};
