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

        if (!this.ceSystem.spend(80)) return;
        
        this.yujiAwakened = true;
        this.yujiAwakenedTimer = 15000;
        
        // Boosts
        this.power = (this.charData.stats.power || 1.0) * 1.5;
        this.speed = (this.charData.stats.speed || 300) * 1.1; // 10% more speed
        this.defense = (this.charData.stats.defense || 0.95) * 1.1; // 10% more defense
        this.blackFlashMultiplier = 1.5; // He naturally has 20%. 20% * 1.5 = 30% chance

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

            // Visual aura
            if (Math.floor(time) % 100 < 40) {
                const cx = this.sprite.x + (Math.random() - 0.5) * 40;
                const cy = this.sprite.y + (Math.random() - 0.5) * 80;
                const spark = this.scene.add.circle(cx, cy, 3, 0xFF6600, 0.8).setDepth(15);
                this.scene.tweens.add({ targets: spark, y: cy - 40, alpha: 0, duration: 400, onComplete: () => spark.destroy() });
            }

            if (this.yujiAwakenedTimer <= 0) {
                this.yujiAwakened = false;
                this.power = this.charData.stats.power || 1.0;
                this.speed = this.charData.stats.speed || 300;
                this.defense = this.charData.stats.defense || 0.95;
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
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.004);

        const skinColor = isFlashing ? 0xFFFFFF : 0xffe4d6;
        const uniformColor = isFlashing ? 0xFFFFFF : 0x161824;
        const hairColor = isFlashing ? 0xFFFFFF : 0xfda4af;
        const shoeColor = isFlashing ? 0xFFFFFF : 0xdc2626;
        const buttonColor = isFlashing ? 0xFFFFFF : 0xfbbf24;

        const ox = x;
        const oy = masterY;

        const rotArmSup = isMoving ? Math.sin(time * 1.5) * 10 : 15;
        const rotArmInf = isMoving ? Math.sin(time * 1.5 + 0.3) * 8 : 10;
        const rotLegSup = isMoving ? Math.cos(time * 1.5) * 5 : 0;
        const rotLegInf = isMoving ? Math.cos(time * 1.5 + 0.5) * 4 : 0;

        // ── Legs (dark uniform pants) ──
        this.drawRect(g, ox - 7, oy + 41, 9.5, 28, uniformColor, rotLegSup);
        this.drawCircle(g, ox - 7, oy + 54, 4, isFlashing ? 0xFFFFFF : 0x000000); // Knee
        this.drawRect(g, ox - 7, oy + 67, 8, 24, uniformColor, rotLegInf);
        this.drawRect(g, ox - 8, oy + 80, 11, 6, shoeColor); // Red sneaker

        this.drawRect(g, ox + 7, oy + 41, 9.5, 28, uniformColor, -rotLegSup);
        this.drawCircle(g, ox + 7, oy + 54, 4, isFlashing ? 0xFFFFFF : 0x000000); // Knee
        this.drawRect(g, ox + 7, oy + 67, 8, 24, uniformColor, -rotLegInf);
        this.drawRect(g, ox + 8, oy + 80, 11, 6, shoeColor); // Red sneaker

        // ── Torso (school uniform jacket) ──
        this.drawRect(g, ox, oy - 10, 24, 38, uniformColor);
        this.drawRect(g, ox, oy + 18, 23, 18, uniformColor);

        // ── High collar with gold button ──
        this.drawRect(g, ox, oy - 31, 12, 10, uniformColor);
        this.drawCircle(g, ox + 4, oy - 30, 2.5, buttonColor);

        // ── Arms (uniform sleeves) ──
        this.drawRect(g, ox - 15, oy - 12, 8.5, 22, uniformColor, rotArmSup);
        this.drawRect(g, ox - 15, oy + 8, 7, 18, uniformColor, rotArmInf);
        this.drawCircle(g, ox - 15, oy + 20, 4.5, skinColor); // Hand

        this.drawRect(g, ox + 15, oy - 12, 8.5, 22, uniformColor, -rotArmSup);
        this.drawRect(g, ox + 15, oy + 8, 7, 18, uniformColor, -rotArmInf);
        this.drawCircle(g, ox + 15, oy + 20, 4.5, skinColor); // Hand

        // ── Head ──
        const hx = ox;
        const hy = oy - 48;

        // Undercut hair base (behind head)
        this.drawCircle(g, hx, hy - 2, 15, isFlashing ? 0xFFFFFF : 0x111827);

        // Ears
        this.drawCircle(g, hx - 13, hy + 1, 3.5, skinColor);
        this.drawCircle(g, hx + 13, hy + 1, 3.5, skinColor);

        // Face
        this.drawCircle(g, hx, hy, 13, skinColor);

        // ── Battle eyes (angry brows, white sclera, hazel pupils) ──
        if (!isFlashing) {
            // Angry eyebrows
            this.drawLine(g, hx - 8, hy - 6, hx - 2, hy - 3.5, 2, 0x000000);
            this.drawLine(g, hx + 8, hy - 6, hx + 2, hy - 3.5, 2, 0x000000);
            // White sclera
            this.drawRect(g, hx - 5, hy - 1, 5, 2.5, 0xffffff);
            this.drawRect(g, hx + 5, hy - 1, 5, 2.5, 0xffffff);
            // Hazel pupils
            this.drawCircle(g, hx - 4, hy - 1, 1.2, 0x7c2d12);
            this.drawCircle(g, hx + 4, hy - 1, 1.2, 0x7c2d12);
            // Upper eyelids
            this.drawLine(g, hx - 8, hy - 2, hx - 2, hy - 1, 2, 0x000000);
            this.drawLine(g, hx + 8, hy - 2, hx + 2, hy - 1, 2, 0x000000);
            // Determined mouth
            this.drawLine(g, hx - 3, hy + 6, hx + 3, hy + 6, 1.5, 0x000000);
            // Scars
            this.drawLine(g, hx - 6, hy + 2.5, hx - 3, hy + 4.5, 1.5, 0x991b1b); // Cheek
            this.drawLine(g, hx - 2, hy - 8, hx - 4, hy - 13, 1.5, 0x991b1b); // Forehead
        }

        // ── Pink spiky hair (upward spikes + bangs) ──
        this.drawTriangle(g, hx - 8, hy - 12, 6, 14, hairColor, 155);
        this.drawTriangle(g, hx - 3, hy - 14, 6, 16, hairColor, 170);
        this.drawTriangle(g, hx + 3, hy - 14, 6, 16, hairColor, 190);
        this.drawTriangle(g, hx + 8, hy - 12, 6, 14, hairColor, 205);
        // Bangs falling on forehead
        this.drawTriangle(g, hx - 7, hy - 8, 4.5, 11, hairColor, 25);
        this.drawTriangle(g, hx - 2.5, hy - 9, 4.5, 13, hairColor, 10);
        this.drawTriangle(g, hx + 2.5, hy - 9, 4.5, 13, hairColor, -10);
        this.drawTriangle(g, hx + 7, hy - 8, 4.5, 11, hairColor, -25);

        // ── Hitstun stars ──
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
