export default {
    name: 'hack',
    aliases: ['hacker', 'matrix'],
    category: 'fun',
    description: 'Simulate a fun hacking sequence (totally fake!)',
    usage: 'hack [@user]',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from, user, prefix }) {
        try {
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const targetUser = mentionedUsers.length > 0 ? mentionedUsers[0] : message.key.participant || from;
            const targetName = mentionedUsers.length > 0 ? `@${targetUser.split('@')[0]}` : 'yourself';
            const targetNumber = targetUser.split('@')[0];

            // Start hacking sequence
            await sock.sendMessage(from, {
                text: `🔴 *INITIATING HACK SEQUENCE*\n\n🎯 *Target:* ${targetName}\n💻 *Status:* Starting...\n\n⚠️ *WARNING: This is just for fun!*`,
                mentions: mentionedUsers
            });

            // Phase 1
            setTimeout(async () => {
                await sock.sendMessage(from, {
                    text: `🟡 *PHASE 1: RECONNAISSANCE*\n\n🔍 Scanning target...\n📡 Gathering information...\n🌐 Analyzing network...\n\n[████████████████░░░░] 80%`
                });
            }, 2000);

            // Phase 2  
            setTimeout(async () => {
                await sock.sendMessage(from, {
                    text: `🟠 *PHASE 2: PENETRATION*\n\n🔓 Bypassing security...\n🛡️ Cracking passwords...\n🔑 Accessing mainframe...\n\n[████████████████████] 100%`
                });
            }, 4000);

            // Phase 3 - Fake data
            setTimeout(async () => {
                const fakeData = [
                    `📱 Device: ${Math.random() > 0.5 ? 'iPhone' : 'Android'} ${Math.floor(Math.random() * 5) + 10}`,
                    `🌍 Location: ${['New York', 'London', 'Tokyo', 'Sydney', 'Paris'][Math.floor(Math.random() * 5)]}`,
                    `📊 Battery: ${Math.floor(Math.random() * 50) + 50}%`,
                    `💾 Storage: ${Math.floor(Math.random() * 200) + 50}GB used`,
                    `📶 Network: ${['WiFi', '5G', '4G'][Math.floor(Math.random() * 3)]}`,
                    `⏰ Last seen: ${Math.floor(Math.random() * 60)} minutes ago`
                ];

                await sock.sendMessage(from, {
                    text: `🟢 *PHASE 3: DATA EXTRACTION*\n\n💽 **TARGET DATA ACQUIRED:**\n\n${fakeData.join('\n')}\n\n🔐 Password: ${Array(8).fill().map(() => '*').join('')}\n📧 Email: ${targetNumber.slice(0,3)}***@****.com\n\n✅ *HACK COMPLETE*`
                });
            }, 6000);

            // Final message
            setTimeout(async () => {
                const outcomes = [
                    `🎮 Just kidding! I'm just a fun bot, not a real hacker! 😄`,
                    `🤖 PLOT TWIST: I'm actually just reading random data! 😂`,
                    `🎭 Surprise! This was all fake - I can't actually hack anyone! 🎪`,
                    `🎨 This was just a fun simulation! No real hacking here! 🌈`,
                    `🎪 Ta-da! Just a silly prank - your data is totally safe! 🎉`
                ];

                const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

                await sock.sendMessage(from, {
                    text: `🎭 *REALITY CHECK*\n\n${randomOutcome}\n\n⚠️ **IMPORTANT DISCLAIMERS:**\n• This is 100% fake and for entertainment only\n• No real hacking was performed\n• Your privacy and security are intact\n• I'm just a WhatsApp bot, not a hacker\n• Please use technology responsibly\n\n😄 *Hope you enjoyed the show!*`,
                    mentions: mentionedUsers
                });
            }, 8000);

        } catch (error) {
            console.error('Hack command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *HACK FAILED*\n\nSystem error! The firewall was too strong! 🔥🧱\n\n_(This is still just for fun!)_ 😄'
            });
        }
    }
};