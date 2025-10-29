const fs = require('fs');
const path = require('path');

// Configuration File
const config = {
    // Bot Settings
    BOT_NAME: process.env.BOT_NAME || "DarkX Official",
    OWNER_NAME: process.env.OWNER_NAME || "MrX Developer",
    PREFIX: process.env.PREFIX || ".",
    
    // API Keys (Add your APIs here)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "your-openai-key",
    
    // Bot Features
    AUTO_READ_MESSAGES: true,
    AUTO_RECONNECT: true,
    ANTI_CRASH: true,
    
    // Database
    USE_DATABASE: false,
    
    // Other Settings
    SESSION_PATH: "./session",
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
};

// Create session directory if not exists
if (!fs.existsSync(config.SESSION_PATH)) {
    fs.mkdirSync(config.SESSION_PATH, { recursive: true });
}

module.exports = config;
