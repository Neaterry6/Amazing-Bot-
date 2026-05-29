import { BOT_CHANNEL_LINK } from '../../utils/botChannel.js';

export default {
  name: 'bchannel',
  aliases: ['botchannel', 'channel'],
  category: 'utility',
  description: 'Share official bot channel link',
  usage: 'bchannel',
  cooldown: 3,

  async execute({ sock, message, from }) {
    return sock.sendMessage(from, {
      text: `📢 *Bot Channel*\n\nFollow for more updates and features:\n${BOT_CHANNEL_LINK}`
    }, { quoted: message });
  }
};
