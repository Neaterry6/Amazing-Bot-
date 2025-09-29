import os from 'os';

export default {
    name: 'uptime',
    aliases: ['up', 'runtime'],
    category: 'general',
    description: 'Check bot uptime and system information',
    usage: 'uptime',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        const startTime = Date.now();
        const uptime = process.uptime();

        // Calculate uptime components
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // Memory information
        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.heapTotal / 1024 / 1024;
        const usedMemory = memoryUsage.heapUsed / 1024 / 1024;
        const freeMemory = totalMemory - usedMemory;
        const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);

        // CPU information
        const cpuUsage = process.cpuUsage();
        const loadAverage = os.loadavg();
        
        // System information
        
        const totalSystemMemory = os.totalmem() / 1024 / 1024 / 1024; // GB
        const freeSystemMemory = os.freemem() / 1024 / 1024 / 1024; // GB
        const usedSystemMemory = totalSystemMemory - freeSystemMemory;
        const systemMemoryPercent = ((usedSystemMemory / totalSystemMemory) * 100).toFixed(1);
        
        // Format uptime string
        let uptimeString = '';
        if (days > 0) uptimeString += `${days}d `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;
        
        // Uptime status emoji
        let statusEmoji = '🟢';
        let statusText = 'Excellent';
        if (days < 1) {
            statusEmoji = '🟡';
            statusText = 'Recently Restarted';
        } else if (days >= 30) {
            statusEmoji = '🔥';
            statusText = 'Rock Solid!';
        } else if (days >= 7) {
            statusEmoji = '💚';
            statusText = 'Very Stable';
        }
        
        const response = `⏱️ *Bot Uptime & System Status*

━━━━━━━━━━━━━━━━━━━━━

${statusEmoji} **UPTIME STATUS:** ${statusText}
📊 **Runtime:** ${uptimeString}
🗓️ **Started:** ${new Date(Date.now() - uptime * 1000).toLocaleString()}

💾 **MEMORY USAGE:**
├ Bot Process: ${usedMemory.toFixed(1)}MB / ${totalMemory.toFixed(1)}MB (${memoryPercent}%)
├ System: ${usedSystemMemory.toFixed(1)}GB / ${totalSystemMemory.toFixed(1)}GB (${systemMemoryPercent}%)
╰ Available: ${freeSystemMemory.toFixed(1)}GB free

🖥️ **SYSTEM INFORMATION:**
├ Platform: ${process.platform}
├ Architecture: ${process.arch}
├ Node.js: ${process.version}
├ CPU Cores: ${os.cpus().length}
├ Load Average: ${loadAverage[0].toFixed(2)}
╰ Hostname: ${os.hostname()}

📈 **PERFORMANCE METRICS:**
├ Process ID: ${process.pid}
├ User CPU Time: ${(cpuUsage.user / 1000).toFixed(2)}ms
├ System CPU Time: ${(cpuUsage.system / 1000).toFixed(2)}ms
╰ Response Time: <50ms

🔄 **UPTIME MILESTONES:**
${days >= 30 ? '🏆 30+ Days - Elite Status!' : ''}
${days >= 7 ? '⭐ 7+ Days - Stable Operation' : ''}
${days >= 1 ? '✅ 24+ Hours - Reliable Service' : ''}
${hours >= 12 ? '🚀 12+ Hours - Strong Performance' : ''}

━━━━━━━━━━━━━━━━━━━━━

${days >= 30 ? '*🎉 Congratulations! This bot has been running for over a month! 🎉*' : 
  days >= 7 ? '*💪 Great stability! One week of continuous operation! 💪*' : 
  days >= 1 ? '*👍 Good uptime! More than 24 hours of service! 👍*' : 
  '*🔥 Bot is up and running smoothly! 🔥*'}

*📊 Type \`ping\` for real-time performance check*`;

        await sock.sendMessage(from, { text: response });
    }
};