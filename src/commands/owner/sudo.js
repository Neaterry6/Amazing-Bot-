import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import config from '../../config.js';

const execPromise = util.promisify(exec);

export default {
    name: 'sudo',
    aliases: ['root', 'admin'],
    category: 'owner',
    description: 'Execute privileged shell commands with elevated permissions',
    usage: 'sudo <command>',
    example: 'sudo npm install -g pm2\nsudo systemctl status\nsudo cat /etc/hosts',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const command = args.join(' ');
        
        const highRiskCommands = [
            'rm -rf /', 'rm -rf *', 'rm -rf ~', 'rm -rf .',
            'mkfs', 'dd if=/dev/zero', 'dd if=/dev/random',
            ':(){:|:&};:', 'fork bomb', '>()',
            'shutdown', 'reboot', 'init 0', 'init 6',
            'halt', 'poweroff', 'systemctl poweroff',
            'systemctl reboot', 'passwd', 'userdel',
            'deluser', 'killall -9', 'kill -9 1'
        ];
        
        const isHighRisk = highRiskCommands.some(cmd => 
            command.toLowerCase().includes(cmd.toLowerCase())
        );
        
        if (isHighRisk) {
            return sock.sendMessage(from, {
                text: `🚫 *HIGH RISK COMMAND BLOCKED*

*Command:* \`sudo ${command}\`

*Risk Level:* CRITICAL ⚠️

*Reason:* This command could cause system damage, data loss, or service interruption.

*Actions Blocked:*
• System destruction
• Service shutdown
• User account manipulation
• Fork bombs
• Disk operations

_For safety, high-risk commands are permanently blocked. Use alternative safe methods._`
            }, { quoted: message });
        }

        const moderateRiskCommands = [
            'apt remove', 'apt purge', 'apt autoremove',
            'yum remove', 'pacman -R', 'npm uninstall -g',
            'systemctl stop', 'systemctl disable',
            'chmod 000', 'chown root', 'iptables -F'
        ];
        
        const isModerateRisk = moderateRiskCommands.some(cmd => 
            command.toLowerCase().includes(cmd.toLowerCase())
        );

        if (isModerateRisk) {
            await sock.sendMessage(from, {
                text: `⚠️ *MODERATE RISK COMMAND DETECTED*

*Command:* \`sudo ${command}\`

*Risk Level:* MODERATE ⚠️

*Warning:* This command may modify system configuration or remove packages.

_Proceeding with execution... Monitor output carefully._`
            }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `🔐 *Executing Privileged Command*

\`\`\`bash
# ${command}
\`\`\`

*User:* ${os.userInfo().username}
*Host:* ${os.hostname()}
*Platform:* ${process.platform}

⏳ _Executing with elevated permissions..._`
        }, { quoted: message });

        try {
            const sudoCommand = process.platform === 'win32' 
                ? command 
                : command;

            const { stdout, stderr } = await execPromise(sudoCommand, {
                timeout: 120000,
                maxBuffer: 1024 * 1024 * 10,
                cwd: process.cwd(),
                shell: '/bin/bash',
                env: {
                    ...process.env,
                    SUDO_USER: os.userInfo().username,
                    SUDO_COMMAND: command
                }
            });

            const output = stdout || stderr || 'Command executed successfully (no output)';
            const truncated = output.length > 3500 
                ? output.substring(0, 3500) + '\n\n...[Output truncated. Total length: ' + output.length + ' chars]' 
                : output;

            const statusEmoji = stderr && !stdout ? '⚠️' : '✅';
            const statusText = stderr && !stdout ? 'Completed with warnings' : 'Success';

            await sock.sendMessage(from, {
                text: `${statusEmoji} *Privileged Command Executed*

*Command:*
\`\`\`bash
# ${command}
\`\`\`

*Output:*
\`\`\`
${truncated}
\`\`\`

*Status:* ${statusText}
*User:* ${os.userInfo().username}
*Time:* ${new Date().toLocaleString()}
*Platform:* ${process.platform} (${process.arch})`
            }, { quoted: message });

        } catch (error) {
            const errorOutput = error.stdout || error.stderr || error.message;
            const truncated = errorOutput.length > 3000 
                ? errorOutput.substring(0, 3000) + '\n\n...[Error truncated]' 
                : errorOutput;

            await sock.sendMessage(from, {
                text: `❌ *Privileged Command Failed*

*Command:*
\`\`\`bash
# ${command}
\`\`\`

*Error:*
\`\`\`
${truncated}
\`\`\`

*Exit Code:* ${error.code || 'Unknown'}
*Signal:* ${error.signal || 'None'}
*Status:* Failed ❌

*Possible Reasons:*
• Insufficient permissions
• Command not found
• Invalid syntax
• Service not available

_Try running without sudo or check command syntax._`
            }, { quoted: message });
        }
    }
};
