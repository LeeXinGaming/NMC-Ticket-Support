require('dotenv').config();

/**
 * Validates and exposes application configuration from environment variables.
 */
const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '1552438033176072352',
  ticketCategoryId: process.env.TICKET_CATEGORY_ID || '1549490376195309661',
  supportRoleId: process.env.SUPPORT_ROLE_ID || '',
  logChannelId: process.env.LOG_CHANNEL_ID || '',

  colors: {
    primary: 0x5865F2,   // Discord Blurple
    success: 0x57F287,   // Discord Green
    warning: 0xFEE75C,   // Discord Yellow
    danger: 0xED4245,    // Discord Red
    dark: 0x2B2D31,      // Discord Dark Embed
    info: 0x3BA55D       // Teal/Info
  }
};

/**
 * Validate presence of required environment variables for deployment/running.
 * @param {boolean} exitOnError - Whether to exit process if validation fails.
 */
function validateConfig(exitOnError = false) {
  const missing = [];
  if (!config.token || config.token === 'your_bot_token_here') missing.push('DISCORD_TOKEN');
  if (!config.clientId || config.clientId === 'your_client_id_here') missing.push('CLIENT_ID');
  if (!config.guildId) missing.push('GUILD_ID');
  if (!config.ticketCategoryId) missing.push('TICKET_CATEGORY_ID');

  if (missing.length > 0) {
    const msg = `[CONFIG WARNING] Missing or unconfigured environment variables: ${missing.join(', ')}. Check your .env file.`;
    if (exitOnError) {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(msg);
    }
    return false;
  }
  return true;
}

module.exports = {
  config,
  validateConfig
};
