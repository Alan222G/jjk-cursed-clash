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

        // Custom trackers for specialized projectiles
        this.activeWorms = [];
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
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castWormProjectile();
        } else if (tier >= 1) {
            this.castSummonSpirit();
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
    // SKILL 1: WORM PROJECTILE — Giant dragging worm
    // ════════════════════════════════════════════
    castWormProjectile() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        this.spawnWormEffect();

        // Fire a large worm projectile
        const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 50, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 0,
            knockbackY: 0,
            stunDuration: 1000,
            speed: 500,
            direction: this.facing,
            color: 0x3B2043,
            size: { w: 180, h: 80 },
            lifetime: 2500,
            type: 'worm',
            onHitCallback: (projectile, target) => {
                // Ignore if already swallowed someone
                if (projectile.swallowedTarget) return true; 

                // Swallow the target!
                projectile.swallowedTarget = target;
                target.takeDamage(projectile.damage, 0, 0, 500);
                target.sprite.setAlpha(0); // Invisible, inside the stomach
                target.stateMachine.lock(projectile.lifetime);
                target.isInvulnerable = true; 
                
                // Return true to prevent projectile from destroying itself
                return true; 
            }
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
            this.activeWorms.push(proj);
        }
    }

    // ════════════════════════════════════════════
    // SKILL 2: SUMMON CURSED SPIRIT — 4-Armed Beast
    // ════════════════════════════════════════════
    castSummonSpirit() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        if (this.summonedSpirit) return; // Only one at a time

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        this.spiritTarget = target;

        const spawnX = this.sprite.x + 80 * this.facing;
        const spawnY = this.sprite.y - 50;

        this.summonedSpirit = {
            x: spawnX,
            y: spawnY,
            facing: this.facing,
            hp: 300,
            attackCooldown: 0,
            moveTimer: 0,
            state: 'idle', // idle, walk, attack
            animTimer: 0
        };
        this.spiritTimer = 10000; // Lives for 10 seconds
        this.spiritGraphics = this.scene.add.graphics().setDepth(14);

        // Summon flash
        const flash = this.scene.add.circle(spawnX, spawnY, 30, 0x111111, 0.8).setDepth(15);
        this.scene.tweens.add({
            targets: flash, alpha: 0, scaleX: 3, scaleY: 3, duration: 400, onComplete: () => flash.destroy()
        });
    }

    // ════════════════════════════════════════════
    // MAXIMUM UZUMAKI — Devastating spirit beam
    // ════════════════════════════════════════════
    castUzumaki() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.isCasting = true;
        this.stateMachine.lock(2500);
        this.sprite.body.setVelocityX(0);

        // Charge-up VFX
        this.spawnUzumakiChargeEffect();

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 500);
        }

        this.scene.time.delayedCall(700, () => {
            // Massive beam projectile spanning screen
            const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: 0, // Handled continuously
                knockbackX: 0,
                knockbackY: 0,
                stunDuration: 100,
                speed: 0, // Stationary relative to origin, but spans the map
                direction: this.facing,
                color: 0x8844CC,
                size: { w: 1500, h: 120 },
                lifetime: 1800, // active for 1.8s
                type: 'uzumaki',
                onHitCallback: (projectile, victim) => {
                    // Continuous tick damage
                    if (!projectile.tickTimer) projectile.tickTimer = 0;
                    
                    const now = projectile.timer; // 0 to 1800
                    if (now - projectile.tickTimer > 150) { // dmg every 150ms
                        victim.takeDamage(18 * this.power, 60 * this.facing, 0, 300);
                        projectile.tickTimer = now;
                    }
                    return true; // Don't destroy!
                }
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.06, 1800);
            }

            this.scene.time.delayedCall(1800, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            });
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

    /** Sure-Hit: Gravity Crush */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        
        // Heavy crush damage and knockback
        opponent.takeDamage(35, 0, 800, 300); // 800 positive Y = DOWN into the ground
        
        // Force them down into the floor
        opponent.sprite.body.setVelocityY(800); 
        opponent.isOnGround = true; // Pretend they are grounded immediately
        if (opponent.stateMachine.isAny('jump', 'fall')) {
            opponent.stateMachine.setState('hitstun'); // Cancel jumps
        }

        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y;
        
        // Gravity visual effect (dark red pillars from sky)
        const g = this.scene.add.graphics().setDepth(15);
        g.fillStyle(0x330011, 0.6);
        g.fillRect(ox - 30, oy - 600, 60, 620);
        g.lineStyle(4, 0x881122, 0.8);
        g.strokeRect(ox - 30, oy - 600, 60, 620);
        
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
        if (this.scene.screenEffects) {
            this.scene.screenEffects.shake(0.015, 200);
        }
    }

    // ════════════════════════════════════════════
    // UPDATE LOGIC
    // ════════════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);

        // ── Worm Abduction Logic ──
        if (this.activeWorms.length > 0) {
            for (let i = this.activeWorms.length - 1; i >= 0; i--) {
                const w = this.activeWorms[i];
                if (w.alive && w.swallowedTarget) {
                    // Pull target along with the worm
                    w.swallowedTarget.sprite.setPosition(w.sprite.x, w.sprite.y);
                    w.swallowedTarget.sprite.body.setVelocity(w.sprite.body.velocity.x, 0); // nullify gravity
                    w.swallowedTarget.sprite.setAlpha(0); // keep hidden
                    w.swallowedTarget.isInvulnerable = true;
                } else if (!w.alive && w.swallowedTarget) {
                    // Worm died or expired, pop them out!
                    const t = w.swallowedTarget;
                    t.sprite.setAlpha(1);
                    t.isInvulnerable = false;
                    t.stateMachine.unlock();
                    t.stateMachine.setState('knockdown');
                    t.takeDamage(10, 200 * w.direction, -300, 600); // Toss them to the floor
                    w.swallowedTarget = null;
                    this.activeWorms.splice(i, 1);
                } else if (!w.alive) {
                    this.activeWorms.splice(i, 1);
                }
            }
        }

        // ── Summoned Beast AI ──
        if (this.summonedSpirit && this.spiritTarget) {
            this.spiritTimer -= dt;

            if (this.spiritTimer <= 0 || this.spiritTarget.isDead) {
                this.destroySpirit();
                return;
            }

            const spirit = this.summonedSpirit;
            const target = this.spiritTarget;
            spirit.animTimer += dt;

            const dx = target.sprite.x - spirit.x;
            const dy = (target.sprite.y - 10) - spirit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (spirit.state !== 'attack') {
                spirit.facing = dx > 0 ? 1 : -1;
            }

            // Movement rules
            const speed = 260 * (dt / 1000); // Fast beast
            if (spirit.state !== 'attack') {
                if (dist > 70) {
                    spirit.state = 'walk';
                    spirit.x += (dx / dist) * speed;
                    spirit.y += (dy / dist) * speed * 0.8;
                } else {
                    spirit.state = 'idle';
                }
            }

            // Attack logic
            spirit.attackCooldown -= dt;
            if (dist < 80 && spirit.attackCooldown <= 0 && spirit.state !== 'attack') {
                spirit.attackCooldown = 1500; // Attack every 1.5s
                spirit.state = 'attack';
                spirit.animTimer = 0;
                
                // Deal damage immediately
                if (!target.isDead) {
                    target.takeDamage(45, 120 * spirit.facing, -80, 400); // Built like a heavy attack
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.02, 150);
                    }
                }
                
                // Return to idle after attack anim ends
                this.scene.time.delayedCall(400, () => {
                    if (this.summonedSpirit) this.summonedSpirit.state = 'idle';
                });
            }

            this.drawSummonedBeast(spirit, time);
        }
    }

    drawSummonedBeast(spirit, time) {
        if (!this.spiritGraphics) return;
        this.spiritGraphics.clear();

        const x = spirit.x;
        const y = spirit.y;
        const f = spirit.facing;
        const g = this.spiritGraphics;

        const bob = spirit.state === 'walk' ? Math.sin(spirit.animTimer * 0.02) * 8 : Math.sin(time * 0.005) * 4;
        const torsoY = y + bob;

        // ── Drawing a 4-Armed Beast ──
        // Back Arms
        g.lineStyle(10, 0x1A0D22, 1);
        g.beginPath();
        // Top Back arm
        let bAng1 = f > 0 ? -Math.PI/4 : Math.PI + Math.PI/4;
        if(spirit.state === 'attack') bAng1 += (1 - spirit.animTimer/400) * 1.5 * f;
        g.moveTo(x, torsoY - 20);
        g.lineTo(x + Math.cos(bAng1)*50, torsoY - 20 + Math.sin(bAng1)*50);
        g.strokePath();

        // Bottom Back Arm
        let bAng2 = f > 0 ? Math.PI/6 : Math.PI - Math.PI/6;
        g.beginPath();
        g.moveTo(x, torsoY);
        g.lineTo(x + Math.cos(bAng2)*40, torsoY + Math.sin(bAng2)*40);
        g.strokePath();

        // Beast Body
        g.fillStyle(0x221133, 1);
        g.fillEllipse(x, torsoY, 45, 65); // Torso

        // Beast Head
        const hx = x + 10 * f;
        const hy = torsoY - 45;
        g.fillStyle(0x331144, 1);
        g.fillEllipse(hx, hy, 25, 20);

        // Spikes on back
        g.fillStyle(0x110011, 1);
        for(let i=0; i<3; i++){
            const sx = x - 15 * f;
            const sy = torsoY - 20 + (i*15);
            g.fillTriangle(sx, sy, sx - 20*f, sy - 10, sx, sy - 10);
        }

        // Eyes (6 eyes!)
        g.fillStyle(0xFF0055, 1);
        for(let i=0; i<3; i++) {
            g.fillCircle(hx + (5 + i*4) * f, hy - 5 + i*2, 2);
        }
        // Mouth full of fangs
        g.fillStyle(0xDDDDDD, 1);
        g.fillTriangle(hx + 8*f, hy + 5, hx + 18*f, hy + 5, hx + 13*f, hy + 12);

        // Front Arms
        g.lineStyle(12, 0x331144, 1);
        g.beginPath();
        // Top Front arm
        let fAng1 = f > 0 ? -Math.PI/6 : Math.PI + Math.PI/6;
        if(spirit.state === 'attack') fAng1 += Math.sin(spirit.animTimer*0.02) * -1.2 * f; // Smash down
        else if (spirit.state === 'walk') fAng1 += Math.cos(spirit.animTimer*0.015) * 0.5;
        
        g.moveTo(x + 10*f, torsoY - 20);
        g.lineTo(x + 10*f + Math.cos(fAng1)*60, torsoY - 20 + Math.sin(fAng1)*60);
        g.strokePath();

        // Bottom Front Arm
        let fAng2 = f > 0 ? Math.PI/4 : Math.PI - Math.PI/4;
        if (spirit.state === 'walk') fAng2 += Math.sin(spirit.animTimer*0.015) * -0.5;
        g.beginPath();
        g.moveTo(x + 5*f, torsoY + 10);
        g.lineTo(x + 5*f + Math.cos(fAng2)*50, torsoY + 10 + Math.sin(fAng2)*50);
        g.strokePath();
    }

    destroySpirit() {
        if (this.spiritGraphics) {
            const x = this.summonedSpirit ? this.summonedSpirit.x : this.sprite.x;
            const y = this.summonedSpirit ? this.summonedSpirit.y : this.sprite.y;
            
            // Death blood splash
            const puff = this.scene.add.circle(x, y, 40, 0x440022, 0.8).setDepth(15);
            this.scene.tweens.add({
                targets: puff, alpha: 0, scaleX: 2, scaleY: 2, duration: 400, onComplete: () => puff.destroy()
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
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x000000, 150, 0.8);
        }
    }

    spawnUzumakiChargeEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 50;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Massive swirling pool
        for (let i = 0; i < 30; i++) {
            const angle = (i * Math.PI * 2) / 30;
            const r1 = 150;
            const sx = x + Math.cos(angle) * r1;
            const sy = y + Math.sin(angle) * r1;
            
            g.lineStyle(3, 0x550088, 0.8);
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(x + 50*this.facing, y); g.strokePath();
        }

        const orb = this.scene.add.circle(x + 50 * this.facing, y, 10, 0x000000, 1.0).setDepth(16);
        orb.setStrokeStyle(4, 0xAA00FF);

        this.scene.tweens.add({
            targets: orb, scaleX: 6, scaleY: 6, duration: 700, onComplete: () => orb.destroy()
        });
        
        this.scene.tweens.add({
            targets: g, alpha: 0, duration: 700, onComplete: () => g.destroy()
        });
    }
}
