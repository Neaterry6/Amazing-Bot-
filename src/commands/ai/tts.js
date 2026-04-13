export default {
    name: 'tts',
    aliases: ['t2s'],
    category: 'ai',
    description: 'Text to speech (voice note)',
    usage: 'tts <text>',
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        if (!args.length) {
            return await sock.sendMessage(from, { text: 'Give text' }, { quoted: message });
        }

        try {
            const text = args.join(' ');
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
            const audioRes = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (!audioRes.ok) throw new Error(`HTTP ${audioRes.status}`);
            const buffer = Buffer.from(await audioRes.arrayBuffer());
            if (!buffer.length) throw new Error('No audio returned');

            await sock.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `TTS Error\n${error.message}` }, { quoted: message });
        }

        return null;
    }
};
