function normalizeChannelId(input = '') {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '';
  if (trimmed.endsWith('@newsletter')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `${digits}@newsletter` : '';
}

function safe(value, fallback = 'N/A') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return fallback; }
  }
  const out = String(value).trim();
  return out || fallback;
}

export default {
  name: 'idch',
  aliases: ['channelid', 'newsletterinfo', 'channelinfo', 'chinfo'],
  category: 'utility',
  description: 'Fetch newsletter/channel metadata by channel ID',
  usage: 'idch <channel_id_or_jid>',
  cooldown: 5,
  permissions: ['user'],
  args: true,
  minArgs: 1,

  async execute({ sock, message, from, args }) {
    const channelJid = normalizeChannelId(args.join(' '));
    if (!channelJid) {
      return sock.sendMessage(from, {
        text: '❌ Invalid channel ID. Example: .idch 120363406682873896'
      }, { quoted: message });
    }

    try {
      if (typeof sock.newsletterMetadata !== 'function') {
        return sock.sendMessage(from, {
          text: '❌ This bot build does not support newsletter metadata lookup.'
        }, { quoted: message });
      }

      const data = await sock.newsletterMetadata('jid', channelJid);
      const dpUrl = data?.picture?.url || data?.picture?.directPath || null;
      const text = [
        '📦 *Full Channel Info*',
        `🆔 *JID:* ${safe(data?.id || channelJid)}`,
        `👤 *Channel Name:* ${safe(data?.name || data?.channelName)}`,
        `🏷️ *Newsletter Name:* ${safe(data?.newsletterName || data?.thread_metadata?.name || data?.name)}`,
        `👥 *Followers:* ${safe(data?.subscribers || data?.followerCount || data?.followers)}`,
        `📊 *Status:* ${safe(data?.state?.type || data?.state || data?.status)}`,
        `✔️ *Verified:* ${data?.verification === 'VERIFIED' || data?.verified ? 'Yes' : 'No'}`,
        `📝 *Description:* ${safe(data?.description || data?.thread_metadata?.description)}`,
        `🖼️ *Channel DP:* ${safe(dpUrl)}`,
        `🕒 *Created:* ${safe(data?.creationTime || data?.createdAt)}`
      ].join('\n');

      if (dpUrl) {
        return sock.sendMessage(from, {
          image: { url: dpUrl },
          caption: text
        }, { quoted: message });
      }

      return sock.sendMessage(from, { text }, { quoted: message });
    } catch (error) {
      return sock.sendMessage(from, {
        text: `❌ Failed to fetch channel info: ${error.message}`
      }, { quoted: message });
    }
  }
};
