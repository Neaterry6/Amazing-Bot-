import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import yts from 'yt-search';

const STATE_FILE = path.join(process.cwd(), 'data', 'ilom-mode.json');
const GEMINI_URL = 'https://api.qasimdev.dpdns.org/api/gemini/flash';
const GEMINI_API_KEY = 'qasim-dev';

async function loadState() {
    try { return await fs.readJSON(STATE_FILE); } catch { return { public: false }; }
}
async function saveState(state) {
    await fs.ensureDir(path.dirname(STATE_FILE));
    await fs.writeJSON(STATE_FILE, state, { spaces: 2 });
}

function extractText(message) {
    const m = message.message;
    return m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
}

function extractUrl(text) {
    const m = text.match(/https?:\/\/[^\s]+/i);
    return m?.[0] || null;
}

async function findFileByName(fileName, base = process.cwd()) {
    const stack = [base];
    const deny = new Set(['node_modules', '.git', 'temp', 'logs']);
    while (stack.length) {
        const dir = stack.pop();
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (!deny.has(e.name)) stack.push(full);
            } else if (e.name.toLowerCase() === fileName.toLowerCase()) {
                return full;
            }
        }
    }
    return null;
}

async function askAI(prompt) {
    const { data } = await axios.get(GEMINI_URL, {
        params: { apiKey: GEMINI_API_KEY, text: prompt }, timeout: 30000
    });
    return data?.data?.response || data?.response || data?.text || 'No response.';
}

function registerReplyHandler(messageId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[messageId] = { command: 'ilom', handler };
    setTimeout(() => { if (global.replyHandlers?.[messageId]) delete global.replyHandlers[messageId]; }, 15 * 60 * 1000);
}

export default {
    name: 'ilom',
    aliases: ['ilomai'],
    category: 'ai',
    description: 'Special AI assistant with no-prefix trigger and tools',
    usage: 'ilom <message>',
    noPrefix: true,

    async execute({ sock, message, args, from, sender, isGroup, isBotAdmin, isOwner, isSudo }) {
        const text = extractText(message).trim();
        const full = text || `ilom ${args.join(' ')}`;
        if (!/^ilom\b/i.test(full)) return;

        const state = await loadState();
        const isPrivileged = isOwner || isSudo;
        const input = full.replace(/^ilom\s*/i, '').trim();

        if (/^on$/i.test(input)) {
            if (!isPrivileged) return;
            state.public = true;
            await saveState(state);
            return await sock.sendMessage(from, { text: '✅ ilom public mode is ON' }, { quoted: message });
        }

        if (/^off$/i.test(input)) {
            if (!isPrivileged) return;
            state.public = false;
            await saveState(state);
            return await sock.sendMessage(from, { text: '✅ ilom public mode is OFF' }, { quoted: message });
        }

        if (!state.public && !isPrivileged) return;

        if (/\btag\b/i.test(input) && isGroup) {
            const meta = await sock.groupMetadata(from);
            const mentions = meta.participants.map(p => p.id);
            return await sock.sendMessage(from, { text: `📢 ${input.replace(/\btag\b/i, '').trim() || 'Attention everyone!'}`, mentions }, { quoted: message });
        }

        if (/\bkick\b/i.test(input) && isGroup && isBotAdmin && isPrivileged) {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const rawNum = input.match(/\b\d{7,15}\b/)?.[0];
            const target = mentioned[0] || (rawNum ? `${rawNum}@s.whatsapp.net` : null);
            if (!target) return await sock.sendMessage(from, { text: 'Mention/number required for kick.' }, { quoted: message });
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            return await sock.sendMessage(from, { text: `✅ Kicked @${target.split('@')[0]}`, mentions: [target] }, { quoted: message });
        }

        if (/send me\s+.+\.(js|json|txt|md|env)$/i.test(input) && isPrivileged) {
            const fileName = input.match(/send me\s+([^\s]+\.(?:js|json|txt|md|env))/i)?.[1];
            const found = await findFileByName(fileName || '');
            if (!found) return await sock.sendMessage(from, { text: '❌ File not found.' }, { quoted: message });
            return await sock.sendMessage(from, {
                document: await fs.readFile(found),
                fileName: path.basename(found),
                mimetype: 'text/plain'
            }, { quoted: message });
        }

        if (/send me (song|music)/i.test(input)) {
            const q = input.replace(/.*send me (song|music)\s*/i, '').trim();
            const video = (await yts(q)).videos?.[0];
            if (!video) return await sock.sendMessage(from, { text: '❌ Song not found.' }, { quoted: message });
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(video.url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.result) throw new Error('Song API failed');
            return await sock.sendMessage(from, { audio: { url: data.result }, mimetype: 'audio/mpeg' }, { quoted: message });
        }

        if (/send me image|image of|generate image/i.test(input)) {
            const q = input.replace(/.*(?:image of|send me image of|send me image|generate image of?)\s*/i, '').trim() || 'random';
            const imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(q)}`;
            return await sock.sendMessage(from, { image: { url: imageUrl }, caption: `🖼️ ${q}` }, { quoted: message });
        }

        if (/endpoint|html|stalk.*website/i.test(input)) {
            const url = extractUrl(input);
            if (!url) return await sock.sendMessage(from, { text: '❌ Provide a valid URL.' }, { quoted: message });
            const { data } = await axios.get(url, { timeout: 20000 });
            const html = String(data);
            const endpoints = [...new Set([...(html.match(/href=["']([^"'#?]+)["']/gi) || []).map(x => x.replace(/href=["']|["']/gi, '')), ...(html.match(/src=["']([^"'#?]+)["']/gi) || []).map(x => x.replace(/src=["']|["']/gi, ''))])].filter(Boolean).slice(0, 40);
            return await sock.sendMessage(from, { text: `🌐 HTML fetched (${html.length} chars)\n\nEndpoints:\n${endpoints.map(e => `• ${e}`).join('\n') || 'None found'}` }, { quoted: message });
        }

        const aiReply = await askAI(`You are Ilom, an assistant for WhatsApp chats. User: ${input || 'hello'}`);
        const sent = await sock.sendMessage(from, { text: aiReply }, { quoted: message });
        const chain = async (replyText, replyMessage) => {
            const sub = (replyText || '').trim();
            if (!sub) return;
            if (!state.public) {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                if (String(replySender).split(':')[0] !== String(sender).split(':')[0] && !isPrivileged) return;
            }
            const follow = await askAI(`Continue as Ilom. User: ${sub}`);
            const s2 = await sock.sendMessage(from, { text: follow }, { quoted: replyMessage });
            registerReplyHandler(s2.key.id, chain);
        };
        registerReplyHandler(sent.key.id, chain);
    }
};
