const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('Add a user to the current ticket')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to add to this ticket')
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

    await interaction.deferReply();
    const targetUser = interaction.options.getUser('user');

    try {
      await channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });

      const embed = new EmbedBuilder()
        .setTitle('➕ User Added to Ticket')
        .setDescription(`Successfully added <@${targetUser.id}> (${targetUser.tag}) to this ticket.`)
        .setColor(config.colors.success)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      Logger.logTicketEvent(interaction.guild, 'MEMBER_ADDED', {
        channelId: channel.id,
        targetId: targetUser.id,
        staffId: interaction.user.id
      }).catch(() => {});
    } catch (err) {
      Logger.error(`Failed to add user ${targetUser.id} to ticket ${channel.id}:`, err);
      return interaction.editReply({
        content: '❌ Failed to add user to ticket. Check bot permissions.'
      });
    }
  }
};
