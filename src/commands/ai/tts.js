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
            return await sock.sendMessage(from, {
                text: `Give text or reply to a message.\nVoices: ${Object.keys(VOICES).join(', ')}`
            }, { quoted: message });
        }

        try {
            const tl = VOICES[voice] || 'en-ng';
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text.slice(0, 500))}`;
            const audioRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!audioRes.ok) throw new Error(`HTTP ${audioRes.status}`);
            const buffer = Buffer.from(await audioRes.arrayBuffer());

            await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `TTS Error\n${error.message}` }, { quoted: message });
        }

        return null;
    }
};
