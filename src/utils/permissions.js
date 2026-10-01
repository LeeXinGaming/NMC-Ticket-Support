const { PermissionFlagsBits } = require('discord.js');
const { config } = require('../config');

// Known staff role IDs for the server
const STAFF_ROLE_IDS = [
  '1553098258325180457', // NMG CITY TICKET
  '1549503438461607957', // 𝐀𝐃𝐌𝐈𝐍
  '1549502805767618651', // 𝐎𝐖𝐍𝐄𝐑
  '1549717658453418054', // 𝐅𝐎𝐔𝐍𝐃𝐄𝐑
  '1549503711544348804', // 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑
  '1549492423326179458'  // 𝐍𝐌𝐂 𝐒𝐄𝐑𝐕𝐄𝐑 𝐓𝐄𝐀𝐌
];

/**
 * Checks if a member has support staff or administrative privileges.
 * @param {import('discord.js').GuildMember} member 
 * @returns {boolean}
 */
function isSupportOrAdmin(member) {
  if (!member) return false;

  // 1. Check Administrator or Manage Server permissions
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  ) {
    return true;
  }

  // 2. Check configured SUPPORT_ROLE_ID from .env
  if (config.supportRoleId && member.roles.cache.has(config.supportRoleId)) {
    return true;
  }

  // 3. Check any server staff roles
  for (const roleId of STAFF_ROLE_IDS) {
    if (member.roles.cache.has(roleId)) {
      return true;
    }
  }

  return false;
}

/**
 * Verify bot has necessary permissions in a guild or channel.
 * @param {import('discord.js').GuildChannel | import('discord.js').Guild} target 
 * @param {import('discord.js').Client} client 
 * @returns {boolean}
 */
function hasBotPermissions(target, client) {
  if (!target || !client.user) return false;
  const me = target.guild ? target.guild.members.me : target.members.me;
  if (!me) return false;

  const required = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles
  ];

  return required.every(perm => me.permissions.has(perm));
}

module.exports = {
  isSupportOrAdmin,
  hasBotPermissions,
  STAFF_ROLE_IDS
};
