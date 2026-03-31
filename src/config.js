// ========================================================
// JJK: CURSED CLASH — Game Configuration & Constants
// ========================================================

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── Physics ──────────────────────────────────────────────
export const PHYSICS = {
    GRAVITY: 1200,
    GROUND_Y: 620,
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
    BODY_WIDTH: 55,
    BODY_HEIGHT: 110,
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
    DOMAIN: 100,
    MAXIMUM: 150,
};

// ── Domain Expansion ─────────────────────────────────────
export const DOMAIN = {
    DURATION: 15000,            // default baseline
    CE_DRAIN_RATE: 13.33,       // replaced with dynamic calculated drain rate per character
    SURE_HIT_DPS: 50,          // Damage per tick
    SURE_HIT_INTERVAL: 1000,   // ms between Sure-Hit ticks
    CLASH_WINDOW: 1200,        // ms window to counter-domain
    FATIGUE_DURATION: 10000,   // ms of no CE regen after domain ends
    CAST_INVULN_TIME: 1500,    // ms of invulnerability while casting
};

// ── Domain Clash QTE ─────────────────────────────────────
export const DOMAIN_CLASH = {
    TIME_LIMIT: 6000,           // ms for mash tug-of-war
    P1_MASH_KEY: 'J',
    P2_MASH_KEY: '1',
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
            maxHp: 5000,
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
            maxHp: 4500,
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
};

// ── Visual Constants ─────────────────────────────────────
export const HUD_STYLE = {
    BAR_WIDTH: 420,
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
