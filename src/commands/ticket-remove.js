const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-remove')
    .setDescription('Remove a user from the current ticket')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to remove from this ticket')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only support staff or administrators can manage ticket participants.',
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

    const targetUser = interaction.options.getUser('user');

    if (targetUser.id === ticket.creatorId) {
      return interaction.reply({
        content: '⚠️ You cannot remove the ticket creator from their own ticket.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      await channel.permissionOverwrites.delete(targetUser.id);

      const embed = new EmbedBuilder()
        .setTitle('➖ User Removed from Ticket')
        .setDescription(`Successfully removed <@${targetUser.id}> (${targetUser.tag}) from this ticket channel.`)
        .setColor(config.colors.warning)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      Logger.logTicketEvent(interaction.guild, 'MEMBER_REMOVED', {
        channelId: channel.id,
        targetId: targetUser.id,
        staffId: interaction.user.id
      }).catch(() => {});
    } catch (err) {
      Logger.error(`Failed to remove user ${targetUser.id} from ticket ${channel.id}:`, err);
      return interaction.editReply({
        content: '❌ Failed to remove user from ticket. Check bot permissions.'
      });
    }
  }
};
