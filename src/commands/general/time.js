import moment from 'moment';



export default {
    name: 'time',
    aliases: ['clock', 'datetime', 'date'],
    category: 'general',
    description: 'Get current time and date with timezone support',
    usage: 'time [timezone]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        const timezone = args.length > 0 ? args.join(' ') : null;
        
        try {
            let currentTime;
            let timezoneName = 'UTC';
            
            if (timezone) {
                // Common timezone mappings
                const timezoneMap = {
                    'ist': 'Asia/Kolkata',
                    'pst': 'America/Los_Angeles', 
                    'est': 'America/New_York',
                    'gmt': 'GMT',
                    'cet': 'Europe/Paris',
                    'jst': 'Asia/Tokyo',
                    'aest': 'Australia/Sydney',
                    'msk': 'Europe/Moscow',
                    'bst': 'Europe/London',
                    'cst': 'America/Chicago'
                };
                
                const mappedTimezone = timezoneMap[timezone.toLowerCase()] || timezone;
                
                try {
                    currentTime = new Date().toLocaleString('en-US', { 
                        timeZone: mappedTimezone,
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    });
                    timezoneName = mappedTimezone;
                } catch (error) {
                    throw new Error('Invalid timezone');
                }
            } else {
                currentTime = new Date().toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: 'UTC'
                });
            }
            
            // Get additional time info
            const now = new Date();
            const unixTimestamp = Math.floor(now.getTime() / 1000);
            const isoString = now.toISOString();
            const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            
            // Time zones for reference
            const worldTimes = {
                'New York (EST)': new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true }),
                'London (GMT)': new Date().toLocaleString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: true }),
                'Tokyo (JST)': new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: true }),
                'Sydney (AEST)': new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: true })
            };
            
            const response = `🕒 *World Clock & Time Information*

━━━━━━━━━━━━━━━━━━━━━

📅 **Current Time (${timezoneName}):**
${currentTime}

⏰ **Time Details:**
├ Unix Timestamp: ${unixTimestamp}
├ ISO Format: ${isoString}
├ Day of Year: ${dayOfYear}
╰ Week Day: ${now.toLocaleDateString('en-US', { weekday: 'long' })}

🌍 **World Times:**
├ 🇺🇸 ${worldTimes['New York (EST)']} (New York)
├ 🇬🇧 ${worldTimes['London (GMT)']} (London)  
├ 🇯🇵 ${worldTimes['Tokyo (JST)']} (Tokyo)
╰ 🇦🇺 ${worldTimes['Sydney (AEST)']} (Sydney)

💡 **Timezone Examples:**
• \`time IST\` - India Standard Time
• \`time PST\` - Pacific Standard Time
• \`time GMT\` - Greenwich Mean Time
• \`time Asia/Tokyo\` - Full timezone name

━━━━━━━━━━━━━━━━━━━━━

*🌐 Supporting 400+ timezones worldwide*`;

            await sock.sendMessage(from, { text: response });
            
        } catch (error) {
            const response = `❌ *Invalid Timezone*

⚠️ **Error:** Could not find timezone "${timezone}"

💡 **Valid Formats:**
• \`time\` - UTC time
• \`time IST\` - Abbreviations  
• \`time Asia/Kolkata\` - Full names
• \`time America/New_York\` - City format

🌍 **Popular Timezones:**
• IST (India), PST (Pacific), EST (Eastern)
• GMT (Greenwich), CET (Central Europe)
• JST (Japan), AEST (Australia)

*Try: \`time IST\` or \`time GMT\`*`;

            await sock.sendMessage(from, { text: response });
        }
    }
};