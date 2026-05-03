// ========================================================
// JJK: CURSED CLASH — Game Configuration & Constants
// ========================================================

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── Physics ──────────────────────────────────────────────
export const PHYSICS = {
    GRAVITY: 1200,
    GROUND_Y: 550,
    DRAG_X: 900,
    WALL_LEFT: 60,
    WALL_RIGHT: 1220,
    BOUNCE: 0,
};

// ── Fighter Defaults ─────────────────────────────────────
export const FIGHTER_DEFAULTS = {
    MAX_HP: 3000,
    MAX_CE: 200,
    CE_REGEN_RATE: 10,         // CE per second (passive) - increased for faster gameplay
    CE_REGEN_ON_HIT: 12,      // CE gained when landing a hit
    CE_REGEN_ON_DAMAGE: 8,    // CE gained when taking damage
    SPEED: 320,
    JUMP_FORCE: -620,
    WEIGHT: 100,
    BODY_WIDTH: 75,
    BODY_HEIGHT: 150,
};

// ── Attack Data ──────────────────────────────────────────
export const ATTACKS = {
    LIGHT: {
        damage: 15,
        knockbackX: 80,
        knockbackY: -20,
        stunDuration: 150,
        range: 65,
        hitboxW: 55,
        hitboxH: 40,
        startup: 60,
        active: 80,
        recovery: 300,       // 300ms cooldown to prevent spam
        ceGain: 3,
        breaksBlock: false,
        blockKnockMult: 0.1,  // Barely pushes if blocked
    },
    MEDIUM: {
        damage: 30,
        knockbackX: 250,
        knockbackY: -80,
        stunDuration: 300,
        range: 80,
        hitboxW: 65,
        hitboxH: 50,
        startup: 120,
        active: 120,
        recovery: 250,
        ceGain: 8,
        breaksBlock: false,
        blockKnockMult: 0.3,  // Reduced push if blocked
    },
    HEAVY: {
        damage: 50,
        knockbackX: 650,
        knockbackY: -300,
        stunDuration: 600,
        range: 95,
        hitboxW: 80,
        hitboxH: 60,
        startup: 250,
        active: 150,
        recovery: 450,
        ceGain: 12,
        breaksBlock: true,     // Breaks normal block
        blockKnockMult: 1.0,   // Full launch even through block
    },
};

// ── Cursed Energy Ability Costs ──────────────────────────
export const CE_COSTS = {
    SKILL_1: 30,
    SKILL_2: 60,
    DOMAIN: 50,
    MAXIMUM: 150,
};

// ── Domain Expansion ─────────────────────────────────────
export const DOMAIN = {
    DURATION: 15000,            // default baseline
    CE_DRAIN_RATE: 4,           // VERY slow drain so domain lasts long as requested
    SURE_HIT_DPS: 50,          // Damage per tick
    SURE_HIT_INTERVAL: 1000,   // ms between Sure-Hit ticks
    CLASH_WINDOW: 1200,        // ms window to counter-domain
    FATIGUE_DURATION: 10000,   // ms of no CE regen after domain ends
    CAST_INVULN_TIME: 1500,    // ms of invulnerability while casting
};

// ── Domain Clash QTE ─────────────────────────────────────
export const DOMAIN_CLASH = {
    TIME_LIMIT: 16000,          // 16 seconds for sequence QTE
    PROGRESS_PER_HIT: 2.5,     // Tug-of-war progress per correct key
    P1_SEQUENCE: ['U', 'I', 'J', 'A', 'S', 'D', 'W'],
    P2_SEQUENCE: ['UP', 'DOWN', 'LEFT', 'RIGHT', 'NUMPAD_ONE'],
};

// ── Rounds ───────────────────────────────────────────────
export const ROUNDS = {
    BEST_OF: 3,
    PRE_ROUND_DELAY: 2000,
    POST_ROUND_DELAY: 3000,
    POST_MATCH_DELAY: 5000,
};

// ── Input Key Mappings ───────────────────────────────────
export const KEY_MAPS = {
    P1: {
        LEFT: 'A',
        RIGHT: 'D',
        UP: 'W',
        DOWN: 'S',
        LIGHT: 'J',
        MEDIUM: 'K',
        HEAVY: 'L',
        SPECIAL: 'U',
        DOMAIN: 'I',
        BLOCK: 'SHIFT',
    },
    P2: {
        LEFT: 'LEFT',
        RIGHT: 'RIGHT',
        UP: 'UP',
        DOWN: 'DOWN',
        LIGHT: 'NUMPAD_ONE',
        MEDIUM: 'NUMPAD_TWO',
        HEAVY: 'NUMPAD_THREE',
        SPECIAL: 'NUMPAD_FOUR',
        DOMAIN: 'NUMPAD_FIVE',
        BLOCK: 'NUMPAD_ZERO',
    },
};

// ── Character Roster Data ────────────────────────────────
export const CHARACTERS = {
    GOJO: {
        id: 'gojo',
        name: 'Gojo Satoru',
        title: 'The Strongest',
        colors: {
            primary: 0xE8E8FF,
            secondary: 0x00D4FF,
            energy: 0x4488FF,
            accent: 0xAA00FF,
            skin: 0xFFE0CC,
            hair: 0xF5F5FF,
        },
        stats: {
            maxHp: 4000,
            speed: 340,
            power: 0.9,
            defense: 1.2,
            ceRegen: 3.5,
            weight: 95,
            jumpForce: -640,
            domainDuration: 45000,
            domainPhase1: 20000,
        },
        skills: {
            skill1: { name: 'Ao — Blue', cost: 30, damage: 50, type: 'projectile' },
            skill2: { name: 'Aka — Red', cost: 60, damage: 80, type: 'projectile_heavy' },
            domain: { name: 'Unlimited Void', cost: 100, sureHitType: 'paralysis' },
            maximum: { name: 'Hollow Purple', cost: 150, damage: 500, type: 'beam' },
        },
        domainBg: 'gojo_void',
    },
    SUKUNA: {
        id: 'sukuna',
        name: 'Ryomen Sukuna',
        title: 'King of Curses',
        colors: {
            primary: 0x330000,
            secondary: 0xFF2200,
            energy: 0xFF4444,
            accent: 0xFF0066,
            skin: 0xE8D0B8,
            hair: 0xFF8899,
        },
        stats: {
            maxHp: 3500,
            speed: 310,
            power: 1.3,
            defense: 0.9,
            ceRegen: 2.8,
            weight: 110,
            jumpForce: -600,
            domainDuration: 35000,
            domainPhase1: 10000,
        },
        skills: {
            skill1: { name: 'Dismantle', cost: 30, damage: 45, type: 'slash_ranged' },
            skill2: { name: 'Cleave', cost: 60, damage: 90, type: 'slash_aoe' },
            domain: { name: 'Malevolent Shrine', cost: 100, sureHitType: 'dps' },
            maximum: { name: 'Divine Flame', cost: 150, damage: 500, type: 'fire' },
        },
        domainBg: 'sukuna_shrine',
    },
    TOJI: {
        id: 'toji',
        name: 'Toji Fushiguro',
        title: 'The Sorcerer Killer',
        colors: {
            primary: 0x2A2A2A,
            secondary: 0x55FF55,
            energy: 0x44DD44,
            accent: 0x00AA00,
            skin: 0xE8D0B8,
            hair: 0x222222,
        },
        stats: {
            maxHp: 3200,
            speed: 400,
            power: 1.4,
            defense: 0.85,
            ceRegen: 8.0,
            weight: 105,
            jumpForce: -700,
            domainDuration: 0,
            domainPhase1: 0,
        },
        skills: {
            skill1: { name: 'Inverted Spear', cost: 0, damage: 70, type: 'melee_lunge' },
            skill2: { name: 'Chain Strike', cost: 0, damage: 55, type: 'ranged_chain' },
            domain: null,
            maximum: { name: 'Playful Cloud', cost: 0, damage: 400, type: 'heavy_smash' },
        },
        domainBg: null,
    },
    KENJAKU: {
        id: 'kenjaku',
        name: 'Kenjaku',
        title: 'The Ancient Sorcerer',
        colors: {
            primary: 0x1A1A3A,
            secondary: 0x8844CC,
            energy: 0xAA66FF,
            accent: 0xCC88FF,
            skin: 0xE8D0B8,
            hair: 0x111111,
        },
        stats: {
            maxHp: 3800,
            speed: 310,
            power: 1.0,
            defense: 1.1,
            ceRegen: 4.0,
            weight: 95,
            jumpForce: -620,
            domainDuration: 30000,
            domainPhase1: 15000,
        },
        skills: {
            skill1: { name: 'Cursed Spirit Manipulation', cost: 35, damage: 60, type: 'summon' },
            skill2: { name: 'Maximum Uzumaki', cost: 70, damage: 110, type: 'beam' },
            domain: { name: 'Womb Profusion', cost: 100, sureHitType: 'dps' },
            maximum: { name: 'Gravity Crush', cost: 150, damage: 450, type: 'gravity' },
        },
        domainBg: 'kenjaku_domain',
    },
    ISHIGORI: {
        id: 'ishigori',
        name: 'Ryu Ishigori',
        title: 'The Reincarnated Sorcerer',
        colors: {
            primary: 0x2A1A0A,
            secondary: 0xFF8800,
            energy: 0xFFAA33,
            accent: 0xFFCC00,
            skin: 0xE8D0B8,
            hair: 0x333333,
        },
        stats: {
            maxHp: 3800,
            speed: 290,
            power: 1.5,
            defense: 0.85,
            ceRegen: 3.0,
            weight: 120,
            jumpForce: -580,
            domainDuration: 0,
            domainPhase1: 0,
        },
        skills: {
            skill1: { name: 'Granite Blast', cost: 30, damage: 70, type: 'projectile_heavy' },
            skill2: { name: 'Cursed Energy Discharge', cost: 60, damage: 120, type: 'beam' },
            domain: { name: 'Granite Fortress', cost: 100, sureHitType: 'buff' },
            maximum: { name: 'Maximum Output', cost: 150, damage: 550, type: 'beam' },
        },
        domainBg: null,
    },
    KUROROSHI: {
        id: 'kuroroshi',
        name: 'Kuroroshi',
        title: 'The Cursed Cockroach',
        colors: {
            primary: 0x1A0A0A,
            secondary: 0x664422,
            energy: 0x886633,
            accent: 0xAA7744,
            skin: 0x332211,
            hair: 0x0A0A0A,
        },
        stats: {
            maxHp: 3000,
            speed: 370,
            power: 0.9,
            defense: 1.3,
            ceRegen: 5.0,
            weight: 80,
            jumpForce: -680,
            domainDuration: 0,
            domainPhase1: 0,
        },
        skills: {
            skill1: { name: 'Cockroach Swarm', cost: 25, damage: 35, type: 'swarm' },
            skill2: { name: 'Festering Plague', cost: 55, damage: 60, type: 'poison_aoe' },
            domain: { name: 'Swarm Shield', cost: 100, sureHitType: 'counter' },
            maximum: { name: 'Plague of Decay', cost: 150, damage: 400, type: 'poison' },
        },
        domainBg: null,
    },
    SUKUNA_20: {
        id: 'sukuna_20',
        name: 'Sukuna — True Form',
        title: 'King of Curses (20 Fingers)',
        colors: {
            primary: 0x1A0000,
            secondary: 0xFF0000,
            energy: 0xCC0022,
            accent: 0xFF2244,
            skin: 0xD8B8A0,
            hair: 0xCC4466,
        },
        stats: {
            maxHp: 5000,
            speed: 350,
            power: 2.0,
            defense: 1.5,
            ceRegen: 6.0,
            weight: 130,
            jumpForce: -650,
            domainDuration: 60000,
            domainPhase1: 25000,
        },
        skills: {
            skill1: { name: 'World-Splitting Dismantle', cost: 25, damage: 80, type: 'slash_ranged' },
            skill2: { name: 'Simple Domain', cost: 15, damage: 0, type: 'shield' },
            domain: { name: 'Malevolent Shrine — Barrierless', cost: 100, sureHitType: 'dps' },
            maximum: { name: 'Divine Flame — Fuga', cost: 120, damage: 700, type: 'bleed_net' },
        },
        domainBg: 'assets/domains/sukuna_shrine.png',
        isCurse: true,
    },
    YUJI: {
        id: 'yuji',
        name: 'Yuji Itadori',
        title: 'The Tiger of West Junior High',
        colors: {
            primary: 0x1A1A3E,
            secondary: 0xFF6600,
            energy: 0xFF8833,
            accent: 0xFFAA44,
            skin: 0xF5D0B0,
            hair: 0xDD7788,
        },
        stats: {
            maxHp: 2800,
            speed: 370,
            power: 1.2,
            defense: 0.95,
            ceRegen: 3.5,
            weight: 95,
            jumpForce: -660,
            domainDuration: 0,
            domainPhase1: 0,
        },
        skills: {
            skill1: { name: 'Divergent Fist', cost: 20, damage: 70, type: 'melee_delayed' },
            skill2: { name: 'Piercing Blood', cost: 45, damage: 90, type: 'beam' },
            domain: null,
            maximum: { name: 'Super Black Flash', cost: 100, damage: 600, type: 'melee_combo' },
        },
        domainBg: null,
    },
    MAHITO: {
        id: 'mahito',
        name: 'Mahito',
        title: 'Special Grade Cursed Spirit',
        colors: {
            primary: 0x1A2A2A,
            secondary: 0x00CCAA,
            energy: 0x00DDBB,
            accent: 0x00FFAA,
            skin: 0xBBCCBB,
            hair: 0x5577AA,
        },
        stats: {
            maxHp: 3400,
            speed: 330,
            power: 1.1,
            defense: 1.25,
            ceRegen: 3.8,
            weight: 90,
            jumpForce: -630,
            domainDuration: 25000,
            domainPhase1: 12000,
        },
        skills: {
            skill1: { name: 'Idle Transfiguration', cost: 15, damage: 0, type: 'buff_morph' },
            skill2: { name: 'Polymorphic Soul Isomer', cost: 40, damage: 65, type: 'summon' },
            domain: { name: 'Self-Embodiment of Perfection', cost: 100, sureHitType: 'soul_touch' },
            maximum: { name: 'Instant Spirit Body', cost: 120, damage: 0, type: 'transform' },
        },
        domainBg: 'dagon_domain',
        isCurse: true,
    },
    YUTA: {
        id: 'yuta',
        name: 'Yuta Okkotsu',
        title: 'Special Grade Sorcerer',
        colors: {
            primary: 0x111133,
            secondary: 0xFF88CC,
            energy: 0xFF66AA,
            accent: 0xFF44AA,
            skin: 0xF0D0B0,
            hair: 0x222244,
        },
        stats: {
            maxHp: 3200,
            speed: 360,
            power: 1.15,
            defense: 1.0,
            ceRegen: 4.0,
            weight: 88,
            jumpForce: -650,
            domainDuration: 20000,
            domainPhase1: 10000,
        },
        skills: {
            skill1: { name: 'Katana Rush', cost: 18, damage: 60, type: 'melee_combo' },
            skill2: { name: 'Thin Ice Breaker', cost: 30, damage: 75, type: 'shockwave' },
            domain: { name: 'Authentic Mutual Love', cost: 60, sureHitType: 'copy' },
            maximum: { name: 'Love Beam (Rika)', cost: 100, damage: 350, type: 'beam' },
        },
        domainBg: 'yuta_domain',
    },
    NAOYA: {
        id: 'naoya',
        name: 'Naoya Zenin',
        title: 'Projection Sorcery',
        colors: { primary: 0x222255, secondary: 0x00CCAA, energy: 0x00FFCC, accent: 0x00AA88, skin: 0xF0D0B0, hair: 0xCCBB77 },
        stats: { maxHp: 2600, speed: 380, power: 1.05, defense: 0.85, ceRegen: 3.5, weight: 80, jumpForce: -680, domainDuration: 15000, domainPhase1: 8000 },
        skills: {
            skill1: { name: 'Projection Dash', cost: 15, damage: 30, type: 'teleport' },
            skill2: { name: 'Speed Combo', cost: 30, damage: 72, type: 'multi_hit' },
            domain: { name: 'Time Cell Moon Palace', cost: 100, sureHitType: 'movement_cuts' },
            maximum: { name: 'Subsonic Charge', cost: 80, damage: 160, type: 'dash' },
        },
        domainBg: null,
    },
    HAKARI: {
        id: 'hakari',
        name: 'Kinji Hakari',
        title: 'Idle Death Gamble',
        colors: { primary: 0x222222, secondary: 0xFFCC00, energy: 0xFFDD00, accent: 0xFF4400, skin: 0xF0D0B0, hair: 0xBB8833 },
        stats: { maxHp: 2800, speed: 340, power: 1.0, defense: 0.95, ceRegen: 3.0, weight: 90, jumpForce: -650, domainDuration: 15000, domainPhase1: 8000 },
        skills: {
            skill1: { name: 'Shutter Doors', cost: 15, damage: 30, type: 'trap' },
            skill2: { name: 'Pachinko Balls', cost: 20, damage: 60, type: 'projectile' },
            domain: { name: 'Idle Death Gamble', cost: 80, sureHitType: 'jackpot_rng' },
            maximum: { name: 'Push Kick', cost: 25, damage: 45, type: 'melee' },
        },
        domainBg: null,
    },
    HIGURUMA: {
        id: 'higuruma',
        name: 'Hiromi Higuruma',
        title: 'Deadly Sentencing',
        colors: { primary: 0x1A1A2E, secondary: 0x8B0000, energy: 0x666666, accent: 0x8B7355, skin: 0xF0D0B0, hair: 0x111122 },
        stats: { maxHp: 2500, speed: 310, power: 1.1, defense: 0.90, ceRegen: 3.5, weight: 85, jumpForce: -650, domainDuration: 15000, domainPhase1: 8000 },
        skills: {
            skill1: { name: 'Gavel Sentence', cost: 15, damage: 40, type: 'melee' },
            skill2: { name: 'Hammer of Justice', cost: 25, damage: 60, type: 'aoe' },
            domain: { name: 'Deadly Sentencing', cost: 100, sureHitType: 'tribunal' },
            maximum: { name: 'Judicial Citation', cost: 20, damage: 15, type: 'projectile' },
        },
        domainBg: null,
    },
    NANAMI: {
        id: 'nanami',
        name: 'Kento Nanami',
        title: '7:3 Sorcerer',
        colors: { primary: 0xEEDDCC, secondary: 0x444444, energy: 0x2288CC, accent: 0xFF0000, skin: 0xF0D0B0, hair: 0xDDCC88 },
        stats: { maxHp: 2400, speed: 330, power: 1.1, defense: 0.90, ceRegen: 3.5, weight: 80, jumpForce: -650, domainDuration: 15000, domainPhase1: 8000 },
        skills: {
            skill1: { name: 'Tajo de Relojería', cost: 15, damage: 45, type: 'melee' },
            skill2: { name: 'Colapso', cost: 25, damage: 65, type: 'aoe' },
            domain: { name: 'Overtime', cost: 80, sureHitType: 'buff' },
            maximum: { name: 'Ráfaga Embotada', cost: 30, damage: 70, type: 'combo' },
        },
        domainBg: null,
    },
    TODO: {
        id: 'todo',
        name: 'Aoi Todo',
        title: 'The Brother',
        colors: { primary: 0x222222, secondary: 0x333333, energy: 0xAA22AA, accent: 0xAA22AA, skin: 0x996644, hair: 0x111111 },
        stats: { maxHp: 2800, speed: 340, power: 1.15, defense: 0.95, ceRegen: 3.0, weight: 95, jumpForce: -670, domainDuration: 10000, domainPhase1: 5000 },
        skills: {
            skill1: { name: 'Boogie Woogie', cost: 10, damage: 0, type: 'utility' },
            skill2: { name: 'Patada Gran Alcance', cost: 20, damage: 55, type: 'melee' },
            domain: { name: 'Best Friend Tag-Team', cost: 80, sureHitType: 'buff' },
            maximum: { name: 'Black Flash', cost: 30, damage: 100, type: 'melee' },
        },
        domainBg: null,
    },
    JOGO: {
        id: 'jogo',
        name: 'Jogo',
        title: 'The Earth Disaster',
        colors: { primary: 0x441111, secondary: 0xFF4400, energy: 0xFF6600, accent: 0xFF2200, skin: 0x665555, hair: 0x000000 },
        stats: { maxHp: 2000, speed: 420, power: 1.6, defense: 0.70, ceRegen: 4.5, weight: 70, jumpForce: -700, domainDuration: 15000, domainPhase1: 8000 },
        skills: {
            skill1: { name: 'Ember Insects', cost: 20, damage: 45, type: 'projectile' },
            skill2: { name: 'Volcanic Eruption', cost: 35, damage: 80, type: 'aoe' },
            domain: { name: 'Coffin of Iron Mountain', cost: 100, sureHitType: 'dps' },
            maximum: { name: 'Maximum: Meteor', cost: 120, damage: 450, type: 'aoe' },
        },
        domainBg: 'sukuna_shrine',
        isCurse: true,
    },
    DAGON: {
        id: 'dagon',
        name: 'Dagon',
        title: 'The Sea Disaster',
        colors: { primary: 0x112244, secondary: 0x0088FF, energy: 0x00CCFF, accent: 0x0066AA, skin: 0x992222, hair: 0x000000 },
        stats: { maxHp: 4500, speed: 250, power: 0.9, defense: 1.40, ceRegen: 3.5, weight: 150, jumpForce: -550, domainDuration: 15000, domainPhase1: 8000 },
        skills: {
            skill1: { name: 'Water Prison', cost: 20, damage: 20, type: 'projectile' },
            skill2: { name: 'Shikigami Swarm', cost: 25, damage: 40, type: 'seeking' },
            domain: { name: 'Horizon of the Captivating Skandha', cost: 100, sureHitType: 'dps' },
            maximum: { name: 'Leviathan Crash', cost: 100, damage: 500, type: 'aoe' },
        },
        domainBg: 'jogo_domain',
        isCurse: true,
    },
    HANAMI: {
        id: 'hanami',
        name: 'Hanami',
        title: 'The Vigor of Nature',
        colors: { primary: 0x228B22, secondary: 0x8B4513, energy: 0x32CD32, accent: 0xFFD700, skin: 0xD2B48C, hair: 0x006400 },
        stats: { maxHp: 4200, speed: 280, power: 1.1, defense: 1.5, ceRegen: 3.2, weight: 150, jumpForce: -550, domainDuration: 25000, domainPhase1: 10000 },
        skills: {
            skill1: { name: 'Wood Buds', cost: 30, damage: 30, type: 'projectile_drain' },
            skill2: { name: 'Emerging Roots', cost: 45, damage: 60, type: 'aoe_knockup' },
            domain: { name: 'Ceremonial Sea of Flowers', cost: 100, sureHitType: 'lifesteal' },
            maximum: { name: 'Disaster Arm', cost: 80, damage: 150, type: 'heavy_block_breaker' },
        },
        domainBg: 'kenjaku_domain', // Placeholder
        isCurse: true,
    },
    CHOSO: {
        id: 'choso',
        name: 'Choso',
        title: 'Death Painting Womb',
        colors: { primary: 0x4B0082, secondary: 0x8B0000, energy: 0xDC143C, accent: 0x8A2BE2, skin: 0xF5F5DC, hair: 0x191970 },
        stats: { maxHp: 3100, speed: 350, power: 1.25, defense: 0.9, ceRegen: 4.5, weight: 95, jumpForce: -680, domainDuration: 0, domainPhase1: 0 },
        skills: {
            skill1: { name: 'Piercing Blood', cost: 40, damage: 85, type: 'beam_fast' },
            skill2: { name: 'Supernova', cost: 60, damage: 70, type: 'projectile_radial' },
            domain: null,
            maximum: { name: 'Slicing Exorcism', cost: 55, damage: 90, type: 'dash_slice' },
        },
        domainBg: null,
        isCurse: true,
    },
    MEGUMI: {
        id: 'megumi',
        name: 'Megumi Fushiguro',
        title: 'Ten Shadows Sorcerer',
        colors: { primary: 0x000033, secondary: 0x006633, energy: 0x00AAFF, accent: 0xFFFFFF, skin: 0xF5DEB3, hair: 0x000000 },
        stats: { maxHp: 2800, speed: 360, power: 1.0, defense: 0.9, ceRegen: 4.0, weight: 80, jumpForce: -650, domainDuration: 20000, domainPhase1: 10000 },
        skills: {
            skill1: { name: 'Divine Dogs: Totality', cost: 20, damage: 40, type: 'dash_bite' },
            skill2: { name: 'Nue: Electric Dive', cost: 35, damage: 55, type: 'stun_projectile' },
            skill3: { name: 'Toad & Serpent', cost: 40, damage: 60, type: 'grab_launch' },
            skill4: { name: 'Rabbit Escape', cost: 25, damage: 0, type: 'utility_evade' },
            domain: { name: 'Chimera Shadow Garden', cost: 100, sureHitType: 'clones' },
            maximum: { name: 'Eight-Handled Sword Mahoraga', cost: 120, damage: 1000, type: 'one_shot_risk' },
        },
        domainBg: 'jogo_domain', // Placeholder
        isCurse: true,
    },
    MAHORAGA: {
        id: 'mahoraga',
        name: 'Eight-Handled Sword Mahoraga',
        title: 'Divine General',
        colors: { primary: 0xFFFFFF, secondary: 0xAAAAAA, energy: 0xFFFFFF, accent: 0x000000, skin: 0xFFFFFF, hair: 0x000000 },
        stats: { maxHp: 5000, speed: 240, power: 1.5, defense: 1.0, ceRegen: 5.0, weight: 500, jumpForce: -500, domainDuration: 0, domainPhase1: 0 },
        skills: {
            skill1: { name: 'Extermination Sword', cost: 30, damage: 90, type: 'physical_special', guardBreak: true },
            skill2: { name: 'Adaptation Charge', cost: 40, damage: 60, type: 'dash_armor' },
            skill3: { name: 'Ground Smash', cost: 35, damage: 70, type: 'physical_area' },
            skill4: { name: 'The Wheel', cost: 20, damage: 0, type: 'utility_heal' },
            domain: { name: 'Total Adaptation', cost: 100, sureHitType: 'immune' },
        },
        domainBg: 'kenjaku_domain', // Placeholder
    },
};

// ── Visual Constants ─────────────────────────────────────
export const HUD_STYLE = {
    BAR_WIDTH: 510,
    BAR_HEIGHT: 28,
    CE_BAR_HEIGHT: 14,
    BORDER_WIDTH: 3,
    BORDER_COLOR: 0xD4A843,
    BORDER_COLOR_DARK: 0x8B6914,
    HP_COLOR_HIGH: 0x00CC44,
    HP_COLOR_MED: 0xCCAA00,
    HP_COLOR_LOW: 0xCC2200,
    CE_COLOR: 0x7744FF,
    CE_GLOW: 0xAA66FF,
    BG_COLOR: 0x1A1A2E,
    AVATAR_RADIUS: 40,
    AVATAR_BORDER: 4,
    MARGIN: 20,
    TIMER_Y: 18,
};

export const COLORS = {
    MENU_BG: 0x0A0A12,
    MENU_ACCENT: 0x7722CC,
    MENU_GOLD: 0xD4A843,
    MENU_TEXT: 0xFFFFFF,
    MENU_TEXT_DIM: 0x888899,
    DAMAGE_NORMAL: 0xFF4444,
    DAMAGE_CE: 0xBB44FF,
    DAMAGE_CRITICAL: 0xFFAA00,
};
