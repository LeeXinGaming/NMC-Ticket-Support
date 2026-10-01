const { Events, ActivityType } = require('discord.js');
const Logger = require('../utils/logger');
const { getTicketStats } = require('../database');
const { config } = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client 
   */
  async execute(client) {
    Logger.info(`=========================================`);
    Logger.info(`🚀 Discord Ticket Bot is ONLINE!`);
    Logger.info(`🤖 Logged in as: ${client.user.tag} (${client.user.id})`);
    Logger.info(`🌐 Connected Guilds: ${client.guilds.cache.size}`);
    Logger.info(`⚙️ Ticket Category ID: ${config.ticketCategoryId || 'Not Set'}`);
    Logger.info(`🛡️ Support Role ID: ${config.supportRoleId || 'Not Set'}`);
    Logger.info(`📜 Log Channel ID: ${config.logChannelId || 'Not Set'}`);
    Logger.info(`=========================================`);

    // Set Bot Activity / Presence
    try {
      client.user.setPresence({
        activities: [
          {
            name: 'Support Tickets | /ticket-panel',
            type: ActivityType.Watching
          }
        ],
        status: 'online'
      });
    } catch (err) {
      Logger.warn('Failed to set bot presence:', err);
    }
  }
};
