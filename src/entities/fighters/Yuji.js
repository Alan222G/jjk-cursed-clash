// ========================================================
// Yuji Itadori — Shinjuku Showdown Arc
// Black Flash Specialist (2x probability)
// No Domain Expansion — Pure combat instinct
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS } from '../../config.js';

export default class Yuji extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.YUJI);
        this.isCasting = false;
        this.divergentFistActive = false;
        this.divergentTimer = 0;
        this.piercingBloodCooldown = 0;
        this.superBlackFlashReady = false;
        this.consecutiveBlackFlash = 0;
        this.blackFlashMultiplier = 1.0; // Base rate
        this.yujiAwakened = false;
        this.yujiAwakenedTimer = 0;
    }

    // ═══════════════════════════════════════
    // SPECIAL ATTACKS
    // ═══════════════════════════════════════
    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castSuperBlackFlash();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castPiercingBlood();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.castSoulDismantle();
        } else if (tier >= 1) {
            this.castDivergentFist();
        }
    }

    castWithAudio(sfxKey, callback, fallbackMs) {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);
        let _fired = false;
        const fireAction = () => {
            if (_fired) return; _fired = true;
            this.isCasting = false;
            if (this.stateMachine.locked) this.stateMachine.unlock();
            callback();
        };
        try {
            let rawVol = (window.gameSettings?.sfx ?? 50) / 100;
            const snd = this.scene.sound.add(sfxKey, { volume: rawVol * 2.0 });
            snd.once('complete', fireAction);
            snd.play();
            this.scene.time.delayedCall(fallbackMs || 5000, fireAction);
        } catch (e) { fireAction(); }
    }

    // ═══════════════════════════════════════
    // DIVERGENT FIST — Delayed cursed energy impact
    // Physical hit + delayed CE explosion 200ms later
    // ═══════════════════════════════════════
    castDivergentFist() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        const skill = this.charData.skills.skill1;

        // Lunge forward
        this.sprite.body.setVelocityX(400 * this.facing);

        this.castWithAudio('sfx_slash', () => {
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 120) {
                    // First hit — physical
                    const dmg1 = Math.floor(skill.damage * this.power * 0.5);
                    target.takeDamage(dmg1, 120 * this.facing, -50, 200);
                    this.comboSystem.registerHit('SPECIAL');

                    // Flash for first hit
                    const flash1 = this.scene.add.circle(target.sprite.x, target.sprite.y - 30, 20, 0xFFAA00, 0.7).setDepth(15);
                    this.scene.tweens.add({ targets: flash1, alpha: 0, scaleX: 2, scaleY: 2, duration: 150, onComplete: () => flash1.destroy() });

                    // Second hit — delayed CE explosion (200ms later)
                    this.scene.time.delayedCall(200, () => {
                        if (!target.isDead) {
                            const dmg2 = Math.floor(skill.damage * this.power * 0.6);
                            target.takeDamage(dmg2, 250 * this.facing, -100, 400);

                            // CE explosion VFX
                            const g = this.scene.add.graphics().setDepth(16);
                            const ex = target.sprite.x; const ey = target.sprite.y - 30;
                            g.fillStyle(0xFF6600, 0.6); g.fillCircle(ex, ey, 35);
                            g.fillStyle(0xFFCC00, 0.4); g.fillCircle(ex, ey, 20);
                            g.lineStyle(3, 0xFFFFFF, 0.8);
                            for (let i = 0; i < 6; i++) {
                                const angle = (i / 6) * Math.PI * 2;
                                g.lineBetween(ex, ey, ex + Math.cos(angle) * 40, ey + Math.sin(angle) * 40);
                            }
                            this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
                            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.015, 200);
                        }
                    });
                }
            }
            this.stateMachine.setState('idle');
        }, 1500);
    }

    // ═══════════════════════════════════════
    // SOUL DISMANTLE — Inherited from Sukuna's memory
    // Cuts directly at the soul boundary
    // ═══════════════════════════════════════
    castSoulDismantle() {
        if (!this.ceSystem.spend(15)) return;

        this.castWithAudio('sfx_slash', () => {
            // 3 soul-cutting slashes
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 80, () => {
                    const proj = new Projectile(this.scene,
                        this.sprite.x + (35 + i * 10) * this.facing,
                        this.sprite.y - 45 + (i - 1) * 20, {
                        owner: this,
                        damage: Math.floor(25 * this.power),
                        knockbackX: 100, knockbackY: -40,
                        stunDuration: 180, speed: 800,
                        direction: this.facing, color: 0xFF8800,
                        size: { w: 40, h: 8 }, lifetime: 800, type: 'slash',
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);

                    // Soul slash VFX — orange-gold
                    const g = this.scene.add.graphics().setDepth(15);
                    const sx = this.sprite.x + 25 * this.facing;
                    const sy = this.sprite.y - 40 + (i - 1) * 20;
                    g.lineStyle(3, 0xFF8800, 0.8);
                    g.beginPath(); g.moveTo(sx - 20, sy - 15); g.lineTo(sx + 20, sy + 15); g.strokePath();
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
                });
            }
            this.stateMachine.setState('idle');
        }, 1800);
    }

    // ═══════════════════════════════════════
    // PIERCING BLOOD — Blood Manipulation technique
    // High-speed blood projectile (inherited from Kamo bloodline)
    // ═══════════════════════════════════════
    castPiercingBlood() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        if (this.piercingBloodCooldown > 0) return;
        this.piercingBloodCooldown = 3000;

        this.castWithAudio('sfx_slash', () => {
            // Convergence VFX — blood gathers at the fingertip
            const cx = this.sprite.x + 30 * this.facing;
            const cy = this.sprite.y - 40;
            const convergence = this.scene.add.circle(cx, cy, 8, 0xCC0000, 0.9).setDepth(15);
            this.scene.tweens.add({
                targets: convergence, scaleX: 0.3, scaleY: 0.3, duration: 300,
                onComplete: () => {
                    convergence.destroy();
                    // Fire the high-speed blood beam
                    const proj = new Projectile(this.scene, cx, cy, {
                        owner: this,
                        damage: Math.floor(this.charData.skills.skill2.damage * this.power),
                        knockbackX: 600, knockbackY: -100,
                        stunDuration: 500, speed: 1200,
                        direction: this.facing, color: 0xCC0000,
                        size: { w: 60, h: 6 }, lifetime: 1500, type: 'beam',
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);

                    // Blood trail VFX
                    const trail = this.scene.add.graphics().setDepth(14);
                    trail.lineStyle(4, 0xCC0000, 0.7);
                    trail.lineBetween(cx, cy, cx + 120 * this.facing, cy);
                    trail.lineStyle(2, 0xFF4444, 0.5);
                    trail.lineBetween(cx, cy - 3, cx + 100 * this.facing, cy - 3);
                    this.scene.tweens.add({ targets: trail, alpha: 0, duration: 400, onComplete: () => trail.destroy() });
                }
            });
            this.stateMachine.setState('idle');
        }, 2000);
    }

    // ═══════════════════════════════════════
    // SUPER BLACK FLASH — Ultimate (U+Down)
    // Guaranteed devastating Black Flash combo
    // 5 consecutive hits, each with 2.5x multiplier + soul damage
    // ═══════════════════════════════════════
    castSuperBlackFlash() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 1500);
            this.scene.screenEffects.flash(0x000000, 800, 0.8);
        }

        this.castWithAudio('sfx_slash', () => {
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (!target || target.isDead) { this.stateMachine.setState('idle'); return; }

            // Rush to opponent
            const rushX = target.sprite.x - 60 * this.facing;
            this.sprite.body.setVelocityX((rushX - this.sprite.x) * 3);

            // 5 consecutive Black Flash hits
            for (let i = 0; i < 5; i++) {
                this.scene.time.delayedCall(200 + i * 250, () => {
                    if (target.isDead) return;
                    const dmg = Math.floor((this.charData.skills.maximum.damage / 5) * this.power * 2.5);
                    target.takeDamage(dmg, (i === 4 ? 500 : 80) * this.facing, i === 4 ? -300 : -30, i === 4 ? 800 : 200);

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.hitFreeze(150);
                        this.scene.screenEffects.flash(0x000000, 150, 0.4);
                        if (i === 4) {
                            this.scene.screenEffects.shake(0.05, 600);
                            this.scene.screenEffects.flash(0x000000, 400, 0.7);
                        } else {
                            this.scene.screenEffects.shake(0.02, 200);
                        }
                    }
                    try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
                    this.spawnBlackFlashEffect(target.sprite.x, target.sprite.y);
                });
            }

            this.scene.time.delayedCall(1600, () => {
                this.sprite.body.setVelocityX(0);
                this.stateMachine.setState('idle');
            });
        }, 3000);
    }

    // ═══════════════════════════════════════
    // NO DOMAIN — Yuji has no domain expansion
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.yujiAwakened) return;

        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;
        
        this.yujiAwakened = true;
        this.yujiAwakenedTimer = 15000;
        
        // Boosts
        this.power = (this.charData.stats.power || 1.0) * 1.5;
        this.speed = (this.charData.stats.speed || 300) * 1.3;
        this.blackFlashMultiplier = 2.0;

        // Visual feedback
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xFF6600, 200, 0.4);
            this.scene.screenEffects.shake(0.03, 300);
        }
        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.7 }); } catch(e) {}

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'AWAKENING!', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#FF6600', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }

    // ═══════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);
        if (this.piercingBloodCooldown > 0) this.piercingBloodCooldown -= dt;
        
        if (this.yujiAwakened) {
            this.yujiAwakenedTimer -= dt;
            if (this.yujiAwakenedTimer <= 0) {
                this.yujiAwakened = false;
                this.power = this.charData.stats.power || 1.0;
                this.speed = this.charData.stats.speed || 300;
                this.blackFlashMultiplier = 1.0;
            }
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Athletic build, Shinjuku uniform
    // Pink-brown hair, school uniform jacket
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const skinColor = isFlashing ? 0xFFFFFF : 0xF5D0B0;
        const jacketColor = isFlashing ? 0xFFFFFF : 0x1A1A3E;
        const shirtColor = isFlashing ? 0xFFFFFF : 0xEEEEEE;
        const pantColor = isFlashing ? 0xFFFFFF : 0x111122;
        const armExtend = this.attackSwing * 40;

        // LEGS
        const legY = masterY + 8;
        let leftLeg = 38, rightLeg = 38;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 22; rightLeg = 22; }
        g.lineStyle(7, pantColor, 1);
        g.beginPath(); g.moveTo(x - 10, legY); g.lineTo(x - 15 - (f * 8), legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 10, legY); g.lineTo(x + 15 + (f * 8), legY + rightLeg); g.strokePath();
        // Shoes
        g.fillStyle(0x222222, 1);
        g.fillCircle(x - 15 - (f * 8), legY + leftLeg, 5);
        g.fillCircle(x + 15 + (f * 8), legY + rightLeg, 5);

        // TORSO — Jacket over white shirt
        g.fillStyle(jacketColor, 1);
        g.fillRect(x - 16, masterY - 38, 32, 50);
        // White shirt V-neck visible
        g.fillStyle(shirtColor, 1);
        g.beginPath();
        g.moveTo(x - 6, masterY - 38); g.lineTo(x + 6, masterY - 38);
        g.lineTo(x + 3, masterY - 20); g.lineTo(x - 3, masterY - 20); g.fillPath();
        // Jacket lapel lines
        g.lineStyle(1, 0x333366, 0.6);
        g.lineBetween(x - 6, masterY - 38, x - 3, masterY - 5);
        g.lineBetween(x + 6, masterY - 38, x + 3, masterY - 5);

        // HEAD
        const hx = x; const hy = masterY - 52;
        g.fillStyle(skinColor, 1); g.fillCircle(hx, hy, 13);
        // Hair — spiky pink-brown
        g.fillStyle(isFlashing ? 0xFFFFFF : 0xDD7788, 1);
        g.beginPath();
        g.moveTo(hx - 15, hy - 5); g.lineTo(hx - 14, hy - 20); g.lineTo(hx - 8, hy - 12);
        g.lineTo(hx - 3, hy - 22); g.lineTo(hx + 3, hy - 16);
        g.lineTo(hx + 8, hy - 24); g.lineTo(hx + 14, hy - 14);
        g.lineTo(hx + 15, hy - 5); g.fillPath();
        // Scar on face (from Sukuna)
        g.lineStyle(2, 0xAA4444, 0.6);
        g.beginPath(); g.moveTo(hx + 3 * f, hy - 6); g.lineTo(hx + 6 * f, hy + 2); g.strokePath();
        // Eyes
        g.fillStyle(0x884422, 1);
        g.fillCircle(hx - 4 * f, hy - 2, 2);
        g.fillCircle(hx + 4 * f, hy - 2, 2);
        // Mouth — determined expression
        g.lineStyle(1, 0x663333, 0.7);
        g.beginPath(); g.moveTo(hx - 3, hy + 5); g.lineTo(hx + 3, hy + 5); g.strokePath();

        // ARMS
        const armY = masterY - 32;
        // Back arm
        g.lineStyle(7, jacketColor, 0.85);
        g.beginPath(); g.moveTo(x - 14, armY + 3); g.lineTo(x - 24 * f, armY + 20); g.strokePath();
        g.fillStyle(skinColor, 0.85); g.fillCircle(x - 24 * f, armY + 20, 5);
        // Front arm
        g.lineStyle(8, jacketColor, 1);
        if (this.stateMachine.is('block')) {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 8 * f, armY - 12); g.strokePath();
        } else if (this.attackSwing > 0) {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + (25 + armExtend) * f, armY - 3); g.strokePath();
            g.fillStyle(skinColor, 1); g.fillCircle(x + (28 + armExtend) * f, armY - 3, 6);
            // Fist glow — cursed energy on hands
            g.fillStyle(0xFF6600, 0.4); g.fillCircle(x + (28 + armExtend) * f, armY - 3, 10);
        } else {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 18 * f, armY + 20); g.strokePath();
            g.fillStyle(skinColor, 1); g.fillCircle(x + 18 * f, armY + 20, 5);
        }

        // Hitstun stars
        if (this.stateMachine.is('hitstun')) {
            const starT = (this.animTimer || 0) * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(x + Math.cos(angle) * 22, y - 65 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.2) * 25, y - 65 + Math.sin(angle + 0.2) * 12,
                    x + Math.cos(angle - 0.2) * 25, y - 65 + Math.sin(angle - 0.2) * 12);
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (!this.isDead) {
            const ag = this.auraGraphics;
            const x = this.sprite.x; const y = this.sprite.y;
            const t = this.scene.time.now;
            // Orange-gold cursed energy aura
            const pulse = 0.1 + Math.sin(t * 0.005) * 0.08;
            ag.fillStyle(0xFF6600, pulse);
            ag.fillEllipse(x, y - 30, 55, 90);
        }
    }
}
