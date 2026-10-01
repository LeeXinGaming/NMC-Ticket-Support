const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { config } = require('../config');
const database = require('../database');
const Logger = require('./logger');
const { STAFF_ROLE_IDS } = require('./permissions');

/**
 * Builds the initial ticket channel buttons row.
 * @param {boolean} isClaimed - Whether the ticket is currently claimed.
 * @param {string|null} claimedById - Discord user ID of claiming staff.
 */
function buildTicketActionRow(isClaimed = false, claimedById = null) {
  const row = new ActionRowBuilder();

  // Close Button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );

  // Claim / Unclaim Button
  if (isClaimed) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('unclaim_ticket')
        .setLabel('Unclaim')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('Claim Ticket')
        .setEmoji('🔐')
        .setStyle(ButtonStyle.Success)
    );
  }

  // Delete Button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId('delete_ticket')
      .setLabel('Delete')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary)
  );

  // Transcript Button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId('transcript_ticket')
      .setLabel('Transcript')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Primary)
  );

  return row;
}

/**
 * Builds the primary embed displayed at the top of a new ticket channel.
 * @param {import('discord.js').User} user - Ticket creator
 * @param {number} ticketNumber - Ticket sequence number
 * @param {string|null} claimedById - ID of claiming staff member if claimed
 */
function buildTicketEmbed(user, ticketNumber, claimedById = null) {
  const embed = new EmbedBuilder()
    .setTitle(`🎫 Support Ticket #${ticketNumber}`)
    .setDescription(
      `Welcome to your support ticket, <@${user.id}>!\n\n` +
      `Our staff team has been notified and will assist you shortly. ` +
      `Please describe your issue or question in detail.`
    )
    .setColor(config.colors.primary)
    .addFields(
      { name: '👤 Creator', value: `<@${user.id}> (${user.tag})`, inline: true },
      { name: '🕒 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: '📌 Status', value: claimedById ? `Claimed by <@${claimedById}>` : '🟢 Open / Unclaimed', inline: true },
      {
        name: '⚙️ Ticket Controls',
        value: 
          '• **🔒 Close Ticket:** Safely close and archive this ticket.\n' +
          '• **🔐 Claim Ticket:** Support staff can claim exclusive ownership.\n' +
          '• **📄 Transcript:** Generate HTML transcript at any time.\n' +
          '• **🗑️ Delete:** Permanently remove ticket.',
        inline: false
      }
    )
    .setThumbnail(user.displayAvatarURL({ forceStatic: false }))
    .setFooter({ text: `Ticket ID: #${ticketNumber} • Support System` })
    .setTimestamp();

  return embed;
}

/**
 * Helper to sanitize Discord channel names.
 * Format: ticket-username
 * @param {string} username 
 * @returns {string}
 */
function sanitizeChannelName(prefix, username) {
  const cleanName = (username || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '')
    .slice(0, 20) || 'user';
  return `${prefix}-${cleanName}`;
}

/**
 * Create a new support ticket channel and database entry.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').User} user 
 * @returns {Promise<{ success: boolean, channel?: import('discord.js').TextChannel, error?: string, existingChannelId?: string }>}
 */
async function createNewTicket(guild, user) {
  // Check if user already has an active ticket
  const existingTicket = database.getActiveTicketByCreator(user.id, guild.id);
  if (existingTicket) {
    const existingChannel = await guild.channels.fetch(existingTicket.channelId).catch(() => null);
    if (existingChannel) {
      return {
        success: false,
        error: 'DUPLICATE_TICKET',
        existingChannelId: existingTicket.channelId
      };
    }
  }

  // Construct permission overwrites
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels
      ]
    }
  ];

  // Add support roles to channel permission overwrites
  const rolesToAdd = new Set([...STAFF_ROLE_IDS]);
  if (config.supportRoleId) rolesToAdd.add(config.supportRoleId);

  for (const roleId of rolesToAdd) {
    if (roleId && guild.roles.cache.has(roleId)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
  }

  const channelName = sanitizeChannelName('ticket', user.username);

  // Create Channel
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId || null,
    permissionOverwrites,
    topic: `Support Ticket for ${user.tag} (${user.id})`
  });

  // Store in DB
  const ticketRecord = database.createTicket({
    channelId: channel.id,
    guildId: guild.id,
    creatorId: user.id,
    creatorTag: user.tag
  });

  // Send Initial Embed & Controls
  const embed = buildTicketEmbed(user, ticketRecord.ticketNumber);
  const actionRow = buildTicketActionRow(false);

  channel.send({
    content: `${user} Welcome to your support ticket! Support staff have been notified.`,
    embeds: [embed],
    components: [actionRow]
  }).catch(err => Logger.error('Failed to send initial ticket message:', err));

  // Async Audit Log (does not block ticket creation response)
  Logger.logTicketEvent(guild, 'CREATE', {
    channelId: channel.id,
    creatorId: user.id,
    ticketNumber: ticketRecord.ticketNumber
  }).catch(() => {});

  return {
    success: true,
    channel,
    ticketRecord
  };
}

module.exports = {
  buildTicketActionRow,
  buildTicketEmbed,
  sanitizeChannelName,
  createNewTicket
};
