import mongoose from 'mongoose';
import axios from 'axios';
import logger from '../../utils/logger.js';

// Define MongoDB schema for user chat sessions
const ChatSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // WhatsApp ID (e.g., 254700143167@s.whatsapp.net)
  command: { type: String, default: 'chat' },
  chatHistory: [{ role: String, content: String, timestamp: Date }],
  lastInteraction: { type: Date, default: Date.now },
});
const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);

export default {
  name: 'chat',
  supportsChat: true,

  async execute({ sock, message, from, sender }) {
    await this.setupChatHandler(sock, from, sender);

    // Check for existing session
    let session = await ChatSession.findOne({ userId: sender });
    if (!session) {
      session = new ChatSession({ userId: sender });
      await session.save();
      logger.info(`New chat session created for ${sender}`);
    }

    // Send initial prompt
    await sock.sendMessage(from, {
      text: '👋 Hey there! I’m Ilom, your friendly AI buddy. What’s on your mind? Just chat with me normally, and I’ll keep up!',
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
          let session = await ChatSession.findOne({ userId: sender });
          if (!session) {
            session = new ChatSession({ userId: sender });
            await session.save();
          }

          // Add user message to history
          session.chatHistory.push({ role: 'user', content: text, timestamp: new Date() });
          session.lastInteraction = new Date();
          await session.save();

          // Call Kaiz GPT-4.1 API
          let responseText;
          try {
            const response = await axios.post(
              'https://api.kaiz.com/v1/chat',
              {
                model: 'gpt-4.1',
                messages: [
                  {
                    role: 'system',
                    content: 'You are Ilom, a friendly and knowledgeable AI assistant created by Ilom. Respond in a conversational, engaging tone, providing helpful and accurate answers. Keep responses concise (under 100 words) and adapt to the user’s style. Use emojis where appropriate to match WhatsApp’s vibe! 😊',
                  },
                  ...session.chatHistory.slice(-10).map(({ role, content }) => ({ role, content })), // Last 10 messages for context
                  { role: 'user', content: text },
                ],
                max_tokens: 100,
              },
              {
                headers: { Authorization: `Bearer ${process.env.KAIZ_API_KEY}` },
                timeout: 10000, // 10s timeout
              }
            );

            responseText = response.data.choices[0].message.content;
            session.chatHistory.push({ role: 'assistant', content: responseText, timestamp: new Date() });
            await session.save();
          } catch (error) {
            logger.error(`Ilom failed to generate response for ${sender}:`, error);
            responseText = '😓 Sorry, Ilom’s having a moment! Try chatting again, or ask something else!';
          }

          await sock.sendMessage(from, {
            text: responseText,
          }, { quoted: message });

          // Clean up old sessions (e.g., older than 1 hour)
          if (Date.now() - session.lastInteraction.getTime() > 3600000) {
            await ChatSession.deleteOne({ userId: sender });
            delete global.chatHandlers[sender];
            logger.info(`Cleared old chat session for ${sender}`);
          }
        } catch (error) {
          logger.error(`Ilom chat handler error for ${sender}:`, error);
          await sock.sendMessage(from, {
            text: '❌ Ilom hit a snag! Try again, please! 😊',
          }, { quoted: message });
        }
      },
    };

    // Set timeout to clean up in-memory handler
    setTimeout(() => {
      if (global.chatHandlers[sender]) {
        delete global.chatHandlers[sender];
        logger.info(`Ilom chat handler timeout for ${sender}`);
      }
    }, 300000); // 5 minutes
  },
};