import logger from '../utils/logger.js';
import config from '../config.js';
import { isBanned } from '../commands/admin/ban.js';
import { normNum } from '../utils/adminUtils.js';
import { getGroup } from '../models/Group.js';

async function getProfilePic(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

function renderWelcomeTemplate(template = '', participant = '', groupName = 'the group') {
    const num = normNum(participant) || 'user';
    const mention = `@${num}`;
    return String(template || '')
        .replace(/&getpp|\{pp\}/gi, '')
        .replace(/@user|\{user\}|&mention|\bmentions user\b/gi, mention)
        .replace(/@group|\{group\}|\(group name\)|&group/gi, groupName)
        .replace(/\n{3,}/g, '\n\n')
        .trim() || `👋 Welcome ${mention} to ${groupName}!`;
}

export default async function handleGroupJoin(sock, groupUpdate) {
    const { id: groupId, participants, action } = groupUpdate;
    if (action && action !== 'add') return;
    try {
        const meta = await sock.groupMetadata(groupId);
        const groupName = meta.subject || 'the group';
        const savedGroup = await getGroup(groupId);
        const welcomeEnabled = savedGroup?.settings?.welcome?.enabled;
        const welcomeTemplate = savedGroup?.settings?.welcome?.message
            || '👋 Welcome @user to @group!\n\nKindly do intro:\n• Pics\n• Age\n• Location\n\n📌 Please read the group description.';

        for (const participant of participants) {
            if (await isBanned(groupId, participant)) {
                try {
                    await sock.groupParticipantsUpdate(groupId, [participant], 'remove');
                    await sock.sendMessage(groupId, {
                        text: `@${normNum(participant)} is banned from this group.`,
                        mentions: [participant]
                    });
                } catch {}
                continue;
            }

            if (!config.events?.groupJoin || !welcomeEnabled) continue;

            try {
                const ppUrl = await getProfilePic(sock, participant);
                const text = renderWelcomeTemplate(welcomeTemplate, participant, groupName);

                if (ppUrl) {
                    await sock.sendMessage(groupId, {
                        image: { url: ppUrl },
                        caption: text,
                        mentions: [participant]
                    });
                    continue;
                }

                await sock.sendMessage(groupId, { text, mentions: [participant] });
            } catch (err) {
                logger.error(`groupJoin notification error for ${participant}:`, err);
            }
        }
    } catch (err) {
        logger.error('handleGroupJoin error:', err);
    }
}
