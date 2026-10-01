const { EmbedBuilder } = require('discord.js');
const { config } = require('../config');

/**
 * Enhanced Logger for terminal output and Discord log channel broadcasting.
 */
class Logger {
  static info(message, ...args) {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
  }

  static warn(message, ...args) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...args);
  }

  static error(message, ...args) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, ...args);
  }

  static debug(message, ...args) {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args);
    }
  }

  /**
   * Send a rich log embed to the configured LOG_CHANNEL_ID.
   * @param {import('discord.js').Guild} guild 
   * @param {object} logData 
   * @param {string} logData.title 
   * @param {string} logData.description 
   * @param {number} [logData.color] 
   * @param {Array<{name: string, value: string, inline?: boolean}>} [logData.fields] 
   * @param {import('discord.js').AttachmentBuilder[]} [logData.files] 
   */
  static async sendDiscordLog(guild, { title, description, color = config.colors.primary, fields = [], files = [] }) {
    if (!config.logChannelId) return;

    try {
      const logChannel = await guild.channels.fetch(config.logChannelId).catch(() => null);
      if (!logChannel || !logChannel.isTextBased()) {
        Logger.warn(`Log channel ${config.logChannelId} not found or is not a text channel.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || null)
        .setColor(color)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: `Ticket Audit Log • Guild ID: ${guild.id}` });

      await logChannel.send({ embeds: [embed], files });
    } catch (err) {
      Logger.error(`Failed to send log to Discord channel ${config.logChannelId}:`, err);
    }
  }

  /**
   * Shortcut for ticket event logs
   */
  static async logTicketEvent(guild, eventType, data = {}) {
    let title = '';
    let color = config.colors.primary;
    const fields = [];

    switch (eventType) {
      case 'CREATE':
        title = '🎫 Ticket Created';
        color = config.colors.success;
        fields.push(
          { name: 'Channel', value: `<#${data.channelId}> (\`${data.channelId}\`)`, inline: true },
          { name: 'Creator', value: `<@${data.creatorId}> (\`${data.creatorId}\`)`, inline: true },
          { name: 'Ticket #', value: `#${data.ticketNumber || 'N/A'}`, inline: true }
        );
        break;

      case 'CLAIM':
        title = '🔐 Ticket Claimed';
        color = config.colors.warning;
        fields.push(
          { name: 'Channel', value: `<#${data.channelId}>`, inline: true },
          { name: 'Staff Member', value: `<@${data.staffId}>`, inline: true },
          { name: 'Ticket Creator', value: `<@${data.creatorId}>`, inline: true }
        );
        break;

      case 'UNCLAIM':
        title = '🔓 Ticket Unclaimed';
        color = config.colors.warning;
        fields.push(
          { name: 'Channel', value: `<#${data.channelId}>`, inline: true },
          { name: 'Staff Member', value: `<@${data.staffId}>`, inline: true }
        );
        break;

      case 'CLOSE':
        title = '🔒 Ticket Closed';
        color = config.colors.danger;
        fields.push(
          { name: 'Channel', value: `${data.channelName || data.channelId}`, inline: true },
          { name: 'Closed By', value: `<@${data.closedBy}>`, inline: true },
          { name: 'Ticket Creator', value: `<@${data.creatorId}>`, inline: true }
        );
        if (data.reason) {
          fields.push({ name: 'Reason', value: data.reason, inline: false });
        }
        break;

      case 'DELETE':
        title = '🗑️ Ticket Deleted';
        color = config.colors.danger;
        fields.push(
          { name: 'Channel Name', value: `${data.channelName}`, inline: true },
          { name: 'Deleted By', value: `<@${data.deletedBy}>`, inline: true },
          { name: 'Ticket Creator', value: `<@${data.creatorId}>`, inline: true }
        );
        break;

      case 'TRANSCRIPT':
        title = '📄 Ticket Transcript Generated';
        color = config.colors.info;
        fields.push(
          { name: 'Channel', value: `${data.channelName}`, inline: true },
          { name: 'Requested By', value: `<@${data.requestedBy}>`, inline: true },
          { name: 'Total Messages', value: `${data.messageCount || 0}`, inline: true }
        );
        break;

      case 'MEMBER_ADDED':
        title = '➕ Member Added to Ticket';
        color = config.colors.primary;
        fields.push(
          { name: 'Channel', value: `<#${data.channelId}>`, inline: true },
          { name: 'Added User', value: `<@${data.targetId}>`, inline: true },
          { name: 'Staff Action By', value: `<@${data.staffId}>`, inline: true }
        );
        break;

      case 'MEMBER_REMOVED':
        title = '➖ Member Removed from Ticket';
        color = config.colors.primary;
        fields.push(
          { name: 'Channel', value: `<#${data.channelId}>`, inline: true },
          { name: 'Removed User', value: `<@${data.targetId}>`, inline: true },
          { name: 'Staff Action By', value: `<@${data.staffId}>`, inline: true }
        );
        break;

      case 'RENAME':
        title = '✏️ Ticket Renamed';
        color = config.colors.primary;
        fields.push(
          { name: 'Channel', value: `<#${data.channelId}>`, inline: true },
          { name: 'Old Name', value: `\`${data.oldName}\``, inline: true },
          { name: 'New Name', value: `\`${data.newName}\``, inline: true },
          { name: 'Staff Action By', value: `<@${data.staffId}>`, inline: true }
        );
        break;

      default:
        title = `Ticket Event: ${eventType}`;
        break;
    }

    await Logger.sendDiscordLog(guild, {
      title,
      color,
      fields,
      files: data.files || []
    });
  }
}

module.exports = Logger;
