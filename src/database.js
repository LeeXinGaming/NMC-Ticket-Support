const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tickets.db');

let db;

// Initialize SQLite: Prefer Node.js native built-in `node:sqlite`, with `better-sqlite3` fallback
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
} catch (e) {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    db = new BetterSqlite3(dbPath);
  } catch (err) {
    console.error('Failed to initialize SQLite driver:', err);
    throw err;
  }
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    creator_tag TEXT,
    claimed_by TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    closed_at INTEGER DEFAULT NULL,
    closed_by TEXT DEFAULT NULL,
    ticket_number INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_creator_status ON tickets (creator_id, status);
  CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets (guild_id);
`);

/**
 * Get next incremental ticket sequence number
 */
function getNextTicketNumber(guildId) {
  const row = db.prepare('SELECT MAX(ticket_number) as max_num FROM tickets WHERE guild_id = ?').get(guildId);
  return (row && row.max_num) ? Number(row.max_num) + 1 : 1;
}

/**
 * Create a new ticket record
 */
function createTicket({ channelId, guildId, creatorId, creatorTag }) {
  const ticketNumber = getNextTicketNumber(guildId);
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO tickets (channel_id, guild_id, creator_id, creator_tag, status, created_at, ticket_number)
    VALUES (?, ?, ?, ?, 'open', ?, ?)
  `);

  stmt.run(channelId, guildId, creatorId, creatorTag || '', now, ticketNumber);

  return {
    channelId,
    guildId,
    creatorId,
    creatorTag,
    claimedBy: null,
    status: 'open',
    createdAt: now,
    closedAt: null,
    closedBy: null,
    ticketNumber
  };
}

/**
 * Retrieve ticket info by channel ID
 */
function getTicketByChannel(channelId) {
  const row = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  if (!row) return null;

  return {
    channelId: row.channel_id,
    guildId: row.guild_id,
    creatorId: row.creator_id,
    creatorTag: row.creator_tag,
    claimedBy: row.claimed_by,
    status: row.status,
    createdAt: Number(row.created_at),
    closedAt: row.closed_at ? Number(row.closed_at) : null,
    closedBy: row.closed_by,
    ticketNumber: row.ticket_number ? Number(row.ticket_number) : null
  };
}

/**
 * Find active (open or claimed) ticket for a given creator in a guild
 */
function getActiveTicketByCreator(creatorId, guildId) {
  const row = db.prepare(`
    SELECT * FROM tickets 
    WHERE creator_id = ? AND guild_id = ? AND status IN ('open', 'claimed')
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(creatorId, guildId);

  if (!row) return null;

  return {
    channelId: row.channel_id,
    guildId: row.guild_id,
    creatorId: row.creator_id,
    creatorTag: row.creator_tag,
    claimedBy: row.claimed_by,
    status: row.status,
    createdAt: Number(row.created_at),
    closedAt: row.closed_at ? Number(row.closed_at) : null,
    closedBy: row.closed_by,
    ticketNumber: row.ticket_number ? Number(row.ticket_number) : null
  };
}

/**
 * Claim a ticket
 */
function claimTicket(channelId, staffId) {
  const stmt = db.prepare(`
    UPDATE tickets 
    SET claimed_by = ?, status = 'claimed'
    WHERE channel_id = ?
  `);
  return stmt.run(staffId, channelId);
}

/**
 * Unclaim a ticket
 */
function unclaimTicket(channelId) {
  const stmt = db.prepare(`
    UPDATE tickets 
    SET claimed_by = NULL, status = 'open'
    WHERE channel_id = ?
  `);
  return stmt.run(channelId);
}

/**
 * Close a ticket
 */
function closeTicket(channelId, closedById) {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE tickets 
    SET status = 'closed', closed_at = ?, closed_by = ?
    WHERE channel_id = ?
  `);
  return stmt.run(now, closedById, channelId);
}

/**
 * Reopen a ticket
 */
function reopenTicket(channelId) {
  const stmt = db.prepare(`
    UPDATE tickets 
    SET status = 'open', closed_at = NULL, closed_by = NULL
    WHERE channel_id = ?
  `);
  return stmt.run(channelId);
}

/**
 * Mark a ticket as deleted
 */
function deleteTicket(channelId) {
  const stmt = db.prepare(`
    UPDATE tickets 
    SET status = 'deleted'
    WHERE channel_id = ?
  `);
  return stmt.run(channelId);
}

/**
 * Get active tickets count and statistics
 */
function getTicketStats(guildId) {
  const openCount = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status IN ('open', 'claimed')").get(guildId);
  const totalCount = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?").get(guildId);
  return {
    active: openCount ? Number(openCount.count) : 0,
    total: totalCount ? Number(totalCount.count) : 0
  };
}

module.exports = {
  db,
  createTicket,
  getTicketByChannel,
  getActiveTicketByCreator,
  claimTicket,
  unclaimTicket,
  closeTicket,
  reopenTicket,
  deleteTicket,
  getTicketStats
};
