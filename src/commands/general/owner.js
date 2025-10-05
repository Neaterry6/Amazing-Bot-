import config from '../../config.js';



export default {
    name: 'owner',
    aliases: ['creator', 'developer'],
    category: 'general',
    description: 'Get owner contact information',
    usage: 'owner',
    cooldown: 5,
    permissions: ['user'],

    async execute(sock, message) {
        const ownerText = `╭──⦿【 👑 BOT OWNER 】
╰────────⦿

╭──⦿【 👨‍💻 DEVELOPER INFO 】
│ 🎯 𝗡𝗮𝗺𝗲: Ilom
│ 📱 𝗖𝗼𝗻𝘁𝗮𝗰𝘁: ${config.ownerNumbers?.[0] || 'Not set'}
│ 🌐 𝗪𝗲𝗯: ${config.website || 'https://ilom.tech'}
│ 📧 𝗦𝘂𝗽𝗽𝗼𝗿𝘁: Contact via WhatsApp
╰────────⦿

╭──⦿【 💼 SERVICES 】
│ ✧ Custom Bot Development
│ ✧ WhatsApp Automation
│ ✧ AI Integration
│ ✧ Web Development
│ ✧ Full Stack Solutions
╰────────⦿

╭──⦿【 🤝 SUPPORT 】
│ ✧ Bug Reports
│ ✧ Feature Requests
│ ✧ Technical Support
│ ✧ Custom Solutions
│ ✧ Consulting Services
╰────────⦿

╭─────────────⦿
│ ✨ Thanks for using our bot!
│ 💫 Contact info sent below
╰────────────⦿`;

        const ownerNumber = config.ownerNumbers?.[0];
        if (ownerNumber) {
            const ownerVcard = `BEGIN:VCARD
VERSION:3.0
FN:Ilom - Bot Developer
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

            await sock.sendMessage(message.key.remoteJid, {
                contacts: {
                    displayName: 'Ilom - Bot Developer',
                    contacts: [{
                        vcard: ownerVcard
                    }]
                }
            });
        }

        await sock.sendMessage(message.key.remoteJid, { text: ownerText });
    }
};