import fs from 'fs-extra';
import path from 'path';
import { addOwner, delOwner, getOwners } from '../../utils/owner.js';
import { resolveJidFromMentionOrReply } from '../../utils/jidResolver.js';
import { getSessionControl, normalizePhone, toPhoneJid, updateSessionControl } from '../../utils/sessionControl.js';

function appendUniqueNumberLine(lines, key, phoneNumber) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index === -1) {
        lines.push(`${key}=${phoneNumber}`);
        return;
    }
    const current = (lines[index].split('=')[1] || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!current.some((num) => num.replace(/\D/g, '') === phoneNumber)) current.push(phoneNumber);
    lines[index] = `${key}=${current.join(',')}`;
}

async function persistOwnerEnv(phoneNumber) {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (await fs.pathExists(envPath)) envContent = await fs.readFile(envPath, 'utf8');
    const lines = envContent.split('\n').filter((line) => line !== '');
    appendUniqueNumberLine(lines, 'OWNER_NUMBERS', phoneNumber);
    await fs.writeFile(envPath, `${lines.join('\n')}\n`, 'utf8');
}

async function resolveTarget({ sock, message, from, args }) {
    const mentioned = await resolveJidFromMentionOrReply({ sock, message, from });
    if (mentioned) return mentioned;
    const raw = args.find((arg) => /\d{7,}/.test(arg));
    return raw ? toPhoneJid(raw) : '';
}

export default {
    name: 'setowner',
    aliases: ['addowner', 'delowner', 'listowner'],
    category: 'owner',
    description: 'Manage persistent bot owners by mention, reply, or number',
    usage: 'setowner @user | addowner @user | delowner @user | listowner',
    ownerOnly: true,

    async execute({ sock, message, from, args, commandName }) {
        const cmd = String(commandName || '').toLowerCase();
        const action = cmd === 'delowner' ? 'remove' : cmd === 'listowner' ? 'list' : (args[0]?.toLowerCase() === 'remove' ? 'remove' : args[0]?.toLowerCase() === 'list' ? 'list' : 'add');

        if (action === 'list') {
            const owners = getOwners().map((o) => o.replace('@s.whatsapp.net', ''));
            return await sock.sendMessage(from, { text: `Owners:\n${owners.join('\n') || 'None'}` }, { quoted: message });
        }

        const targetJid = await resolveTarget({ sock, message, from, args });
        if (!targetJid) {
            return await sock.sendMessage(from, {
                text: '❌ Mention, reply to a user, or provide a number.\n\nUsage: .setowner @user'
            }, { quoted: message });
        }

        const phoneNumber = normalizePhone(targetJid);
        if (!phoneNumber || phoneNumber.length < 7) {
            return await sock.sendMessage(from, { text: '❌ Could not resolve a valid WhatsApp ID/number.' }, { quoted: message });
        }

        const normalizedJid = toPhoneJid(phoneNumber);
        if (action === 'remove') {
            const result = delOwner(phoneNumber);
            const session = await getSessionControl(sock);
            await updateSessionControl(sock, {
                owners: (session.owners || []).filter((n) => normalizePhone(n) !== phoneNumber)
            });
            return await sock.sendMessage(from, { text: result.msg, mentions: [normalizedJid] }, { quoted: message });
        }

        const result = addOwner(phoneNumber);
        const session = await getSessionControl(sock);
        await updateSessionControl(sock, {
            owners: Array.from(new Set([...(session.owners || []), phoneNumber]))
        });
        await persistOwnerEnv(phoneNumber);

        return await sock.sendMessage(from, {
            text: `${result.success ? '✅' : 'ℹ️'} ${result.msg}\n\n👑 @${phoneNumber} is recognized as bot owner.`,
            mentions: [normalizedJid]
        }, { quoted: message });
    }
};
