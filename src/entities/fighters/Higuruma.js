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
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.0035);

        const skinColor = isFlashing ? 0xFFFFFF : 0xfecdd3;
        const suitColor = isFlashing ? 0xFFFFFF : 0x11121b;
        const tieColor = isFlashing ? 0xFFFFFF : 0x991b1b;
        const shirtColor = isFlashing ? 0xFFFFFF : 0xffffff;
        const hairColor = isFlashing ? 0xFFFFFF : 0x1e293b;

        const ox = x;
        const oy = masterY - 15;

        // Executioner Sword back aura
        if (this.hasExecutionerSword) {
            const pulse = 0.4 + Math.sin((this.animTimer || 0) * 0.005) * 0.2;
            g.fillStyle(0xFF0000, pulse * 0.3);
            g.fillEllipse(ox, oy + 15, 60, 90);
        }

        // 1. LEGS (Suit trousers and shoes)
        const legAngle = isMoving ? Math.sin(time) * 5 : 0;
        this.drawRect(g, ox - 5, oy + 28 + 18, 7.5, 38, suitColor, legAngle);
        this.drawRect(g, ox - 5, oy + 28 + 39, 9, 5, 0x1e293b); // Shoe

        this.drawRect(g, ox + 5, oy + 28 + 18, 7.5, 38, suitColor, -legAngle);
        this.drawRect(g, ox + 5, oy + 28 + 39, 9, 5, 0x1e293b); // Shoe

        // 2. TORSO
        this.drawRect(g, ox, oy + 5, 17, 34, suitColor);
        // Shirt V-neck
        this.drawTriangle(g, ox, oy - 4 - 3, 8, 14, shirtColor);
        // Tie
        this.drawRect(g, ox, oy - 4 + 5, 2.2, 16, tieColor);

        // 3. ARMS
        // Back Arm
        this.drawRect(g, ox - 9, oy - 10, 7.5, 28, suitColor, -30);
        this.drawCircle(g, ox - 9 - Math.sin(-30*Math.PI/180)*28, oy - 10 + Math.cos(-30*Math.PI/180)*28, 3.8, skinColor);

        // Front Arm (holding gavel/sword)
        const armExtend = this.attackSwing * 40;
        const armRot = (12 + (isMoving ? Math.sin(time) * 8 : 0));
        
        let fx, fy;
        if (this.attackSwing > 0) {
            fx = ox + (9 + 22 + armExtend) * f;
            fy = oy - 10 + 5;
            this.drawRect(g, ox + 9, oy - 10, 7.5, 28 + armExtend, suitColor, 85 * f);
        } else {
            fx = ox + 9;
            fy = oy - 10 + 27;
            this.drawRect(g, ox + 9, oy - 10, 7.5, 28, suitColor, armRot * f);
        }
        this.drawCircle(g, fx, fy, 3.8, skinColor);

        // GAVEL OR EXECUTIONER SWORD RENDER
        const gs = this.gavelSize || 1.0;
        if (this.hasExecutionerSword) {
            // Executioner Sword
            const pulse = 0.7 + Math.sin((this.animTimer || 0) * 0.006) * 0.3;
            g.fillStyle(0xFF0000, pulse);
            g.beginPath();
            g.moveTo(fx + 15 * f, fy - 18);
            g.lineTo(fx + 60 * f, fy - 30);
            g.lineTo(fx + 65 * f, fy - 20);
            g.lineTo(fx + 20 * f, fy - 5);
            g.fillPath();
            g.lineStyle(2, 0xFFAAAA, pulse * 0.8);
            g.beginPath();
            g.moveTo(fx + 15 * f, fy - 18);
            g.lineTo(fx + 60 * f, fy - 30);
            g.lineTo(fx + 65 * f, fy - 20);
            g.lineTo(fx + 20 * f, fy - 5);
            g.closePath();
            g.strokePath();
        } else {
            // Gavel
            const hx = fx;
            const hy = fy;
            // Draw judge blue/purple aura
            g.lineStyle(3, 0x818cf8, 0.4);
            g.strokeCircle(hx - 8*f, hy - 46, 25 * gs);

            // Gavel handle
            g.lineStyle(3.5, 0x78350f, 1);
            g.beginPath();
            g.moveTo(hx, hy);
            g.lineTo(hx - 8 * f, hy - 46);
            g.strokePath();

            // Gavel head
            this.drawRect(g, hx - 8 * f, hy - 46, 18 * gs, 34 * gs, 0x475569, 90);
            this.drawRect(g, hx - 8 * f, hy - 46, 14 * gs, 36 * gs, 0x334155, 90);
        }

        // 4. HEAD
        const hx = ox;
        const hy = oy - 22;

        this.drawCircle(g, hx, hy, 10, skinColor);

        // Face details
        if (!isFlashing) {
            this.drawLine(g, hx - 5, hy + 2, hx - 1, hy + 2, 1, 0x64748b);
            this.drawLine(g, hx + 1, hy + 2, hx + 5, hy + 2, 1, 0x64748b);
            this.drawLine(g, hx - 3, hy - 1, hx - 1, hy - 1.5, 1.8, 0x000000);
            this.drawLine(g, hx + 1, hy - 1.5, hx + 3, hy - 1, 1.8, 0x000000);
            this.drawLine(g, hx - 3, hy + 5, hx + 3, hy + 5, 1.5, 0x000000);
        }

        // Messy attorney hair
        this.drawCircle(g, hx, hy - 8, 9, hairColor);
        this.drawTriangle(g, hx - 4, hy - 4, 4, 10, hairColor, 20);
        this.drawTriangle(g, hx, hy - 4, 5, 11, hairColor, 0);
        this.drawTriangle(g, hx + 4, hy - 4, 4, 10, hairColor, -20);
        this.drawTriangle(g, hx - 2, hy - 8, 3.5, 13, hairColor, -45);
    }
}
