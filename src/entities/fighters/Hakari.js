// ========================================================
// Kinji Hakari — The Gambler
// Fever meter passive, Jackpot domain, God-state buff
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Hakari extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.HAKARI);
        this._baseSpeed = this.speed;
        this.isCasting = false;
        // Fever system
        this.feverMeter = 0;
        this.feverMax = 100;
        this.feverActive = false;
        this.feverTimer = 0;
        // Jackpot state
        this.jackpotActive = false;
        this.jackpotTimer = 0;
        this.jackpotRegenRate = 6; // progressive, not instantaneous
        // Probability shift buff
        this.probShiftTimer = 0;
        // Cooldowns
        this.shutterCd = 0;
        this.pachinkoCd = 0;
        // Domain minigame state
        this._domainAttempts = 0;
        this._domainMaxAttempts = 3;
        this._domainRoundTimer = null;
        this._domainTexts = [];
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 3 && this.input.isDown('DOWN')) {
            this.castRushCombo();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castProbabilityShift();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castPachinkoBalls();
        } else if (tier >= 1) {
            this.castShutterDoors();
        }
    }

    // ═══════════════════════════════════════
    // SKILL 1: Shutter Doors — trap + pull
    // ═══════════════════════════════════════
    castShutterDoors() {
        if (this.shutterCd > 0) return;
        const cost = this.probShiftTimer > 0 ? 8 : 15;
        if (!this.ceSystem.spend(cost)) return;
        this.shutterCd = this.probShiftTimer > 0 ? 1500 : 3000;
        this.isCasting = true;
        this.stateMachine.lock(800);

        try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (!target || target.isDead) { this._endCast(600); return; }

        const tx = target.sprite.x;
        const ty = target.sprite.y;
        const dist = Math.abs(tx - this.sprite.x);

        const g = this.scene.add.graphics().setDepth(16);
        const doorW = 30; const doorH = 100;
        g.fillStyle(0xFFCC00, 0.7);
        g.fillRect(tx - 80, ty - 50, doorW, doorH);
        g.fillRect(tx + 50, ty - 50, doorW, doorH);
        this.scene.tweens.add({
            targets: { offset: 50 },
            offset: 0,
            duration: 300,
            onUpdate: (tw, obj) => {
                g.clear();
                g.fillStyle(0xFFCC00, 0.7);
                g.fillRect(tx - 30 - obj.offset, ty - 50, doorW, doorH);
                g.fillRect(tx + obj.offset, ty - 50, doorW, doorH);
            },
            onComplete: () => {
                g.destroy();
                if (dist < 350) {
                    target.sprite.body.setVelocityX((this.sprite.x - tx) * 3);
                    target.takeDamage(Math.floor(30 * this.power), 0, 0, 600);
                    target.stateMachine.lock(1500);
                    this.scene.time.delayedCall(1500, () => target.stateMachine.unlock());
                    this.addFever(15);
                }
            }
        });
        this._endCast(700);
    }

    // ═══════════════════════════════════════
    // SKILL 2: Pachinko Balls — guard-break
    // ═══════════════════════════════════════
    castPachinkoBalls() {
        if (this.pachinkoCd > 0) return;
        const cost = this.probShiftTimer > 0 ? 10 : 20;
        if (!this.ceSystem.spend(cost)) return;
        this.pachinkoCd = this.probShiftTimer > 0 ? 1000 : 2000;
        this.isCasting = true;
        this.stateMachine.lock(600);

        try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}

        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 40 + i * 15, {
                    owner: this, damage: Math.floor(20 * this.power),
                    knockbackX: 100, knockbackY: 0, stunDuration: 150,
                    speed: 1000, direction: this.facing, color: 0xFFDD00,
                    size: { w: 15, h: 15 }, lifetime: 800, type: 'circle',
                    guardBreak: true,
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }
        this.addFever(8);
        this._endCast(500);
    }

    // ═══════════════════════════════════════
    // SKILL 3 (U+DOWN): Rush Combo — rapid punches
    // ═══════════════════════════════════════
    castRushCombo() {
        if (!this.ceSystem.spend(30)) return;
        this.isCasting = true;
        this.stateMachine.lock(1200);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const totalHits = 6;

        for (let i = 0; i < totalHits; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                if (!target || target.isDead) return;
                if (Math.abs(target.sprite.x - this.sprite.x) < 140) {
                    target.takeDamage(Math.floor(12 * this.power), 80 * this.facing, -20, 200);
                    // Punch spark VFX
                    const g = this.scene.add.graphics().setDepth(16);
                    const ox = target.sprite.x + (Math.random() - 0.5) * 20;
                    const oy = target.sprite.y - 25 + (Math.random() - 0.5) * 30;
                    g.fillStyle(0xFFCC00, 0.8);
                    g.fillCircle(ox, oy, 5 + Math.random() * 4);
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() });
                    try { this.scene.sound.play('sfx_slash', { volume: 0.3 }); } catch(e2) {}
                }
            });
        }

        // Final big punch
        this.scene.time.delayedCall(totalHits * 150, () => {
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 160) {
                target.takeDamage(Math.floor(35 * this.power), 600 * this.facing, -300, 500);
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
                const g = this.scene.add.graphics().setDepth(16);
                g.fillStyle(0xFFDD00, 0.6);
                g.fillCircle(target.sprite.x, target.sprite.y - 20, 18);
                this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 2, scaleY: 2, duration: 200, onComplete: () => g.destroy() });
            }
        });

        this.addFever(20);
        this._endCast(1100);
    }

    // ═══════════════════════════════════════
    // SKILL 4 (U+UP): Probability Shift
    // ═══════════════════════════════════════
    castProbabilityShift() {
        if (!this.ceSystem.spend(20)) return;
        this.probShiftTimer = 8000;
        this.isCasting = true;
        this.stateMachine.lock(400);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, '⚡ PROBABILITY SHIFT', {
            fontFamily: 'Arial Black', fontSize: '12px', color: '#FFDD00',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });

        this.addFever(5);
        this._endCast(350);
    }

    // ═══════════════════════════════════════
    // FEVER SYSTEM
    // ═══════════════════════════════════════
    addFever(amount) {
        if (this.feverActive || this.jackpotActive) return;
        this.feverMeter = Math.min(this.feverMax, this.feverMeter + amount);
        if (this.feverMeter >= this.feverMax) {
            this.feverActive = true;
            this.feverTimer = 10000;
            this.feverMeter = 0;
            this.speed = this._baseSpeed * 1.15;
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 90, '🔥 FEVER!', {
                fontFamily: 'Arial Black', fontSize: '16px', color: '#FF4400',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        }
    }

    // ═══════════════════════════════════════
    // DOMAIN — Idle Death Gamble (36s, 3 attempts)
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (this.jackpotActive) return;
        if (this.ceSystem.isFatigued) return;
        if (this.ceSystem.ce < 80) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        if (!this.ceSystem.spend(80)) return;
        this.domainActive = true;
        this.ceSystem.startDomain();

        try { this.scene.sound.play('sfx_purple', { volume: 0.8 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'idle_death_gamble');

        // Start the 3-attempt system (1 attempt every 15s, 45s total max)
        this._domainAttempts = 0;
        this._domainJackpotWon = false;

        // Show domain timer
        this._domainTimerText = this.scene.add.text(this.sprite.x, this.sprite.y - 140, '45', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);

        this._domainStartTime = this.scene.time.now;
        this._scheduleNextAttempt();
    }

    _scheduleNextAttempt() {
        if (this._domainJackpotWon) return;
        if (this._domainAttempts >= this._domainMaxAttempts) {
            this._endDomain();
            return;
        }

        // Delay before each spin (15s per attempt window)
        const delay = this._domainAttempts === 0 ? 1000 : 15000;

        this._domainRoundTimer = this.scene.time.delayedCall(delay, () => {
            if (this._domainJackpotWon) return;
            this._domainAttempts++;
            this._runSlotSpin();
        });
    }

    _runSlotSpin() {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocity(0, 0);

        const symbols = ['🎰', '💀', '⭐', '🔥', '💎', '7️⃣'];
        let spinCount = 0;
        const maxSpins = 20;
        const reelTexts = [];

        // Attempt counter (center of screen)
        const cx = this.scene.cameras.main.centerX;
        const cy = this.scene.cameras.main.centerY;
        
        const attemptTxt = this.scene.add.text(cx, cy - 100, `ATTEMPT ${this._domainAttempts}/3`, {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#FFCC00',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(30);

        for (let i = 0; i < 3; i++) {
            const t = this.scene.add.text(cx - 100 + i * 100, cy, '?', {
                fontFamily: 'Arial Black', fontSize: '80px', color: '#FFDD00',
                stroke: '#000000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(30);
            reelTexts.push(t);
        }

        const spinInterval = this.scene.time.addEvent({
            delay: 80,
            callback: () => {
                spinCount++;
                reelTexts.forEach(t => {
                    t.setText(symbols[Math.floor(Math.random() * symbols.length)]);
                });
                if (spinCount >= maxSpins) {
                    spinInterval.remove();
                    this._resolveSlot(reelTexts, attemptTxt);
                }
            },
            loop: true
        });
    }

    _resolveSlot(reelTexts, attemptTxt) {
        const isJackpot = Math.random() < 0.65;

        if (isJackpot) {
            // JACKPOT!
            reelTexts.forEach(t => t.setText('7️⃣'));
            this._domainJackpotWon = true;

            const jTxt = this.scene.add.text(cx, cy - 160, '🎰 JACKPOT!!! 🎰', {
                fontFamily: 'Arial Black', fontSize: '40px', color: '#FFD700',
                stroke: '#FF0000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(30);
            this.scene.tweens.add({
                targets: jTxt, scaleX: 1.5, scaleY: 1.5,
                duration: 400, yoyo: true, repeat: 2,
                onComplete: () => jTxt.destroy()
            });
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0xFFDD00, 300, 0.8);
                this.scene.screenEffects.shake(0.05, 500);
            }

            this.scene.time.delayedCall(1500, () => {
                reelTexts.forEach(t => t.destroy());
                attemptTxt.destroy();
                this._activateJackpotState();
            });
        } else {
            // MISS
            reelTexts.forEach(t => {
                t.setText('💀');
                this.scene.tweens.add({ targets: t, alpha: 0, duration: 800, onComplete: () => t.destroy() });
            });
            const loseTxt = this.scene.add.text(cx, cy - 140, 'MISS...', {
                fontFamily: 'Arial Black', fontSize: '30px', color: '#888888',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(30);
            this.scene.tweens.add({ targets: loseTxt, y: loseTxt.y - 20, alpha: 0, duration: 800, onComplete: () => loseTxt.destroy() });
            attemptTxt.destroy();

            // Unlock between attempts
            this.scene.time.delayedCall(500, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
                this._scheduleNextAttempt();
            });
        }
    }

    _activateJackpotState() {
        this.jackpotActive = true;
        this.jackpotTimer = 15000;
        this._endDomain();

        this.ceSystem.ce = this.ceSystem.maxCe;
        this.speed = this._baseSpeed * 1.3;
        this.power *= 1.4;

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 100, '∞ UNLIMITED ∞', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
    }

    _endDomain() {
        this.domainActive = false;
        this.ceSystem.endDomain();
        this.isCasting = false;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');
        if (this._domainTimerText) { this._domainTimerText.destroy(); this._domainTimerText = null; }
        if (this._domainRoundTimer) { this._domainRoundTimer.remove(); this._domainRoundTimer = null; }
    }

    applySureHitTick(opponent) { }

    _endCast(delay) {
        this.scene.time.delayedCall(delay, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.shutterCd > 0) this.shutterCd -= dt;
        if (this.pachinkoCd > 0) this.pachinkoCd -= dt;
        if (this.probShiftTimer > 0) this.probShiftTimer -= dt;

        if (this.feverActive) {
            this.feverTimer -= dt;
            if (this.feverTimer <= 0) { this.feverActive = false; this.speed = this._baseSpeed; }
        }

        if (this.jackpotActive) {
            this.jackpotTimer -= dt;
            this.hp = Math.min(this.charData.stats.maxHp, this.hp + this.jackpotRegenRate);
            this.ceSystem.ce = this.ceSystem.maxCe;
            if (this.jackpotTimer <= 0) {
                this.jackpotActive = false;
                this.speed = this._baseSpeed;
                this.power = this.charData.stats.power || 1.0;
            }
        }

        // Domain timer display
        if (this.domainActive && this._domainTimerText && this._domainStartTime) {
            const elapsed = (time - this._domainStartTime) / 1000;
            const remaining = Math.max(0, 45 - elapsed);
            this._domainTimerText.setText(Math.ceil(remaining) + 's');
            this._domainTimerText.setPosition(this.sprite.x, this.sprite.y - 140);
            if (remaining <= 0 && !this._domainJackpotWon) {
                this._endDomain();
            }
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Full-height Hakari (Gojo-scale)
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const skinColor = isFlashing ? 0xFFFFFF : 0xF0D0B0;
        const jacketColor = isFlashing ? 0xFFFFFF : 0x222222;
        const pantsColor = isFlashing ? 0xFFFFFF : 0x333333;
        const hairColor = isFlashing ? 0xFFFFFF : 0xBB8833;
        const armExtend = this.attackSwing * 40;
        const t = (this.animTimer || 0) * 0.003;

        // Jackpot golden aura
        if (this.jackpotActive) {
            const pulse = 0.3 + Math.sin(t * 4) * 0.15;
            g.fillStyle(0xFFDD00, pulse);
            g.fillEllipse(x, masterY - 20, 70, 90);
            g.lineStyle(2, 0xFFD700, pulse * 0.5);
            g.strokeEllipse(x, masterY - 20, 75, 95);
        }
        if (this.feverActive) {
            g.fillStyle(0xFF4400, 0.1 + Math.sin(t * 3) * 0.05);
            g.fillEllipse(x, masterY - 15, 55, 70);
        }

        // LEGS
        const legY = masterY + 5;
        let leftLeg = 35, rightLeg = 35;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 20; rightLeg = 20; }
        g.fillStyle(pantsColor, 0.85);
        g.fillTriangle(x - 10, legY, x - 10 - 10, legY + leftLeg, x - 10 + 10, legY + leftLeg - 5);
        g.fillStyle(pantsColor, 1);
        g.fillTriangle(x + 10, legY, x + 10 - 12 * f, legY + rightLeg, x + 10 + 12 * f, legY + rightLeg - 2);

        // TORSO
        g.fillStyle(jacketColor, 1);
        g.beginPath();
        g.moveTo(x - 16, masterY - 38);
        g.lineTo(x + 16, masterY - 38);
        g.lineTo(x + 12, masterY + 12);
        g.lineTo(x - 12, masterY + 12);
        g.fillPath();
        // Shirt underneath
        g.fillStyle(0xEEEEEE, 1);
        g.fillRect(x - 6, masterY - 35, 12, 40);
        g.lineStyle(2, 0xFF4444, 0.6);
        g.beginPath(); g.moveTo(x, masterY - 34); g.lineTo(x, masterY + 8); g.strokePath();
        // Jacket line details
        g.lineStyle(1, 0x333333, 0.4);
        g.beginPath(); g.moveTo(x, masterY - 38); g.lineTo(x, masterY + 10); g.strokePath();

        // BACK ARM
        const armY = masterY - 34;
        g.lineStyle(10, jacketColor, 0.8);
        g.beginPath();
        g.moveTo(x - 12 * f, armY + 2);
        g.lineTo(x - 22 * f, armY + 18);
        g.strokePath();

        // HEAD
        const hx = x; const hy = masterY - 56;
        g.fillStyle(skinColor, 1);
        g.fillRect(hx - 4, hy + 5, 8, 8); // Neck
        g.beginPath();
        g.moveTo(hx - 12, hy - 10);
        g.lineTo(hx + 12, hy - 10);
        g.lineTo(hx + 8, hy + 12);
        g.lineTo(hx - 8, hy + 12);
        g.fillPath();

        // Hair — messy/spiked blonde
        g.fillStyle(hairColor, 1);
        for (let i = -14; i <= 14; i += 4) {
            const spikeH = 12 + Math.cos((i / 14) * (Math.PI / 2)) * 8;
            const slant = (i * 0.5) * f;
            g.fillTriangle(hx + i, hy - 8, hx + i + 2, hy - 8, hx + i + slant, hy - 8 - spikeH);
        }

        // Eyes
        g.fillStyle(0x000000, 1);
        g.fillCircle(hx - 5 * f, hy - 2, 2.5);
        g.fillCircle(hx + 5 * f, hy - 2, 2.5);
        // Smirk
        g.lineStyle(1, 0x000000, 0.8);
        g.beginPath(); g.moveTo(hx - 3 * f, hy + 6);
        g.lineTo(hx + 6 * f, hy + 5); g.strokePath();

        // FRONT ARM (attack arm)
        g.lineStyle(10, jacketColor, 1);
        g.beginPath();
        g.moveTo(x + 12 * f, armY + 2);
        g.lineTo(x + (22 + armExtend) * f, armY + 5);
        g.strokePath();
        // Fists
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 22 * f, armY + 20, 5);
        g.fillCircle(x + (22 + armExtend) * f, armY + 7, 6);

        // Fever meter bar (above head)
        if (!this.jackpotActive) {
            const barW = 30; const barH = 4;
            const barX = x - barW / 2; const barY = hy - 22;
            g.fillStyle(0x333333, 0.6); g.fillRect(barX, barY, barW, barH);
            const fillW = (this.feverMeter / this.feverMax) * barW;
            g.fillStyle(this.feverActive ? 0xFF4400 : 0xFFCC00, 0.8);
            g.fillRect(barX, barY, fillW, barH);
            g.lineStyle(1, 0x666666, 0.5); g.strokeRect(barX, barY, barW, barH);
        }
    }
}
