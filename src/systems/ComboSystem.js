// ========================================================
// Combo System — Input buffer + chain detection
// ========================================================

export default class ComboSystem {
    constructor(fighter) {
        this.fighter = fighter;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboDuration = 1500; // ms — combo resets after this
        this.lastAttackType = null;
        this.chainTable = {
            'LIGHT': ['LIGHT', 'MEDIUM', 'HEAVY', 'SPECIAL'],
            'MEDIUM': ['MEDIUM', 'HEAVY', 'SPECIAL'],
            'HEAVY': ['SPECIAL'],
            'SPECIAL': [],
        };
    }

    /** Register a successful hit */
    registerHit(attackType) {
        if (this.canChain(attackType)) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.lastAttackType = attackType;
        this.comboTimer = this.comboDuration;
    }

    /** Check if current attack can chain from last attack */
    canChain(attackType) {
        if (!this.lastAttackType || this.comboTimer <= 0) return false;
        const allowed = this.chainTable[this.lastAttackType];
        return allowed && allowed.includes(attackType);
    }

    /** Get damage multiplier based on combo length */
    getDamageMultiplier() {
        if (this.comboCount <= 1) return 1.0;
        if (this.comboCount <= 3) return 0.9; // Damage scaling to prevent infinites
        if (this.comboCount <= 5) return 0.75;
        return 0.6;
    }

    /** Update combo timer */
    update(dt) {
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.reset();
            }
        }
    }

    /** Reset combo */
    reset() {
        this.comboCount = 0;
        this.comboTimer = 0;
        this.lastAttackType = null;
    }

    getCount() {
        return this.comboCount;
    }
}
