const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
    name: 'exec',
    aliases: ['execute', 'shell', '$'],
    category: 'owner',
    description: 'Execute system commands (EXTREMELY DANGEROUS - Owner Only)',
    usage: 'exec <command>',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const command = args.join(' ');
            
            // Blacklist dangerous commands
            const dangerousCommands = [
                'rm -rf', 'rm -r', 'format', 'del /s', 'shutdown', 'reboot',
                'sudo rm', 'dd if=', 'mkfs', 'fdisk', 'parted', ':(){:|:&};:',
                'chmod 000', 'chown root', 'passwd', '>/dev/null', 'kill -9'
            ];
            
            const isDangerous = dangerousCommands.some(dangerous => 
                command.toLowerCase().includes(dangerous.toLowerCase())
            );
            
            if (isDangerous) {
                return sock.sendMessage(from, {
                    text: `🚨 *BLOCKED: DANGEROUS COMMAND DETECTED*\n\n⛔ **Command:** \`${command}\`\n\n🔒 **Security Notice:**\nThis command has been blocked as it could:\n• Delete system files\n• Damage the operating system  \n• Compromise security\n• Cause system instability\n\n✅ **Alternative:** Use safer system administration tools`
                });
            }
            
            await sock.sendMessage(from, {
                text: `🖥️ *Executing System Command*\n\n⚠️ **DANGER:** Running shell command\n📝 **Command:** \`${command}\`\n🔒 **User:** Owner (${sender.split('@')[0]})\n\n⏳ Executing...`
            });
            
            try {
                const startTime = Date.now();
                
                // Execute command with timeout
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 30000, // 30 second timeout
                    maxBuffer: 1024 * 1024 // 1MB buffer limit
                });
                
                const executionTime = Date.now() - startTime;
                
                let output = '';
                if (stdout) output += `📤 **STDOUT:**\n\`\`\`\n${stdout}\n\`\`\`\n\n`;
                if (stderr) output += `⚠️ **STDERR:**\n\`\`\`\n${stderr}\n\`\`\`\n\n`;
                if (!stdout && !stderr) output = '📭 *No output returned*\n\n';
                
                // Truncate if too long
                if (output.length > 3000) {
                    output = output.substring(0, 3000) + '...[truncated]';
                }
                
                const response = `✅ *Command Execution Complete*\n\n📝 **Command:**\n\`${command}\`\n\n${output}⏱️ **Execution Time:** ${executionTime}ms\n🔒 **Security Level:** MAXIMUM RISK\n\n✅ *Executed successfully*`;
                
                await sock.sendMessage(from, { text: response });
                
            } catch (execError) {
                const response = `❌ *Command Execution Failed*\n\n📝 **Command:**\n\`${command}\`\n\n🚨 **Error:**\n\`\`\`\n${execError.message}\n\`\`\`\n\n**Error Details:**\n• Exit Code: ${execError.code || 'Unknown'}\n• Signal: ${execError.signal || 'None'}\n• Timeout: ${execError.killed ? 'Yes (30s limit)' : 'No'}\n\n⚠️ *Command failed to execute properly*`;
                
                await sock.sendMessage(from, { text: response });
            }
            
        } catch (error) {
            console.error('Exec command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Critical Exec Error*\n\n**System Error:** ${error.message}\n\n🚨 **SECURITY ALERT:** Command execution system failure\n⚠️ **This could indicate a serious system issue**\n\n**Immediate actions needed:**\n• Check system integrity\n• Review security logs\n• Monitor system performance\n• Consider emergency restart if necessary\n\n🔒 **System security may be compromised**`
            });
        }
    }
};