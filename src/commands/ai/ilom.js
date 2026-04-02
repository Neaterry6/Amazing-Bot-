import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import yts from 'yt-search';
import { getRandomSticker } from '../../utils/stickerVault.js';

const STATE_FILE = path.join(process.cwd(), 'data', 'ilom-mode.json');
const HISTORY_FILE = path.join(process.cwd(), 'data', 'ilom-history.json');
const GEMINI_URL = 'https://api.qasimdev.dpdns.org/api/gemini/flash';
const GEMINI_API_KEY = 'qasim-dev';
const TRANSCRIBE_URL = 'https://api.qasimdev.dpdns.org/api/ai/transcribe';
const MAX_HISTORY_PER_USER = 12;

async function loadState() {
    try { return await fs.readJSON(STATE_FILE); } catch { return { public: false }; }
}
async function saveState(state) {
    await fs.ensureDir(path.dirname(STATE_FILE));
    await fs.writeJSON(STATE_FILE, state, { spaces: 2 });
}

async function loadHistory() {
    try { return await fs.readJSON(HISTORY_FILE); } catch { return {}; }
}

async function saveHistory(history) {
    await fs.ensureDir(path.dirname(HISTORY_FILE));
    await fs.writeJSON(HISTORY_FILE, history, { spaces: 2 });
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

function historyKey(from, sender) {
    const safeFrom = String(from || 'unknown-chat');
    const safeSender = String(sender || 'unknown-user').split(':')[0];
    return `${safeFrom}::${safeSender}`;
}

function buildHistoryPrompt(history = []) {
    if (!history.length) return '';
    return history.map(h => `${h.role}: ${h.text}`).join('\n');
}

async function appendHistory({ from, sender, role, text }) {
    if (!text?.trim()) return;
    const db = await loadHistory();
    const key = historyKey(from, sender);
    const current = Array.isArray(db[key]) ? db[key] : [];
    current.push({ role, text: text.trim(), at: Date.now() });
    db[key] = current.slice(-MAX_HISTORY_PER_USER);
    await saveHistory(db);
}

async function getRecentHistory({ from, sender }) {
    const db = await loadHistory();
    const key = historyKey(from, sender);
    return Array.isArray(db[key]) ? db[key] : [];
}

async function webSearch(query) {
    const { data } = await axios.get('https://api.duckduckgo.com/', {
        params: {
            q: query,
            format: 'json',
            no_html: 1,
            skip_disambig: 1
        },
        timeout: 25000
    });

    const out = [];
    if (data?.AbstractText) {
        out.push({
            title: data.Heading || 'Result',
            snippet: data.AbstractText,
            url: data.AbstractURL || ''
        });
    }
    if (Array.isArray(data?.RelatedTopics)) {
        for (const item of data.RelatedTopics) {
            if (out.length >= 5) break;
            if (item?.Text) {
                out.push({ title: 'Related', snippet: item.Text, url: item.FirstURL || '' });
            } else if (Array.isArray(item?.Topics)) {
                for (const nested of item.Topics) {
                    if (out.length >= 5) break;
                    if (nested?.Text) {
                        out.push({ title: 'Related', snippet: nested.Text, url: nested.FirstURL || '' });
                    }
                }
            }
        }
    }
    return out;
}

function extractQuotedMessage(message) {
    return message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

async function analyzeImage(buffer, prompt = 'Describe this image in detail.') {
    const imageBase64 = Buffer.from(buffer).toString('base64');
    const { data } = await axios.post(
        GEMINI_URL,
        { apiKey: GEMINI_API_KEY, text: prompt, image: imageBase64 },
        { timeout: 45000 }
    );
    return data?.data?.response || data?.response || data?.text || 'I could not analyze that image.';
}

async function analyzeAudio(buffer, prompt = 'Transcribe this audio and summarize what is said.') {
    const form = new FormData();
    form.append('apiKey', GEMINI_API_KEY);
    form.append('prompt', prompt);
    form.append('audio', new Blob([buffer], { type: 'audio/ogg' }), 'audio.ogg');

    const { data } = await axios.post(TRANSCRIBE_URL, form, { timeout: 60000 });
    return data?.data?.transcript || data?.data?.response || data?.transcript || data?.response || data?.text || 'I could not transcribe that audio.';
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
        const recentHistory = await getRecentHistory({ from, sender });

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

        if (/\b(open|unview|viewonce)\b/i.test(input)) {
            const quoted = extractQuotedMessage(message);
            const vo = quoted?.viewOnceMessage?.message || quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessageV2Extension?.message;
            if (!vo) return await sock.sendMessage(from, { text: '❌ Reply to a view-once image/video with: ilom open' }, { quoted: message });
            if (vo.imageMessage) {
                const img = await sock.downloadMediaMessage({ message: { imageMessage: vo.imageMessage } });
                return await sock.sendMessage(from, { image: img, caption: '👁️ Opened view-once image' }, { quoted: message });
            }
            if (vo.videoMessage) {
                const vid = await sock.downloadMediaMessage({ message: { videoMessage: vo.videoMessage } });
                return await sock.sendMessage(from, { video: vid, caption: '👁️ Opened view-once video' }, { quoted: message });
            }
        }

        if (/\b(analy[sz]e|describe|what(?:'s| is) in|see)\b.*\b(image|photo|picture)\b|\b(image|photo|picture)\b.*\b(analy[sz]e|describe)\b/i.test(input)) {
            const quoted = extractQuotedMessage(message);
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(from, { text: '❌ Reply to an image with: ilom analyze image' }, { quoted: message });
            }

            try {
                const imageBuffer = await sock.downloadMediaMessage({ message: { imageMessage: quoted.imageMessage } });
                const analysis = await analyzeImage(imageBuffer, `You are Ilom. Analyze this image clearly and safely. User request: ${input}`);
                return await sock.sendMessage(from, { text: `🖼️ *Image Analysis*\n\n${analysis}` }, { quoted: message });
            } catch (err) {
                return await sock.sendMessage(from, { text: `❌ Could not analyze image right now.\n${err.message}` }, { quoted: message });
            }
        }

        if (/\b(analy[sz]e|transcrib[e]?|listen|hear|what (?:did|is) (?:in|this))\b.*\b(audio|voice|voice note|recording)\b|\b(audio|voice|voice note)\b.*\b(transcrib[e]?|analy[sz]e|hear)\b/i.test(input)) {
            const quoted = extractQuotedMessage(message);
            const audioMessage = quoted?.audioMessage || quoted?.ptvMessage;
            if (!audioMessage) {
                return await sock.sendMessage(from, { text: '❌ Reply to a voice note/audio with: ilom transcribe this' }, { quoted: message });
            }

            try {
                const audioBuffer = await sock.downloadMediaMessage({ message: { audioMessage } });
                const transcript = await analyzeAudio(audioBuffer, `You are Ilom. Transcribe this audio, then provide a concise summary. User request: ${input}`);
                return await sock.sendMessage(from, { text: `🎧 *Audio Analysis*\n\n${transcript}` }, { quoted: message });
            } catch (err) {
                return await sock.sendMessage(from, { text: `❌ Could not analyze audio right now.\n${err.message}` }, { quoted: message });
            }
        }

        if (/\bsend sticker\b|\bsticker\b/i.test(input)) {
            const sticker = await getRandomSticker(from);
            if (!sticker) return await sock.sendMessage(from, { text: '❌ No saved stickers yet in this chat.' }, { quoted: message });
            return await sock.sendMessage(from, { sticker }, { quoted: message });
        }

        if (/send me (song|music)/i.test(input)) {
            const q = input.replace(/.*send me (song|music)\s*/i, '').trim();
            const video = (await yts(q)).videos?.[0];
            if (!video) return await sock.sendMessage(from, { text: '❌ Song not found.' }, { quoted: message });
            const api = `https://apiskeith.top/download/audio?url=${encodeURIComponent(video.url)}`;
            const { data } = await axios.get(api, { timeout: 30000 });
            if (!data?.result) throw new Error('Song API failed');

            if (video.thumbnail) {
                await sock.sendMessage(from, {
                    image: { url: video.thumbnail },
                    caption: `🎵 *${video.title || 'Song'}*\n👤 ${video.author?.name || 'Unknown artist'}\n⏱️ ${video.timestamp || 'Unknown duration'}`
                }, { quoted: message });
            }

            return await sock.sendMessage(from, {
                audio: { url: data.result },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: video.title || 'Audio',
                        body: `${video.author?.name || 'Unknown artist'} • ${video.timestamp || ''}`.trim(),
                        thumbnailUrl: video.thumbnail || undefined,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: message });
        }

        if (/\b(aza|account number|send money|transfer|opay)\b/i.test(input)) {
            return await sock.sendMessage(from, {
                text: `Nah my account be that, you self send me money 😌\n\n🏦 Bank: OPay\n👤 Name: Akewushola Abdulbakri Temitope\n💳 Account Number: 8148804813`
            }, { quoted: message });
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

        if (/\b(search|web|google|look\s*up|browse)\b/i.test(input)) {
            const query = input.replace(/\b(search|web|google|look\s*up|browse)\b/ig, '').trim() || input;
            try {
                const results = await webSearch(query);
                if (!results.length) {
                    return await sock.sendMessage(from, { text: `🔎 No useful web result found for: ${query}` }, { quoted: message });
                }
                const context = results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}`).join('\n\n');
                const aiReply = await askAI(
                    `You are Ilom. Use the web snippets below to answer the user clearly.\n\nConversation history:\n${buildHistoryPrompt(recentHistory)}\n\nUser request: ${input}\n\nWeb snippets:\n${context}`
                );
                await appendHistory({ from, sender, role: 'user', text: input });
                await appendHistory({ from, sender, role: 'assistant', text: aiReply });
                return await sock.sendMessage(from, { text: `🌐 *Web Search Answer*\n\n${aiReply}` }, { quoted: message });
            } catch (err) {
                return await sock.sendMessage(from, { text: `❌ Web search failed.\n${err.message}` }, { quoted: message });
            }
        }

        const aiReply = await askAI(`You are Ilom, an assistant for WhatsApp chats.\n\nConversation history:\n${buildHistoryPrompt(recentHistory)}\n\nUser: ${input || 'hello'}`);
        await appendHistory({ from, sender, role: 'user', text: input || 'hello' });
        await appendHistory({ from, sender, role: 'assistant', text: aiReply });
        const sent = await sock.sendMessage(from, { text: aiReply }, { quoted: message });
        const chain = async (replyText, replyMessage) => {
            const sub = (replyText || '').trim();
            if (!sub) return;
            if (!state.public) {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                if (String(replySender).split(':')[0] !== String(sender).split(':')[0] && !isPrivileged) return;
            }
            const chainHistory = await getRecentHistory({ from, sender });
            const follow = await askAI(`Continue as Ilom.\n\nConversation history:\n${buildHistoryPrompt(chainHistory)}\n\nUser: ${sub}`);
            await appendHistory({ from, sender, role: 'user', text: sub });
            await appendHistory({ from, sender, role: 'assistant', text: follow });
            const s2 = await sock.sendMessage(from, { text: follow }, { quoted: replyMessage });
            registerReplyHandler(s2.key.id, chain);
        };
        registerReplyHandler(sent.key.id, chain);
    }
};
