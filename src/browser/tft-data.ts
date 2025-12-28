// TFT Set 16 (Magic n' Mayhem) Champion Cost Data
// Based on user-provided tier list

const CHAMPION_COSTS: Record<string, number> = {
    // 1 Cost Champions (Gray)
    "TFT16_Anivia": 1,
    "TFT16_Blitzcrank": 1,
    "TFT16_Briar": 1,
    "TFT16_Caitlyn": 1,
    "TFT16_Illaoi": 1,
    "TFT16_JarvanIV": 1,
    "TFT16_Jarvan": 1,
    "TFT16_Jhin": 1,
    "TFT16_KogMaw": 1,
    "TFT16_Kog'Maw": 1,
    "TFT16_Lulu": 1,
    "TFT16_Qiyana": 1,
    "TFT16_Rumble": 1,
    "TFT16_Shen": 1,
    "TFT16_Sona": 1,
    "TFT16_Viego": 1,

    // 2 Cost Champions (Green)
    "TFT16_Aphelios": 2,
    "TFT16_Ashe": 2,
    "TFT16_Bard": 2,
    "TFT16_Chogath": 2,
    "TFT16_ChoGath": 2,
    "TFT16_Cho'Gath": 2,
    "TFT16_Ekko": 2,
    "TFT16_Graves": 2,
    "TFT16_Neeko": 2,
    "TFT16_Orianna": 2,
    "TFT16_Poppy": 2,
    "TFT16_RekSai": 2,
    "TFT16_Rek'Sai": 2,
    "TFT16_Sion": 2,
    "TFT16_Teemo": 2,
    "TFT16_Tristana": 2,
    "TFT16_Tryndamere": 2,
    "TFT16_TwistedFate": 2,
    "TFT16_Vi": 2,
    "TFT16_XinZhao": 2,
    "TFT16_Yasuo": 2,
    "TFT16_Yorick": 2,

    // 3 Cost Champions (Blue)
    "TFT16_Ahri": 3,
    "TFT16_Darius": 3,
    "TFT16_DrMundo": 3,
    "TFT16_Draven": 3,
    "TFT16_Gangplank": 3,
    "TFT16_Gwen": 3,
    "TFT16_Jinx": 3,
    "TFT16_Kennen": 3,
    "TFT16_Kobuko": 3,
    "TFT16_KobukoYuumi": 3,
    "TFT16_LeBlanc": 3,
    "TFT16_Leona": 3,
    "TFT16_Loris": 3,
    "TFT16_Malzahar": 3,
    "TFT16_Milio": 3,
    "TFT16_Nautilus": 3,
    "TFT16_Sejuani": 3,
    "TFT16_Vayne": 3,
    "TFT16_Zoe": 3,

    // 4 Cost Champions (Pink)
    "TFT16_Ambessa": 4,
    "TFT16_BelVeth": 4,
    "TFT16_Bel'Veth": 4,
    "TFT16_Braum": 4,
    "TFT16_Diana": 4,
    "TFT16_Fizz": 4,
    "TFT16_Garen": 4,
    "TFT16_Kaisa": 4,
    "TFT16_Kai'Sa": 4,
    "TFT16_Kalista": 4,
    "TFT16_Lissandra": 4,
    "TFT16_Lux": 4,
    "TFT16_MissFortune": 4,
    "TFT16_Nasus": 4,
    "TFT16_Nidalee": 4,
    "TFT16_Renekton": 4,
    "TFT16_Seraphine": 4,
    "TFT16_Singed": 4,
    "TFT16_Skarner": 4,
    "TFT16_Swain": 4,
    "TFT16_Taric": 4,
    "TFT16_Veigar": 4,
    "TFT16_Warwick": 4,
    "TFT16_Wukong": 4,
    "TFT16_Yone": 4,
    "TFT16_Yunara": 4,
    "TFT16_VadisHarbinger": 4, // Vadi'nin Alameti

    // 5 Cost Champions (Yellow)
    "TFT16_Aatrox": 5,
    "TFT16_Annie": 5,
    "TFT16_Azir": 5,
    "TFT16_Fiddlesticks": 5,
    "TFT16_Galio": 5,
    "TFT16_Kindred": 5,
    "TFT16_Lucian": 5, // Lucian ve Senna
    "TFT16_LucianSenna": 5,
    "TFT16_Mel": 5,
    "TFT16_Ornn": 5,
    "TFT16_Sett": 5,
    "TFT16_Shyvana": 5,
    "TFT16_THex": 5,
    "TFT16_T-Hex": 5,
    "TFT16_TahmKench": 5,
    "TFT16_Thresh": 5,
    "TFT16_Volibear": 5,
    "TFT16_Xerath": 5,
    "TFT16_Ziggs": 5,
    "TFT16_Zilean": 5,

    // 7 Cost Champions (Orange/Special)
    "TFT16_AurelionSol": 7,
    "TFT16_BaronNashor": 7,
    "TFT16_Brock": 7,
    "TFT16_Ryze": 7,
    "TFT16_Sylas": 7,
    "TFT16_Zaahen": 7,

    // 11 Cost Special (Red)
    "TFT16_Tibbers": 11,
};

export function getChampionTier(championId: string): string {
    // Direct match
    if (CHAMPION_COSTS[championId]) {
        return CHAMPION_COSTS[championId].toString();
    }

    // Try to find with different prefixes
    const baseId = championId.replace(/^TFT\d+_/, '');
    for (const prefix of ['TFT16_']) {
        const testId = prefix + baseId;
        if (CHAMPION_COSTS[testId]) {
            return CHAMPION_COSTS[testId].toString();
        }
    }

    // Last resort: check if champion name contains any known champion
    const lowerChampionId = championId.toLowerCase();
    for (const [key, value] of Object.entries(CHAMPION_COSTS)) {
        const keyName = key.split('_').pop()?.toLowerCase() || '';
        if (keyName && keyName.length > 2 && lowerChampionId.includes(keyName)) {
            return value.toString();
        }
    }

    // Unknown champion
    console.log('Unknown champion:', championId);
    return "?";
}

export function getChampionColor(tier: string): string {
    switch (tier) {
        case '1': return '#808080'; // Gray
        case '2': return '#11b288'; // Green
        case '3': return '#207ac7'; // Blue
        case '4': return '#c38bff'; // Pink
        case '5': return '#f9d342'; // Yellow
        case '7': return '#ff6b35'; // Orange (new tier)
        case '11': return '#ff0000'; // Red (special)
        default: return 'white';
    }
}
