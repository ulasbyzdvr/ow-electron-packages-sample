// TFT Set 16 (Magic n' Mayhem) Champion Data
// Fetched dynamically from Community Dragon

import https from 'https';

// Cache for champion data
let championDataCache: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Fallback champion costs (used if API fails)
const FALLBACK_CHAMPION_COSTS: Record<string, number> = {
    // 1 Cost
    "TFT16_Anivia": 1, "TFT16_Blitzcrank": 1, "TFT16_Briar": 1, "TFT16_Caitlyn": 1,
    "TFT16_Illaoi": 1, "TFT16_JarvanIV": 1, "TFT16_Jhin": 1, "TFT16_KogMaw": 1,
    "TFT16_Lulu": 1, "TFT16_Qiyana": 1, "TFT16_Rumble": 1, "TFT16_Shen": 1,
    "TFT16_Sona": 1, "TFT16_Viego": 1,

    // 2 Cost
    "TFT16_Aphelios": 2, "TFT16_Ashe": 2, "TFT16_Bard": 2, "TFT16_Chogath": 2,
    "TFT16_Ekko": 2, "TFT16_Graves": 2, "TFT16_Neeko": 2, "TFT16_Orianna": 2,
    "TFT16_Poppy": 2, "TFT16_RekSai": 2, "TFT16_Sion": 2, "TFT16_Teemo": 2,
    "TFT16_Tristana": 2, "TFT16_Tryndamere": 2, "TFT16_TwistedFate": 2,
    "TFT16_Vi": 2, "TFT16_XinZhao": 2, "TFT16_Yasuo": 2, "TFT16_Yorick": 2,

    // 3 Cost
    "TFT16_Ahri": 3, "TFT16_Darius": 3, "TFT16_DrMundo": 3, "TFT16_Draven": 3,
    "TFT16_Gangplank": 3, "TFT16_Gwen": 3, "TFT16_Jinx": 3, "TFT16_Kennen": 3,
    "TFT16_Kobuko": 3, "TFT16_LeBlanc": 3, "TFT16_Leona": 3, "TFT16_Loris": 3,
    "TFT16_Malzahar": 3, "TFT16_Milio": 3, "TFT16_Nautilus": 3, "TFT16_Sejuani": 3,
    "TFT16_Vayne": 3, "TFT16_Zoe": 3,

    // 4 Cost
    "TFT16_Ambessa": 4, "TFT16_BelVeth": 4, "TFT16_Braum": 4, "TFT16_Diana": 4,
    "TFT16_Fizz": 4, "TFT16_Garen": 4, "TFT16_Kaisa": 4, "TFT16_Kalista": 4,
    "TFT16_Lissandra": 4, "TFT16_Lux": 4, "TFT16_MissFortune": 4, "TFT16_Nasus": 4,
    "TFT16_Nidalee": 4, "TFT16_Renekton": 4, "TFT16_Seraphine": 4, "TFT16_Singed": 4,
    "TFT16_Skarner": 4, "TFT16_Swain": 4, "TFT16_Taric": 4, "TFT16_Veigar": 4,
    "TFT16_Warwick": 4, "TFT16_Wukong": 4, "TFT16_Yone": 4, "TFT16_Yunara": 4,
    "TFT16_VadisHarbinger": 4,

    // 5 Cost
    "TFT16_Aatrox": 5, "TFT16_Annie": 5, "TFT16_Azir": 5, "TFT16_Fiddlesticks": 5,
    "TFT16_Galio": 5, "TFT16_Kindred": 5, "TFT16_Lucian": 5, "TFT16_Mel": 5,
    "TFT16_Ornn": 5, "TFT16_Sett": 5, "TFT16_Shyvana": 5, "TFT16_THex": 5,
    "TFT16_TahmKench": 5, "TFT16_Thresh": 5, "TFT16_Volibear": 5, "TFT16_Xerath": 5,
    "TFT16_Ziggs": 5, "TFT16_Zilean": 5,

    // 7 Cost
    "TFT16_AurelionSol": 7, "TFT16_BaronNashor": 7, "TFT16_Brock": 7,
    "TFT16_Ryze": 7, "TFT16_Sylas": 7, "TFT16_Zaahen": 7,

    // 11 Cost
    "TFT16_Tibbers": 11,
};

/**
 * Fetch TFT Set 16 data from Community Dragon
 */
async function fetchTFTData(): Promise<any> {
    // Check cache
    const now = Date.now();
    if (championDataCache && (now - lastFetchTime) < CACHE_DURATION) {
        return championDataCache;
    }

    return new Promise((resolve, reject) => {
        const url = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    championDataCache = jsonData;
                    lastFetchTime = now;
                    resolve(jsonData);
                } catch (error) {
                    console.error('Failed to parse TFT data:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Failed to fetch TFT data:', error);
            reject(error);
        });
    });
}

/**
 * Get champion costs from Community Dragon data
 */
export async function getChampionCosts(): Promise<Record<string, number>> {
    try {
        const data = await fetchTFTData();
        const costs: Record<string, number> = {};

        // Parse setData for Set 16
        if (data.setData && Array.isArray(data.setData)) {
            const set16 = data.setData.find((set: any) =>
                set.mutator === 'TFTSet16' || set.number === 16
            );

            if (set16 && set16.champions) {
                set16.champions.forEach((champ: any) => {
                    // Filter out non-champion entries (augments, items, etc.)
                    if (champ.apiName && champ.cost && champ.apiName.startsWith('TFT16_')) {
                        // Exclude special non-playable units
                        const excludeList = [
                            'TrainingDummy',
                            'Slime',
                            'Target',
                            'Dummy',
                            'ArmoryKey',
                            'Mercenary',
                            'Atakhan',
                            'AzirSoldier',
                            'FreljordProp',
                            'MalzaharVoid',
                            'Piltover'
                        ];

                        const isExcluded = excludeList.some(excluded =>
                            champ.apiName.toLowerCase().includes(excluded.toLowerCase())
                        );

                        if (!isExcluded) {
                            costs[champ.apiName] = champ.cost;
                        }
                    }
                });
            }
        }

        // If no data found, use fallback
        return Object.keys(costs).length > 0 ? costs : FALLBACK_CHAMPION_COSTS;
    } catch (error) {
        console.error('Using fallback champion costs due to error:', error);
        return FALLBACK_CHAMPION_COSTS;
    }
}

// Helper to clean paths
function convertCdragonPath(path: string): string {
    if (!path) return '';
    return `https://raw.communitydragon.org/latest/game/${path.replace(/^ASSETS\//i, 'assets/').replace(/\.tex$/i, '.png').toLowerCase()}`;
}

/**
 * Get champion data with images from Community Dragon
 */
export async function getChampionDataWithImages(): Promise<Array<{ id: string, name: string, cost: number, image: string, traits: Array<{ name: string, icon: string }> }>> {
    try {
        const data = await fetchTFTData();
        const champions: Array<{ id: string, name: string, cost: number, image: string, traits: Array<{ name: string, icon: string }> }> = [];

        // Parse setData for Set 16
        if (data.setData && Array.isArray(data.setData)) {
            const set16 = data.setData.find((set: any) =>
                set.mutator === 'TFTSet16' || set.number === 16
            );

            if (set16 && set16.champions) {
                // Create a map for traits to get clean names (apiName -> displayName + icon)
                const traitMap: Record<string, { name: string, icon: string }> = {};
                if (set16.traits && Array.isArray(set16.traits)) {
                    set16.traits.forEach((t: any) => {
                        if (t.apiName && t.name) {
                            let iconUrl = convertCdragonPath(t.icon);
                            // Fallback if icon path is missing or empty
                            if (!iconUrl || iconUrl.length < 10) {
                                const pureName = t.apiName.replace(/^TFT\d+_/, '').toLowerCase();
                                iconUrl = `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_16_${pureName}.png`;
                            }
                            traitMap[t.apiName] = {
                                name: t.name,
                                icon: iconUrl
                            };
                        }
                    });
                }

                set16.champions.forEach((champ: any) => {
                    // Filter out non-champion entries
                    if (champ.apiName && champ.cost && champ.apiName.startsWith('TFT16_')) {
                        const excludeList = [
                            'TrainingDummy', 'Slime', 'Target', 'Dummy', 'ArmoryKey', 'Mercenary',
                            'Atakhan', 'AzirSoldier', 'FreljordProp', 'MalzaharVoid', 'Piltover'
                        ];

                        const isExcluded = excludeList.some(excluded =>
                            champ.apiName.toLowerCase().includes(excluded.toLowerCase())
                        );

                        if (!isExcluded && champ.tileIcon) {
                            const imageUrl = convertCdragonPath(champ.tileIcon);

                            // Process traits
                            const champTraits: Array<{ name: string, icon: string }> = [];
                            if (champ.traits && Array.isArray(champ.traits)) {
                                champ.traits.forEach((tName: string) => {
                                    const traitData = traitMap[tName];
                                    if (traitData) {
                                        champTraits.push(traitData);
                                    } else {
                                        // Fallback for missing trait data
                                        champTraits.push({
                                            name: tName.replace(/^TFT16_/, ''),
                                            icon: ''
                                        });
                                    }
                                });
                            }

                            champions.push({
                                id: champ.apiName,
                                name: champ.name || champ.apiName, // Also add name
                                cost: champ.cost,
                                image: imageUrl,
                                traits: champTraits
                            });
                        } else {
                            console.log(`Skipped: ${champ.apiName}, hasCharacterRecord: ${!!champ.character_record}, hasTileIcon: ${!!champ.tileIcon}`);
                        }
                    }
                });
            }
        }

        // If no data found, use fallback
        if (champions.length === 0) {
            for (const [id, cost] of Object.entries(FALLBACK_CHAMPION_COSTS)) {
                champions.push({
                    id: id,
                    name: id.replace(/^TFT\d+_/, ''),
                    cost: cost,
                    image: getChampionImage(id),
                    traits: [] // Fallback traits empty
                });
            }
        }

        return champions;
    } catch (error) {
        console.error('Using fallback champion data due to error:', error);
        const champions: Array<{ id: string, name: string, cost: number, image: string, traits: Array<{ name: string, icon: string }> }> = [];
        for (const [id, cost] of Object.entries(FALLBACK_CHAMPION_COSTS)) {
            champions.push({
                id: id,
                name: id.replace(/^TFT\d+_/, ''),
                cost: cost,
                image: getChampionImage(id),
                traits: []
            });
        }
        return champions;
    }
}

/**
 * Get champion image URL from Community Dragon using tileIcon path
 */
export function getChampionImage(championId: string): string {
    // Try to get from cache first
    if (championDataCache && championDataCache.setData) {
        const set16 = championDataCache.setData.find((set: any) =>
            set.mutator === 'TFTSet16' || set.number === 16
        );

        if (set16 && set16.champions) {
            const champ = set16.champions.find((c: any) => c.apiName === championId);
            if (champ && champ.tileIcon) {
                // Convert ASSETS path to Community Dragon URL
                // ASSETS/Characters/TFT16_Tristana/HUD/TFT16_Tristana_square.TFT_Set16.tex
                // -> https://raw.communitydragon.org/latest/game/assets/characters/tft16_tristana/hud/tft16_tristana_square.tft_set16.png

                const path = champ.tileIcon
                    .replace(/^ASSETS\//i, 'assets/')
                    .replace(/\.tex$/i, '.png')
                    .toLowerCase();

                return `https://raw.communitydragon.org/latest/game/${path}`;
            }
        }
    }

    // Fallback: construct URL from championId
    const lowerId = championId.toLowerCase();
    const cleanId = lowerId.replace(/[^a-z0-9_]/g, '');

    return `https://raw.communitydragon.org/latest/game/assets/characters/${cleanId}/hud/${cleanId}_square.tft_set16.png`;
}

/**
 * Get champion tier/cost (synchronous, uses cache or fallback)
 */
export function getChampionTier(championId: string): string {
    // Try cache first
    if (championDataCache && championDataCache.setData) {
        const set16 = championDataCache.setData.find((set: any) =>
            set.mutator === 'TFTSet16' || set.number === 16
        );

        if (set16 && set16.champions) {
            const champ = set16.champions.find((c: any) => c.apiName === championId);
            if (champ && champ.cost) {
                return champ.cost.toString();
            }
        }
    }

    // Fallback to static data
    if (FALLBACK_CHAMPION_COSTS[championId]) {
        return FALLBACK_CHAMPION_COSTS[championId].toString();
    }

    // Try to find with different prefixes
    const baseId = championId.replace(/^TFT\d+_/, '');
    for (const prefix of ['TFT16_']) {
        const testId = prefix + baseId;
        if (FALLBACK_CHAMPION_COSTS[testId]) {
            return FALLBACK_CHAMPION_COSTS[testId].toString();
        }
    }

    console.log('Unknown champion:', championId);
    return "?";
}

/**
 * Get champion color by tier
 */
export function getChampionColor(tier: string): string {
    switch (tier) {
        case '1': return '#aeaca9'; // Gray
        case '2': return '#22c55e'; // Green
        case '3': return '#0090ff'; // Blue
        case '4': return '#a855f7'; // Pink
        case '5': return '#e7ac0c'; // Yellow
        case '7': return '#ff6b35'; // Orange
        case '11': return '#ff0000'; // Red
        default: return 'white';
    }
}

// Export for backward compatibility
export const CHAMPION_COSTS = FALLBACK_CHAMPION_COSTS;
