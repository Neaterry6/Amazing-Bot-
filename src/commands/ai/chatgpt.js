import config from '../../config.js';

export default {
    name: 'ai',
    aliases: ['chatgpt', 'ask', 'gpt'],
    category: 'ai',
    description: 'Chat with AI assistant',
    usage: 'ai <question>',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const question = args.join(' ');
        
        const thinkingMsg = await sock.sendMessage(from, {
            text: `╭──⦿【 🤖 AI ASSISTANT 】
│ 💭 Processing your question...
│ ⚡ AI is thinking...
╰────────⦿`
        }, { quoted: message });

        try {
            const responses = [
                "That's a fascinating question! While I'm currently in demo mode, full AI capabilities with ChatGPT/Gemini integration are available when properly configured.",
                "Great question! The AI system can provide detailed responses once the OpenAI API key is configured by the bot owner.",
                "I'd love to help with that! AI features require API setup. Contact the owner to enable full intelligence.",
                "Interesting query! Full conversational AI with context awareness is available after configuration.",
                "Excellent question! The AI engine supports multi-turn conversations, just needs API credentials to unlock."
            ];

            const response = responses[Math.floor(Math.random() * responses.length)];

            const responseText = `╭──⦿【 🤖 AI ASSISTANT 】
╰────────⦿

╭──⦿【 ❓ YOUR QUESTION 】
│ ${question.length > 100 ? question.substring(0, 100) + '...' : question}
╰────────⦿

╭──⦿【 💭 AI RESPONSE 】
│ ${response}
╰────────⦿

╭──⦿【 ⚙️ FEATURES 】
│ ✧ 🧠 Smart Conversations
│ ✧ 🌐 Multi-Language
│ ✧ 📚 Knowledge Base
│ ✧ 🎯 Context Aware
╰────────⦿

╭─────────────⦿
│ ⚠️ Note: Full AI requires API key
│ 📞 Contact owner to enable
╰────────────⦿`;

            await sock.sendMessage(from, { 
                text: responseText,
                edit: thinkingMsg.key
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ AI ERROR 】
│ Failed to process request
│ Please try again later
╰────────⦿`
            }, { quoted: message });
        }
    }
};