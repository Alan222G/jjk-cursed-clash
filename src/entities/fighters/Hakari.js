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
        this.jackpotRegenRate = 60; // HP per frame
        // Probability shift buff
        this.probShiftTimer = 0;
        // Cooldowns
        this.shutterCd = 0;
        this.pachinkoCd = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 3 && this.input.isDown('DOWN')) {
            this.castSubsonicKick();
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

        // Two doors VFX closing on target
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
                    // Pull and immobilize
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
    // SKILL 2: Pachinko Balls — guard-break projectile
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
    // SKILL 3: Push Kick — big knockback
    // ═══════════════════════════════════════
    castSubsonicKick() {
        if (!this.ceSystem.spend(25)) return;
        this.isCasting = true;
        this.stateMachine.lock(700);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 130) {
            target.takeDamage(Math.floor(45 * this.power), 1200 * this.facing, -300, 500);
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
            // Kick VFX
            const g = this.scene.add.graphics().setDepth(16);
            g.lineStyle(5, 0xFFCC00, 0.8);
            g.beginPath(); g.moveTo(this.sprite.x + 15 * this.facing, this.sprite.y);
            g.lineTo(target.sprite.x, target.sprite.y - 20); g.strokePath();
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
            this.addFever(12);
        }
        this._endCast(600);
    }

    // ═══════════════════════════════════════
    // SKILL 4: Probability Shift — cooldown buff
    // ═══════════════════════════════════════
    castProbabilityShift() {
        if (!this.ceSystem.spend(20)) return;
        this.probShiftTimer = 8000; // 8s half cooldowns
        this.isCasting = true;
        this.stateMachine.lock(400);

        // Buff VFX
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, '⚡ PROBABILITY SHIFT', {
            fontFamily: 'Arial Black', fontSize: '12px', color: '#FFDD00',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });

        this.addFever(5);
        this._endCast(350);
    }

    // ═══════════════════════════════════════
    // FEVER SYSTEM — passive attack speed buff
    // ═══════════════════════════════════════
    addFever(amount) {
        if (this.feverActive || this.jackpotActive) return;
        this.feverMeter = Math.min(this.feverMax, this.feverMeter + amount);
        if (this.feverMeter >= this.feverMax) {
            this.feverActive = true;
            this.feverTimer = 10000; // 10 seconds
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
    // DOMAIN — Idle Death Gamble
    // RNG Jackpot → God state (regen + infinite CE)
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (this.jackpotActive) return; // Already in god state
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
        this.isCasting = true;
        this.stateMachine.lock(99999);

        try { this.scene.sound.play('sfx_purple', { volume: 0.8 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'idle_death_gamble');

        // Jackpot RNG — visual slot machine, 65% chance
        this._runJackpotSequence();
    }

    _runJackpotSequence() {
        const symbols = ['🎰', '💀', '⭐', '🔥', '💎', '7️⃣'];
        let spinCount = 0;
        const maxSpins = 20;
        const resultTexts = [];

        // Create 3 slot reels
        for (let i = 0; i < 3; i++) {
            const t = this.scene.add.text(this.sprite.x - 30 + i * 30, this.sprite.y - 100, '?', {
                fontFamily: 'Arial Black', fontSize: '20px', color: '#FFDD00',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(25);
            resultTexts.push(t);
        }

        // Spin animation
        const spinInterval = this.scene.time.addEvent({
            delay: 80,
            callback: () => {
                spinCount++;
                resultTexts.forEach(t => {
                    t.setText(symbols[Math.floor(Math.random() * symbols.length)]);
                });
                if (spinCount >= maxSpins) {
                    spinInterval.remove();
                    this._resolveJackpot(resultTexts);
                }
            },
            loop: true
        });
    }

    _resolveJackpot(reelTexts) {
        const isJackpot = Math.random() < 0.65; // 65% win rate

        if (isJackpot) {
            // JACKPOT! Set all reels to 7
            reelTexts.forEach(t => t.setText('7️⃣'));

            this.scene.time.delayedCall(600, () => {
                reelTexts.forEach(t => t.destroy());
                this._activateJackpotState();
            });

            // Jackpot text
            const jTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 140, '🎰 JACKPOT!!! 🎰', {
                fontFamily: 'Arial Black', fontSize: '22px', color: '#FFD700',
                stroke: '#FF0000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(25);
            this.scene.tweens.add({
                targets: jTxt, scaleX: 1.5, scaleY: 1.5,
                duration: 400, yoyo: true, repeat: 2,
                onComplete: () => jTxt.destroy()
            });
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0xFFDD00, 300, 0.8);
                this.scene.screenEffects.shake(0.05, 500);
            }
        } else {
            // LOSE — vulnerable exit
            reelTexts.forEach(t => {
                t.setText('💀');
                this.scene.tweens.add({ targets: t, alpha: 0, duration: 600, onComplete: () => t.destroy() });
            });
            const loseTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 130, 'MISS...', {
                fontFamily: 'Arial Black', fontSize: '16px', color: '#888888',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(25);
            this.scene.tweens.add({ targets: loseTxt, y: loseTxt.y - 20, alpha: 0, duration: 1000, onComplete: () => loseTxt.destroy() });

            this.scene.time.delayedCall(400, () => {
                this.domainActive = false;
                this.ceSystem.endDomain();
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            });
        }
    }

    _activateJackpotState() {
        this.jackpotActive = true;
        this.jackpotTimer = 15000; // 15s god state (scaled from manga's 4:11)
        this.domainActive = false;
        this.ceSystem.endDomain();
        this.isCasting = false;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');

        // Infinite CE during jackpot
        this.ceSystem.ce = this.ceSystem.maxCe;
        this.speed = this._baseSpeed * 1.3;
        this.power *= 1.4;

        // Gold aura text
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 100, '∞ UNLIMITED ∞', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
    }

    applySureHitTick(opponent) {
        // Domain doesn't do sure-hit damage — it's about the gamble
    }

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

        // Fever timer
        if (this.feverActive) {
            this.feverTimer -= dt;
            if (this.feverTimer <= 0) {
                this.feverActive = false;
                this.speed = this._baseSpeed;
            }
        }

        // Jackpot state — regen HP + CE every frame
        if (this.jackpotActive) {
            this.jackpotTimer -= dt;
            this.hp = Math.min(this.charData.stats.maxHp, this.hp + this.jackpotRegenRate);
            this.ceSystem.ce = this.ceSystem.maxCe; // Infinite CE
            if (this.jackpotTimer <= 0) {
                this.jackpotActive = false;
                this.speed = this._baseSpeed;
                this.power = this.charData.stats.power || 1.0;
            }
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Hakari with gambling aesthetics
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
            g.fillEllipse(x, masterY - 20, 60, 70);
            g.lineStyle(2, 0xFFD700, pulse * 0.5);
            g.strokeEllipse(x, masterY - 20, 65, 75);
        }

        // Fever aura
        if (this.feverActive) {
            g.fillStyle(0xFF4400, 0.1 + Math.sin(t * 3) * 0.05);
            g.fillEllipse(x, masterY - 15, 45, 55);
        }

        // LEGS
        const legY = masterY + 8;
        let leftLeg = 38, rightLeg = 38;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 22; rightLeg = 22; }
        g.lineStyle(7, pantsColor, 1);
        g.beginPath(); g.moveTo(x - 6 * f, legY); g.lineTo(x - 6 * f, legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 6 * f, legY); g.lineTo(x + 6 * f, legY + rightLeg); g.strokePath();
        // Shoes
        g.fillStyle(0x111111, 1);
        g.fillEllipse(x - 6 * f, legY + leftLeg + 3, 10, 5);
        g.fillEllipse(x + 6 * f, legY + rightLeg + 3, 10, 5);

        // TORSO — open jacket
        g.fillStyle(jacketColor, 1);
        g.fillRoundedRect(x - 14, masterY - 18, 28, 30, 4);
        // Shirt underneath (white/red stripe)
        g.fillStyle(0xEEEEEE, 1);
        g.fillRect(x - 8, masterY - 15, 16, 25);
        g.lineStyle(2, 0xFF4444, 0.6);
        g.beginPath(); g.moveTo(x, masterY - 14); g.lineTo(x, masterY + 8); g.strokePath();

        // ARMS
        g.lineStyle(6, skinColor, 1);
        g.beginPath(); g.moveTo(x - 16, masterY - 12);
        g.lineTo(x - 16 - 12 * f, masterY + 5 + armExtend * 0.3); g.strokePath();
        g.beginPath(); g.moveTo(x + 16, masterY - 12);
        g.lineTo(x + 16 + (10 + armExtend) * f, masterY - 5); g.strokePath();
        // Fists
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 16 - 12 * f, masterY + 7 + armExtend * 0.3, 5);
        g.fillCircle(x + 16 + (10 + armExtend) * f, masterY - 5, 5);

        // HEAD
        g.fillStyle(skinColor, 1);
        g.fillCircle(x + 2 * f, masterY - 30, 13);
        // Hair — messy/spiked blonde
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(x - 12, masterY - 35);
        g.lineTo(x - 8, masterY - 50);
        g.lineTo(x - 2, masterY - 42);
        g.lineTo(x + 3, masterY - 52);
        g.lineTo(x + 8, masterY - 44);
        g.lineTo(x + 12, masterY - 48);
        g.lineTo(x + 14, masterY - 35);
        g.fillPath();
        // Eyes
        g.fillStyle(0x000000, 1);
        g.fillCircle(x - 4 * f, masterY - 32, 2);
        g.fillCircle(x + 6 * f, masterY - 32, 2);
        // Smirk
        g.lineStyle(1, 0x000000, 0.8);
        g.beginPath(); g.moveTo(x - 2 * f, masterY - 26);
        g.lineTo(x + 7 * f, masterY - 27); g.strokePath();

        // Fever meter bar (above head)
        if (!this.jackpotActive) {
            const barW = 30; const barH = 4;
            const barX = x - barW / 2; const barY = masterY - 55;
            g.fillStyle(0x333333, 0.6); g.fillRect(barX, barY, barW, barH);
            const fillW = (this.feverMeter / this.feverMax) * barW;
            g.fillStyle(this.feverActive ? 0xFF4400 : 0xFFCC00, 0.8);
            g.fillRect(barX, barY, fillW, barH);
            g.lineStyle(1, 0x666666, 0.5); g.strokeRect(barX, barY, barW, barH);
        }
    }
}
