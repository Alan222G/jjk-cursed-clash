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
        this.isCasting = false;
        // Gavel scaling
        this.gavelSize = 1.0; // Scales with heavy attacks
        this.gavelSizeTimer = 0;
        // Executioner's Sword state
        this.hasExecutionerSword = false;
        this.executionerTimer = 0;
        // Guilt mark
        this.guiltTarget = null;
        this.guiltTimer = 0;
        // Confiscation
        this.confiscatedTarget = null;
        this.confiscateTimer = 0;
        // Cooldowns
        this.sentenceCd = 0;
        this.hammerCd = 0;
        this.leapCd = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 3 && this.input.isDown('DOWN')) {
            this.castCitation();
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

        // Enlarge gavel temporarily
        this.gavelSize = 1.8;
        this.gavelSizeTimer = 3000;

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 300) {
            const dmg = this.hasExecutionerSword ? target.charData.stats.maxHp : Math.floor(40 * this.power);
            if (this.hasExecutionerSword) {
                // EXECUTIONER'S SWORD — instant kill on hit!
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
                // Pull toward Higuruma
                target.sprite.body.setVelocityX((this.sprite.x - target.sprite.x) * 2);
            }
            // Gavel extension VFX
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

        // Jump up
        this.sprite.body.setVelocityY(-400);
        try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}

        this.scene.time.delayedCall(300, () => {
            // Slam down
            this.sprite.body.setVelocityY(800);
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

            this.scene.time.delayedCall(200, () => {
                // AOE shockwave
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

        // Vault forward and up
        this.sprite.body.setVelocityY(-550);
        this.sprite.body.setVelocityX(500 * this.facing);

        // Pole vault VFX
        const g = this.scene.add.graphics().setDepth(16);
        g.lineStyle(4, 0x666666, 0.7);
        g.beginPath(); g.moveTo(this.sprite.x, this.sprite.y);
        g.lineTo(this.sprite.x - 20 * this.facing, this.sprite.y + 30); g.strokePath();
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });

        this._endCast(400);
    }

    // ═══════════════════════════════════════
    // SKILL 4: Judicial Citation — mark + defense debuff
    // ═══════════════════════════════════════
    castCitation() {
        if (!this.ceSystem.spend(20)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);

        // Small gavel projectile
        const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 40, {
            owner: this, damage: Math.floor(15 * this.power),
            knockbackX: 50, knockbackY: 0, stunDuration: 200,
            speed: 900, direction: this.facing, color: 0x8B7355,
            size: { w: 20, h: 15 }, lifetime: 800, type: 'normal',
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);

        // On-hit callback for guilt mark
        const origOnHit = proj.onHit;
        proj.onHit = (target) => {
            if (origOnHit) origOnHit(target);
            this.guiltTarget = target;
            this.guiltTimer = 12000; // 12s defense debuff
            target.defense = (target.defense || 1.0) * 0.6; // 40% defense reduction
            const gTxt = this.scene.add.text(target.sprite.x, target.sprite.y - 70, '⚖️ GUILTY', {
                fontFamily: 'Arial Black', fontSize: '14px', color: '#FF6600',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: gTxt, y: gTxt.y - 25, alpha: 0, duration: 1200, onComplete: () => gTxt.destroy() });
        };

        this._endCast(500);
    }

    // ═══════════════════════════════════════
    // DOMAIN — Deadly Sentencing
    // Tribunal: no-aggression zone, Judgeman verdict
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (this.ceSystem.isFatigued) return;
        if (this.ceSystem.ce < 100) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        if (!this.ceSystem.spend(100)) return;
        this.domainActive = true;
        this.ceSystem.startDomain();
        this.isCasting = true;
        this.stateMachine.lock(99999);

        try { this.scene.sound.play('sfx_purple', { volume: 0.8 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'deadly_sentencing');

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        // Lock both fighters during tribunal
        if (target && !target.isDead) {
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }
        this.sprite.body.setVelocity(0, 0);

        // Judgeman appears
        const jm = this.scene.add.text(this.sprite.x, this.sprite.y - 130, '👤 JUDGEMAN', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#FFFFFF',
            stroke: '#444444', strokeThickness: 3
        }).setOrigin(0.5).setDepth(25);

        // Trial sequence
        const verdictDelay = 3000;
        const crimes = [
            'Used special ability', 'Attempted attack', 'Moved aggressively',
            'Resisted judgment', 'Showed intent to harm', 'Violated court order'
        ];
        const crime = crimes[Math.floor(Math.random() * crimes.length)];

        const crimeTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 100, `Crime: "${crime}"`, {
            fontFamily: 'Arial', fontSize: '11px', color: '#CCCCCC',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(25);

        this.scene.time.delayedCall(verdictDelay, () => {
            jm.destroy();
            crimeTxt.destroy();

            // RNG: 40% Death Penalty (Executioner's Sword), 60% Confiscation
            const isDeathPenalty = Math.random() < 0.40;

            if (isDeathPenalty) {
                // DEATH PENALTY → Executioner's Sword
                this.hasExecutionerSword = true;
                this.executionerTimer = 20000; // 20s

                const dpTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 120, '⚔️ DEATH PENALTY ⚔️', {
                    fontFamily: 'Arial Black', fontSize: '18px', color: '#FF0000',
                    stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5).setDepth(25);
                this.scene.tweens.add({ targets: dpTxt, scaleX: 1.3, scaleY: 1.3, duration: 300, yoyo: true, repeat: 2 });
                this.scene.tweens.add({ targets: dpTxt, y: dpTxt.y - 30, alpha: 0, delay: 1500, duration: 800, onComplete: () => dpTxt.destroy() });

                if (this.scene.screenEffects) {
                    this.scene.screenEffects.flash(0xFF0000, 200, 0.6);
                    this.scene.screenEffects.shake(0.04, 500);
                }
            } else {
                // CONFISCATION → opponent can't use specials for 15s
                if (target && !target.isDead) {
                    this.confiscatedTarget = target;
                    this.confiscateTimer = 15000;
                    target._origTrySpecial = target.trySpecialAttack;
                    target.trySpecialAttack = function() {
                        // Blocked!
                    };
                }
                const confTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 120, '🔒 CONFISCATION 🔒', {
                    fontFamily: 'Arial Black', fontSize: '16px', color: '#FF8800',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(25);
                this.scene.tweens.add({ targets: confTxt, y: confTxt.y - 30, alpha: 0, delay: 1000, duration: 800, onComplete: () => confTxt.destroy() });
            }

            // Unlock both fighters
            this.scene.time.delayedCall(500, () => {
                this.domainActive = false;
                this.ceSystem.endDomain();
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
                if (target && !target.isDead) {
                    target.stateMachine.unlock();
                    if (!target.stateMachine.isAny('idle', 'walk', 'jump', 'fall')) {
                        target.stateMachine.setState('idle');
                    }
                }
            });
        });
    }

    applySureHitTick(opponent) {
        // Domain is a tribunal — no tick damage
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
        if (this.sentenceCd > 0) this.sentenceCd -= dt;
        if (this.hammerCd > 0) this.hammerCd -= dt;
        if (this.leapCd > 0) this.leapCd -= dt;

        // Gavel size decay
        if (this.gavelSizeTimer > 0) {
            this.gavelSizeTimer -= dt;
            if (this.gavelSizeTimer <= 0) this.gavelSize = 1.0;
        }

        // Executioner's sword timer
        if (this.executionerTimer > 0) {
            this.executionerTimer -= dt;
            if (this.executionerTimer <= 0) {
                this.hasExecutionerSword = false;
            }
        }

        // Guilt timer
        if (this.guiltTimer > 0) {
            this.guiltTimer -= dt;
            if (this.guiltTimer <= 0 && this.guiltTarget) {
                this.guiltTarget.defense = this.guiltTarget.charData?.stats?.defense || 1.0;
                this.guiltTarget = null;
            }
        }

        // Confiscation timer
        if (this.confiscateTimer > 0) {
            this.confiscateTimer -= dt;
            if (this.confiscateTimer <= 0 && this.confiscatedTarget) {
                if (this.confiscatedTarget._origTrySpecial) {
                    const ct = this.confiscatedTarget;
                    ct.trySpecialAttack = ct.constructor.prototype.trySpecialAttack.bind(ct);
                    ct._origTrySpecial = null;
                }
                this.confiscatedTarget = null;
            }
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Higuruma in suit + gavel
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

        // Executioner's sword glow
        if (this.hasExecutionerSword) {
            const pulse = 0.4 + Math.sin((this.animTimer || 0) * 0.005) * 0.2;
            g.fillStyle(0xFF0000, pulse * 0.3);
            g.fillEllipse(x, masterY - 15, 50, 60);
        }

        // LEGS — suit pants
        const legY = masterY + 8;
        let leftLeg = 38, rightLeg = 38;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 22; rightLeg = 22; }
        g.lineStyle(7, suitColor, 1);
        g.beginPath(); g.moveTo(x - 6 * f, legY); g.lineTo(x - 6 * f, legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 6 * f, legY); g.lineTo(x + 6 * f, legY + rightLeg); g.strokePath();
        // Dress shoes
        g.fillStyle(0x222222, 1);
        g.fillEllipse(x - 6 * f, legY + leftLeg + 3, 10, 5);
        g.fillEllipse(x + 6 * f, legY + rightLeg + 3, 10, 5);

        // TORSO — formal suit
        g.fillStyle(suitColor, 1);
        g.fillRoundedRect(x - 14, masterY - 18, 28, 30, 4);
        // White shirt underneath
        g.fillStyle(0xEEEEEE, 1);
        g.fillRect(x - 5, masterY - 16, 10, 26);
        // Tie
        g.fillStyle(tieColor, 1);
        g.beginPath();
        g.moveTo(x - 3, masterY - 15);
        g.lineTo(x + 3, masterY - 15);
        g.lineTo(x + 1, masterY + 5);
        g.lineTo(x, masterY + 8);
        g.lineTo(x - 1, masterY + 5);
        g.fillPath();
        // Suit lapels
        g.lineStyle(1, 0x333344, 0.6);
        g.beginPath(); g.moveTo(x - 5, masterY - 16); g.lineTo(x - 10, masterY - 5); g.strokePath();
        g.beginPath(); g.moveTo(x + 5, masterY - 16); g.lineTo(x + 10, masterY - 5); g.strokePath();

        // ARMS
        g.lineStyle(6, suitColor, 1);
        g.beginPath(); g.moveTo(x - 16, masterY - 12);
        g.lineTo(x - 16 - 8 * f, masterY + 8); g.strokePath();
        // Gavel hand
        g.lineStyle(6, suitColor, 1);
        g.beginPath(); g.moveTo(x + 16, masterY - 12);
        g.lineTo(x + 16 + (12 + armExtend) * f, masterY - 10); g.strokePath();
        // Hands
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 16 - 8 * f, masterY + 10, 5);
        g.fillCircle(x + 16 + (12 + armExtend) * f, masterY - 10, 5);

        // GAVEL
        const gs = this.gavelSize;
        const gx = x + (22 + armExtend) * f;
        const gy = masterY - 15;
        // Handle
        g.lineStyle(3, 0x8B7355, 1);
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 15 * gs * f, gy - 5 * gs); g.strokePath();
        // Head
        const headColor = this.hasExecutionerSword ? 0xFF0000 : 0x555555;
        g.fillStyle(headColor, 1);
        g.fillRect(gx + 12 * gs * f - 5 * gs, gy - 10 * gs, 10 * gs, 12 * gs);

        // Executioner's sword blade (overlays gavel when active)
        if (this.hasExecutionerSword) {
            const pulse = 0.7 + Math.sin((this.animTimer || 0) * 0.006) * 0.3;
            g.fillStyle(0xFF0000, pulse);
            g.beginPath();
            g.moveTo(gx + 10 * f, gy - 12);
            g.lineTo(gx + 45 * f, gy - 20);
            g.lineTo(gx + 50 * f, gy - 15);
            g.lineTo(gx + 15 * f, gy - 5);
            g.fillPath();
            g.lineStyle(1, 0xFFAAAA, pulse * 0.8);
            g.strokePath();
        }

        // HEAD
        g.fillStyle(skinColor, 1);
        g.fillCircle(x + 2 * f, masterY - 30, 13);
        // Hair — neat, dark
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(x - 13, masterY - 32);
        g.lineTo(x - 10, masterY - 46);
        g.lineTo(x - 3, masterY - 44);
        g.lineTo(x + 3, masterY - 46);
        g.lineTo(x + 10, masterY - 44);
        g.lineTo(x + 13, masterY - 32);
        g.fillPath();
        // Eyes — serious
        g.fillStyle(0x000000, 1);
        g.fillCircle(x - 4 * f, masterY - 31, 2);
        g.fillCircle(x + 6 * f, masterY - 31, 2);
        // Eyebrows — stern
        g.lineStyle(2, hairColor, 1);
        g.beginPath(); g.moveTo(x - 7 * f, masterY - 35); g.lineTo(x - 2 * f, masterY - 34); g.strokePath();
        g.beginPath(); g.moveTo(x + 3 * f, masterY - 35); g.lineTo(x + 9 * f, masterY - 34); g.strokePath();
        // Mouth — thin line
        g.lineStyle(1, 0x000000, 0.6);
        g.beginPath(); g.moveTo(x - 3 * f, masterY - 25); g.lineTo(x + 3 * f, masterY - 25); g.strokePath();

        // Guilt mark indicator on target
        if (this.guiltTarget && !this.guiltTarget.isDead && this.guiltTimer > 0) {
            const tx = this.guiltTarget.sprite.x;
            const ty = this.guiltTarget.sprite.y - 65;
            g.fillStyle(0xFF6600, 0.6 + Math.sin((this.animTimer || 0) * 0.005) * 0.3);
            g.fillCircle(tx, ty, 8);
            g.lineStyle(2, 0xFF8800, 0.8);
            g.strokeCircle(tx, ty, 10);
        }
    }
}
