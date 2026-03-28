// ========================================================
// Cursed Energy System — Passive regen, costs, fatigue
// ========================================================

import { FIGHTER_DEFAULTS, CE_COSTS, DOMAIN } from '../config.js';

export default class CursedEnergySystem {
    constructor(fighter) {
        this.fighter = fighter;
        this.maxCe = FIGHTER_DEFAULTS.MAX_CE;
        this.ce = 0;
        this.regenRate = fighter.charData?.stats?.ceRegen || FIGHTER_DEFAULTS.CE_REGEN_RATE;
        this.isFatigued = false;
        this.fatigueTimer = 0;
        this.isDomainActive = false;
        
        // Calculate drain rate based on max duration
        const domainDurMs = fighter.charData?.stats?.domainDuration || DOMAIN.DURATION;
        this.domainDrainRate = this.maxCe / (domainDurMs / 1000);
    }

    update(dt) {
        const dtSec = dt / 1000;

        // Fatigue countdown
        if (this.isFatigued) {
            this.fatigueTimer -= dt;
            if (this.fatigueTimer <= 0) {
                this.isFatigued = false;
                this.fatigueTimer = 0;
            }
            return; // No regen during fatigue
        }

        // Domain CE drain
        if (this.isDomainActive) {
            this.ce -= this.domainDrainRate * dtSec;
            if (this.ce <= 0) {
                this.ce = 0;
                this.endDomain();
            }
            return;
        }

        // Passive regen
        if (this.ce < this.maxCe) {
            this.ce = Math.min(this.maxCe, this.ce + this.regenRate * dtSec);
        }
    }

    /** Try to spend CE. Returns true if successful */
    spend(amount) {
        if (this.ce >= amount) {
            this.ce -= amount;
            return true;
        }
        return false;
    }

    /** Can afford a specific cost? */
    canAfford(amount) {
        return this.ce >= amount && !this.isFatigued;
    }

    /** Gain CE (from hitting or getting hit) */
    gain(amount) {
        if (!this.isFatigued) {
            this.ce = Math.min(this.maxCe, this.ce + amount);
        }
    }

    /** Activate domain mode */
    startDomain() {
        this.isDomainActive = true;
    }

    /** End domain — enter fatigue */
    endDomain() {
        this.isDomainActive = false;
        this.isFatigued = true;
        this.fatigueTimer = DOMAIN.FATIGUE_DURATION;
        if (this.fighter.onDomainEnd) {
            this.fighter.onDomainEnd();
        }
    }

    /** Get CE as a ratio 0-1 */
    getRatio() {
        return this.ce / this.maxCe;
    }

    /** Get current CE level tier */
    getTier() {
        if (this.ce >= CE_COSTS.MAXIMUM) return 4;
        if (this.ce >= CE_COSTS.DOMAIN) return 3;
        if (this.ce >= CE_COSTS.SKILL_2) return 2;
        if (this.ce >= CE_COSTS.SKILL_1) return 1;
        return 0;
    }
}
