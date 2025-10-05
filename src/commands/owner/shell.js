import { exec } from 'child_process';
import util from 'util';
import config from '../../config.js';

const execPromise = util.promisify(exec);

export default {
    name: 'shell',
    aliases: ['sh', 'bash', 'terminal'],
    category: 'owner',
    description: 'Execute shell commands directly in the terminal',
    usage: 'shell <command>',
    example: 'shell ls -la\nshell whoami\nshell df -h',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const command = args.join(' ');
        
        const dangerousCommands = [
            'rm -rf /', 'rm -rf *', 'rm -rf ~',
            'mkfs', 'dd if=/dev/zero', ':(){:|:&};:',
            'fork', '>()', 'shutdown', 'reboot',
            'init 0', 'init 6', 'halt', 'poweroff'
        ];
        
        const isDangerous = dangerousCommands.some(cmd => 
            command.toLowerCase().includes(cmd.toLowerCase())
        );
        
        if (isDangerous) {
            return sock.sendMessage(from, {
                text: `⛔ *Dangerous Command Blocked*

*Command:* \`${command}\`

*Reason:* This command could harm the system

_Dangerous commands are blocked for safety. Use with caution._`
            }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `⚙️ *Executing Shell Command*

\`\`\`bash
$ ${command}
\`\`\`

⏳ _Processing..._`
        }, { quoted: message });

        try {
            const { stdout, stderr } = await execPromise(command, {
                timeout: 60000,
                maxBuffer: 1024 * 1024 * 10,
                cwd: process.cwd(),
                shell: '/bin/bash'
            });

            const output = stdout || stderr || 'Command executed (no output)';
            const truncated = output.length > 3500 
                ? output.substring(0, 3500) + '\n\n...[Output truncated. Use cmd get to save large outputs]' 
                : output;

            await sock.sendMessage(from, {
                text: `✅ *Shell Command Executed*

*Command:*
\`\`\`bash
$ ${command}
\`\`\`

*Output:*
\`\`\`
${truncated}
\`\`\`

*Status:* Success ✅
*Time:* ${new Date().toLocaleTimeString()}`
            }, { quoted: message });

        } catch (error) {
            const errorOutput = error.stdout || error.stderr || error.message;
            const truncated = errorOutput.length > 3000 
                ? errorOutput.substring(0, 3000) + '\n\n...[Error truncated]' 
                : errorOutput;

            await sock.sendMessage(from, {
                text: `❌ *Shell Command Failed*

*Command:*
\`\`\`bash
$ ${command}
\`\`\`

*Error:*
\`\`\`
${truncated}
\`\`\`

*Exit Code:* ${error.code || 'Unknown'}
*Status:* Failed ❌`
            }, { quoted: message });
        }
    }
};
