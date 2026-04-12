import fs from 'fs-extra';

const POKE_DB_PATH = 'pokedb.json';

function getDisplayName(entry, fallbackJid) {
    if (entry?.name && typeof entry.name === 'string') {
        return entry.name;
    }
    return fallbackJid.split('@')[0];
}

export default {
    name: 'pokechamps',
    aliases: ['pokechams', 'pokemasters'],
    category: 'games',
    description: 'Show the Pokemon leaderboard for this group',
    usage: 'pokechamps',
    example: 'pokechamps',
    cooldown: 5,
    permissions: ['user'],
    groupOnly: true,

    async execute({ sock, message, from }) {
        try {
            const exists = await fs.pathExists(POKE_DB_PATH);
            if (!exists) {
                await sock.sendMessage(from, { text: '❌ pokedb.json not found.' }, { quoted: message });
                return;
            }

            const pokedb = await fs.readJson(POKE_DB_PATH);
            const threadData = pokedb?.[from];

            if (!threadData) {
                await sock.sendMessage(from, { text: "This thread hasn’t started pokebot yet." }, { quoted: message });
                return;
            }

            const users = threadData.usdata || {};
            const rows = Object.entries(users)
                .map(([uid, pokemonList]) => {
                    const normalizedUid = uid.includes('@') ? uid : `${uid}@s.whatsapp.net`;
                    const profile = threadData.users?.[uid] || threadData.users?.[normalizedUid] || null;
                    return {
                        uid,
                        poks: Array.isArray(pokemonList) ? pokemonList.length : 0,
                        name: getDisplayName(profile, normalizedUid)
                    };
                })
                .sort((a, b) => b.poks - a.poks);

            if (!rows.length) {
                await sock.sendMessage(from, { text: 'Alas!! Nobody in this thread has any Pokémon.' }, { quoted: message });
                return;
            }

            const body = rows
                .map((item, i) => `${i + 1} ↬ Uid: ${item.uid}\nName: ${item.name}\nPokemons: ${item.poks}`)
                .join('\n\n');

            await sock.sendMessage(from, { text: body }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: '🥺 Not found or invalid pokedb format.' }, { quoted: message });
        }
    }
};
