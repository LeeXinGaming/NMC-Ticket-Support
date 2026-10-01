const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { isSupportOrAdmin } = require('../utils/permissions');
const { config } = require('../config');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-rename')
    .setDescription('Rename the current ticket channel')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('New channel name (lowercase, hyphens)')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only support staff or administrators can rename tickets.',
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

    const rawName = interaction.options.getString('name');
    const sanitizedName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, '')
      .slice(0, 32);

    if (!sanitizedName) {
      return interaction.reply({
        content: '⚠️ Invalid channel name provided. Use letters, numbers, and hyphens.',
        ephemeral: true
      });
    }

    await interaction.deferReply();
    const oldName = channel.name;

    try {
      await channel.setName(sanitizedName);

      const embed = new EmbedBuilder()
        .setTitle('✏️ Ticket Channel Renamed')
        .setDescription(`Channel renamed from \`#${oldName}\` to \`#${sanitizedName}\`.`)
        .setColor(config.colors.primary)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      Logger.logTicketEvent(interaction.guild, 'RENAME', {
        channelId: channel.id,
        oldName,
        newName: sanitizedName,
        staffId: interaction.user.id
      }).catch(() => {});
    } catch (err) {
      Logger.error(`Failed to rename ticket channel ${channel.id}:`, err);
      return interaction.editReply({
        content: '❌ Failed to rename channel. Note that Discord limits channel renames to 2 times per 10 minutes.'
      });
    }
  }
};
