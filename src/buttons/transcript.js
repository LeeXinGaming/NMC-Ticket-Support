const { EmbedBuilder } = require('discord.js');
const database = require('../database');
const { config } = require('../config');
const Logger = require('../utils/logger');
const { generateTranscript } = require('../utils/transcript');

module.exports = {
  customId: 'transcript_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const channel = interaction.channel;
    const ticket = database.getTicketByChannel(channel.id) || {
      creatorId: 'Unknown',
      creatorTag: 'Unknown',
      createdAt: Date.now()
    };

    try {
      const transcriptResult = await generateTranscript(channel, ticket);

      const embed = new EmbedBuilder()
        .setTitle('📄 Ticket Transcript')
        .setDescription(`Generated transcript containing **${transcriptResult.messageCount}** messages for **#${channel.name}**.`)
        .setColor(config.colors.info)
        .addFields(
          { name: 'Generated For', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Generated At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: 'Download and open the attached .html file in any web browser.' })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [transcriptResult.attachment]
      });

      // Send to log channel
      await Logger.logTicketEvent(interaction.guild, 'TRANSCRIPT', {
        channelName: channel.name,
        requestedBy: interaction.user.id,
        messageCount: transcriptResult.messageCount,
        files: [transcriptResult.attachment]
      });
    } catch (err) {
      Logger.error('Failed to generate transcript:', err);
      await interaction.editReply({
        content: '❌ An error occurred while generating the transcript.'
      });
    }
  }
};
