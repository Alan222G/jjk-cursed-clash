// ========================================================
// Toji Fushiguro — The Sorcerer Killer
// Zero Cursed Energy Physical Fighter
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS } from '../../config.js';

export default class Toji extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.TOJI);
        this.isCasting = false;
        this.chainGraphics = null;
        // Toji has NO cursed energy — he uses raw physical power
        // Override CE to always be 0 but never fatigue
        this.ceSystem.ce = 0;
        this.ceSystem.maxCe = 0;
    }

    /** Menacing scar face */
    drawFace(g, x, y, facing) {
        // Dark narrow eyes
        g.fillStyle(0x222222, 1);
        g.fillRect(x - 7 * facing, y - 3, 4, 2);
        g.fillRect(x + 3 * facing, y - 3, 4, 2);
        // Scar on lip
        g.lineStyle(1, 0x884444, 0.8);
        g.beginPath();
        g.moveTo(x - 3, y + 3);
        g.lineTo(x + 4, y + 5);
        g.strokePath();
    }

    trySpecialAttack() {
        if (this.isCasting) return;

        // Toji uses NO CE — all skills are free, gated by cooldown only
        if (this.input.isDown('DOWN')) {
            this.castPlayfulCloud();
        } else if (this.input.isDown('LEFT') || this.input.isDown('RIGHT')) {
            this.castChainStrike();
        } else {
            this.castInvertedSpear();
        }
    }

    // ── Helper: Audio-driven cast ──
    castWithAudio(sfxKey, callback, fallbackMs) {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        let _fired = false;
        const fireAction = () => {
            if (_fired) return;
            _fired = true;
            this.isCasting = false;
            this.stateMachine.unlock();
            callback();
        };

        try {
            const vol = ((window.gameSettings?.sfx ?? 50) / 100) * 2.0;
            const snd = this.scene.sound.add(sfxKey, { volume: vol });
            snd.once('complete', fireAction);
            snd.play();
            this.scene.time.delayedCall(fallbackMs, fireAction);
        } catch (e) {
            this.scene.time.delayedCall(fallbackMs, fireAction);
        }
    }

    // ════════════════════════════════════════════
    // INVERTED SPEAR OF HEAVEN — Fast melee lunge
    // ════════════════════════════════════════════
    castInvertedSpear() {
        const skill = this.charData.skills.skill1;

        // Visual: spear thrust
        this.spawnSpearEffect();

        // Quick lunge forward
        this.sprite.body.setVelocityX(500 * this.facing);

        this.scene.time.delayedCall(200, () => {
            this.sprite.body.setVelocityX(0);

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 120) {
                    const dmg = Math.floor(skill.damage * this.power);
                    this.opponent.takeDamage(dmg, 300 * this.facing, -150, 300);
                    this.comboSystem.registerHit('SPECIAL');

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.005, 200);
                        this.scene.screenEffects.hitFreeze(80);
                    }
                }
            }

            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        });
    }

    // ════════════════════════════════════════════
    // CHAIN STRIKE — Ranged chain whip
    // ════════════════════════════════════════════
    castChainStrike() {
        const skill = this.charData.skills.skill2;

        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 10, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 200,
            knockbackY: -100,
            stunDuration: 350,
            speed: 900,
            direction: this.facing,
            color: 0x888888,
            size: { w: 30, h: 10 },
            lifetime: 800,
            type: 'slash',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }

        // Chain visual
        this.spawnChainEffect();
    }

    // ════════════════════════════════════════════
    // PLAYFUL CLOUD — Devastating smash (Ultimate)
    // ════════════════════════════════════════════
    castPlayfulCloud() {
        const skill = this.charData.skills.maximum;

        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 600);
            this.scene.screenEffects.flash(0x55FF55, 400, 0.4);
        }

        // Stun enemy during wind-up
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            target.stateMachine.unlock();
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }

        // Wind-up → Smash
        this.scene.time.delayedCall(800, () => {
            // Giant smash VFX
            this.spawnPlayfulCloudEffect();

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 200) {
                    const dmg = Math.floor(skill.damage * this.power);
                    this.opponent.takeDamage(dmg, 800 * this.facing, -500, 1000);
                    this.comboSystem.registerHit('SPECIAL');

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.06, 800);
                        this.scene.screenEffects.hitFreeze(250);
                    }
                }
            }

            // Unlock enemy
            if (target && !target.isDead) {
                target.stateMachine.unlock();
                if (!target.stateMachine.isAny('idle', 'walk', 'jump', 'fall', 'attack')) {
                    target.stateMachine.setState('idle');
                }
            }

            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // DOMAIN — Toji has none (Heavenly Restriction)
    // ════════════════════════════════════════════
    tryActivateDomain() {
        // Toji cannot use domains — zero cursed energy
        return;
    }

    applySureHitTick(opponent) {
        // No domain, no sure-hit
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnSpearEffect() {
        const x = this.sprite.x + 30 * this.facing;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Spear shaft
        g.lineStyle(3, 0xCCCCCC, 1);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 80 * this.facing, y);
        g.strokePath();
        
        // Spear tip
        g.fillStyle(0xAADDFF, 1);
        g.beginPath();
        const tipX = x + 80 * this.facing;
        g.moveTo(tipX, y - 6);
        g.lineTo(tipX + 15 * this.facing, y);
        g.lineTo(tipX, y + 6);
        g.closePath();
        g.fillPath();
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 250,
            onComplete: () => g.destroy()
        });
    }

    spawnChainEffect() {
        const x = this.sprite.x + 20 * this.facing;
        const y = this.sprite.y - 5;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Drawing chain links
        for (let i = 0; i < 8; i++) {
            const lx = x + (i * 12) * this.facing;
            g.lineStyle(2, 0x888888, 0.9);
            g.strokeCircle(lx, y + Math.sin(i) * 3, 4);
        }
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 300,
            onComplete: () => g.destroy()
        });
    }

    spawnPlayfulCloudEffect() {
        const x = this.sprite.x + 40 * this.facing;
        const y = this.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(16);
        
        // Impact shockwave circles
        for (let i = 0; i < 3; i++) {
            const r = 40 + i * 30;
            g.lineStyle(6 - i * 2, 0x55FF55, 0.8 - i * 0.2);
            g.strokeCircle(x, y, r);
        }
        
        // Impact lines radiating outward
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const endX = x + Math.cos(angle) * 80;
            const endY = y + Math.sin(angle) * 60;
            g.lineStyle(4, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(x, y); g.lineTo(endX, endY); g.strokePath();
            g.lineStyle(2, 0x55FF55, 1);
            g.beginPath(); g.moveTo(x, y); g.lineTo(endX, endY); g.strokePath();
        }
        
        // Central flash
        const flash = this.scene.add.circle(x, y, 30, 0xFFFFFF, 0.6).setDepth(17);
        
        this.scene.tweens.add({
            targets: [g, flash],
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 400,
            ease: 'Power2',
            onComplete: () => { g.destroy(); flash.destroy(); }
        });
    }
}
