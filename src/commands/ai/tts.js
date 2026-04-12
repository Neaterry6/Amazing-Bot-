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
            const url = `https://omegatech-api.dixonomega.tech/api/ai/Gemini-tts?text=${encodeURIComponent(text)}`;

            const meta = await fetch(url);
            const data = await meta.json();
            const audioUrl = data?.result;
            if (!meta.ok || !audioUrl) throw new Error('No audio');

            const audioRes = await fetch(audioUrl);
            const buffer = Buffer.from(await audioRes.arrayBuffer());

            await sock.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: 'TTS Error' }, { quoted: message });
        }

        return null;
    }
};
