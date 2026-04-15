import axios from 'axios';

function getQuotedText(message) {
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return '';
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

const VOICES = {
    en: 'en',
    ng: 'en-ng',
    us: 'en-us',
    uk: 'en-uk',
    au: 'en-au',
    hi: 'hi',
    yo: 'yo',
    ig: 'ig'
};

async function fetchAudio(text, voice) {
    const streamElementsVoice = {
        ng: 'Brian',
        us: 'Joanna',
        uk: 'Amy',
        au: 'Russell',
        en: 'Joanna'
    }[voice] || 'Joanna';

    const seUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(streamElementsVoice)}&text=${encodeURIComponent(text)}`;
    try {
        const se = await axios.get(seUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return Buffer.from(se.data);
    } catch {
        const tl = VOICES[voice] || 'en-ng';
        const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text.slice(0, 500))}`;
        const g = await axios.get(gUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return Buffer.from(g.data);
    }
}

export default {
    name: 'tts',
    aliases: ['t2s'],
    category: 'ai',
    description: 'Text to speech (voice note)',
    usage: 'tts [voice] <text> or reply to a message with tts',
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        let voice = 'ng';
        let input = args.join(' ').trim();

        const first = (args[0] || '').toLowerCase();
        if (VOICES[first]) {
            voice = first;
            input = args.slice(1).join(' ').trim();
        }

        const quotedText = getQuotedText(message);
        const text = input || quotedText;

        if (!text) {
            return sock.sendMessage(from, {
                text: `Give text or reply to a message.\nVoices: ${Object.keys(VOICES).join(', ')}`
            }, { quoted: message });
        }

        try {
            const buffer = await fetchAudio(text.slice(0, 900), voice);
            await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `TTS Error\n${error.message}` }, { quoted: message });
        }

        return null;
    }
};
