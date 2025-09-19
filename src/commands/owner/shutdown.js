export default {
    name: 'shutdown',
    aliases: ['stop', 'exit', 'kill'],
    category: 'owner',
    description: 'Shutdown the bot gracefully (Owner Only)',
    usage: 'shutdown [reason]',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const reason = args.join(' ') || 'Manual shutdown by owner';
            const uptime = process.uptime();
            
            // Calculate uptime
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const uptimeString = `${days}d ${hours}h ${minutes}m`;
            
            // Get memory usage
            const memoryUsage = process.memoryUsage();
            const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            
            await sock.sendMessage(from, {
                text: `🛑 *Bot Shutdown Initiated*\n\n👤 **Initiated by:** Owner (${sender.split('@')[0]})\n📝 **Reason:** ${reason}\n⏰ **Final uptime:** ${uptimeString}\n💾 **Memory usage:** ${memoryMB} MB\n📊 **Status:** Preparing graceful shutdown...\n\n⚠️ **Notice:** Bot will go offline permanently\n🔄 **Restart required:** Manual intervention needed\n\n⏳ *Shutting down in 5 seconds...*`
            });
            
            // Log shutdown event
            console.log(`[SHUTDOWN] Bot shutdown initiated by ${sender} - Reason: ${reason}`);
            console.log(`[SHUTDOWN] Final uptime: ${uptimeString}`);
            console.log(`[SHUTDOWN] Memory usage: ${memoryMB} MB`);
            
            // Send final goodbye message
            setTimeout(async () => {
                try {
                    await sock.sendMessage(from, {
                        text: `👋 *Goodbye!*\n\n🤖 WhatsApp Bot is now shutting down...\n⏰ Final uptime: ${uptimeString}\n📊 Commands processed: Unknown\n🎯 Status: Offline\n\n*Thank you for using WhatsApp Bot!*\n*Manual restart required to come back online*\n\n💤 *Shutting down gracefully...*`
                    });
                } catch (msgError) {
                    console.error('[SHUTDOWN] Failed to send goodbye message:', msgError);
                }
                
                // Graceful shutdown sequence
                setTimeout(() => {
                    console.log('[SHUTDOWN] Performing graceful shutdown...');
                    
                    // Close database connections if any
                    // await mongoose.disconnect();
                    
                    // Close other resources
                    // sock.end(); // Close WhatsApp connection
                    
                    console.log('[SHUTDOWN] Graceful shutdown complete.');
                    process.exit(0);
                }, 2000);
            }, 3000);
            
        } catch (error) {
            console.error('Shutdown command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Shutdown Failed*\n\n**Error:** ${error.message}\n\n**Critical Issue:** Unable to perform graceful shutdown\n\n**Emergency actions:**\n• Force kill process if needed\n• Check system resources\n• Review error logs\n• Contact system administrator\n\n⚠️ *System may require force termination*\n🔴 *Bot may remain in unstable state*`
            });
            
            // Emergency shutdown if normal shutdown fails
            setTimeout(() => {
                console.error('[SHUTDOWN] Emergency shutdown due to error');
                process.exit(1);
            }, 5000);
        }
    }
};