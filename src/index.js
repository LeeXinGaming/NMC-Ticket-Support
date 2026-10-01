const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes
} = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config');
const database = require('./database');
const Logger = require('./utils/logger');

// Validate environment configuration
validateConfig(false);

// Initialize Discord Client with standard Gateway Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// Collections for commands and interactive button handlers
client.commands = new Collection();
client.buttons = new Collection();

// 1. Load Slash Commands
const commandsArray = [];
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commandsArray.push(command.data.toJSON());
      Logger.debug(`Loaded command: ${command.data.name}`);
    } else {
      Logger.warn(`The command at ${filePath} is missing "data" or "execute".`);
    }
  }
}

// 2. Load Button Handlers
const buttonsPath = path.join(__dirname, 'buttons');
if (fs.existsSync(buttonsPath)) {
  const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
  for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);
    if ('customId' in button && 'execute' in button) {
      client.buttons.set(button.customId, button);
      Logger.debug(`Loaded button handler: ${button.customId}`);
    } else {
      Logger.warn(`The button handler at ${filePath} is missing "customId" or "execute".`);
    }
  }
}

// 3. Load Event Handlers
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    Logger.debug(`Loaded event: ${event.name}`);
  }
}

// Automatic Slash Command Sync on startup
async function syncSlashCommands() {
  if (!config.token || !config.clientId || !config.guildId) return;
  try {
    const rest = new REST({ version: '10' }).setToken(config.token);
    Logger.info(`Auto-syncing ${commandsArray.length} slash commands to Guild ${config.guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commandsArray }
    );
    Logger.info(`✅ Slash commands successfully synced on startup!`);
  } catch (err) {
    Logger.warn('Auto command sync warning (commands might already be registered):', err.message);
  }
}

// Render / Cloud Hosting HTTP Health Check Server
// Render assigns a PORT environment variable and requires an HTTP port to bind to for Web Services.
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: client.user ? client.user.tag : 'Connecting...',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, () => {
  Logger.info(`Render health-check web server is listening on port ${port}`);
});

// Global Process Error Handlers (Prevents Bot from Crashing)
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception thrown:', error);
});

// Graceful Shutdown
function gracefulShutdown(signal) {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    if (database.db && typeof database.db.close === 'function') {
      database.db.close();
      Logger.info('Database connection closed.');
    }
  } catch (err) {
    Logger.error('Error closing database:', err);
  }

  if (server) {
    server.close();
  }

  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Login Bot & Sync Commands
if (!config.token || config.token === 'your_bot_token_here') {
  Logger.warn('DISCORD_TOKEN is not set or using default placeholder. Please add your token in .env');
} else {
  client.login(config.token).then(() => {
    syncSlashCommands().catch(() => {});
  }).catch(err => {
    Logger.error('Failed to log in to Discord:', err);
  });
}

module.exports = client;
