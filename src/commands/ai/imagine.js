// commands/ai/imagine.js
import axios from 'axios';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { cache } from '../../utils/cache.js';

export default {
  name: 'imagine',
  aliases: ['generate', 'create', 'draw'],
  category: 'ai',
  description: 'Generate stunning images with Amazing AI, created by Ilom, based on your text descriptions. Use descriptive prompts for best results, or reply to a message to include its context.',
  usage: 'imagine [description]',
  example: 'imagine a cute cat wearing sunglasses | imagine a futuristic city with flying cars',
  cooldown: 30, // 30-second cooldown to prevent API abuse
  permissions: ['user'], // Accessible to all users
  args: true, // Requires arguments
  minArgs: 1, // At least one argument
  async execute({ sock, message, args, command, user, from, sender, prefix }) {
    try {
      // Combine user prompt from args
      const description = args.join(' ').trim();

      // Check if the message is a reply
      let quotedText = '';
      const quotedMessage = message.message?.contextInfo?.quotedMessage;
      if (quotedMessage) {
        if (quotedMessage.conversation) {
          quotedText = quotedMessage.conversation;
        } else if (quotedMessage.extendedTextMessage) {
          quotedText = quotedMessage.extendedTextMessage.text;
        }
      }

      // Validate prompt length
      if (description.length < 5 && !quotedText) {
        await sock.sendMessage(from, {
          text: `✨ *Amazing AI - Image Generator* ✨\n\n❌ Please provide a detailed description or reply to a message.\n\n*Usage:* ${prefix}${command} [description]\n\n*Examples:*\n• ${prefix}${command} A cute cat wearing sunglasses\n• ${prefix}${command} A futuristic city with flying cars\n• ${prefix}${command} Abstract art with vibrant colors`,
        });
        return;
      }

      // Combine description with quoted text (if any) for context
      let fullPrompt = description;
      if (quotedText) {
        fullPrompt = `${quotedText}\n\n${description}`;
      }

      // Show processing message with typing indicator
      await sock.sendPresenceUpdate('composing', from);
      await sock.sendMessage(from, {
        text: `✨ *Amazing AI - Image Generator* ✨\n\n📝 *Prompt:* ${fullPrompt}\n🤖 *Status:* Generating image...\n⏱️ *Estimated time:* 15-30 seconds\n\nPlease wait while Amazing AI creates your masterpiece! 🎨`,
      });

      // Make API call to Kaiz Flux Replicate API
      const apiUrl = 'https://kaiz-apis.gleeze.com/api/flux-replicate';
      const apiKey = 'a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea'; // Move to config in production
      const params = {
        prompt: fullPrompt,
        apikey: apiKey,
      };

      const response = await axios.get(apiUrl, { params, responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);

      // Send the generated image to WhatsApp
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: `✨ *Amazing AI - Image Generator* ✨\n\n🖼️ *Generated Image for:* "${fullPrompt}"\n\nCreated with love by Amazing AI! 🎨`,
        contextInfo: quotedMessage ? { quotedMessage: message.message } : undefined,
      });

      // Cache the image generation request
      cache.set(`imagine_${sender}`, {
        prompt: fullPrompt,
        timestamp: Date.now(),
      }, 600); // Cache for 10 minutes

    } catch (error) {
      logger.error(`Imagine command error: ${error.message}`);
      await sock.sendMessage(from, {
        text: `❌ *Amazing AI Error* ❌\n\nFailed to generate image! 😿\n\n*Error:* ${error.message || 'Unknown error'}\n\nPlease try again with a different prompt or contact support.`,
      });
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  },
};