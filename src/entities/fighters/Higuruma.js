// ========================================================
// Hiromi Higuruma — The Judge
// Canon: Gavel shape-shifting, Deadly Sentencing domain
// Executioner's Sword = instant kill on next hit
// ========================================================
import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Higuruma extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.HIGURUMA);
        this.isCasting = false;
        this.gavelSize = 1.0;
        this.gavelSizeTimer = 0;
        this.hasExecutionerSword = false;
        this.executionerTimer = 0;
        this.confiscatedTarget = null;
        this.confiscateTimer = 0;
        this.sentenceCd = 0;
        this.hammerCd = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();
        if (tier >= 3 && this.input.isDown('DOWN')) {
            this.castGavelHook();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castGavelVault();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castHammerSlam();
        } else if (tier >= 1) {
            this.castGavelSwing();
        }
    }

    // U — Gavel Swing (extends gavel, pulls enemy)
    castGavelSwing() {
        if (this.sentenceCd > 0) return;
        if (!this.ceSystem.spend(15)) return;
        this.sentenceCd = 1800;
        this.isCasting = true;
        this.stateMachine.lock(700);
        this.gavelSize = 1.8;
        this.gavelSizeTimer = 2500;
        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 280) {
            if (this.hasExecutionerSword) {
                target.takeDamage(target.charData.stats.maxHp, 100 * this.facing, 0, 1000);
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
                target.takeDamage(Math.floor(40 * this.power), -200 * this.facing, -50, 300);
                target.sprite.body.setVelocityX((this.sprite.x - target.sprite.x) * 2);
            }
            const gv = this.scene.add.graphics().setDepth(16);
            gv.lineStyle(6, 0x666666, 0.8);
            gv.beginPath(); gv.moveTo(this.sprite.x + 20 * this.facing, this.sprite.y - 30);
            gv.lineTo(target.sprite.x, target.sprite.y - 20); gv.strokePath();
            gv.fillStyle(0x444444, 1);
            gv.fillRect(target.sprite.x - 10, target.sprite.y - 30, 20, 20);
            this.scene.tweens.add({ targets: gv, alpha: 0, duration: 300, onComplete: () => gv.destroy() });
        }
        this._endCast(600);
    }

    // U+dir — Hammer Slam (jump + AOE ground pound)
    castHammerSlam() {
        if (this.hammerCd > 0) return;
        if (!this.ceSystem.spend(25)) return;
        this.hammerCd = 2500;
        this.isCasting = true;
        this.stateMachine.lock(900);
        this.sprite.body.setVelocityY(-400);
        try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
        this.scene.time.delayedCall(300, () => {
            this.sprite.body.setVelocityY(800);
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            this.scene.time.delayedCall(200, () => {
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.03, 400);
                const gfx = this.scene.add.graphics().setDepth(16);
                gfx.fillStyle(0x666666, 0.4);
                gfx.fillEllipse(this.sprite.x, this.sprite.y + 15, 120, 30);
                this.scene.tweens.add({ targets: gfx, alpha: 0, duration: 400, onComplete: () => gfx.destroy() });
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 150) {
                    target.takeDamage(Math.floor(55 * this.power), 300 * this.facing, -500, 600);
                }
            });
        });
        this._endCast(800);
    }

    // U+up — Gavel Vault (mobility leap)
    castGavelVault() {
        if (!this.ceSystem.spend(10)) return;
        this.isCasting = true;
        this.stateMachine.lock(450);
        this.sprite.body.setVelocityY(-500);
        this.sprite.body.setVelocityX(450 * this.facing);
        this._endCast(350);
    }

    // U+down — Gavel Hook (extending gavel grabs and slams enemy down)
    castGavelHook() {
        if (!this.ceSystem.spend(20)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);
        this.gavelSize = 2.0;
        this.gavelSizeTimer = 2000;
        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 250) {
            target.takeDamage(Math.floor(35 * this.power), 150 * this.facing, 400, 500);
            const gfx = this.scene.add.graphics().setDepth(16);
            gfx.lineStyle(5, 0x8B7355, 0.8);
            gfx.beginPath(); gfx.moveTo(this.sprite.x + 15 * this.facing, this.sprite.y - 25);
            gfx.lineTo(target.sprite.x, target.sprite.y); gfx.strokePath();
            this.scene.tweens.add({ targets: gfx, alpha: 0, duration: 250, onComplete: () => gfx.destroy() });
        }
        this._endCast(700);
    }

    // DOMAIN — Deadly Sentencing
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
        if (target && !target.isDead) {
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }
        this.sprite.body.setVelocity(0, 0);

        // Judgeman text
        const jm = this.scene.add.text(this.sprite.x, this.sprite.y - 130, '👤 JUDGEMAN', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#FFFFFF',
            stroke: '#444444', strokeThickness: 3
        }).setOrigin(0.5).setDepth(25);

        const crimes = ['Uso de técnica maldita', 'Agresión injustificada', 'Resistencia al juicio',
            'Intención de daño', 'Violación de orden', 'Ataque premeditado'];
        const crime = crimes[Math.floor(Math.random() * crimes.length)];
        const crimeTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 100, `Crimen: "${crime}"`, {
            fontFamily: 'Arial', fontSize: '11px', color: '#CCCCCC',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(25);

        this.scene.time.delayedCall(3000, () => {
            jm.destroy();
            crimeTxt.destroy();
            const isDeathPenalty = Math.random() < 0.40;

            if (isDeathPenalty) {
                this.hasExecutionerSword = true;
                this.executionerTimer = 20000;
                const dpTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 120, '⚔️ PENA DE MUERTE ⚔️', {
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
                if (target && !target.isDead) {
                    this.confiscatedTarget = target;
                    this.confiscateTimer = 15000;
                    target._confiscated = true;
                    target._origTrySpecial = target.trySpecialAttack;
                    target.trySpecialAttack = function() {};
                }
                const confTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 120, '🔒 CONFISCACIÓN 🔒', {
                    fontFamily: 'Arial Black', fontSize: '16px', color: '#FF8800',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(25);
                this.scene.tweens.add({ targets: confTxt, y: confTxt.y - 30, alpha: 0, delay: 1000, duration: 800, onComplete: () => confTxt.destroy() });
            }

            this.scene.time.delayedCall(500, () => {
                this.domainActive = false;
                this.ceSystem.endDomain();
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
                if (target && !target.isDead) {
                    target.stateMachine.unlock();
                    if (!target.stateMachine.isAny('idle', 'walk', 'jump', 'fall')) target.stateMachine.setState('idle');
                }
            });
        });
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
        if (this.sentenceCd > 0) this.sentenceCd -= dt;
        if (this.hammerCd > 0) this.hammerCd -= dt;
        if (this.gavelSizeTimer > 0) { this.gavelSizeTimer -= dt; if (this.gavelSizeTimer <= 0) this.gavelSize = 1.0; }
        if (this.executionerTimer > 0) { this.executionerTimer -= dt; if (this.executionerTimer <= 0) this.hasExecutionerSword = false; }
        if (this.confiscateTimer > 0) {
            this.confiscateTimer -= dt;
            if (this.confiscateTimer <= 0 && this.confiscatedTarget) {
                if (this.confiscatedTarget._origTrySpecial) {
                    this.confiscatedTarget.trySpecialAttack = this.confiscatedTarget._origTrySpecial;
                    this.confiscatedTarget._origTrySpecial = null;
                    this.confiscatedTarget._confiscated = false;
                }
                this.confiscatedTarget = null;
            }
        }
    }

    // DRAW — Higuruma: shorter, suit + gavel
    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 70, 22); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY + 8; // shorter
        const skinColor = isFlashing ? 0xFFFFFF : 0xF0D0B0;
        const suitColor = isFlashing ? 0xFFFFFF : 0x1A1A2E;
        const tieColor = isFlashing ? 0xFFFFFF : 0x8B0000;
        const hairColor = isFlashing ? 0xFFFFFF : 0x111122;
        const armExtend = this.attackSwing * 35;

        if (this.hasExecutionerSword) {
            const pulse = 0.4 + Math.sin((this.animTimer || 0) * 0.005) * 0.2;
            g.fillStyle(0xFF0000, pulse * 0.3);
            g.fillEllipse(x, masterY - 12, 45, 55);
        }

        // LEGS
        const legY = masterY + 6;
        let lL = 30, rL = 30;
        if (this.stateMachine.is('walk')) { lL += this.walkCycle * 1.3; rL -= this.walkCycle * 1.3; }
        else if (this.stateMachine.isAny('jump', 'fall')) { lL = 18; rL = 18; }
        g.lineStyle(6, suitColor, 1);
        g.beginPath(); g.moveTo(x - 5 * f, legY); g.lineTo(x - 5 * f, legY + lL); g.strokePath();
        g.beginPath(); g.moveTo(x + 5 * f, legY); g.lineTo(x + 5 * f, legY + rL); g.strokePath();
        g.fillStyle(0x222222, 1);
        g.fillEllipse(x - 5 * f, legY + lL + 3, 9, 4);
        g.fillEllipse(x + 5 * f, legY + rL + 3, 9, 4);

        // TORSO
        g.fillStyle(suitColor, 1);
        g.fillRoundedRect(x - 12, masterY - 15, 24, 24, 3);
        g.fillStyle(0xEEEEEE, 1); g.fillRect(x - 4, masterY - 13, 8, 20);
        g.fillStyle(tieColor, 1);
        g.beginPath(); g.moveTo(x - 2, masterY - 12); g.lineTo(x + 2, masterY - 12);
        g.lineTo(x, masterY + 5); g.fillPath();

        // ARMS
        g.lineStyle(5, suitColor, 1);
        g.beginPath(); g.moveTo(x - 14, masterY - 10); g.lineTo(x - 14 - 7 * f, masterY + 6); g.strokePath();
        g.beginPath(); g.moveTo(x + 14, masterY - 10); g.lineTo(x + 14 + (10 + armExtend) * f, masterY - 8); g.strokePath();
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 14 - 7 * f, masterY + 8, 4);
        g.fillCircle(x + 14 + (10 + armExtend) * f, masterY - 8, 4);

        // GAVEL
        const gs = this.gavelSize;
        const gx = x + (18 + armExtend) * f; const gy = masterY - 12;
        g.lineStyle(3, 0x8B7355, 1);
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 12 * gs * f, gy - 4 * gs); g.strokePath();
        const headColor = this.hasExecutionerSword ? 0xFF0000 : 0x555555;
        g.fillStyle(headColor, 1);
        g.fillRect(gx + 9 * gs * f - 4 * gs, gy - 8 * gs, 8 * gs, 10 * gs);
        if (this.hasExecutionerSword) {
            const pulse = 0.7 + Math.sin((this.animTimer || 0) * 0.006) * 0.3;
            g.fillStyle(0xFFDD00, pulse);
            g.beginPath(); g.moveTo(gx + 8 * f, gy - 10);
            g.lineTo(gx + 40 * f, gy - 18); g.lineTo(gx + 42 * f, gy - 12);
            g.lineTo(gx + 12 * f, gy - 3); g.fillPath();
        }

        // HEAD
        g.fillStyle(skinColor, 1); g.fillCircle(x + 2 * f, masterY - 25, 11);
        g.fillStyle(hairColor, 1);
        g.beginPath(); g.moveTo(x - 11, masterY - 28); g.lineTo(x - 8, masterY - 40);
        g.lineTo(x - 2, masterY - 38); g.lineTo(x + 3, masterY - 40);
        g.lineTo(x + 8, masterY - 38); g.lineTo(x + 11, masterY - 28); g.fillPath();
        g.fillStyle(0x000000, 1);
        g.fillCircle(x - 3 * f, masterY - 26, 1.5);
        g.fillCircle(x + 5 * f, masterY - 26, 1.5);
        g.lineStyle(2, hairColor, 1);
        g.beginPath(); g.moveTo(x - 6 * f, masterY - 30); g.lineTo(x - 1 * f, masterY - 29); g.strokePath();
        g.beginPath(); g.moveTo(x + 2 * f, masterY - 30); g.lineTo(x + 7 * f, masterY - 29); g.strokePath();
    }
}
