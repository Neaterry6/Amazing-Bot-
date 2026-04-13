import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { commandManager } from '../../utils/commandManager.js';

dotenv.config();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_CODE_MODEL = process.env.GEMINI_CODE_MODEL || 'gemini-1.5-pro';

const MEMORY_PATH = './data/ilom_memory.json';
const COMMANDS_PATH = './src/commands';
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
- Analyze user-replied code file
`;
}

function getApiKey() {
    return (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_1 || '').trim();
}

async function gemini(model, prompt) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment.');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await axios.post(endpoint, {
        contents: [{ parts: [{ text: prompt }] }]
    }, { timeout: 60000 });

    const output = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!output) throw new Error('Gemini returned empty response.');
    return output;
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

function getQuotedMessage(message) {
    return message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

export default {
    name: 'ilomcreate',
    aliases: ['ilom', 'agent', 'cmdai'],
    category: 'ai',
    description: 'Autonomous AI command creator + installer (Gemini)',
    usage: 'ilomcreate <prompt>',
    cooldown: 3,
    permissions: ['user'],
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        try {
            if (!getApiKey()) {
                return sock.sendMessage(from, {
                    text: '❌ GEMINI_API_KEY not set in environment.'
                }, { quoted: message });
            }

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
- Prefer code block output.`;

            await sock.sendMessage(from, { text: '🧠 ILOM thinking...' }, { quoted: message });

            let output = '';
            const wantsCode = /\b(command|plugin|fix|code|script|js)\b/i.test(userText) || Boolean(fileCode);
            const preferredModel = wantsCode ? GEMINI_CODE_MODEL : GEMINI_MODEL;

            try {
                output = await gemini(preferredModel, finalPrompt);
            } catch (primaryError) {
                output = await gemini('gemini-1.5-flash', finalPrompt).catch(() => {
                    throw primaryError;
                });
            }

            userMemory.history.push({ role: 'user', text: userText });
            userMemory.history.push({ role: 'ai', text: output });
            memory[sender] = userMemory;
            saveMemory(memory);

            if (output.includes('export default')) {
                const installedPath = saveCommand(output);
                await commandManager.reloadAllCommands().catch(() => null);

                return sock.sendMessage(from, {
                    text: `✅ Command installed successfully!\n\n📂 ${installedPath}\n\n🔄 If needed, restart bot to ensure full reload.`
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
