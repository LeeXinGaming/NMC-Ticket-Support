const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config');
const Logger = require('./utils/logger');

// Validate environment variables before attempting deployment
if (!validateConfig(false)) {
  Logger.error('Missing configuration in .env. Please configure DISCORD_TOKEN, CLIENT_ID, and GUILD_ID before deploying commands.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    Logger.info(`Loaded command definition: /${command.data.name}`);
  } else {
    Logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    Logger.info(`Started refreshing ${commands.length} application (/) commands for Guild: ${config.guildId}...`);

    // Register guild-specific commands for instant update
    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    Logger.info(`✅ Successfully reloaded ${data.length} application (/) commands for Guild: ${config.guildId}!`);
  } catch (error) {
    Logger.error('Failed to deploy slash commands:', error);
    process.exit(1);
  }
})();
