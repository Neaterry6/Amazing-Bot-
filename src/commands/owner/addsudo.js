import fs from 'fs-extra';
import path from 'path';
import config from '../../config.js';
import { getSessionControl, normalizePhone, toPhoneJid, updateSessionControl } from '../../utils/sessionControl.js';

export default {
    name: 'addsudo',
    aliases: ['addowner', 'makeowner'],
    category: 'owner',
    description: 'Add a user as bot owner/sudo admin',
    usage: '.addsudo @user',
    example: '.addsudo @1234567890',
    cooldown: 5,
    ownerOnly: true,
    
    async execute({ sock, message, from, sender }) {
        try {
            const contextInfo = message.message?.extendedTextMessage?.contextInfo;
            const mentioned = contextInfo?.mentionedJid;
            const quotedUser = contextInfo?.participant;
            const remoteJid = message.key?.remoteJid || '';
            
            let targetJid = null;
            
            if (mentioned && mentioned.length > 0) {
                targetJid = mentioned[0];
            } else if (quotedUser) {
                targetJid = quotedUser;
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Usage*\n\nPlease mention or reply to a user to add as sudo admin.\n\n*Usage:* .addsudo @user'
                }, { quoted: message });
            }
            
            let fullJid = targetJid.includes('@') ? targetJid : `${targetJid}@s.whatsapp.net`;

            const pickPhoneFromMetadata = async (jidLike) => {
                const normalizedInput = String(jidLike || '').trim();
                if (!normalizedInput || !from.endsWith('@g.us')) return '';
                try {
                    const metadata = await sock.groupMetadata(from);
                    const participants = metadata?.participants || [];
                    const inputLocal = normalizedInput.split('@')[0].split(':')[0];

                    for (const participant of participants) {
                        const pid = String(participant?.id || '');
                        const pidLocal = pid.split('@')[0].split(':')[0];
                        if (pid === normalizedInput || pidLocal === inputLocal) {
                            const normalized = normalizePhone(pid);
                            if (normalized && pid.endsWith('@s.whatsapp.net')) return normalized;
                        }
                    }
                } catch {
                    return '';
                }
                return '';
            };

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

            let phoneNumber = normalizePhone(fullJid);
            if (fullJid.endsWith('@lid') || phoneNumber.length > 15 || phoneNumber.length < 10) {
                phoneNumber = await pickPhoneFromMetadata(fullJid) || phoneNumber;
            }
            
            if (!phoneNumber || phoneNumber.length < 10) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Phone Number*\n\nExtracted: ${phoneNumber}\nFrom: ${fullJid}\n\nCannot add this user.`
                }, { quoted: message });
            }
            
            const normalizedJid = toPhoneJid(phoneNumber);
            const sessionControl = await getSessionControl(sock);
            
            const isAlreadyOwner = sessionControl.owners.includes(phoneNumber);
            
            if (isAlreadyOwner) {
                return await sock.sendMessage(from, {
                    text: `ℹ️ *Already Owner*\n\n+${phoneNumber} is already a bot owner.`,
                    mentions: [normalizedJid]
                }, { quoted: message });
            }
            
            const isAlreadySudo = sessionControl.sudoers.includes(phoneNumber);
            
            if (isAlreadySudo) {
                return await sock.sendMessage(from, {
                    text: `ℹ️ *Already Sudo*\n\n+${phoneNumber} is already a sudo admin.`,
                    mentions: [normalizedJid]
                }, { quoted: message });
            }
            
            const envPath = path.join(process.cwd(), '.env');
            let envContent = '';
            
            if (await fs.pathExists(envPath)) {
                envContent = await fs.readFile(envPath, 'utf8');
            }
            
            const lines = envContent.split('\n');
            let sudoLineIndex = lines.findIndex(line => line.startsWith('SUDO_NUMBERS='));
            
            if (sudoLineIndex !== -1) {
                const currentSudos = lines[sudoLineIndex].split('=')[1] || '';
                const sudoList = currentSudos.split(',').map(s => s.trim()).filter(s => s);
                
                const alreadyInList = sudoList.some(existingSudo => {
                    const existingPhone = existingSudo.replace(/[^0-9]/g, '');
                    return existingPhone === phoneNumber;
                });
                
                if (!alreadyInList) {
                    sudoList.push(phoneNumber);
                }
                
                lines[sudoLineIndex] = `SUDO_NUMBERS=${sudoList.join(',')}`;
            } else {
                lines.push(`SUDO_NUMBERS=${phoneNumber}`);
            }
            
            await fs.writeFile(envPath, lines.join('\n'), 'utf8');
            
            await updateSessionControl(sock, { sudoers: [...sessionControl.sudoers, phoneNumber] });
            
            await sock.sendMessage(from, {
                    text: `✅ *Sudo Admin Added*\n\n👤 *User:* @${phoneNumber}\n📱 *Number:* ${phoneNumber}\n🆔 *JID:* ${normalizedJid}\n🔐 *Permissions:* Owner-level access\n📝 *Saved to:* .env file\n\n💡 This user can now use all owner commands!\n\n⚠️ *Note:* Restart the bot for full effect.\n\n*Resolved from:* ${fullJid}`,
                mentions: [normalizedJid]
            }, { quoted: message });
            
        } catch (error) {
            console.error('Add sudo error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\n\nFailed to add sudo admin.\n\n*Error:* ${error.message}\n\nPlease try again.`
            }, { quoted: message });
        }
    }
};
