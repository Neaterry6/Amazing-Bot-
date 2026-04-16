import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import commandManager from '../../utils/commandManager.js';

dotenv.config();

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_ILOM_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://qwen.aikit.club/v1';
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.QWEN_ACCESS_TOKEN || '';
const QWEN_IMAGE_MODEL = process.env.QWEN_IMAGE_MODEL || 'Qwen3.5-Plus';

const MEMORY_PATH = './data/ilom_memory.json';
const COMMANDS_PATH = './src/commands';
const REPO_ROOT = process.cwd();
const LOW_RESOURCE_MODE = process.env.LOW_RESOURCE_MODE === 'true';
const LONG_OUTPUT_LIMIT = LOW_RESOURCE_MODE ? 2200 : 3500;
const REPLY_TTL = 10 * 60 * 1000;

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

function stripTrailingDetailsBlock(text) {
    const trimmedEnd = String(text || '').replace(/\s+$/g, '');
    const closeTag = '</details>';
    const lower = trimmedEnd.toLowerCase();
    const closeIndex = lower.lastIndexOf(closeTag);
    if (closeIndex < 0 || closeIndex + closeTag.length !== trimmedEnd.length) return String(text || '');
    const openIndex = lower.lastIndexOf('<details', closeIndex);
    if (openIndex < 0) return String(text || '');
    return trimmedEnd.slice(0, openIndex).trimEnd();
}

function getModePrompt(mode) {
    return `
You are ILOMCREATE Agent.

STRICT RULES:
- You operate from the bot root folder and can reason about logs, src, temp, and data folders.
- For code tasks return final code directly; no markdown wrappers.
- Never output <think> or hidden reasoning.
- Keep responses concise and production-safe.

CURRENT MODE: ${mode}
`;
}

function getRepoSnapshot() {
    const probes = ['logs', 'temp', 'downloads', 'data'];
    const lines = [];
    for (const probe of probes) {
        const full = path.join(REPO_ROOT, probe);
        if (!fs.existsSync(full)) continue;
        try {
            const entries = fs.readdirSync(full);
            lines.push(`${probe}: ${entries.length} entries`);
        } catch {}
    }
    return lines.join('\n');
}

async function askIlomApi(prompt, question) {
    if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY for ilomcreate');

    const { data } = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: String(question || 'Continue').slice(0, 4000) }
            ],
            temperature: LOW_RESOURCE_MODE ? 0.2 : 0.4,
            max_tokens: LOW_RESOURCE_MODE ? 950 : 1800
        },
        {
            timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const raw = data?.choices?.[0]?.message?.content || '';
    const cleaned = stripTrailingDetailsBlock(String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').trim());
    if (!cleaned) throw new Error('Groq returned empty response');
    return cleaned;
}

async function generateIlomImage(prompt) {
    if (!QWEN_API_KEY) throw new Error('Missing QWEN_API_KEY for image generation');
    const { data } = await axios.post(`${QWEN_BASE_URL}/images/generations`, {
        model: QWEN_IMAGE_MODEL,
        prompt,
        size: '1024x1024'
    }, {
        timeout: 180000,
        headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' }
    });
    const url = data?.data?.[0]?.url || data?.url;
    if (!url) throw new Error('No image URL returned from Qwen');
    return url;
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

function registerReplyHandler(msgId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[msgId] = { command: 'ilomcreate', handler };
    setTimeout(() => { if (global.replyHandlers?.[msgId]) delete global.replyHandlers[msgId]; }, REPLY_TTL);
}

function normalizeText(raw = '') {
    return String(raw || '').trim();
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
            let userText = normalizeText(args.join(' '));

            if (!userText && quoted) userText = 'Continue previous task.';

            if (!userText) {
                return sock.sendMessage(from, {
                    text: '❌ Provide a prompt or reply to continue.'
                }, { quoted: message });
            }


            if (/^(img|image)\s+/i.test(userText)) {
                const prompt = userText.replace(/^(img|image)\s+/i, '').trim();
                if (!prompt) {
                    return sock.sendMessage(from, { text: '❌ Usage: ilom img <prompt>' }, { quoted: message });
                }
                await sock.sendMessage(from, { text: '🎨 Generating image with Qwen...' }, { quoted: message });
                const imageUrl = await generateIlomImage(prompt);
                return sock.sendMessage(from, { image: { url: imageUrl }, caption: `✅ Ilom image generated\nPrompt: ${prompt}` }, { quoted: message });
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
                fileCode = buffer.toString('utf8').slice(0, LOW_RESOURCE_MODE ? 5000 : 10000);
            }

            const historyText = userMemory.history
                .slice(-8)
                .map((h) => `${h.role}: ${h.text}`)
                .join('\n');

            const finalPrompt = `${getModePrompt(userMemory.mode)}
ROOT SNAPSHOT:
${getRepoSnapshot() || 'No snapshot available'}

CHAT HISTORY:
${historyText}

${fileCode ? `CODE:\n${fileCode}` : ''}

USER:\n${userText}

COMMAND TEMPLATE REQUIREMENT:
- When creating commands, output complete JS command file using export default.
- Include: name, category, description, usage, cooldown, and execute().
- To overwrite existing files ONLY when user clearly asks install/save/write/apply, respond with:
FILE: relative/path/from/repo
<full file content>
- Prefer raw code output without markdown wrappers.`;

            const output = await askIlomApi(finalPrompt, userText);

            userMemory.history.push({ role: 'user', text: userText });
            userMemory.history.push({ role: 'ai', text: output });
            memory[sender] = userMemory;
            saveMemory(memory);

            const shouldInstall = /\b(install|save|write|apply|overwrite|replace)\b/i.test(userText);
            const installedPath = shouldInstall ? saveGeneratedOutput(output) : null;
            if (installedPath) {
                await commandManager.reloadAllCommands().catch(() => null);
                const sent = await sock.sendMessage(from, {
                    text: `✅ File updated successfully!\n\n📂 ${installedPath}\n\n🔄 If needed, restart bot to ensure full reload.`
                }, { quoted: message });
                registerReplyHandler(sent.key.id, async (replyText, replyMessage) => {
                    await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
                });
                return;
            }

            if (output.length > LONG_OUTPUT_LIMIT) {
                const fileName = `ilom_${Date.now()}.txt`;
                const filePath = path.join('./temp', fileName);

                fs.mkdirSync('./temp', { recursive: true });
                fs.writeFileSync(filePath, output);

                const sent = await sock.sendMessage(from, {
                    document: fs.readFileSync(filePath),
                    fileName,
                    mimetype: 'text/plain'
                }, { quoted: message });
                registerReplyHandler(sent.key.id, async (replyText, replyMessage) => {
                    await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
                });
                return;
            }

            const sent = await sock.sendMessage(from, { text: output }, { quoted: message });
            registerReplyHandler(sent.key.id, async (replyText, replyMessage) => {
                await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
            });
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ AI Error: ${err.message}\n\nTry again shortly.`
            }, { quoted: message });
        }
    }
};
