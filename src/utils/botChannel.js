export const BOT_CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb8Ko1ZAe5VhZaGl3E3m';
export const BOT_CHANNEL_JID = '120363406682873896@newsletter';
export const MENU_HELP_IMAGE_URL = 'https://i.ibb.co/hJxQr8Wx/2c50b66ac106.png';

export function withBotChannelPreview(content = {}) {
    return {
        ...content,
        contextInfo: {
            ...(content.contextInfo || {}),
            externalAdReply: {
                title: 'Join Our Bot Channel',
                body: 'Tap here for bot updates and support',
                thumbnailUrl: MENU_HELP_IMAGE_URL,
                sourceUrl: BOT_CHANNEL_LINK,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false,
                ...(content.contextInfo?.externalAdReply || {})
            }
        }
    };
}
