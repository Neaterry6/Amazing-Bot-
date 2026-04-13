import fs from 'fs-extra';
import path from 'path';
import { getSessionControl, normalizePhone, toPhoneJid, updateSessionControl } from '../../utils/sessionControl.js';

function appendUniqueNumberLine(lines, key, phoneNumber) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index === -1) {
        lines.push(`${key}=${phoneNumber}`);
        return;
    }

    const current = (lines[index].split('=')[1] || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

    const exists = current.some((num) => num.replace(/\D/g, '') === phoneNumber);
    if (!exists) current.push(phoneNumber);
    lines[index] = `${key}=${current.join(',')}`;
}

export default {
    name: 'addsudo',
    aliases: ['addowner', 'makeowner'],
    category: 'owner',
    description: 'Add a user as bot owner/sudo admin',
    usage: '.addsudo @user',
    example: '.addsudo @1234567890',
    cooldown: 5,
    ownerOnly: true,

    async execute({ sock, message, from }) {
        try {
            const contextInfo = message.message?.extendedTextMessage?.contextInfo;
            const mentioned = contextInfo?.mentionedJid;
            const quotedUser = contextInfo?.participant;
            const remoteJid = message.key?.remoteJid || '';

            let targetJid = null;
            if (mentioned && mentioned.length > 0) targetJid = mentioned[0];
            else if (quotedUser) targetJid = quotedUser;
            else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Usage*\n\nPlease mention or reply to a user to add as sudo/owner.\n\n*Usage:* .addsudo @user'
                }, { quoted: message });
            }

            let fullJid = targetJid.includes('@') ? targetJid : `${targetJid}@s.whatsapp.net`;

            const resolveFromMentions = async () => {
                if (!mentioned?.length || !from.endsWith('@g.us')) return '';
                try {
                    const metadata = await sock.groupMetadata(remoteJid || from);
                    const participants = metadata?.participants || [];
                    for (const participant of participants) {
                        const jid = String(participant?.id || '');
                        if (!jid) continue;
                        const jidBase = jid.split('@')[0].split(':')[0];
                        const matched = mentioned.some((m) => {
                            const mBase = String(m || '').split('@')[0].split(':')[0];
                            return m === jid || (mBase && jidBase && mBase === jidBase);
                        });
                        if (matched && jid.endsWith('@s.whatsapp.net')) return jid;
                    }
                } catch {}
                return '';
            };

            if (fullJid.endsWith('@lid')) {
                const resolvedMentionJid = await resolveFromMentions();
                if (resolvedMentionJid) fullJid = resolvedMentionJid;
            }

            const phoneNumber = normalizePhone(fullJid);
            if (!phoneNumber || phoneNumber.length < 10) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Phone Number*\n\nExtracted: ${phoneNumber || 'none'}\nFrom: ${fullJid}\n\nCannot add this user.`
                }, { quoted: message });
            }

            const normalizedJid = toPhoneJid(phoneNumber);
            const sessionControl = await getSessionControl(sock);

            const updatedSudoers = Array.from(new Set([...(sessionControl.sudoers || []), phoneNumber]));
            const updatedOwners = Array.from(new Set([...(sessionControl.owners || []), phoneNumber]));

            const envPath = path.join(process.cwd(), '.env');
            let envContent = '';
            if (await fs.pathExists(envPath)) envContent = await fs.readFile(envPath, 'utf8');

            const lines = envContent.split('\n').filter((line) => line !== '');
            appendUniqueNumberLine(lines, 'SUDO_NUMBERS', phoneNumber);
            appendUniqueNumberLine(lines, 'OWNER_NUMBERS', phoneNumber);
            await fs.writeFile(envPath, `${lines.join('\n')}\n`, 'utf8');

            await updateSessionControl(sock, {
                sudoers: updatedSudoers,
                owners: updatedOwners
            });

            await sock.sendMessage(from, {
                text:
                    `✅ *Access Updated*\n\n` +
                    `👤 *User:* @${phoneNumber}\n` +
                    `🆔 *JID:* ${normalizedJid}\n` +
                    `👑 Added to: *OWNER_NUMBERS*\n` +
                    `🔐 Added to: *SUDO_NUMBERS*\n\n` +
                    `💡 Tagged user now has owner + sudo permissions.`,
                mentions: [normalizedJid]
            }, { quoted: message });
        } catch (error) {
            console.error('Add sudo error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\n\nFailed to add sudo admin.\n\n*Error:* ${error.message}`
            }, { quoted: message });
        }
    }
};
