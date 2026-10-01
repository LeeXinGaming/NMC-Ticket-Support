const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { generateTranscript } = require('../utils/transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-transcript')
    .setDescription('Generate and download an HTML transcript for this ticket'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id) || {
      creatorId: 'Unknown',
      creatorTag: 'Unknown',
      createdAt: Date.now()
    };

    await interaction.deferReply();

    try {
      const transcriptResult = await generateTranscript(channel, ticket);

      const embed = new EmbedBuilder()
        .setTitle('📄 Ticket Transcript')
        .setDescription(`Exported transcript with **${transcriptResult.messageCount}** messages from **#${channel.name}**.`)
        .setColor(config.colors.info)
        .addFields(
          { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Generated At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: 'Download and open in your web browser.' })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [transcriptResult.attachment]
      });

      await Logger.logTicketEvent(interaction.guild, 'TRANSCRIPT', {
        channelName: channel.name,
        requestedBy: interaction.user.id,
        messageCount: transcriptResult.messageCount,
        files: [transcriptResult.attachment]
      });
    } catch (err) {
      Logger.error('Failed to generate transcript via slash command:', err);
      return interaction.editReply({
        content: '❌ An error occurred while generating the transcript.'
      });
    }
  }
};
