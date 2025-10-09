
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
  aliases: ['ilom', 'talk', 'ai'],
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

          // Call Kaiz GPT-4.1 API with retries
          let responseText;
          const maxRetries = 3;
          let attempt = 0;

          while (attempt < maxRetries) {
            try {
              const response = await axios.post(
                'https://api.kaiz.com/v1/chat',
                {
                  model: 'gpt-4.1',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are Ilom, a friendly and knowledgeable AI assistant created by Ilom. Respond in a conversational, engaging tone with a bit of humor, matching the user’s vibe. Keep answers short (under 100 words) and use emojis to fit WhatsApp’s style! 😎',
                    },
                    ...session.chatHistory.slice(-10).map(({ role, content }) => ({ role, content })), // Last 10 messages
                    { role: 'user', content: text },
                  ],
                  max_tokens: 100,
                },
                {
                  headers: { Authorization: `Bearer ${process.env.KAIZ_API_KEY}` },
                  timeout: 10000,
                }
              );

              responseText = response.data.choices[0].message.content;
              session.chatHistory.push({ role: 'assistant', content: responseText, timestamp: new Date() });
              await session.save();
              break; // Success, exit retry loop
            } catch (error) {
              attempt++;
              logger.error(`Kaiz API attempt ${attempt}/${maxRetries} failed for ${sender}:`, error);
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
            text: '❌ Ilom’s having a rough day! Try again, please! 😎',
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