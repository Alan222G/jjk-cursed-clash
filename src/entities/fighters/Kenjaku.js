// ========================================================
// Kenjaku (Geto's Body) — The Ancient Sorcerer
// Cursed Spirit Manipulation & Barrier Techniques
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Kenjaku extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.KENJAKU);
        this.isCasting = false;
        this.spiritActive = false;
        this.spiritTimer = 0;
    }

    /** Stitched forehead with sinister eyes */
    drawFace(g, x, y, facing) {
        // Narrow calculating eyes (purple tint)
        g.fillStyle(0xAA66FF, 1);
        g.fillCircle(x - 5 * facing, y - 2, 2.5);
        g.fillCircle(x + 5 * facing, y - 2, 2.5);
        // Forehead stitch line (Kenjaku's signature)
        g.lineStyle(2, 0x333333, 0.9);
        g.beginPath();
        g.moveTo(x - 10, y - 8);
        g.lineTo(x + 10, y - 8);
        g.strokePath();
        // Stitch marks
        for (let i = -8; i <= 8; i += 4) {
            g.lineStyle(1, 0x444444, 0.7);
            g.beginPath();
            g.moveTo(x + i, y - 10);
            g.lineTo(x + i, y - 6);
            g.strokePath();
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;

        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castGravityCrush();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castMaximumUzumaki();
        } else if (tier >= 1) {
            this.castSpiritManipulation();
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
    // CURSED SPIRIT MANIPULATION — Summon a spirit
    // ════════════════════════════════════════════
    castSpiritManipulation() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        this.spawnSpiritEffect();

        // Fire a homing spirit projectile
        const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 20, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 180,
            knockbackY: -80,
            stunDuration: 300,
            speed: 500,
            direction: this.facing,
            color: 0xAA66FF,
            size: { w: 35, h: 35 },
            lifetime: 2000,
            type: 'circle',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }
    }

    // ════════════════════════════════════════════
    // MAXIMUM UZUMAKI — Devastating beam of spirits
    // ════════════════════════════════════════════
    castMaximumUzumaki() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.spawnUzumakiEffect();

        this.castWithAudio('sfx_slash', () => {
            const proj = new Projectile(this.scene, this.sprite.x + 60 * this.facing, this.sprite.y - 10, {
                owner: this,
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 600,
                knockbackY: -200,
                stunDuration: 600,
                speed: 700,
                direction: this.facing,
                color: 0x8844CC,
                size: { w: 200, h: 80 },
                lifetime: 2000,
                type: 'circle',
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.03, 600);
            }

            this.stateMachine.setState('idle');
        }, 5000);
    }

    // ════════════════════════════════════════════
    // GRAVITY CRUSH — Ultimate anti-gravity attack
    // ════════════════════════════════════════════
    castGravityCrush() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        const skill = this.charData.skills.maximum;

        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 500);
            this.scene.screenEffects.flash(0xAA66FF, 500, 0.5);
        }

        // Stun enemy during cast
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            target.stateMachine.unlock();
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }

        this.castWithAudio('sfx_slash', () => {
            // Anti-gravity field VFX
            this.spawnGravityEffect();

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 300) {
                    const dmg = Math.floor(skill.damage * this.power);
                    this.opponent.takeDamage(dmg, 200 * this.facing, -800, 1200);
                    this.comboSystem.registerHit('SPECIAL');

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.05, 800);
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

            this.stateMachine.setState('idle');
        }, 8000);
    }

    // ════════════════════════════════════════════
    // DOMAIN EXPANSION — Womb Profusion
    // ════════════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        
        if (this.scene.domainActive) {
            if (this.scene.domainOwner !== this) {
                const clashPossible = this.scene.attemptDomainClash(this);
                if (!clashPossible) return;
            } else {
                return;
            }
        } else if (this.domainActive) {
            return;
        }

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();

        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        try {
            // Use generic domain voice for now until specific audio is added
            this.scene.sound.play('gojo_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 });
        } catch (e) { console.warn('Kenjaku domain voice error', e); }

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'womb_profusion');
        }
    }

    /** Sure-Hit: Womb Profusion summons spirits that damage opponent */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        
        // DPS-type domain like Sukuna
        opponent.takeDamage(40, 30 * this.facing, 0, 80);

        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y - 20;
        
        // Purple spirit orbs swirling around opponent
        const g = this.scene.add.graphics().setDepth(15);
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 40;
            const sx = ox + Math.cos(angle) * dist;
            const sy = oy + Math.sin(angle) * dist;
            g.fillStyle(0xAA66FF, 0.7);
            g.fillCircle(sx, sy, 8 + Math.random() * 6);
            g.fillStyle(0xFFFFFF, 0.3);
            g.fillCircle(sx, sy, 4);
        }
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 200,
            onComplete: () => g.destroy()
        });
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnSpiritEffect() {
        const x = this.sprite.x + 30 * this.facing;
        const y = this.sprite.y - 15;
        
        // Purple spirit orb
        const circle = this.scene.add.circle(x, y, 18, 0x8844CC, 0.7).setDepth(12);
        // White core
        const core = this.scene.add.circle(x, y, 8, 0xFFFFFF, 0.5).setDepth(13);
        
        this.scene.tweens.add({
            targets: [circle, core],
            scaleX: 2.5,
            scaleY: 2.5,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => { circle.destroy(); core.destroy(); }
        });
    }

    spawnUzumakiEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Spiraling beam effect
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            const r1 = 20 + i * 3;
            const r2 = 60 + i * 8;
            const sx = x + Math.cos(angle) * r1;
            const sy = y + Math.sin(angle) * r1;
            const ex = x + Math.cos(angle) * r2 + 40 * this.facing;
            const ey = y + Math.sin(angle) * r2 * 0.5;
            
            g.lineStyle(3, 0xAA66FF, 0.8 - i * 0.05);
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.strokePath();
        }
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 500,
            onComplete: () => g.destroy()
        });
    }

    spawnGravityEffect() {
        const x = this.sprite.x + 60 * this.facing;
        const y = this.sprite.y - 30;
        const g = this.scene.add.graphics().setDepth(16);
        
        // Anti-gravity distortion rings
        for (let i = 0; i < 5; i++) {
            const r = 30 + i * 25;
            g.lineStyle(4 - i * 0.5, 0xAA66FF, 0.7 - i * 0.1);
            g.strokeCircle(x, y, r);
        }
        
        // Particle lines being sucked
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const startR = 100 + Math.random() * 50;
            const sx = x + Math.cos(angle) * startR;
            const sy = y + Math.sin(angle) * startR;
            g.lineStyle(2, 0xCC88FF, 0.6);
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(x, y); g.strokePath();
        }

        const flash = this.scene.add.circle(x, y, 25, 0xCC88FF, 0.6).setDepth(17);
        
        this.scene.tweens.add({
            targets: [g, flash],
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 500,
            ease: 'Power2',
            onComplete: () => { g.destroy(); flash.destroy(); }
        });
    }
}
