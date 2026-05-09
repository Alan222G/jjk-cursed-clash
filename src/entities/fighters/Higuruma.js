// ========================================================
// Hiromi Higuruma — The Judge
// Gavel attacks, Judgeman tribunal domain, Executioner's Sword
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Higuruma extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.HIGURUMA);
        this._baseSpeed = this.speed;
        this.isCasting = false;
        // Gavel scaling
        this.gavelSize = 1.0; 
        this.gavelSizeTimer = 0;
        // Executioner's Sword state
        this.hasExecutionerSword = false;
        this.executionerTimer = 0;
        // Cooldowns
        this.sentenceCd = 0;
        this.hammerCd = 0;
        this.leapCd = 0;
        
        // Domain state
        this._domainPoints = 0;
        this._domainAttempt = 0;
        this._domainMaxAttempts = 6;
        this.trialUI = [];
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 3 && this.input.isDown('DOWN')) {
            this.castGavelDrop(); // Reworked U+Down
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castLawLeap();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castHammerJustice();
        } else if (tier >= 1) {
            this.castGavelSentence();
        }
    }

    // ═══════════════════════════════════════
    // SKILL 1: Gavel Sentence — long range pull
    // ═══════════════════════════════════════
    castGavelSentence() {
        if (this.sentenceCd > 0) return;
        if (!this.ceSystem.spend(15)) return;
        this.sentenceCd = 2000;
        this.isCasting = true;
        this.stateMachine.lock(800);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        this.gavelSize = 1.8;
        this.gavelSizeTimer = 3000;

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 300) {
            const dmg = this.hasExecutionerSword ? target.charData.stats.maxHp : Math.floor(40 * this.power);
            if (this.hasExecutionerSword) {
                target.takeDamage(dmg, 100 * this.facing, 0, 1000);
                this.hasExecutionerSword = false;
                this.executionerTimer = 0;
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.flash(0xFF0000, 200, 1.0);
                    this.scene.screenEffects.shake(0.06, 600);
                }
                const eTxt = this.scene.add.text(target.sprite.x, target.sprite.y - 80, '⚖️ DEATH PENALTY', {
                    fontFamily: 'Arial Black', fontSize: '18px', color: '#FF0000',
                    stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5).setDepth(25);
                this.scene.tweens.add({ targets: eTxt, y: eTxt.y - 30, alpha: 0, duration: 1500, onComplete: () => eTxt.destroy() });
            } else {
                target.takeDamage(dmg, -200 * this.facing, -50, 300);
                target.sprite.body.setVelocityX((this.sprite.x - target.sprite.x) * 2);
            }
            
            const g = this.scene.add.graphics().setDepth(16);
            g.lineStyle(6, 0x666666, 0.8);
            g.beginPath(); g.moveTo(this.sprite.x + 20 * this.facing, this.sprite.y - 30);
            g.lineTo(target.sprite.x, target.sprite.y - 20); g.strokePath();
            g.fillStyle(0x444444, 1);
            g.fillRect(target.sprite.x - 10, target.sprite.y - 30, 20, 20);
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
        }
        this._endCast(700);
    }

    // ═══════════════════════════════════════
    // SKILL 2: Hammer of Justice — AOE ground slam
    // ═══════════════════════════════════════
    castHammerJustice() {
        if (this.hammerCd > 0) return;
        if (!this.ceSystem.spend(25)) return;
        this.hammerCd = 3000;
        this.isCasting = true;
        this.stateMachine.lock(900);

        this.sprite.body.setVelocityY(-400);
        try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}

        this.scene.time.delayedCall(300, () => {
            this.sprite.body.setVelocityY(800);
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

            this.scene.time.delayedCall(200, () => {
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.03, 400);
                const g = this.scene.add.graphics().setDepth(16);
                g.fillStyle(0x666666, 0.4);
                g.fillEllipse(this.sprite.x, this.sprite.y + 15, 120, 30);
                g.lineStyle(3, 0xFFCC00, 0.6);
                g.strokeEllipse(this.sprite.x, this.sprite.y + 15, 120, 30);
                this.scene.tweens.add({
                    targets: g, alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 400, onComplete: () => g.destroy()
                });

                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 150) {
                    target.takeDamage(Math.floor(60 * this.power), 300 * this.facing, -500, 600);
                }
            });
        });
        this._endCast(800);
    }

    // ═══════════════════════════════════════
    // SKILL 3: Law Leap — gavel-assisted mobility
    // ═══════════════════════════════════════
    castLawLeap() {
        if (this.leapCd > 0) return;
        if (!this.ceSystem.spend(12)) return;
        this.leapCd = 1500;
        this.isCasting = true;
        this.stateMachine.lock(500);

        this.sprite.body.setVelocityY(-550);
        this.sprite.body.setVelocityX(500 * this.facing);

        const g = this.scene.add.graphics().setDepth(16);
        g.lineStyle(4, 0x666666, 0.7);
        g.beginPath(); g.moveTo(this.sprite.x, this.sprite.y);
        g.lineTo(this.sprite.x - 20 * this.facing, this.sprite.y + 30); g.strokePath();
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });

        this._endCast(400);
    }

    // ═══════════════════════════════════════
    // SKILL 4: Gavel Drop (U+Down) - Replaces the broken citation
    // Drops a giant gavel from above to crush the opponent
    // ═══════════════════════════════════════
    castGavelDrop() {
        if (!this.ceSystem.spend(20)) return;
        this.isCasting = true;
        this.stateMachine.lock(700);

        try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const tx = target ? target.sprite.x : this.sprite.x + 100 * this.facing;
        const ty = this.sprite.y;

        const g = this.scene.add.graphics().setDepth(16);
        
        // Handle falling
        g.fillStyle(0x8B7355, 1);
        g.fillRect(tx - 10, ty - 300, 20, 80);
        // Head
        g.fillStyle(0x444444, 1);
        g.fillRect(tx - 40, ty - 220, 80, 50);

        this.scene.tweens.add({
            targets: g, y: 220, duration: 300, ease: 'Power2',
            onComplete: () => {
                g.clear();
                // Slam visual
                g.fillStyle(0x444444, 1);
                g.fillRect(tx - 40, ty, 80, 50);
                g.fillStyle(0x8B7355, 1);
                g.fillRect(tx - 10, ty - 80, 20, 80);
                
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 300);
                
                if (target && !target.isDead && Math.abs(target.sprite.x - tx) < 80) {
                    target.takeDamage(Math.floor(45 * this.power), 100 * this.facing, -100, 500);
                    // Confiscates some CE on hit
                    target.ceSystem.ce = Math.max(0, target.ceSystem.ce - 25);
                    const tTxt = this.scene.add.text(tx, ty - 80, 'CE DRAINED', {
                        fontFamily: 'Arial Black', fontSize: '14px', color: '#FF8800', stroke: '#000000', strokeThickness: 3
                    }).setOrigin(0.5).setDepth(20);
                    this.scene.tweens.add({ targets: tTxt, y: tTxt.y - 30, alpha: 0, duration: 1000, onComplete: () => tTxt.destroy() });
                }
                
                this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, delay: 200, onComplete: () => g.destroy() });
            }
        });

        this._endCast(600);
    }

    // ═══════════════════════════════════════
    // DOMAIN — Deadly Sentencing (Prediction Minigame)
    // 6 Attempts. Guesses: U (Confess), I (Silence), S (Deny)
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting || this.ceSystem.isFatigued || this.ceSystem.ce < 100) return;
        
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                if (!this.scene.attemptDomainClash(this)) return;
            } else return;
        } else if (this.domainActive) return;

        if (!this.ceSystem.spend(100)) return;
        this.domainActive = true;
        this.ceSystem.startDomain();
        this.isCasting = true;
        
        try { this.scene.sound.play('sfx_purple', { volume: 0.8 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'deadly_sentencing');

        this.target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        
        // Strict Immobilization
        if (this.target && !this.target.isDead) {
            this.target.stateMachine.lock(999999);
            this.target.sprite.body.setVelocity(0, 0);
            this.target.sprite.body.setAllowGravity(false);
            this.target.isInvulnerable = true; // No attacks can hit
        }
        this.stateMachine.lock(999999);
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.setAllowGravity(false);

        this._domainPoints = 0;
        this._domainAttempt = 0;
        this._domainMaxAttempts = 6;
        
        // Visual Courtroom
        this.courtroomGraphics = this.scene.add.graphics().setDepth(5);
        const cy = this.scene.cameras.main.centerY;
        const w = this.scene.cameras.main.width;
        this.courtroomGraphics.fillStyle(0x3E2723, 1);
        this.courtroomGraphics.fillRect(0, cy - 100, w, 300); // Wooden floor/wall
        this.courtroomGraphics.fillStyle(0x5D4037, 1);
        this.courtroomGraphics.fillRect(this.sprite.x - 50, this.sprite.y - 20, 100, 80); // Higuruma Podium
        if (this.target) {
            this.courtroomGraphics.fillRect(this.target.sprite.x - 50, this.target.sprite.y - 20, 100, 80); // Def Podium
        }

        // Judgeman appears
        this.jmText = this.scene.add.text(this.sprite.x, this.sprite.y - 130, '⚖️ JUDGEMAN TRIBUNAL ⚖️', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#FFFFFF', stroke: '#444444', strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);

        this.scene.time.delayedCall(3000, () => {
            this._startTrialRound();
        });
    }

    _startTrialRound() {
        if (this._domainAttempt >= this._domainMaxAttempts || this._domainPoints >= 3 || this.isDead || (this.target && this.target.isDead)) {
            this._resolveDomain();
            return;
        }
        this._domainAttempt++;
        
        this.higuChoice = null;
        this.oppChoice = null;
        this.timeLeft = 8000;
        this.trialActive = true;
        
        if (this.trialUI) this.trialUI.forEach(el => el.destroy());
        this.trialUI = [];
        
        const cx = this.scene.cameras.main.centerX;
        const cy = this.scene.cameras.main.centerY - 100;
        
        const title = this.scene.add.text(cx, cy, `TRIAL ${this._domainAttempt}/6 - CHOOSE!`, {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(30);
        
        this.timerTxt = this.scene.add.text(cx, cy + 35, '8.0s', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#FFCC00', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);
        
        const hint1 = this.scene.add.text(cx, cy + 70, `P1: [Bloqueo] Confess | [Ataque] Silence | [Abajo] Deny`, {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#AAAAAA', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);

        const hint2 = this.scene.add.text(cx, cy + 90, `P2: [Bloqueo] Confess | [Ataque] Silence | [Abajo] Deny`, {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#AAAAAA', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);
        
        // Progress Bar for points
        const barW = 200;
        const barH = 20;
        const barX = cx - barW / 2;
        const barY = cy + 120;
        const gBar = this.scene.add.graphics().setDepth(30);
        
        gBar.fillStyle(0x333333, 0.8);
        gBar.fillRect(barX, barY, barW, barH);
        
        const fillW = (this._domainPoints / 3) * barW;
        gBar.fillStyle(0x00FF00, 1);
        gBar.fillRect(barX, barY, fillW, barH);
        
        gBar.lineStyle(3, 0xFFFFFF, 1);
        gBar.strokeRect(barX, barY, barW, barH);
        
        this.trialUI.push(title, this.timerTxt, hint1, hint2, gBar);
    }

    _resolveRound(h1, p2) {
        let pts = 0;
        let msg = `Judge: ${h1} | Def: ${p2}\n`;
        
        // Strict Points Matrix
        if (h1 === 'CONFESS' && p2 === 'CONFESS') {
            pts = 3;
            msg += 'MATCH: FULL CONFESSION! (+3 PTS)';
        } else if (h1 === 'SILENCE' && p2 === 'SILENCE') {
            pts = 1;
            msg += 'MATCH: MUTUAL SILENCE (+1 PT)';
        } else if (h1 === 'DENY' && p2 === 'DENY') {
            pts = 1;
            msg += 'MATCH: MUTUAL DENIAL (+1 PT)';
        } else {
            pts = 0;
            msg += 'MISMATCH: OBJECTION! (+0 PTS)';
        }
        
        this._domainPoints += pts;
        
        const cx = this.scene.cameras.main.centerX;
        const cy = this.scene.cameras.main.centerY;
        const resTxt = this.scene.add.text(cx, cy + 30, msg, {
            fontFamily: 'Arial Black', fontSize: '20px', color: pts > 0 ? '#00FF00' : '#FF0000',
            stroke: '#000000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5).setDepth(30);
        this.trialUI.push(resTxt);
        
        this.scene.time.delayedCall(2000, () => {
            this._startTrialRound();
        });
    }

    _resolveDomain() {
        if (this.trialUI) this.trialUI.forEach(el => el.destroy());
        this.trialUI = [];
        if (this.jmText) { this.jmText.destroy(); this.jmText = null; }
        if (this.courtroomGraphics) { this.courtroomGraphics.destroy(); this.courtroomGraphics = null; }
        
        const cx = this.scene.cameras.main.centerX;
        const cy = this.scene.cameras.main.centerY;
        
        if (this._domainPoints >= 3) {
            // Death Penalty
            this.hasExecutionerSword = true;
            this.executionerTimer = 17000; // Lasts 17 seconds
            const txt = this.scene.add.text(cx, cy, '⚔️ DEATH PENALTY ⚔️\nExecutioner\'s Sword Active!', {
                fontFamily: 'Arial Black', fontSize: '28px', color: '#FF0000', align: 'center', stroke: '#000000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(30);
            this.scene.tweens.add({ targets: txt, scaleX: 1.2, scaleY: 1.2, duration: 500, yoyo: true, repeat: 2, onComplete: () => txt.destroy() });
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0xFF0000, 300, 0.8);
                this.scene.screenEffects.shake(0.06, 600);
            }
        } else {
            // Confiscation
            if (this.target && !this.target.isDead) {
                this.target.ceSystem.ce = 0; // Drain ALL CE
                this.target.ceSystem.isFatigued = true; // No regen for 5s
                this.target.ceSystem.fatigueTimer = 5000;
                this.target.ceSystem.regenRate = ((this.target.charData?.stats?.ceRegen || 3.5) * 1.3) / 3; // 3x slower
                
                this.higuTarget = this.target;
                this.higuNerfTimer = 30000; // Lasts 30 seconds
            }
            const txt = this.scene.add.text(cx, cy, '🔒 CONFISCATION 🔒\nOpponent Cursed Energy Drained!', {
                fontFamily: 'Arial Black', fontSize: '24px', color: '#FF8800', align: 'center', stroke: '#000000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(30);
            this.scene.tweens.add({ targets: txt, y: cy - 50, alpha: 0, duration: 2500, onComplete: () => txt.destroy() });
        }
        
        this.scene.time.delayedCall(2000, () => {
            this.domainActive = false;
            this.ceSystem.endDomain();
            this.isCasting = false;
            this.stateMachine.unlock();
            this.sprite.body.setAllowGravity(true);
            this.stateMachine.setState('idle');
            if (this.target && !this.target.isDead) {
                this.target.isInvulnerable = false;
                this.target.stateMachine.unlock();
                this.target.sprite.body.setAllowGravity(true);
                if (!this.target.stateMachine.isAny('idle', 'walk', 'jump', 'fall')) {
                    this.target.stateMachine.setState('idle');
                }
            }
        });
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

        if (this.higuTarget && this.higuNerfTimer > 0) {
            this.higuNerfTimer -= dt;
            if (this.higuNerfTimer <= 0) {
                if (this.higuTarget.ceSystem) {
                    this.higuTarget.ceSystem.regenRate = (this.higuTarget.charData?.stats?.ceRegen || 3.5) * 1.3;
                }
                this.higuTarget = null;
            }
        }
        
        // --- Domain Trial Input Capturing ---
        if (this.trialActive) {
            this.timeLeft -= dt;
            if (this.timerTxt) this.timerTxt.setText((this.timeLeft/1000).toFixed(1) + 's');

            // AI Logic
            if (this.target && this.target.isAI && this.oppChoice === null) {
                this.oppChoice = 'SILENCE';
            }

            // Capture Inputs only after 1 second to avoid leaky inputs from casting the domain
            if (this.timeLeft <= 7000) {
                // Capture P1 (Higuruma) Input
                if (!this.higuChoice) {
                    if (this.input.isDown('BLOCK')) this.higuChoice = 'CONFESS';
                    else if (this.input.isDown('ATTACK')) this.higuChoice = 'SILENCE';
                    else if (this.input.isDown('DOWN')) this.higuChoice = 'DENY';
                }

                // Capture P2 (Opponent) Input
                if (this.target && !this.target.isAI && !this.oppChoice) {
                    if (this.target.input.isDown('BLOCK')) this.oppChoice = 'CONFESS';
                    else if (this.target.input.isDown('ATTACK')) this.oppChoice = 'SILENCE';
                    else if (this.target.input.isDown('DOWN')) this.oppChoice = 'DENY';
                }
            }

            // Resolve if time is up or both chose
            if (this.timeLeft <= 0 || (this.higuChoice && this.oppChoice)) {
                this.trialActive = false;
                if (!this.higuChoice) this.higuChoice = 'SILENCE';
                if (!this.oppChoice) this.oppChoice = 'SILENCE';
                this._resolveRound(this.higuChoice, this.oppChoice);
            }
        }

        // Prevent default CE drain from ending domain early
        if (this.domainActive) {
            this.ceSystem.ce = this.ceSystem.maxCe;
        }

        if (this.sentenceCd > 0) this.sentenceCd -= dt;
        if (this.hammerCd > 0) this.hammerCd -= dt;
        if (this.leapCd > 0) this.leapCd -= dt;

        if (this.gavelSizeTimer > 0) {
            this.gavelSizeTimer -= dt;
            if (this.gavelSizeTimer <= 0) this.gavelSize = 1.0;
        }

        if (this.executionerTimer > 0) {
            this.executionerTimer -= dt;
            if (this.executionerTimer <= 0) this.hasExecutionerSword = false;
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Full-height Higuruma (Gojo-scale)
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
        const suitColor = isFlashing ? 0xFFFFFF : 0x1A1A2E;
        const tieColor = isFlashing ? 0xFFFFFF : 0x8B0000;
        const hairColor = isFlashing ? 0xFFFFFF : 0x111122;
        const armExtend = this.attackSwing * 40;

        if (this.hasExecutionerSword) {
            const pulse = 0.4 + Math.sin((this.animTimer || 0) * 0.005) * 0.2;
            g.fillStyle(0xFF0000, pulse * 0.3);
            g.fillEllipse(x, masterY - 15, 60, 90);
        }

        // LEGS (Gojo scale: Y+5, 35 height)
        const legY = masterY + 5;
        let leftLeg = 35, rightLeg = 35;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 20; rightLeg = 20; }
        g.fillStyle(suitColor, 0.85);
        g.fillTriangle(x - 10, legY, x - 10 - 10, legY + leftLeg, x - 10 + 10, legY + leftLeg - 5);
        g.fillStyle(suitColor, 1);
        g.fillTriangle(x + 10, legY, x + 10 - 12 * f, legY + rightLeg, x + 10 + 12 * f, legY + rightLeg - 2);

        // TORSO
        g.fillStyle(suitColor, 1);
        g.beginPath();
        g.moveTo(x - 16, masterY - 38);
        g.lineTo(x + 16, masterY - 38);
        g.lineTo(x + 12, masterY + 12);
        g.lineTo(x - 12, masterY + 12);
        g.fillPath();
        
        // Shirt & Tie
        g.fillStyle(0xEEEEEE, 1);
        g.fillRect(x - 6, masterY - 35, 12, 35);
        g.fillStyle(tieColor, 1);
        g.beginPath();
        g.moveTo(x - 4, masterY - 35);
        g.lineTo(x + 4, masterY - 35);
        g.lineTo(x + 2, masterY - 5);
        g.lineTo(x, masterY);
        g.lineTo(x - 2, masterY - 5);
        g.fillPath();

        // BACK ARM
        const armY = masterY - 34;
        g.lineStyle(10, suitColor, 0.8);
        g.beginPath();
        g.moveTo(x - 12 * f, armY + 2);
        g.lineTo(x - 22 * f, armY + 18);
        g.strokePath();

        // FRONT ARM
        g.lineStyle(10, suitColor, 1);
        g.beginPath();
        g.moveTo(x + 12 * f, armY + 2);
        g.lineTo(x + (22 + armExtend) * f, armY + 5);
        g.strokePath();
        // Hands
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 22 * f, armY + 20, 5);
        g.fillCircle(x + (22 + armExtend) * f, armY + 5, 5);

        // GAVEL (held in front hand)
        const gs = this.gavelSize;
        const gx = x + (22 + armExtend) * f;
        const gy = armY + 5;
        g.lineStyle(3, 0x8B7355, 1);
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 20 * gs * f, gy - 15 * gs); g.strokePath();
        const headColor = this.hasExecutionerSword ? 0xFF0000 : 0x555555;
        g.fillStyle(headColor, 1);
        g.fillRect(gx + 18 * gs * f - 8 * gs, gy - 15 * gs - 15 * gs, 16 * gs, 30 * gs);

        if (this.hasExecutionerSword) {
            const pulse = 0.7 + Math.sin((this.animTimer || 0) * 0.006) * 0.3;
            g.fillStyle(0xFF0000, pulse);
            g.beginPath();
            g.moveTo(gx + 15 * f, gy - 18);
            g.lineTo(gx + 60 * f, gy - 30);
            g.lineTo(gx + 65 * f, gy - 20);
            g.lineTo(gx + 20 * f, gy - 5);
            g.fillPath();
            g.lineStyle(2, 0xFFAAAA, pulse * 0.8); g.strokePath();
        }

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

        // Hair
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(hx - 14, hy - 5);
        g.lineTo(hx - 12, hy - 18);
        g.lineTo(hx - 4, hy - 16);
        g.lineTo(hx + 4, hy - 18);
        g.lineTo(hx + 12, hy - 16);
        g.lineTo(hx + 14, hy - 5);
        g.fillPath();

        // Eyes
        g.fillStyle(0x000000, 1);
        g.fillCircle(hx - 5 * f, hy - 2, 2.5);
        g.fillCircle(hx + 5 * f, hy - 2, 2.5);
        // Eyebrows
        g.lineStyle(2, hairColor, 1);
        g.beginPath(); g.moveTo(hx - 8 * f, hy - 6); g.lineTo(hx - 2 * f, hy - 5); g.strokePath();
        g.beginPath(); g.moveTo(hx + 2 * f, hy - 6); g.lineTo(hx + 8 * f, hy - 5); g.strokePath();
        // Mouth
        g.lineStyle(1, 0x000000, 0.6);
        g.beginPath(); g.moveTo(hx - 4 * f, hy + 6); g.lineTo(hx + 4 * f, hy + 6); g.strokePath();
    }
}
