const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs-extra');
const path = require('path');
const qrcode = require('qrcode-terminal');
const chalk = require('chalk');
const config = require('./settings.js');

class DarkXBot {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.startTime = new Date();
        this.init();
    }

    async init() {
        try {
            await this.showBanner();
            await this.connectToWhatsApp();
        } catch (error) {
            console.error(chalk.red('Initialization error:'), error);
            this.handleCrash(error);
        }
    }

    showBanner() {
        console.clear();
        const banner = `
${chalk.hex('#FF0000').bold('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')}
${chalk.hex('#FF0000').bold('┃')}    ${chalk.hex('#00FF00').bold('DARKX OFFICIAL - By MrX Developer')}    ${chalk.hex('#FF0000').bold('┃')}
${chalk.hex('#FF0000').bold('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')}
${chalk.cyan('🤖 Bot Name:')} ${chalk.white(config.BOT_NAME)}
${chalk.cyan('👤 Owner:')} ${chalk.white(config.OWNER_NAME)}
${chalk.cyan('⚡ Prefix:')} ${chalk.white(config.PREFIX)}
${chalk.cyan('🔧 Version:')} ${chalk.white('3.0.0 (Multi-Device)')}
${chalk.cyan('📱 Platform:')} ${chalk.white('WhatsApp Web')}
${chalk.yellow('🚀 Starting bot...')}
        `;
        console.log(banner);
    }

    async connectToWhatsApp() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_PATH);
            const { version } = await fetchLatestBaileysVersion();
            
            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
                },
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: true,
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
            this.sock.ev.on('messages.upsert', this.handleMessages.bind(this));

        } catch (error) {
            console.error(chalk.red('Connection error:'), error);
            this.handleCrash(error);
        }
    }

    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(chalk.yellow('📱 Scan this QR code with WhatsApp:'));
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            this.isConnected = true;
            console.log(chalk.green('✅ Connected to WhatsApp successfully!'));
            await this.sendOwnerMessage('🤖 *DarkX Official* is now online!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.yellow('Connection closed, reconnecting...'));
            
            if (shouldReconnect && config.AUTO_RECONNECT) {
                setTimeout(() => this.connectToWhatsApp(), 5000);
            }
        }
    }

    async handleMessages({ messages }) {
        if (!messages[0] || !this.isConnected) return;
        
        const message = messages[0];
        const messageType = Object.keys(message.message || {})[0];
        
        if (config.AUTO_READ_MESSAGES) {
            await this.sock.readMessages([message.key]);
        }

        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            const text = messageType === 'conversation' 
                ? message.message.conversation 
                : message.message.extendedTextMessage.text;
            
            const from = message.key.remoteJid;
            const sender = message.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            const isOwner = sender.includes('923184474176'); // Replace with owner number
            
            if (text.startsWith(config.PREFIX)) {
                await this.handleCommand(text, from, sender, isGroup, isOwner);
            }
        }
    }

    async handleCommand(text, from, sender, isGroup, isOwner) {
        const command = text.slice(config.PREFIX.length).trim().split(' ')[0].toLowerCase();
        const args = text.slice(config.PREFIX.length + command.length).trim();
        
        console.log(chalk.blue(`📨 Command: ${command} from ${sender}`));

        try {
            switch(command) {
                case 'menu':
                    await this.sendMenu(from);
                    break;
                case 'ping':
                    await this.sendPing(from);
                    break;
                case 'ai':
                    await this.handleAI(from, args);
                    break;
                case 'owner':
                    await this.sendOwnerInfo(from);
                    break;
                default:
                    await this.sock.sendMessage(from, { 
                        text: `❌ Unknown command: ${command}\nType ${config.PREFIX}menu to see all commands.` 
                    });
            }
        } catch (error) {
            console.error(chalk.red('Command error:'), error);
            await this.sock.sendMessage(from, { 
                text: '❌ An error occurred while processing your command.' 
            });
        }
    }

    async sendMenu(from) {
        const menu = `
🤖 *${config.BOT_NAME} - Command Menu*

🔹 *Core Commands:*
• ${config.PREFIX}menu - Show this menu
• ${config.PREFIX}ping - Check bot speed
• ${config.PREFIX}owner - Contact owner

🔹 *AI Commands:*
• ${config.PREFIX}ai [question] - Chat with AI

🔹 *Info:*
• Owner: ${config.OWNER_NAME}
• Prefix: ${config.PREFIX}
• Status: ✅ Online

_Powered by Baileys MD_
        `.trim();
        
        await this.sock.sendMessage(from, { text: menu });
    }

    async sendPing(from) {
        const start = Date.now();
        const message = await this.sock.sendMessage(from, { text: '🏓 Pinging...' });
        const latency = Date.now() - start;
        
        await this.sock.sendMessage(from, { 
            text: `🏓 *Pong!*\n⏱️ Latency: ${latency}ms\n🕐 Uptime: ${this.getUptime()}`,
            edit: message.key 
        });
    }

    async handleAI(from, question) {
        if (!question) {
            await this.sock.sendMessage(from, { 
                text: `❌ Please provide a question.\nExample: ${config.PREFIX}ai What is WhatsApp?` 
            });
            return;
        }

        // Simple AI response (you can integrate OpenAI API here)
        const responses = [
            "I'm DarkX AI, how can I help you?",
            "That's an interesting question!",
            "I'm still learning, but I'll try my best to answer.",
            "As an AI assistant, I recommend researching this topic further.",
            "Let me think about that...",
            "Based on my knowledge, here's what I can tell you..."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        await this.sock.sendMessage(from, { 
            text: `🤖 *AI Response*\n\n*Question:* ${question}\n\n*Answer:* ${randomResponse}\n\n_Powered by DarkX Official_`
        });
    }

    async sendOwnerInfo(from) {
        const ownerInfo = `
👤 *Owner Information*

• *Name:* ${config.OWNER_NAME}
• *Bot:* ${config.BOT_NAME}
• *Status:* Available for queries

📧 *Contact:* 
You can message me directly for any issues or collaborations.

_Powered by DarkX Official_
        `.trim();
        
        await this.sock.sendMessage(from, { text: ownerInfo });
    }

    async sendOwnerMessage(text) {
        const ownerJid = '923184474176@s.whatsapp.net'; // Replace with owner's JID
        try {
            await this.sock.sendMessage(ownerJid, { text });
        } catch (error) {
            console.log(chalk.yellow('Owner message not sent (may not be saved in contacts)'));
        }
    }

    getUptime() {
        const uptime = Date.now() - this.startTime;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    handleCrash(error) {
        console.error(chalk.red('🚨 Crash detected:'), error);
        
        if (config.ANTI_CRASH) {
            console.log(chalk.yellow('🔄 Auto-restarting in 5 seconds...'));
            setTimeout(() => {
                process.exit(1);
            }, 5000);
        } else {
            process.exit(1);
        }
    }
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
});

// Start the bot
new DarkXBot();
