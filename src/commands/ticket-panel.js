const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const { config } = require('../config');
const { isSupportOrAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Deploy the interactive ticket creation panel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel where the panel should be sent (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Custom panel title')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Custom panel description')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    if (!isSupportOrAdmin(interaction.member)) {
      return interaction.reply({
        content: '⛔ Only administrators or support staff can deploy the ticket panel.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const customTitle = interaction.options.getString('title') || '📩 Support Ticket System';
    const customDescription = interaction.options.getString('description') ||
      'Need help or have a question? Click the button below to open a private support ticket.\n\n' +
      'Our team is available to assist with inquiries, reports, questions, and general support.';

    const panelEmbed = new EmbedBuilder()
      .setTitle(customTitle)
      .setDescription(customDescription)
      .setColor(config.colors.primary)
      .addFields(
        {
          name: '🕒 Support Availability',
          value: 'Tickets are answered in the order they are received. Please be patient after opening a ticket.',
          inline: false
        },
        {
          name: '📋 What to include',
          value: '• Clear description of your question or issue\n• Relevant screenshots, transaction IDs, or logs\n• Steps to reproduce (if applicable)',
          inline: false
        }
      )
      .setFooter({ text: 'Click "Open Ticket" below to start • Private & Confidential' })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('Open Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary)
    );

    try {
      await targetChannel.send({
        embeds: [panelEmbed],
        components: [actionRow]
      });

      return interaction.editReply({
        content: `✅ Ticket panel has been successfully posted to ${targetChannel}!`
      });
    } catch (err) {
      return interaction.editReply({
        content: `❌ Failed to send ticket panel to ${targetChannel}. Please check bot channel permissions.`
      });
    }
  }
};
