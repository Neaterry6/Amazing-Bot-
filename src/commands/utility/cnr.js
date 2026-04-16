import axios from 'axios';

class ReactChannel {
    constructor(userJwt) {
        this.userJwt = userJwt;
        this.siteKey = '6LemKk8sAAAAAH5PB3f1EspbMlXjtwv5C8tiMHSm';
        this.backendUrl = 'https://back.asitha.top/api';
        this.http = axios.create({
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.userJwt}`
            },
            timeout: 30000
        });
    }

    async getRecaptchaToken() {
        const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/tools/cf-bypass', {
            params: {
                url: 'https://asitha.top/channel-manager',
                siteKey: this.siteKey,
                type: 'recaptcha-v3'
            },
            timeout: 70000
        });
        if (!data?.success || !data?.result?.token) throw new Error('CF bypass failed');
        return data.result.token;
    }

    async getTempApiKey(token) {
        const { data } = await this.http.post(`${this.backendUrl}/user/get-temp-token`, { recaptcha_token: token });
        if (!data?.token) throw new Error('Temp API key failed');
        return data.token;
    }

    async reactToPost(postLink, reacts) {
        const recaptcha = await this.getRecaptchaToken();
        const tempKey = await this.getTempApiKey(recaptcha);
        const { data } = await this.http.post(`${this.backendUrl}/channel/react-to-post?apiKey=${tempKey}`, {
            post_link: postLink,
            reacts
        });
        return data;
    }
}

export default {
    name: 'cnr',
    aliases: ['rch', 'reactch'],
    category: 'utility',
    description: 'Send reactions to WhatsApp channel post',
    usage: 'cnr <channel-post-url> <emoji1,emoji2>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        const jwt = process.env.CHANNEL_REACT_JWT || '';
        if (!jwt) return sock.sendMessage(from, { text: '❌ Missing CHANNEL_REACT_JWT in env.' }, { quoted: message });

        if (!args[0] || args.length < 2) {
            return sock.sendMessage(from, { text: `⚡ Usage:
cnr <link> <emoji1,emoji2>
Example: cnr https://whatsapp.com/channel/... 😭,🔥` }, { quoted: message });
        }

        const postLink = args[0];
        const emojis = args.slice(1).join(' ').split(',').map((e) => e.trim()).filter(Boolean);
        if (!postLink.includes('whatsapp.com/channel/')) return sock.sendMessage(from, { text: '❌ Invalid WhatsApp channel link.' }, { quoted: message });
        if (!emojis.length) return sock.sendMessage(from, { text: '❌ No emojis provided.' }, { quoted: message });
        if (emojis.length > 4) return sock.sendMessage(from, { text: '❌ Max 4 emojis allowed.' }, { quoted: message });

        try {
            await sock.sendMessage(from, { text: '⏳ Sending reactions...' }, { quoted: message });
            const client = new ReactChannel(jwt);
            await client.reactToPost(postLink, emojis.join(','));
            await sock.sendMessage(from, { text: '🔥 Reactions sent successfully.' }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ Failed: ${e.response?.data?.message || e.message}` }, { quoted: message });
        }
    }
};
