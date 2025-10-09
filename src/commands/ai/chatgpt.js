// commands/ai/gpt.js
import axios from 'axios';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { cache } from '../../utils/cache.js';

export default {
  name: 'gpt',
  description: 'Chat with Amazing AI, created by Ilom, for engaging and insightful conversations. Reply to a message to continue the conversation or provide a prompt to start a new one.',
  usage: 'gpt [prompt]',
  example: 'gpt What is the meaning of life?',
  category: 'ai',
  permissions: ['premium'], // Restrict to premium users, adjust as needed
  cooldown: 5, // 5-second cooldown
  async execute({ sock, message, args, command, user, from, sender, prefix }) {
    try {
      // System prompt for chat responses
      const systemPrompt = "You are Amazing AI, a friendly and intelligent assistant created by Ilom. Provide helpful, engaging, and beautified responses with a touch of humor and personality. Format your replies neatly with proper punctuation and emojis where appropriate. If responding to a reply, continue the conversation contextually.";

      // Check if the message is a reply
      let quotedText = '';
      const quotedMessage = message.message?.contextInfo?.quotedMessage;

      if (quotedMessage) {
        // Extract quoted message text
        if (quotedMessage.conversation) {
          quotedText = quotedMessage.conversation;
        } else if (quotedMessage.extendedTextMessage) {
          quotedText = quotedMessage.extendedTextMessage.text;
        }
      }

      // Combine user prompt from args
      const userPrompt = args.length > 0 ? args.join(' ') : '';

      // If no prompt and no quoted text, provide usage instructions
      if (!userPrompt && !quotedText) {
        await sock.sendMessage(from, {
          text: `✨ *Amazing AI* ✨\n\nPlease provide a prompt or reply to a message to chat with me!\n\n*Usage:* ${prefix}${command} [prompt]\n*Example:* ${prefix}${command} Tell me a joke!`,
        });
        return;
      }

      // Show typing indicator
      await sock.sendPresenceUpdate('composing', from);

      // Combine system prompt, quoted text (if any), and user args
      let fullPrompt = systemPrompt;
      if (quotedText) {
        fullPrompt += `\n\nPrevious message: ${quotedText}`;
      }
      if (userPrompt) {
        fullPrompt += `\n\nUser: ${userPrompt}`;
      }

      // Make API call to Blackbox AI
      const apiUrl = 'https://ab-blackboxai.abrahamdw882.workers.dev/';
      const params = {
        q: fullPrompt,
      };

      const response = await axios.get(apiUrl, { params });
      const aiResponse = response.data.response || 'Sorry, I couldn’t generate a response. 😢';

      // Beautify the chat response
      const beautifiedResponse = `✨ *Amazing AI* ✨\n\n${aiResponse}`;

      // Cache the chat response for conversation continuity
      cache.set(`gpt_${sender}`, {
        prompt: fullPrompt,
        response: aiResponse,
        timestamp: Date.now(),
      }, 600); // Cache for 10 minutes

      // Send the chat response, quoting the original message if it was a reply
      await sock.sendMessage(from, {
        text: beautifiedResponse,
        contextInfo: quotedMessage ? { quotedMessage: message.message } : undefined,
      });

    } catch (error) {
      logger.error(`GPT command error: ${error.message}`);
      await sock.sendMessage(from, {
        text: `❌ *Amazing AI Error* ❌\n\nSorry, something went wrong! 😿\n\n*Error:* ${error.message || 'Unknown error'}\n\nPlease try again later or contact support.`,
      });
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  },
};