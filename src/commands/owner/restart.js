import { exec } from 'child_process';

export default {
    name: 'restart',
    aliases: ['reboot', 'reload'],
    category: 'owner',
    description: 'Restart the bot process',
    usage: 'restart [reason]',
    example: 'restart\nrestart updating features',
    cooldown: 0,
    permissions: ['owner'],
    args: false,
    minArgs: 0,
    maxArgs: 50,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const reason = args.join(' ') || 'Manual restart by owner';
            const uptime = process.uptime();
            const userId = sender.split('@')[0];
            
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 🔄 RESTARTING 】
│ 👤 𝗜𝗻𝗶𝘁𝗶𝗮𝘁𝗲𝗱 𝗯𝘆: @${userId}
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeString}
│ 🔄 𝗦𝘁𝗮𝘁𝘂𝘀: Preparing restart...
╰────────⦿

╭──⦿【 ⚠️ WARNING 】
│ ⏳ 𝗗𝗼𝘄𝗻𝘁𝗶𝗺𝗲: 10-30 seconds
│ 🤖 𝗕𝗼𝘁: Temporarily offline
╰────────⦿

╭──⦿【 ⚡ STATUS 】
│ 🔄 Restarting bot process...
╰────────⦿

╭─────────────⦿
│💫 | [ Ilom Bot 🍀 ]
╰────────────⦿`,
                mentions: [sender]
            }, { quoted: message });
            
            console.log(`[RESTART] Bot restart initiated by ${sender} - Reason: ${reason}`);
            
            setTimeout(() => {
                console.log('[RESTART] Restarting bot process...');
                
                if (process.env.PM2_HOME || process.env.pm_id) {
                    exec('pm2 restart 0', (error, stdout, stderr) => {
                        if (error) {
                            console.error('[RESTART] PM2 restart failed:', error);
                            exec('pm2 restart all', (err2) => {
                                if (err2) {
                                    console.error('[RESTART] PM2 restart all failed:', err2);
                                    process.exit(1);
                                }
                            });
                        } else {
                            console.log('[RESTART] PM2 restart successful:', stdout);
                        }
                    });
                } else {
                    process.exit(0);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Restart command error:', error);
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Restart failed
│
│ ⚠️ 𝗗𝗲𝘁𝗮𝗶𝗹𝘀: ${error.message}
╰────────⦿

╭──⦿【 🔍 POSSIBLE CAUSES 】
│ • Process manager unavailable
│ • Insufficient permissions
│ • System resource constraints
│ • Critical system error
╰────────⦿

╭──⦿【 💡 ALTERNATIVES 】
│ • Use system process manager
│ • Restart hosting service
│ • Check system logs
│ • Contact administrator
╰────────⦿`
            }, { quoted: message });
        }
    }
};