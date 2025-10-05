import { exec } from 'child_process';
import util from 'util';
import fs from 'fs-extra';
import path from 'path';
import config from '../../config.js';

const execPromise = util.promisify(exec);

export default {
    name: 'cmd',
    aliases: ['exec', 'shell', '$', 'terminal'],
    category: 'owner',
    description: 'Execute shell commands, install packages, or get files from the system',
    usage: 'cmd <command|install|get> [args]',
    example: 'cmd ls -la\ncmd install axios\ncmd get package.json',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const action = args[0].toLowerCase();
        
        if (action === 'install') {
            const packageName = args.slice(1).join(' ');
            if (!packageName) {
                return sock.sendMessage(from, {
                    text: `❌ *Package name required*\n\n*Usage:*\n${config.prefix}cmd install <package-name>\n\n*Examples:*\n${config.prefix}cmd install axios\n${config.prefix}cmd install sharp canvas`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `📦 *Installing Package(s)*\n\n*Package:* ${packageName}\n⏳ _Please wait..._`
            }, { quoted: message });

            try {
                const { stdout, stderr } = await execPromise(`npm install ${packageName}`, {
                    timeout: 120000,
                    maxBuffer: 1024 * 1024 * 10
                });

                const output = stdout || stderr || 'Package installed successfully';
                const truncated = output.length > 3000 ? output.substring(0, 3000) + '\n\n...[Output truncated]' : output;

                await sock.sendMessage(from, {
                    text: `✅ *Package Installed Successfully*\n\n*Package:* ${packageName}\n\n*Output:*\n\`\`\`${truncated}\`\`\``
                }, { quoted: message });

            } catch (error) {
                await sock.sendMessage(from, {
                    text: `❌ *Installation Failed*\n\n*Package:* ${packageName}\n\n*Error:*\n\`\`\`${error.message}\`\`\``
                }, { quoted: message });
            }
            return;
        }

        if (action === 'get' || action === 'file') {
            const filePath = args.slice(1).join(' ');
            if (!filePath) {
                return sock.sendMessage(from, {
                    text: `❌ *File path required*\n\n*Usage:*\n${config.prefix}cmd get <file-path>\n\n*Examples:*\n${config.prefix}cmd get package.json\n${config.prefix}cmd get src/config.js`
                }, { quoted: message });
            }

            try {
                const workspaceRoot = process.cwd();
                const fullPath = path.resolve(workspaceRoot, filePath);
                
                if (!fullPath.startsWith(workspaceRoot)) {
                    return sock.sendMessage(from, {
                        text: `❌ *Access Denied*\n\n*Reason:* Path outside workspace\n*Path:* ${filePath}\n\n_Only files within the project workspace can be accessed._`
                    }, { quoted: message });
                }
                
                const exists = await fs.pathExists(fullPath);
                
                if (!exists) {
                    return sock.sendMessage(from, {
                        text: `❌ *File Not Found*\n\n*Path:* ${filePath}`
                    }, { quoted: message });
                }

                const stats = await fs.stat(fullPath);
                
                if (stats.isDirectory()) {
                    const files = await fs.readdir(fullPath);
                    const fileList = files.map((f, i) => `${i + 1}. ${f}`).join('\n');
                    
                    return sock.sendMessage(from, {
                        text: `📁 *Directory Contents*\n\n*Path:* ${filePath}\n*Files:* ${files.length}\n\n${fileList}`
                    }, { quoted: message });
                }

                if (stats.size > 50 * 1024 * 1024) {
                    return sock.sendMessage(from, {
                        text: `❌ *File Too Large*\n\n*Path:* ${filePath}\n*Size:* ${(stats.size / 1024 / 1024).toFixed(2)}MB\n\n_Maximum file size: 50MB_`
                    }, { quoted: message });
                }

                const ext = path.extname(filePath).toLowerCase();
                const textExts = ['.txt', '.js', '.json', '.md', '.env', '.log', '.html', '.css', '.py', '.java', '.cpp', '.c', '.sh', '.yml', '.yaml', '.xml', '.sql'];

                if (textExts.includes(ext)) {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const truncated = content.length > 3500 ? content.substring(0, 3500) + '\n\n...[File truncated]' : content;
                    
                    await sock.sendMessage(from, {
                        text: `📄 *File Content*\n\n*Path:* ${filePath}\n*Size:* ${(stats.size / 1024).toFixed(2)}KB\n\n\`\`\`${truncated}\`\`\``
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(from, {
                        document: { url: fullPath },
                        fileName: path.basename(filePath),
                        mimetype: 'application/octet-stream',
                        caption: `📄 *File*\n\n*Name:* ${path.basename(filePath)}\n*Size:* ${(stats.size / 1024).toFixed(2)}KB\n*Path:* ${filePath}`
                    }, { quoted: message });
                }

            } catch (error) {
                await sock.sendMessage(from, {
                    text: `❌ *Error Reading File*\n\n*Path:* ${filePath}\n\n*Error:*\n${error.message}`
                }, { quoted: message });
            }
            return;
        }

        const command = args.join(' ');
        
        const dangerousCommands = ['rm -rf', 'mkfs', 'dd if=', ':(){:|:&};:', 'fork', '>()', 'shutdown', 'reboot', 'init 0', 'init 6'];
        if (dangerousCommands.some(cmd => command.toLowerCase().includes(cmd.toLowerCase()))) {
            return sock.sendMessage(from, {
                text: `⛔ *Dangerous Command Blocked*\n\n*Command:* ${command}\n\n_This command could harm the system and has been blocked for safety._`
            }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `⚙️ *Executing Command*\n\n\`\`\`${command}\`\`\`\n\n⏳ _Please wait..._`
        }, { quoted: message });

        try {
            const { stdout, stderr } = await execPromise(command, {
                timeout: 60000,
                maxBuffer: 1024 * 1024 * 10,
                cwd: process.cwd()
            });

            const output = stdout || stderr || 'Command executed successfully (no output)';
            const truncated = output.length > 3500 ? output.substring(0, 3500) + '\n\n...[Output truncated]' : output;

            await sock.sendMessage(from, {
                text: `✅ *Command Executed Successfully*\n\n*Command:*\n\`\`\`${command}\`\`\`\n\n*Output:*\n\`\`\`${truncated}\`\`\``
            }, { quoted: message });

        } catch (error) {
            const errorOutput = error.stdout || error.stderr || error.message;
            const truncated = errorOutput.length > 3000 ? errorOutput.substring(0, 3000) + '\n\n...[Error truncated]' : errorOutput;

            await sock.sendMessage(from, {
                text: `❌ *Command Failed*\n\n*Command:*\n\`\`\`${command}\`\`\`\n\n*Error:*\n\`\`\`${truncated}\`\`\``
            }, { quoted: message });
        }
    }
};
