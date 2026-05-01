import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Nanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NANAMI);
        this.overtimeBurstActive = false;
        this.isCasting = false;
    }

    _check73Crit(target) {
        if (!target) return false;
        const dist = Math.abs(this.sprite.x - target.sprite.x);
        const minDist = this.overtimeBurstActive ? 50 : 110;
        const maxDist = this.overtimeBurstActive ? 220 : 150;
        return dist >= minDist && dist <= maxDist;
    }

    _applyBlackFlash(target) {
        if (!target) return;
        const ex = target.sprite.x;
        const ey = target.sprite.y - 30;
        
        this.spawnBlackFlashEffect(ex, ey);
        
        if (this.scene.screenEffects) {
            this.scene.screenEffects.shake(0.015, 400);
            this.scene.screenEffects.hitFreeze(150);
            this.scene.screenEffects.flash(0x000000, 150, 0.4);
        }
        try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
    }

    onHitOpponent(opponent) {
        const isCrit = this._check73Crit(opponent);
        if (isCrit) {
            const originalPower = this.power;
            this.power *= 2.5;
            this._applyBlackFlash(opponent);
            super.onHitOpponent(opponent);
            this.power = originalPower;
        } else {
            super.onHitOpponent(opponent);
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();
        
        if (tier >= 2 && this.input.isDown('DOWN')) {
            this.executeOvertimeBurst(); // Maximum
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeSever(); // Skill 2
        } else if (tier >= 1) {
            this.executeCollapse(); // Skill 1
        }
    }

    executeCollapse() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.7 }); } catch(e) {}
        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.015, 300);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting || this.isDead) return;
            const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y + 15, {
                owner: this,
                damage: Math.floor(40 * this.power),
                knockbackX: 200,
                knockbackY: -600, // Massive Knock-up
                stunDuration: 600,
                speed: 600,
                direction: this.facing,
                color: 0x666666, // Rubble/rock debris
                size: { w: 50, h: 30 },
                lifetime: 1500,
                type: 'normal'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        });

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeSever() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);
        
        this.sprite.body.setVelocityX(this.facing * 700);
        try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}

        this.scene.time.delayedCall(250, () => {
            if (!this.isCasting || this.isDead) return;
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            this.sprite.body.setVelocityX(0);

            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 140) {
                const isCrit = this._check73Crit(target);
                if (isCrit) this._applyBlackFlash(target);
                target.takeDamage(Math.floor((isCrit ? 35 * 2.5 : 35) * this.power), 200 * this.facing, -100, 500);

                // Debuff: Drains CE over 3s
                const drainInterval = this.scene.time.addEvent({
                    delay: 500,
                    repeat: 5,
                    callback: () => {
                        if (!target.isDead) target.ceSystem.spend(3);
                    }
                });
                
                const txt = this.scene.add.text(target.sprite.x, target.sprite.y - 80, 'FLUJO CORTADO', {
                    fontFamily: 'Arial Black', fontSize: '15px', color: '#8800FF', stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(40);
                this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
            }
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeOvertimeBurst() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
        
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'ESTALLIDO DE HORAS EXTRAS', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#FFD700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
            
            this.overtimeBurstActive = true;
            this.speed = (this.charData.stats.speed || 330) * 1.3; // +30% speed
            
            this.scene.time.delayedCall(7000, () => {
                this.overtimeBurstActive = false;
                this.speed = this.charData.stats.speed || 330;
            });
        });
    }

    tryActivateDomain() {
        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;
        
        this.isCasting = true;
        this.stateMachine.lock(2500);
        
        // No black background overlay as requested
        
        this.sprite.body.setVelocityX(this.facing * 1000);

        this.scene.time.delayedCall(300, () => {
            if (!this.isCasting || this.isDead) return;
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 220) {
                this.sprite.body.setVelocityX(0);
                
                const cx = target.sprite.x; const cy = target.sprite.y;
                const line = this.scene.add.graphics().setDepth(20);
                line.lineStyle(5, 0x00FFFF, 1);
                line.beginPath(); line.moveTo(cx - 150, cy - 80); line.lineTo(cx + 150, cy + 80); line.strokePath();
                
                line.fillStyle(0xFF0000, 1);
                line.fillCircle(cx + 60, cy + 32, 12); // The 7:3 point on the line

                // No slow motion as it freezes the game for 10 seconds
                this.scene.time.delayedCall(600, () => {
                    line.destroy();
                    this._applyBlackFlash(target);
                    const txt = this.scene.add.text(cx, cy - 120, 'RATIO MAXIMO!', {
                        fontFamily: 'Arial Black', fontSize: '45px', color: '#00FFFF', stroke: '#000000', strokeThickness: 8
                    }).setOrigin(0.5).setDepth(50);
                    this.scene.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
                    
                    target.takeDamage(Math.floor(target.maxHp * 0.40), 800 * this.facing, -300, 1500);
                });
            }
        });

        this.scene.time.delayedCall(1500, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // DRAW — Nanami in Beige Suit with Cow-pattern Cleaver
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;

        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const suitColor = isFlashing ? 0xFFFFFF : 0xEEDDCC; // Beige suit
        const shirtColor = isFlashing ? 0xFFFFFF : 0x2288CC; // Blue shirt
        const pantColor = isFlashing ? 0xFFFFFF : 0xEEDDCC; // Beige pants
        const tieColor = isFlashing ? 0xFFFFFF : 0xDDCC88; // Yellow tie
        const armExtend = this.attackSwing * 40;

        // LEGS
        const legY = masterY + 8;
        let leftLeg = 38, rightLeg = 38;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 22; rightLeg = 22; }
        
        g.lineStyle(8, pantColor, 1);
        g.beginPath(); g.moveTo(x - 10, legY); g.lineTo(x - 15 - (f * 8), legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 10, legY); g.lineTo(x + 15 + (f * 8), legY + rightLeg); g.strokePath();
        // Shoes (Brown)
        g.fillStyle(0x442211, 1);
        g.fillEllipse(x - 15 - (f * 8) + (f*5), legY + leftLeg + 2, 12, 6);
        g.fillEllipse(x + 15 + (f * 8) + (f*5), legY + rightLeg + 2, 12, 6);

        // TORSO — Beige suit jacket open over blue shirt
        g.fillStyle(shirtColor, 1);
        g.fillRect(x - 12, masterY - 35, 24, 45); // Inner blue shirt
        
        if (!this.overtimeBurstActive) {
            // Yellow Tie (wrapped around hand if Burst is active, else worn)
            g.lineStyle(4, tieColor, 1);
            g.beginPath(); g.moveTo(x, masterY - 30); g.lineTo(x, masterY + 5); g.strokePath();
        }

        // Suit Jacket Halves
        g.fillStyle(suitColor, 1);
        g.fillTriangle(x - 16, masterY - 38, x - 2, masterY - 38, x - 10, masterY + 10);
        g.fillTriangle(x + 16, masterY - 38, x + 2, masterY - 38, x + 10, masterY + 10);

        // HEAD
        const hx = x; const hy = masterY - 50;
        g.fillStyle(0xF0D0B0, 1); g.fillCircle(hx, hy, 12);
        // Hair — Blonde neat comb-over
        g.fillStyle(isFlashing ? 0xFFFFFF : 0xDDCC88, 1);
        g.beginPath(); g.moveTo(hx - 12, hy + 2); g.lineTo(hx - 12, hy - 10);
        g.lineTo(hx, hy - 14); g.lineTo(hx + 12, hy - 8); g.lineTo(hx + 14, hy + 2);
        g.lineTo(hx + 8, hy - 6); g.fillPath();
        // Glasses — Green/Teal goggles
        g.fillStyle(0x118888, 0.9);
        g.fillRect(hx + (f * 2) - 6, hy - 4, 12, 4);

        // ARMS & WEAPON
        const armY = masterY - 32;
        // Back arm
        g.lineStyle(7, suitColor, 0.9);
        g.beginPath(); g.moveTo(x - 14, armY + 3); g.lineTo(x - 24 * f, armY + 20); g.strokePath();
        g.fillStyle(0xF0D0B0, 1); g.fillCircle(x - 24 * f, armY + 20, 5); // Hand

        // Front arm (Wielding the Cleaver)
        const handX = (this.attackSwing > 0) ? x + (25 + armExtend) * f : x + 18 * f;
        const handY = (this.attackSwing > 0) ? armY - 3 : armY + 20;

        g.lineStyle(8, suitColor, 1);
        if (this.stateMachine.is('block')) {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 8 * f, armY - 12); g.strokePath();
        } else {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(handX, handY); g.strokePath();
        }

        // Draw Cow-pattern Cleaver
        g.save();
        g.translate(handX, handY);
        if (this.attackSwing > 0) {
            g.rotate(f === 1 ? Math.PI/2 : -Math.PI/2);
        } else {
            g.rotate(f === 1 ? Math.PI/4 : -Math.PI/4); // Resting angle
        }

        // Blade Base (Grey)
        g.fillStyle(0xDDDDDD, 1);
        g.fillRect(-5, -45, 12, 40); // Broad blade
        // Handle (Black)
        g.fillStyle(0x222222, 1);
        g.fillRect(-2, -5, 6, 25);
        
        // Cow pattern cloth wrapped around blade (White with black spots)
        g.fillStyle(0xFFFFFF, 1);
        g.fillRect(-6, -40, 14, 30); // Cloth wrap

        g.fillStyle(0x111111, 1);
        // Draw spots
        g.fillEllipse(-2, -35, 4, 3);
        g.fillEllipse(3, -25, 5, 4);
        g.fillEllipse(-3, -15, 6, 3);
        g.fillEllipse(4, -30, 3, 5);

        // If Overtime Burst, draw yellow tie wrapped around wrist/handle
        if (this.overtimeBurstActive) {
            g.lineStyle(3, tieColor, 1);
            g.beginPath(); g.moveTo(-10, 5); g.lineTo(15, 15); g.strokePath();
        }

        g.restore();
        
        g.fillStyle(0xF0D0B0, 1); g.fillCircle(handX, handY, 6); // Front Hand
    }
}
