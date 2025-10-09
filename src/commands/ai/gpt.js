// commands/ai/brokenai.js
import axios from 'axios';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { cache } from '../../utils/cache.js';

export default {
  name: 'brokenai',
  description: 'Chat with Amazing AI, created by Ilom, for engaging conversations or vivid image descriptions. Reply to a message to continue the conversation or provide a prompt to start a new one. Use keywords like "generate image" or "create image" to generate images.',
  usage: 'brokenai [prompt]',
  example: 'brokenai What is the meaning of life? | brokenai Generate image of a cute anime girl',
  category: 'ai',
  permissions: ['premium'], // Restrict to premium users, adjust as needed
  cooldown: 5, // 5-second cooldown
  async execute({ sock, message, args, command, user, from, sender, prefix }) {
    try {
      // System prompt for chat responses
      const systemPrompt = "You are Amazing AI, a friendly and intelligent assistant created by Ilom. Provide helpful, engaging, and beautified responses with a touch of humor and personality. Format your replies neatly with proper punctuation and emojis where appropriate. If responding to a reply, continue the conversation contextually. If an image is provided, describe it vividly.";

      // Check if the message is a reply
      let quotedText = '';
      let imageUrl = null;
      const quotedMessage = message.message?.contextInfo?.quotedMessage;

      if (quotedMessage) {
        // Extract quoted message text
        if (quotedMessage.conversation) {
          quotedText = quotedMessage.conversation;
        } else if (quotedMessage.extendedTextMessage) {
          quotedText = quotedMessage.extendedTextMessage.text;
        }

        // Check for media in quoted message (e.g., images)
        if (quotedMessage.imageMessage) {
          imageUrl = quotedMessage.imageMessage.url || null;
        }
      }

      // Combine user prompt from args
      const userPrompt = args.length > 0 ? args.join(' ') : '';

      // Check if the user is requesting image generation
      const isImageGeneration = userPrompt.toLowerCase().includes('generate image') || 
                               userPrompt.toLowerCase().includes('create image');

      // If no prompt and no quoted text, provide usage instructions
      if (!userPrompt && !quotedText && !isImageGeneration) {
        await sock.sendMessage(from, {
          text: `✨ *Amazing AI* ✨\n\nPlease provide a prompt, reply to a message, or request an image (e.g., "generate image of a cat").\n\n*Usage:* ${prefix}${command} [prompt]\n*Example:* ${prefix}${command} Tell me a joke! | ${prefix}${command} Generate image of a cute anime girl`,
        });
        return;
      }

      // Show typing indicator
      await sock.sendPresenceUpdate('composing', from);

      // Handle image generation
      if (isImageGeneration) {
        const imagePrompt = userPrompt; // Use the full prompt for image generation
        const imageApiUrl = 'https://kaiz-apis.gleeze.com/api/flux-replicate';
        const apiKey = 'a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea'; // Move to config in production

        const imageParams = {
          prompt: imagePrompt,
          apikey: apiKey,
        };

        try {
          const response = await axios.get(imageApiUrl, { params: imageParams, responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data);

          // Send the image to WhatsApp
          await sock.sendMessage(from, {
            image: imageBuffer,
            caption: `✨ *Amazing AI* ✨\n\nGenerated image for: "${imagePrompt}"`,
            contextInfo: quotedMessage ? { quotedMessage: message.message } : undefined,
          });

          // Cache the image generation request
          cache.set(`brokenai_image_${sender}`, {
            prompt: imagePrompt,
            timestamp: Date.now(),
          }, 600); // Cache for 10 minutes

        } catch (error) {
          logger.error(`BrokenAI image generation error: ${error.message}`);
          await sock.sendMessage(from, {
            text: `❌ *Amazing AI Error* ❌\n\nFailed to generate image: ${error.message || 'Unknown error'} 😿\n\nPlease try again later.`,
          });
        }

        return;
      }

      // Handle chat response
      let fullPrompt = systemPrompt;
      if (quotedText) {
        fullPrompt += `\n\nPrevious message: ${quotedText}`;
      }
      if (userPrompt) {
        fullPrompt += `\n\nUser: ${userPrompt}`;
      }

      // Make API call to Kaiz GPT-4.1 for chat
      const apiUrl = 'https://kaiz-apis.gleeze.com/api/gpt-4.1';
      const apiKey = 'a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea'; // Move to config in production
      const uid = user.jid.split('@')[0]; // Use user's JID as UID

      const params = {
        ask: fullPrompt,
        uid: uid,
        apikey: apiKey,
      };

      if (imageUrl) {
        params.imageUrl = imageUrl;
      }

      const response = await axios.get(apiUrl, { params });
      const aiResponse = response.data.result || 'Sorry, I couldn’t generate a response. 😢';

      // Beautify the chat response
      const beautifiedResponse = `✨ *Amazing AI* ✨\n\n${aiResponse}`;

      // Cache the chat response for conversation continuity
      cache.set(`brokenai_${sender}`, {
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
      logger.error(`BrokenAI command error: ${error.message}`);
      await sock.sendMessage(from, {
        text: `❌ *Amazing AI Error* ❌\n\nSorry, something went wrong! 😿\n\n*Error:* ${error.message || 'Unknown error'}\n\nPlease try again later or contact support.`,
      });
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  },
};