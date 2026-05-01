// ========================================================
// Kinji Hakari — The Gambler
// Canon: Brawler with "rough" CE, Idle Death Gamble domain
// Jackpot = unlimited CE + RCT instant heal
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
        // Fever system — rough CE
        this.feverMeter = 0;
        this.feverMax = 100;
        this.feverActive = false;
        this.feverTimer = 0;
        // Jackpot state
        this.jackpotActive = false;
        this.jackpotTimer = 0;
        this.jackpotRegenRate = 60;
        // Cooldowns
        this.roughStrikeCd = 0;
        this.serrateCd = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 3 && this.input.isDown('DOWN')) {
            // Rough CE Barrage — rapid multi-hit combo
            this.castRoughBarrage();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            // CE-reinforced uppercut
            this.castRoughUppercut();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            // Serrated rush — dash + multi-hit
            this.castSerratedRush();
        } else if (tier >= 1) {
            // Rough Strike — enhanced punch
            this.castRoughStrike();
        }
    }

    // ═══════════════════════════════════════
    // SKILL 1: Rough Strike — CE-reinforced hit
    // "Like being hit by a serrated bat"
    // ═══════════════════════════════════════
    castRoughStrike() {
        if (this.roughStrikeCd > 0) return;
        if (!this.ceSystem.spend(12)) return;
        this.roughStrikeCd = 1200;
        this.isCasting = true;
        this.stateMachine.lock(600);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 130) {
            const dmg = Math.floor(50 * this.power * (this.feverActive ? 1.2 : 1));
            target.takeDamage(dmg, 350 * this.facing, -100, 400);
            this.addFever(12);

            // Rough CE VFX — jagged sparks on impact
            const g = this.scene.add.graphics().setDepth(16);
            const ox = target.sprite.x; const oy = target.sprite.y - 20;
            g.lineStyle(3, 0xFFCC00, 0.9);
            for (let i = 0; i < 5; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 10 + Math.random() * 15;
                g.beginPath(); g.moveTo(ox, oy);
                g.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r); g.strokePath();
            }
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        }
        this._endCast(500);
    }

    // ═══════════════════════════════════════
    // SKILL 2: Serrated Rush — dash + 3 hits
    // ═══════════════════════════════════════
    castSerratedRush() {
        if (this.serrateCd > 0) return;
        if (!this.ceSystem.spend(22)) return;
        this.serrateCd = 2500;
        this.isCasting = true;
        this.stateMachine.lock(900);

        // Dash forward
        this.sprite.body.setVelocityX(600 * this.facing);
        try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        // 3 rapid hits with slight delays
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(150 + i * 120, () => {
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 150) {
                    const dmg = Math.floor(22 * this.power);
                    target.takeDamage(dmg, 120 * this.facing, -30, 200);
                    this.addFever(5);
                    // Hit spark
                    const g = this.scene.add.graphics().setDepth(16);
                    g.fillStyle(0xFFDD00, 0.8);
                    g.fillCircle(target.sprite.x + (Math.random() - 0.5) * 20, target.sprite.y - 20 + (Math.random() - 0.5) * 15, 6);
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
                }
            });
        }
        this.addFever(8);
        this._endCast(700);
    }

    // ═══════════════════════════════════════
    // SKILL 3: Rough CE Uppercut
    // ═══════════════════════════════════════
    castRoughUppercut() {
        if (!this.ceSystem.spend(18)) return;
        this.isCasting = true;
        this.stateMachine.lock(700);
        this.sprite.body.setVelocityY(-350);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 120) {
            target.takeDamage(Math.floor(40 * this.power), 200 * this.facing, -500, 500);
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
            this.addFever(10);
        }
        this._endCast(600);
    }

    // ═══════════════════════════════════════
    // SKILL 4: Rough Barrage — relentless combo
    // ═══════════════════════════════════════
    castRoughBarrage() {
        if (!this.ceSystem.spend(30)) return;
        this.isCasting = true;
        this.stateMachine.lock(1200);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        for (let i = 0; i < 6; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                try { this.scene.sound.play('sfx_slash', { volume: 0.4 }); } catch(e) {}
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 140) {
                    const dmg = Math.floor(18 * this.power);
                    target.takeDamage(dmg, 80 * this.facing, -20, 150);
                    this.addFever(3);
                }
            });
        }

        // Final heavy hit
        this.scene.time.delayedCall(700, () => {
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 150) {
                target.takeDamage(Math.floor(45 * this.power), 600 * this.facing, -250, 600);
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.03, 300);
                this.addFever(15);
            }
        });
        this._endCast(1100);
    }

    // ═══════════════════════════════════════
    // FEVER — passive attack speed / power buff
    // ═══════════════════════════════════════
    addFever(amount) {
        if (this.jackpotActive) return;
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
    // DOMAIN — Idle Death Gamble
    // Pachinko RNG → Jackpot = unkillable mode
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
        this.isCasting = true;
        this.stateMachine.lock(99999);

        try { this.scene.sound.play('sfx_purple', { volume: 0.8 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'idle_death_gamble');

        this._runJackpotSequence();
    }

    _runJackpotSequence() {
        const symbols = ['🎰', '💀', '⭐', '🔥', '💎', '7️⃣'];
        let spinCount = 0;
        const maxSpins = 20;
        const resultTexts = [];

        for (let i = 0; i < 3; i++) {
            const t = this.scene.add.text(this.sprite.x - 30 + i * 30, this.sprite.y - 100, '?', {
                fontFamily: 'Arial Black', fontSize: '20px', color: '#FFDD00',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(25);
            resultTexts.push(t);
        }

        const spinInterval = this.scene.time.addEvent({
            delay: 80,
            callback: () => {
                spinCount++;
                resultTexts.forEach(t => t.setText(symbols[Math.floor(Math.random() * symbols.length)]));
                if (spinCount >= maxSpins) {
                    spinInterval.remove();
                    this._resolveJackpot(resultTexts);
                }
            },
            loop: true
        });
    }

    _resolveJackpot(reelTexts) {
        const isJackpot = Math.random() < 0.65;

        if (isJackpot) {
            reelTexts.forEach(t => t.setText('7️⃣'));
            this.scene.time.delayedCall(600, () => {
                reelTexts.forEach(t => t.destroy());
                this._activateJackpotState();
            });

            const jTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 140, '🎰 JACKPOT!!! 🎰', {
                fontFamily: 'Arial Black', fontSize: '22px', color: '#FFD700',
                stroke: '#FF0000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(25);
            this.scene.tweens.add({ targets: jTxt, scaleX: 1.5, scaleY: 1.5, duration: 400, yoyo: true, repeat: 2, onComplete: () => jTxt.destroy() });
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0xFFDD00, 300, 0.8);
                this.scene.screenEffects.shake(0.05, 500);
            }
        } else {
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
        this.jackpotTimer = 15000; // 15s god state
        this.domainActive = false;
        this.ceSystem.endDomain();
        this.isCasting = false;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');

        this.ceSystem.ce = this.ceSystem.maxCe;
        this.speed = this._baseSpeed * 1.3;
        this.power *= 1.4;

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 100, '∞ UNKILLABLE ∞', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
    }

    applySureHitTick(opponent) {}

    _endCast(delay) {
        this.scene.time.delayedCall(delay, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.roughStrikeCd > 0) this.roughStrikeCd -= dt;
        if (this.serrateCd > 0) this.serrateCd -= dt;

        if (this.feverActive) {
            this.feverTimer -= dt;
            if (this.feverTimer <= 0) {
                this.feverActive = false;
                this.speed = this._baseSpeed;
            }
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
    }

    // ═══════════════════════════════════════
    // DRAW — Hakari: shorter, brawler build
    // Messy blonde hair, open jacket, streetwear
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 70, 22); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        // Shorter character — masterY offset +8 compared to standard
        const masterY = y + bobY + 8;
        const skinColor = isFlashing ? 0xFFFFFF : 0xF0D0B0;
        const jacketColor = isFlashing ? 0xFFFFFF : 0x1A1A1A;
        const pantsColor = isFlashing ? 0xFFFFFF : 0x2A2A2A;
        const hairColor = isFlashing ? 0xFFFFFF : 0xCC9933;
        const armExtend = this.attackSwing * 35;
        const t = (this.animTimer || 0) * 0.003;

        // Jackpot golden aura
        if (this.jackpotActive) {
            const pulse = 0.3 + Math.sin(t * 4) * 0.15;
            g.fillStyle(0xFFDD00, pulse);
            g.fillEllipse(x, masterY - 15, 50, 60);
        }
        // Fever aura
        if (this.feverActive) {
            g.fillStyle(0xFF4400, 0.1 + Math.sin(t * 3) * 0.05);
            g.fillEllipse(x, masterY - 10, 40, 48);
        }

        // LEGS — shorter
        const legY = masterY + 6;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.3; rightLeg -= this.walkCycle * 1.3; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 18; rightLeg = 18; }
        g.lineStyle(7, pantsColor, 1);
        g.beginPath(); g.moveTo(x - 5 * f, legY); g.lineTo(x - 5 * f, legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 5 * f, legY); g.lineTo(x + 5 * f, legY + rightLeg); g.strokePath();
        g.fillStyle(0x111111, 1);
        g.fillEllipse(x - 5 * f, legY + leftLeg + 3, 9, 4);
        g.fillEllipse(x + 5 * f, legY + rightLeg + 3, 9, 4);

        // TORSO — open jacket, compact
        g.fillStyle(jacketColor, 1);
        g.fillRoundedRect(x - 12, masterY - 15, 24, 24, 3);
        g.fillStyle(0xDDDDDD, 1);
        g.fillRect(x - 6, masterY - 13, 12, 20);
        g.lineStyle(1, 0xCC4444, 0.5);
        g.beginPath(); g.moveTo(x, masterY - 12); g.lineTo(x, masterY + 5); g.strokePath();

        // ARMS — brawler
        g.lineStyle(5, skinColor, 1);
        g.beginPath(); g.moveTo(x - 14, masterY - 10);
        g.lineTo(x - 14 - 10 * f, masterY + 3 + armExtend * 0.3); g.strokePath();
        g.beginPath(); g.moveTo(x + 14, masterY - 10);
        g.lineTo(x + 14 + (8 + armExtend) * f, masterY - 4); g.strokePath();
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 14 - 10 * f, masterY + 5 + armExtend * 0.3, 4);
        g.fillCircle(x + 14 + (8 + armExtend) * f, masterY - 4, 4);

        // HEAD — smaller
        g.fillStyle(skinColor, 1);
        g.fillCircle(x + 2 * f, masterY - 25, 11);
        // Hair — messy spiked blonde
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(x - 10, masterY - 30);
        g.lineTo(x - 7, masterY - 43);
        g.lineTo(x - 1, masterY - 37);
        g.lineTo(x + 3, masterY - 45);
        g.lineTo(x + 7, masterY - 38);
        g.lineTo(x + 11, masterY - 42);
        g.lineTo(x + 12, masterY - 30);
        g.fillPath();
        // Eyes
        g.fillStyle(0x000000, 1);
        g.fillCircle(x - 3 * f, masterY - 27, 1.5);
        g.fillCircle(x + 5 * f, masterY - 27, 1.5);
        // Smirk
        g.lineStyle(1, 0x000000, 0.7);
        g.beginPath(); g.moveTo(x - 1 * f, masterY - 22);
        g.lineTo(x + 6 * f, masterY - 23); g.strokePath();

        // Fever meter bar (above head)
        if (!this.jackpotActive) {
            const barW = 26; const barH = 3;
            const barX = x - barW / 2; const barY = masterY - 48;
            g.fillStyle(0x333333, 0.6); g.fillRect(barX, barY, barW, barH);
            const fillW = (this.feverMeter / this.feverMax) * barW;
            g.fillStyle(this.feverActive ? 0xFF4400 : 0xFFCC00, 0.8);
            g.fillRect(barX, barY, fillW, barH);
        }
    }
}
