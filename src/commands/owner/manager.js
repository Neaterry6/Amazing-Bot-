import path from 'path';
import { generatePairingCode, upsertPairedSessionRecord } from '../../services/pairingService.js';
import { getSessionControl, normalizePhone, updateSessionControl } from '../../utils/sessionControl.js';

function digits(input = '') {
    return String(input).replace(/\D/g, '');
}

function getSenderJid(message) {
    return message?.key?.participant || message?.key?.remoteJid || '';
}

function setReplyHandler(messageId, state, handler, ttlMs = 5 * 60 * 1000) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[messageId] = { command: 'manager', handler, state };
    setTimeout(() => {
        if (global.replyHandlers?.[messageId]?.handler === handler) {
            delete global.replyHandlers[messageId];
        }
    }, ttlMs);
}

async function sendMenu(sock, from, message, sessionId) {
    const control = await getSessionControl(sock);
    const owners = (control.owners || []).slice(0, 8).map((n) => `+${n}`).join(', ') || 'None';
    const menu = [
        '🌐 *Account Manager*',
        `Current: ${sessionId}`,
        '',
        '1. 🔗 Link New Account',
        '2. ✏️ Set Account Prefix',
        '3. 🛡️ Add Account Admin',
        '4. 📜 List Settings & Status',
        '5. ⏸️ Pause/Resume Account',
        '6. 🚪 Logout Account',
        '',
        `Prefix: ${control.prefix}`,
        `Private Mode: ${control.privateMode ? '⏸️ Paused' : '✅ Active'}`,
        `Admins: ${owners}`,
        '',
        'Reply with a number.'
    ].join('\n');

    const sent = await sock.sendMessage(from, { text: menu }, { quoted: message });
    const author = getSenderJid(message);

    setReplyHandler(sent.key.id, { step: 'main_menu', author }, async (text, replyMessage) => {
        const sender = getSenderJid(replyMessage);
        if (author && sender !== author) return;

        const choice = String(text || '').trim();

        if (choice === '1') {
            const ask = await sock.sendMessage(from, { text: '📱 Enter phone number to link (with country code):' }, { quoted: replyMessage });
            setReplyHandler(ask.key.id, { step: 'link_account', author }, async (innerText, msg2) => {
                const sender2 = getSenderJid(msg2);
                if (author && sender2 !== author) return;
                const number = digits(innerText);
                if (!number || number.length < 10 || number.length > 15) {
                    return sock.sendMessage(from, { text: '❌ Invalid number. Use 10-15 digits with country code.' }, { quoted: msg2 });
                }

                await sock.sendMessage(from, { text: `⏳ Requesting pairing code for +${number}...` }, { quoted: msg2 });
                try {
                    const paired = await generatePairingCode(number, {
                        onCodeSent: async ({ number: pairedNumber, sessionPath }) => {
                            const sid = path.basename(sessionPath || '') || 'unknown';
                            await upsertPairedSessionRecord({
                                sessionId: sid,
                                number: pairedNumber,
                                sessionPath: sessionPath || '',
                                source: 'manager_command',
                                status: 'code_sent'
                            });
                        },
                        onLinked: async ({ number: linkedNumber, sessionPath, sessionId: linkedSessionRaw }) => {
                            const current = await getSessionControl(sock);
                            const owners = Array.from(new Set([...(current.owners || []), linkedNumber]));
                            await updateSessionControl(sock, { owners });
                            const linkedSessionId = path.basename(sessionPath || '') || linkedSessionRaw || 'unknown';
                            await upsertPairedSessionRecord({
                                sessionId: linkedSessionId,
                                number: linkedNumber,
                                sessionPath: sessionPath || '',
                                source: 'manager_command',
                                status: 'linked_connected'
                            });
                            await sock.sendMessage(from, {
                                text: `✅ +${linkedNumber} linked successfully.\n🆔 Session ID: ${linkedSessionId}\n🚀 Bot deployment hook triggered for this session.`
                            }, { quoted: msg2 });
                        }
                    });

                    const createdSessionId = path.basename(paired.sessionPath || '') || 'unknown';
                    await sock.sendMessage(from, {
                        text: `✅ *Pairing Code:* ${paired.code}\n🆔 *Session ID:* ${createdSessionId}\n\nUse WhatsApp → Linked Devices → Link with phone number.`
                    }, { quoted: msg2 });
                } catch (e) {
                    await sock.sendMessage(from, { text: `❌ Pairing failed: ${e.message}` }, { quoted: msg2 });
                } finally {
                    delete global.replyHandlers?.[ask.key.id];
                }
            });
            return;
        }

        if (choice === '2') {
            const ask = await sock.sendMessage(from, { text: '⌨️ Enter the new prefix for this account:' }, { quoted: replyMessage });
            setReplyHandler(ask.key.id, { step: 'set_prefix', author }, async (innerText, msg2) => {
                const sender2 = getSenderJid(msg2);
                if (author && sender2 !== author) return;
                const prefix = String(innerText || '').trim();
                if (!prefix || prefix.length > 5 || /\s/.test(prefix)) {
                    return sock.sendMessage(from, { text: '❌ Prefix must be 1-5 non-space characters.' }, { quoted: msg2 });
                }
                await updateSessionControl(sock, { prefix });
                await sock.sendMessage(from, { text: `✅ Prefix updated to: ${prefix}` }, { quoted: msg2 });
                delete global.replyHandlers?.[ask.key.id];
            });
            return;
        }

        if (choice === '3') {
            const ask = await sock.sendMessage(from, { text: '👤 Enter number to add as admin for THIS account:' }, { quoted: replyMessage });
            setReplyHandler(ask.key.id, { step: 'add_admin', author }, async (innerText, msg2) => {
                const sender2 = getSenderJid(msg2);
                if (author && sender2 !== author) return;
                const newAdmin = digits(innerText);
                if (!newAdmin || newAdmin.length < 7) {
                    return sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: msg2 });
                }
                const current = await getSessionControl(sock);
                const owners = Array.from(new Set([...(current.owners || []), newAdmin]));
                await updateSessionControl(sock, { owners });
                await sock.sendMessage(from, { text: `✅ +${newAdmin} added as account admin.` }, { quoted: msg2 });
                delete global.replyHandlers?.[ask.key.id];
            });
            return;
        }

        if (choice === '4') {
            const c = await getSessionControl(sock);
            const list = [
                `⚙️ *Status for ${sessionId}*`,
                `Prefix: ${c.prefix}`,
                `Status: ${c.privateMode ? '⏸️ Paused' : '✅ Active'}`,
                `Admins: ${(c.owners || []).map((n) => `+${n}`).join(', ') || 'None'}`
            ].join('\n');
            await sock.sendMessage(from, { text: list }, { quoted: replyMessage });
            return;
        }

        if (choice === '5') {
            const c = await getSessionControl(sock);
            const next = !c.privateMode;
            await updateSessionControl(sock, { privateMode: next });
            await sock.sendMessage(from, {
                text: next ? '⏸️ Account paused (private mode ON).' : '▶️ Account resumed (private mode OFF).'
            }, { quoted: replyMessage });
            return;
        }

        if (choice === '6') {
            const ask = await sock.sendMessage(from, {
                text: `⚠️ Are you sure you want to logout ${sessionId}?\nReply "YES" to confirm.`
            }, { quoted: replyMessage });
            setReplyHandler(ask.key.id, { step: 'confirm_logout', author }, async (innerText, msg2) => {
                const sender2 = getSenderJid(msg2);
                if (author && sender2 !== author) return;
                if (String(innerText || '').trim().toUpperCase() !== 'YES') {
                    await sock.sendMessage(from, { text: '❌ Logout cancelled.' }, { quoted: msg2 });
                    delete global.replyHandlers?.[ask.key.id];
                    return;
                }
                await sock.sendMessage(from, { text: `🚪 Logging out ${sessionId}...` }, { quoted: msg2 });
                delete global.replyHandlers?.[ask.key.id];
                await sock.logout();
            });
            return;
        }

        await sock.sendMessage(from, { text: '❌ Invalid choice. Reply with 1-6.' }, { quoted: replyMessage });
    });
}

export default {
    name: 'manager',
    aliases: ['mng', 'acc'],
    category: 'owner',
    description: 'Account management (pair, prefix, admins, pause, logout)',
    usage: 'manager',
    cooldown: 3,
    permissions: ['owner'],

    async execute({ sock, message, from }) {
        const myNumber = normalizePhone(sock?.user?.id || '') || 'unknown';
        await sendMenu(sock, from, message, myNumber);
    }
};
