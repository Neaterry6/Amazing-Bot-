import { createCanvas } from '@napi-rs/canvas';

const WIDTH = 1000;
const HEIGHT = 600;

const FIRST_NAMES = ['Philip', 'Amara', 'John', 'Noah', 'Ava', 'Liam', 'Sophia', 'Maya'];
const LAST_NAMES = ['Auer', 'Stone', 'Smith', 'Lopez', 'Carter', 'Reed', 'Khan', 'Davis'];
const BANK = 'ILOM BANK';

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
    return `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
}

function randomExpiry() {
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const year = String((new Date().getFullYear() + 2 + Math.floor(Math.random() * 4)).toString().slice(-2));
    return `${month}/${year}`;
}

function randomCvv() {
    return String(Math.floor(100 + Math.random() * 900));
}

function testCardNumber() {
    const testBins = ['424242424242', '555555555555', '400000000000'];
    const body = randomFrom(testBins) + String(Math.floor(1000 + Math.random() * 9000));
    return body.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawFront(details) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = 120;
    const cy = 120;
    const cw = 760;
    const ch = 420;

    const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
    grad.addColorStop(0, '#12171f');
    grad.addColorStop(0.5, '#0a0d12');
    grad.addColorStop(1, '#020305');

    rr(ctx, cx, cy, cw, ch, 35);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    rr(ctx, cx + cw * 0.6, cy, cw * 0.4, ch, 35);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '900 28px Arial';
    ctx.fillText(BANK, cx + 50, cy + 65);

    rr(ctx, cx + 50, cy + 120, 92, 62, 10);
    const chip = ctx.createLinearGradient(cx + 50, cy + 120, cx + 142, cy + 182);
    chip.addColorStop(0, '#e0e0e0');
    chip.addColorStop(1, '#9e9e9e');
    ctx.fillStyle = chip;
    ctx.fill();

    ctx.font = '500 42px monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(details.number, cx + 50, cy + 280);

    ctx.font = '600 24px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(details.name.toUpperCase(), cx + 50, cy + 350);

    ctx.font = '700 12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('VALID THRU', cx + 380, cy + 340);
    ctx.font = '600 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(details.expiry, cx + 380, cy + 365);

    const lx = cx + cw - 120;
    const ly = cy + ch - 80;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(lx, ly, 35, 0, Math.PI * 2); ctx.fillStyle = '#EB001B'; ctx.fill();
    ctx.beginPath(); ctx.arc(lx + 40, ly, 35, 0, Math.PI * 2); ctx.fillStyle = '#F79E1B'; ctx.fill();
    ctx.globalAlpha = 1;

    return canvas.toBuffer('image/png');
}

function drawBack(details) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = 120;
    const cy = 120;
    const cw = 760;
    const ch = 420;

    const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
    grad.addColorStop(0, '#1a2330');
    grad.addColorStop(1, '#0e141d');
    rr(ctx, cx, cy, cw, ch, 32);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#111';
    rr(ctx, cx + 4, cy + 48, cw - 8, 68, 4);
    ctx.fill();

    ctx.fillStyle = '#e8e8e8';
    rr(ctx, cx + 42, cy + 158, cw - 205, 58, 6);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    rr(ctx, cx + cw - 138, cy + 158, 105, 58, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 23px monospace';
    ctx.fillStyle = '#111';
    ctx.fillText(details.cvv, cx + cw - 118, cy + 192);

    ctx.font = '500 18px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(details.number, cx + 42, cy + 270);

    return canvas.toBuffer('image/png');
}

export default {
    name: 'ccgen',
    aliases: ['cardgen', 'fakecard'],
    category: 'utility',
    description: 'Generate a test card front/back canvas with details (for design/demo use)',
    usage: 'ccgen',
    cooldown: 5,

    async execute({ sock, message, from }) {
        try {
            const details = {
                name: randomName(),
                number: testCardNumber(),
                expiry: randomExpiry(),
                cvv: randomCvv()
            };

            const front = drawFront(details);
            const back = drawBack(details);

            await sock.sendMessage(from, {
                image: front,
                caption: '💳 ILOM BANK — Front side (Demo/Test Card)'
            }, { quoted: message });

            await sock.sendMessage(from, {
                image: back,
                caption: '💳 ILOM BANK — Back side (Demo/Test Card)'
            }, { quoted: message });

            const detailsText = [
                '*ᴄᴀʀᴅ ᴅᴇᴛᴀɪʟs*',
                '────────────────────',
                `🔹 *ɴᴀᴍᴇ*: \`${details.name}\``,
                `🔹 *ɴᴜᴍʙᴇʀ*: \`${details.number.replace(/\s/g, '')}\``,
                `🔹 *ᴇxᴘɪʀʏ*: \`${details.expiry}\``,
                `🔹 *ᴄᴠᴠ*: \`${details.cvv}\``,
                '────────────────────',
                '_For testing/design use only._'
            ].join('\n');

            await sock.sendMessage(from, { text: detailsText }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ ccgen failed: ${error.message}` }, { quoted: message });
        }
    }
};
