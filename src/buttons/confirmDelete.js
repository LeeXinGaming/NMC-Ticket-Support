const { EmbedBuilder } = require('discord.js');
const database = require('../database');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { generateTranscript } = require('../utils/transcript');
const { isSupportOrAdmin } = require('../utils/permissions');

module.exports = {
  customId: 'confirm_delete_ticket',
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

    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id);

    if (!ticket) {
      return interaction.reply({
        content: '⚠️ This channel is not a recognized ticket channel.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // Clean up confirmation prompt
    await interaction.message.delete().catch(() => {});

    // Generate Transcript
    let transcriptResult = null;
    try {
      transcriptResult = await generateTranscript(channel, ticket);
    } catch (err) {
      Logger.error('Failed to generate transcript during ticket deletion:', err);
    }

    // Mark as deleted in DB
    database.deleteTicket(channel.id);

    // Send log to Discord Log Channel with transcript
    if (transcriptResult) {
      await Logger.sendDiscordLog(interaction.guild, {
        title: '🗑️ Ticket Deleted & Archived',
        description: `Ticket channel **#${channel.name}** was deleted by <@${interaction.user.id}>.`,
        color: config.colors.danger,
        fields: [
          { name: 'Channel Name', value: channel.name, inline: true },
          { name: 'Ticket Creator', value: `<@${ticket.creatorId}> (${ticket.creatorTag || ticket.creatorId})`, inline: true },
          { name: 'Deleted By', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: 'Total Messages', value: `${transcriptResult.messageCount}`, inline: true },
          { name: 'Claimed Staff', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'None', inline: true },
          { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true }
        ],
        files: [transcriptResult.attachment]
      });
    }

    // Send countdown embed in ticket channel
    const deletingEmbed = new EmbedBuilder()
      .setTitle('🗑️ Ticket Deletion Scheduled')
      .setDescription('This ticket channel has been archived and will be permanently deleted in **5 seconds**...')
      .setColor(config.colors.danger)
      .setTimestamp();

    await interaction.editReply({ embeds: [deletingEmbed] });

    // Wait 5 seconds and delete channel
    setTimeout(async () => {
      try {
        await channel.delete(`Ticket deleted by ${interaction.user.tag} (${interaction.user.id})`);
      } catch (err) {
        Logger.error(`Failed to delete channel ${channel.id}:`, err);
      }
    }, 5000);
  }
};
