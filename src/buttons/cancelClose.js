module.exports = {
  customId: 'cancel_close_ticket',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction 
   */
  async execute(interaction) {
    try {
      await interaction.message.delete().catch(() => {});
      return interaction.reply({
        content: '✅ Ticket closure cancelled.',
        ephemeral: true
      });
    } catch {
      return interaction.reply({
        content: '✅ Ticket closure cancelled.',
        ephemeral: true
      });
    }
  }
};
