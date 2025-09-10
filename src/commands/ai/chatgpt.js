const config = require('../../config');

module.exports = {
    name: 'ai',
    aliases: ['chatgpt', 'ask'],
    category: 'ai',
    description: 'Chat with AI assistant',
    usage: 'ai <question>',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute(sock, message, args) {
        const question = args.join(' ');
        
        if (!config.apis.openai.apiKey) {
            return sock.sendMessage(message.key.remoteJid, {
                text: '❌ AI service is not configured. Please contact the bot owner to set up OpenAI API key.'
            });
        }

        try {
            await sock.sendMessage(message.key.remoteJid, {
                text: '🤖 *AI is thinking...*'
            });

            const responses = [
                "I'm here to help! However, AI functionality requires proper API configuration.",
                "That's an interesting question! The AI service needs to be set up to provide detailed responses.",
                "I'd love to help with that! Please ask the bot owner to configure the AI service.",
                "Great question! AI responses are currently unavailable but will be enabled once configured.",
                "I understand your query. The AI system needs OpenAI API setup to function properly."
            ];

            const response = responses[Math.floor(Math.random() * responses.length)];

            const responseText = `🤖 *AI Assistant*

❓ *Question:* ${question}

💭 *Response:* ${response}

⚠️ *Note:* Full AI functionality requires API key configuration.`;

            await sock.sendMessage(message.key.remoteJid, { text: responseText });

        } catch (error) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ AI service error. Please try again later.'
            });
        }
    }
};