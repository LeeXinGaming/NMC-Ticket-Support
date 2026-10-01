const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const database = require('../database');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { sanitizeChannelName } = require('../utils/ticketManager');

module.exports = {
  customId: 'confirm_close_ticket',
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

    if (ticket.status === 'closed') {
      return interaction.reply({
        content: '⚠️ This ticket is already marked as closed.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // Clean up confirmation prompt message if still present
    await interaction.message.delete().catch(() => {});

    // Update database
    database.closeTicket(channel.id, interaction.user.id);

    // Modify creator permissions: remove SendMessages
    try {
      if (ticket.creatorId) {
        await channel.permissionOverwrites.edit(ticket.creatorId, {
          SendMessages: false,
          ViewChannel: true,
          ReadMessageHistory: true
        });
      }
    } catch (err) {
      Logger.warn(`Failed to modify permissions for creator ${ticket.creatorId}:`, err);
    }

    // Rename channel: closed-ticket-USERNAME
    const newName = sanitizeChannelName('closed', ticket.creatorTag ? ticket.creatorTag.split('#')[0] : 'ticket');
    await channel.setName(newName).catch(err => Logger.warn('Failed to rename closed ticket channel:', err));

    // Send Closed Embed
    const closedEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket has been closed by <@${interaction.user.id}>.`)
      .setColor(config.colors.danger)
      .addFields(
        { name: '👤 Closed By', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
        { name: '🕒 Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '💡 Actions', value: 'Use the buttons below to export the transcript or permanently delete the ticket.', inline: false }
      )
      .setFooter({ text: 'Ticket Management' })
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

    // Send Discord Log
    await Logger.logTicketEvent(interaction.guild, 'CLOSE', {
      channelId: channel.id,
      channelName: newName,
      closedBy: interaction.user.id,
      creatorId: ticket.creatorId
    });
  }
};
