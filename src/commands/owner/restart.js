export default {
    name: 'restart',
    aliases: ['reboot', 'reload'],
    category: 'owner',
    description: 'Restart the bot process (Owner Only)',
    usage: 'restart [reason]',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const reason = args.join(' ') || 'Manual restart by owner';
            const uptime = process.uptime();
            
            // Calculate uptime
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const uptimeString = `${days}d ${hours}h ${minutes}m`;
            
            await sock.sendMessage(from, {
                text: `🔄 *Bot Restart Initiated*\n\n👤 **Initiated by:** Owner (${sender.split('@')[0]})\n📝 **Reason:** ${reason}\n⏰ **Current uptime:** ${uptimeString}\n🔄 **Status:** Preparing restart...\n\n⚠️ **Warning:** Bot will be offline temporarily\n⏳ **Expected downtime:** 10-30 seconds\n\n🤖 *Restarting bot process now...*`
            });
            
            // Log restart event
            console.log(`[RESTART] Bot restart initiated by ${sender} - Reason: ${reason}`);
            
            // Give time for message to send
            setTimeout(() => {
                console.log('[RESTART] Restarting bot process...');
                
                // Attempt graceful restart
                if (process.env.PM2_HOME) {
                    // If using PM2
                    require('child_process').exec('pm2 restart 0', (error) => {
                        if (error) {
                            console.error('[RESTART] PM2 restart failed:', error);
                            process.exit(1);
                        }
                    });
                } else {
                    // Standard Node.js restart
                    process.exit(0);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Restart command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Restart Failed*\n\n**Error:** ${error.message}\n\n**Possible causes:**\n• Process manager not available\n• Insufficient permissions\n• System resource constraints\n• Critical system error\n\n**Manual alternatives:**\n• Use system process manager\n• Restart hosting service\n• Check system logs\n• Contact system administrator\n\n⚠️ *Bot may need manual intervention*`
            });
        }
    }
};