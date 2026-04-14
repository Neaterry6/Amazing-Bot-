import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { commandManager } from '../../utils/commandManager.js';

dotenv.config();

const OMEGA_GPT_API = 'https://omegatech-api.dixonomega.tech/api/ai/gpt';
const OMEGA_GLM_API = 'https://omegatech-api.dixonomega.tech/api/ai/glm';

const MEMORY_PATH = './data/ilom_memory.json';
const COMMANDS_PATH = './src/commands';
const REPO_ROOT = process.cwd();
const LONG_OUTPUT_LIMIT = 3500;

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveMemory(data) {
    fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
}

function getModePrompt(mode) {
    return `
You are ILOM AI (Autonomous Coding Agent).

STRICT RULES:
- ALWAYS generate full WhatsApp bot command files when user asks for a command.
- FOLLOW Amazing Bot command structure strictly.
- Return clean JavaScript code only for code tasks.
- If user asks normal chat, respond shortly.
- If output is long, format clearly so it can be saved as a file.
- Avoid broken command patterns. If a feature/API is unreliable, return a stable fallback implementation.

CURRENT MODE: ${mode}

ABILITIES:
- Generate commands
- Fix/edit existing commands
- Install command plugins into src/commands/<category>/<name>.js
- Access and modify existing bot files when a valid relative path is provided
- Analyze user-replied code file
`;
}

async function askIlomApi(prompt, question) {
    const parseText = (payload) => payload?.result
        || payload?.response
        || payload?.answer
        || payload?.message
        || payload?.text
        || payload?.data?.result
        || payload?.data?.answer
        || '';

    try {
        const gptResponse = await axios.get(OMEGA_GPT_API, {
            params: {
                question: String(question || 'Generate code').slice(0, 3000),
                prompt: String(prompt).slice(0, 14000)
            },
            timeout: 120000
        });
        const text = String(parseText(gptResponse.data)).trim();
        if (text) return text;
    } catch {}

    const glmResponse = await axios.get(OMEGA_GLM_API, {
        params: {
            prompt: String(prompt).slice(0, 14000)
        },
        timeout: 120000
    });
    const glmText = String(parseText(glmResponse.data)).trim();
    if (!glmText) throw new Error('Omega APIs returned empty response.');
    return glmText;
}

function extractCommandInfo(code) {
    const nameMatch = code.match(/name:\s*['"`](.*?)['"`]/);
    const categoryMatch = code.match(/category:\s*['"`](.*?)['"`]/);

    const safeName = (nameMatch?.[1] || `cmd_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const safeCategory = (categoryMatch?.[1] || 'general').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    return { name: safeName || `cmd_${Date.now()}`, category: safeCategory || 'general' };
}

function saveCommand(code) {
    const { name, category } = extractCommandInfo(code);
    const dir = path.join(COMMANDS_PATH, category);

    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${name}.js`);
    fs.writeFileSync(filePath, code);

    return filePath;
}

function saveGeneratedOutput(output) {
    const fileMatch = output.match(/^\s*FILE:\s*([^\n]+)\n([\s\S]*)$/i);
    if (fileMatch) {
        const relPath = fileMatch[1].trim().replace(/^\/+/, '');
        const content = fileMatch[2].trim();
        const safeBase = path.resolve(REPO_ROOT);
        const resolved = path.resolve(REPO_ROOT, relPath);
        if (!resolved.startsWith(safeBase)) throw new Error('Unsafe target path');
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content);
        return resolved;
    }

    if (output.includes('export default')) return saveCommand(output);
    return null;
}

function getQuotedMessage(message) {
    return message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

export default {
    name: 'ilomcreate',
    aliases: ['ilom', 'agent', 'cmdai'],
    category: 'ai',
    description: 'Autonomous AI command creator + installer',
    usage: 'ilomcreate <prompt>',
    cooldown: 3,
    permissions: ['user'],
        minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        try {
            const memory = loadMemory();
            const userMemory = memory[sender] || { history: [], mode: 'coder' };

            const quoted = getQuotedMessage(message);
            let userText = args.join(' ').trim();

            if (!userText && quoted) {
                userText = 'Continue previous task.';
            }

            if (!userText) {
                return sock.sendMessage(from, {
                    text: '❌ Provide a prompt or reply to continue.'
                }, { quoted: message });
            }

            if (userText.startsWith('mode:')) {
                const mode = userText.split(':')[1]?.trim();
                if (!mode) {
                    return sock.sendMessage(from, { text: '❌ Usage: mode:<coder|pro|friendly|savage>' }, { quoted: message });
                }

                userMemory.mode = mode;
                memory[sender] = userMemory;
                saveMemory(memory);

                return sock.sendMessage(from, {
                    text: `🎭 Mode switched → *${mode}*`
                }, { quoted: message });
            }

            let fileCode = '';
            if (quoted?.documentMessage) {
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, sock);
                fileCode = buffer.toString('utf8').slice(0, 9000);
            }

            const historyText = userMemory.history
                .slice(-8)
                .map((h) => `${h.role}: ${h.text}`)
                .join('\n');

            const finalPrompt = `${getModePrompt(userMemory.mode)}

CHAT HISTORY:
${historyText}

${fileCode ? `CODE:\n${fileCode}` : ''}

USER:
${userText}

COMMAND TEMPLATE REQUIREMENT:
- When creating commands, output complete JS command file using export default.
- Include: name, category, description, usage, cooldown, and execute().
- To overwrite existing files, respond with:
FILE: relative/path/from/repo
<full file content>
- Prefer raw code output without markdown wrappers.`;

            await sock.sendMessage(from, { text: '🧠 ILOM thinking...' }, { quoted: message });

            const output = await askIlomApi(finalPrompt, userText);

            userMemory.history.push({ role: 'user', text: userText });
            userMemory.history.push({ role: 'ai', text: output });
            memory[sender] = userMemory;
            saveMemory(memory);

            const installedPath = saveGeneratedOutput(output);
            if (installedPath) {
                await commandManager.reloadAllCommands().catch(() => null);

                return sock.sendMessage(from, {
                    text: `✅ File updated successfully!\n\n📂 ${installedPath}\n\n🔄 If needed, restart bot to ensure full reload.`
                }, { quoted: message });
            }

            if (output.length > LONG_OUTPUT_LIMIT) {
                const fileName = `ilom_${Date.now()}.txt`;
                const filePath = path.join('./temp', fileName);

                fs.mkdirSync('./temp', { recursive: true });
                fs.writeFileSync(filePath, output);

                return sock.sendMessage(from, {
                    document: fs.readFileSync(filePath),
                    fileName,
                    mimetype: 'text/plain'
                }, { quoted: message });
            }

            await sock.sendMessage(from, { text: output }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ AI Error: ${err.message}\n\nTry again shortly.`
            }, { quoted: message });
        }
    }
};
