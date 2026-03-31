// ========================================================
// Kenjaku (Geto's Body) — The Ancient Sorcerer
// Cursed Spirit Manipulation: Worm, Summoned Spirit, Uzumaki
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Kenjaku extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.KENJAKU);
        this.isCasting = false;
        // Summoned spirit tracking
        this.summonedSpirit = null;
        this.spiritTimer = 0;
        this.spiritTarget = null;
        this.spiritGraphics = null;
    }

    /** Stitched forehead with sinister eyes */
    drawFace(g, x, y, facing) {
        // Purple calculating eyes
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

        if (tier >= 2 && this.input.isDown('DOWN')) {
            this.castUzumaki();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castSummonSpirit();
        } else if (tier >= 1) {
            this.castWormProjectile();
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
    // SKILL 1: WORM PROJECTILE — Large cursed worm
    // ════════════════════════════════════════════
    castWormProjectile() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        this.spawnWormEffect();

        // Fire a large worm projectile
        const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 10, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 200,
            knockbackY: -80,
            stunDuration: 400,
            speed: 400,
            direction: this.facing,
            color: 0x8844CC,
            size: { w: 60, h: 30 },
            lifetime: 2500,
            type: 'circle',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }
    }

    // ════════════════════════════════════════════
    // SKILL 2: SUMMON CURSED SPIRIT — AI fighter for 8s
    // ════════════════════════════════════════════
    castSummonSpirit() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        if (this.summonedSpirit) return; // Only one at a time

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        this.spiritTarget = target;

        // Create the spirit as a visual entity near Kenjaku
        const spawnX = this.sprite.x + 80 * this.facing;
        const spawnY = this.sprite.y - 10;

        this.summonedSpirit = {
            x: spawnX,
            y: spawnY,
            facing: this.facing,
            hp: 200,
            attackCooldown: 0,
            moveTimer: 0,
        };
        this.spiritTimer = 8000; // Lives for 8 seconds
        this.spiritGraphics = this.scene.add.graphics().setDepth(14);

        // Summon flash
        const flash = this.scene.add.circle(spawnX, spawnY, 30, 0xAA66FF, 0.6).setDepth(15);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 400,
            onComplete: () => flash.destroy()
        });
    }

    // ════════════════════════════════════════════
    // MAXIMUM UZUMAKI — Devastating spirit beam
    // ════════════════════════════════════════════
    castUzumaki() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        // Charge-up VFX
        this.spawnUzumakiChargeEffect();

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 400);
        }

        this.scene.time.delayedCall(600, () => {
            // Massive beam projectile
            const proj = new Projectile(this.scene, this.sprite.x + 60 * this.facing, this.sprite.y - 10, {
                owner: this,
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 800,
                knockbackY: -200,
                stunDuration: 700,
                speed: 900,
                direction: this.facing,
                color: 0x8844CC,
                size: { w: 250, h: 100 },
                lifetime: 2000,
                type: 'circle',
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.04, 600);
            }

            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // DOMAIN — Womb Profusion
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
            this.scene.sound.play('gojo_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 });
        } catch (e) {}

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'womb_profusion');
        }
    }

    /** Sure-Hit: Spirit orbs damage opponent */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        
        opponent.takeDamage(40, 30 * this.facing, 0, 80);

        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y - 20;
        
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
    // UPDATE — Summoned spirit AI logic
    // ════════════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);

        // Handle summoned spirit
        if (this.summonedSpirit && this.spiritTarget) {
            this.spiritTimer -= dt;

            if (this.spiritTimer <= 0 || this.spiritTarget.isDead) {
                this.destroySpirit();
                return;
            }

            const spirit = this.summonedSpirit;
            const target = this.spiritTarget;

            // ── Spirit AI: Chase and attack ──
            const dx = target.sprite.x - spirit.x;
            const dy = (target.sprite.y - 10) - spirit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Face target
            spirit.facing = dx > 0 ? 1 : -1;

            // Move towards target
            const speed = 200 * (dt / 1000);
            if (dist > 60) {
                spirit.x += (dx / dist) * speed;
                spirit.y += (dy / dist) * speed * 0.5;
            }

            // Attack if close enough
            spirit.attackCooldown -= dt;
            if (dist < 80 && spirit.attackCooldown <= 0) {
                spirit.attackCooldown = 1200; // Attack every 1.2s
                if (!target.isDead) {
                    target.takeDamage(25, 100 * spirit.facing, -50, 200);
                    
                    // Attack flash
                    const flash = this.scene.add.circle(spirit.x, spirit.y, 15, 0xAA66FF, 0.5).setDepth(16);
                    this.scene.tweens.add({
                        targets: flash,
                        alpha: 0,
                        scaleX: 2,
                        scaleY: 2,
                        duration: 200,
                        onComplete: () => flash.destroy()
                    });
                }
            }

            // Draw the spirit
            this.drawSpirit(spirit, time);
        }
    }

    drawSpirit(spirit, time) {
        if (!this.spiritGraphics) return;
        this.spiritGraphics.clear();

        const x = spirit.x;
        const y = spirit.y;
        const f = spirit.facing;
        const pulse = 0.6 + Math.sin(time * 0.008) * 0.2;

        // Body — dark amorphous blob
        this.spiritGraphics.fillStyle(0x332255, pulse);
        this.spiritGraphics.fillEllipse(x, y, 40, 50);

        // Inner glow
        this.spiritGraphics.fillStyle(0x6633AA, pulse * 0.6);
        this.spiritGraphics.fillEllipse(x, y - 5, 25, 30);

        // Eyes
        this.spiritGraphics.fillStyle(0xFF0000, 1);
        this.spiritGraphics.fillCircle(x - 6 * f, y - 8, 3);
        this.spiritGraphics.fillCircle(x + 6 * f, y - 8, 3);

        // Mouth
        this.spiritGraphics.lineStyle(2, 0xFF3333, 0.8);
        this.spiritGraphics.beginPath();
        this.spiritGraphics.moveTo(x - 5, y + 2);
        this.spiritGraphics.lineTo(x, y + 6);
        this.spiritGraphics.lineTo(x + 5, y + 2);
        this.spiritGraphics.strokePath();

        // Wispy tendrils
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + time * 0.003;
            const len = 15 + Math.sin(time * 0.005 + i) * 8;
            this.spiritGraphics.lineStyle(2, 0x6633AA, 0.5);
            this.spiritGraphics.beginPath();
            this.spiritGraphics.moveTo(x, y + 15);
            this.spiritGraphics.lineTo(
                x + Math.cos(angle) * len,
                y + 15 + Math.sin(angle) * len
            );
            this.spiritGraphics.strokePath();
        }
    }

    destroySpirit() {
        if (this.spiritGraphics) {
            // Death puff
            const x = this.summonedSpirit ? this.summonedSpirit.x : this.sprite.x;
            const y = this.summonedSpirit ? this.summonedSpirit.y : this.sprite.y;
            
            const puff = this.scene.add.circle(x, y, 20, 0x6633AA, 0.6).setDepth(15);
            this.scene.tweens.add({
                targets: puff,
                alpha: 0,
                scaleX: 3,
                scaleY: 3,
                duration: 400,
                onComplete: () => puff.destroy()
            });

            this.spiritGraphics.clear();
            this.spiritGraphics.destroy();
            this.spiritGraphics = null;
        }
        this.summonedSpirit = null;
        this.spiritTarget = null;
        this.spiritTimer = 0;
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnWormEffect() {
        const x = this.sprite.x + 40 * this.facing;
        const y = this.sprite.y - 5;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Worm body — curved segmented shape
        g.lineStyle(12, 0x663399, 0.8);
        g.beginPath();
        g.moveTo(x, y);
        for (let i = 1; i <= 6; i++) {
            const segX = x + (i * 10) * this.facing;
            const segY = y + Math.sin(i * 1.2) * 8;
            g.lineTo(segX, segY);
        }
        g.strokePath();

        // Worm highlight
        g.lineStyle(6, 0x9966CC, 0.5);
        g.beginPath();
        g.moveTo(x, y - 2);
        for (let i = 1; i <= 6; i++) {
            const segX = x + (i * 10) * this.facing;
            const segY = y - 2 + Math.sin(i * 1.2) * 6;
            g.lineTo(segX, segY);
        }
        g.strokePath();

        // Head
        const headX = x + 65 * this.facing;
        g.fillStyle(0x8844CC, 1);
        g.fillCircle(headX, y, 10);
        // Eye
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(headX + 3 * this.facing, y - 3, 2);
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 400,
            onComplete: () => g.destroy()
        });
    }

    spawnUzumakiChargeEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Spiraling convergence lines
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI * 2) / 16;
            const r1 = 80;
            const sx = x + Math.cos(angle) * r1;
            const sy = y + Math.sin(angle) * r1;
            
            g.lineStyle(2, 0xAA66FF, 0.6);
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(x, y); g.strokePath();
        }

        // Central orb growing
        const orb = this.scene.add.circle(x + 30 * this.facing, y, 8, 0x8844CC, 0.8).setDepth(16);
        this.scene.tweens.add({
            targets: orb,
            scaleX: 4,
            scaleY: 4,
            alpha: 0.3,
            duration: 500,
            onComplete: () => orb.destroy()
        });
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 600,
            onComplete: () => g.destroy()
        });
    }
}
