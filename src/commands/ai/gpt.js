import mongoose from 'mongoose';
import axios from 'axios';
import logger from '../../utils/logger.js';

// Define MongoDB schema for user chat sessions
const ChatSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // WhatsApp ID (e.g., 254700143167@s.whatsapp.net)
  command: { type: String, default: 'chat' },
  chatHistory: [{ role: String, content: String, timestamp: Date }],
  lastInteraction: { type: Date, default: Date.now },
}, { collection: 'chatsessions' });
const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);

export default {
  name: 'chat',
  aliases: ['ilom', 'talk', 'ai'], // Added aliases
  supportsChat: true,

  async execute({ sock, message, from, sender }) {
    await this.setupChatHandler(sock, from, sender);

    let session;
    try {
      session = await ChatSession.findOne({ userId: sender }).maxTimeMS(5000);
      if (!session) {
        session = new ChatSession({ userId: sender });
        await session.save();
        logger.info(`New chat session created for ${sender}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch/create session for ${sender}:`, error);
      session = { userId: sender, chatHistory: [], lastInteraction: new Date() }; // Fallback
    }

    await sock.sendMessage(from, {
      text: '👋 Yo! I’m Ilom, your chill AI buddy. What’s good? Chat with me like a friend, and I’ll keep up! 😎',
    }, { quoted: message });
  },

  async setupChatHandler(sock, from, sender) {
    if (!global.chatHandlers) {
      global.chatHandlers = {};
    }

    global.chatHandlers[sender] = {
      command: this.name,
      handler: async (text, message) => {
        try {
          let session = await ChatSession.findOne({ userId: sender }).maxTimeMS(5000);
          if (!session) {
            session = new ChatSession({ userId: sender });
            await session.save();
          }

          // Add user message to history
          session.chatHistory.push({ role: 'user', content: text, timestamp: new Date() });
          session.lastInteraction = new Date();
          await session.save();

          // Prepare context for Blackbox API
          const historyText = session.chatHistory
            .slice(-10)
            .map(msg => `${msg.role === 'user' ? 'User' : 'Ilom'}: ${msg.content}`)
            .join('\n');
          const systemPrompt = 'You are Ilom, a friendly and knowledgeable AI assistant created by Ilom. Respond in a conversational, engaging tone with a bit of humor, matching the user’s vibe. Keep answers short (under 100 words) and use emojis to fit WhatsApp’s style! 😎';
          const query = `${systemPrompt}\n\n${historyText}\nUser: ${text}`;

          // Call Blackbox AI API with retries
          let responseText;
          const maxRetries = 3;
          let attempt = 0;

          while (attempt < maxRetries) {
            try {
              const response = await axios.get(
                `https://ab-blackboxai.abrahamdw882.workers.dev/?q=${encodeURIComponent(query)}`,
                {
                  timeout: 10000,
                }
              );

              responseText = response.data; // Blackbox returns plain text
              if (!responseText || typeof responseText !== 'string') {
                throw new Error('Invalid response format from Blackbox API');
              }

              session.chatHistory.push({ role: 'assistant', content: responseText, timestamp: new Date() });
              await session.save();
              break; // Success, exit retry loop
            } catch (error) {
              attempt++;
              logger.error(`Blackbox API attempt ${attempt}/${maxRetries} failed for ${sender}:`, error);
              if (attempt === maxRetries) {
                responseText = '😓 Yo, Ilom’s AI is acting up! Try again soon, or ask me something else! 😎';
                session.chatHistory.push({ role: 'assistant', content: responseText, timestamp: new Date() });
                await session.save();
              } else {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
              }
            }
          }

          await sock.sendMessage(from, {
            text: responseText,
          }, { quoted: message });

          // Clean up sessions older than 1 hour
          if (Date.now() - session.lastInteraction.getTime() > 3600000) {
            await ChatSession.deleteOne({ userId: sender });
            delete global.chatHandlers[sender];
            logger.info(`Cleared old chat session for ${sender}`);
          }
        } catch (error) {
          logger.error(`Ilom chat handler error for ${sender}:`, error);
          await sock.sendMessage(from, {
            text: '❌ Ilom hit a snag! Try again, please! 😎',
          }, { quoted: message });
        }
      },
    };

    // Clean up in-memory handler after 5 minutes
    setTimeout(() => {
      if (global.chatHandlers[sender]) {
        delete global.chatHandlers[sender];
        logger.info(`Ilom chat handler timeout for ${sender}`);
      }
    }, 300000);
  },
};