// ========================================================
// Ryomen Sukuna — King of Curses
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Sukuna extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.SUKUNA);
        this.slashEffects = [];
    }

    /** Facial markings + menacing eyes */
    drawFace(g, x, y, facing) {
        // Menacing eyes
        g.fillStyle(0xFF2200, 1);
        g.fillCircle(x - 5 * facing, y - 2, 3);
        g.fillCircle(x + 5 * facing, y - 2, 3);

        // Cursed facial markings
        g.lineStyle(2, 0x330000, 0.9);
        // Line down from each eye
        g.beginPath();
        g.moveTo(x - 5, y + 2);
        g.lineTo(x - 5, y + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(x + 5, y + 2);
        g.lineTo(x + 5, y + 10);
        g.strokePath();
        // Line on nose bridge
        g.beginPath();
        g.moveTo(x - 8, y - 5);
        g.lineTo(x + 8, y - 5);
        g.strokePath();

        // Smirk
        g.lineStyle(1, 0x330000, 0.8);
        g.beginPath();
        g.moveTo(x - 6, y + 5);
        g.lineTo(x, y + 7);
        g.lineTo(x + 6, y + 5);
        g.strokePath();
    }

    trySpecialAttack() {
        const tier = this.ceSystem.getTier();

        if (tier >= 2 && this.input.isDown('DOWN')) {
            // Cleave (AOE slash)
            this.castCleave();
        } else if (tier >= 1) {
            // Dismantle (ranged cut)
            this.castDismantle();
        }
    }

    castDismantle() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        // Invisible ranged slash — appears at target location
        const targetX = this.opponent ?
            this.opponent.sprite.x :
            this.sprite.x + 200 * this.facing;

        // Visual: slash line appears at target
        this.spawnSlashEffect(targetX, this.sprite.y - 20, 0xFF4444, 60);

        // Damage check — if opponent is within range
        if (this.opponent) {
            const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
            if (dist < 300) {
                const dmg = Math.floor(skill.damage * this.power);
                this.opponent.takeDamage(dmg, 150 * this.facing, -50, 250);
                this.ceSystem.gain(8);
                this.comboSystem.registerHit('SPECIAL');
            }
        }
    }

    castCleave() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        // AOE slash around Sukuna
        this.spawnCleaveEffect();

        if (this.opponent) {
            const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
            if (dist < 180) {
                const dmg = Math.floor(skill.damage * this.power);
                this.opponent.takeDamage(
                    dmg,
                    400 * this.facing,
                    -250,
                    500
                );
                this.ceSystem.gain(12);
                this.comboSystem.registerHit('SPECIAL');

                if (this.scene.screenEffects) {
                    this.scene.screenEffects.shake(0.006, 300);
                    this.scene.screenEffects.hitFreeze(120);
                }
            }
        }
    }

    spawnSlashEffect(x, y, color, size) {
        const g = this.scene.add.graphics();
        g.setDepth(15);

        // Diagonal slash line
        g.lineStyle(3, color, 0.9);
        g.beginPath();
        g.moveTo(x - size / 2, y - size / 2);
        g.lineTo(x + size / 2, y + size / 2);
        g.strokePath();

        // Second cross slash
        g.lineStyle(2, 0xFFAAAA, 0.7);
        g.beginPath();
        g.moveTo(x + size / 2, y - size / 2);
        g.lineTo(x - size / 2, y + size / 2);
        g.strokePath();

        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 350,
            onComplete: () => g.destroy(),
        });
    }

    spawnCleaveEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 10;

        // Multiple slashes in a fan pattern
        const g = this.scene.add.graphics();
        g.setDepth(15);

        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 3 + (i * Math.PI / 6) + (this.facing < 0 ? Math.PI : 0);
            const len = 80 + i * 10;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;

            g.lineStyle(2 + (i === 2 ? 2 : 0), 0xFF2222, 0.8);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(ex, ey);
            g.strokePath();
        }

        // Red flash
        const flash = this.scene.add.circle(x, y, 50, 0xFF2222, 0.4);
        flash.setDepth(14);

        this.scene.tweens.add({
            targets: [g, flash],
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                g.destroy();
                flash.destroy();
            },
        });
    }

    tryActivateDomain() {
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.domainActive) return;

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.stateMachine.setState('casting_domain');

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'malevolent_shrine');
        }
    }

    /** Sure-Hit: Malevolent Shrine — constant DPS slashes */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;

        // Auto-slash damage
        const dmg = Math.floor(DOMAIN.SURE_HIT_DPS * (DOMAIN.SURE_HIT_INTERVAL / 1000) * this.power);
        opponent.takeDamage(dmg, 50 * this.facing, 0, 100);

        // Visual: random slashes appear on opponent
        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y;
        this.spawnSlashEffect(
            ox + (Math.random() - 0.5) * 40,
            oy + (Math.random() - 0.5) * 60 - 20,
            0xFF4444,
            40 + Math.random() * 30
        );
    }
}
