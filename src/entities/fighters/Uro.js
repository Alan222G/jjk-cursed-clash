// ========================================================
// Takako Uro — Sky Manipulation
// Thin Ice Breaker, Flight, Space Distortion
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Uro extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.URO);
        this.isCasting = false;
        
        // Flight state
        this.isFlying = false;
        this.flightTimer = 0;

        // Auto-counter (Domain utility)
        this.spaceDistortionActive = false;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castIceMissile();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castFlight();
        } else if (tier >= 1) {
            this.castThinIceBreaker();
        }
    }

    // H1: Thin Ice Breaker (Hits the sky surface, causing a shockwave)
    castThinIceBreaker() {
        if (!this.domainActive && !this.ceSystem.spend(30)) return;
        this.isCasting = true; this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(0);

        // Visual: Uro strikes the air
        const strikeX = this.sprite.x + 50 * this.facing;
        const strikeY = this.sprite.y;

        this.scene.time.delayedCall(100, () => {
            try { this.scene.sound.play('heavy_smash', { volume: 0.8 }); } catch(e) {}
            
            // "Shattering sky" visual
            const crack = this.scene.add.graphics().setDepth(20);
            crack.lineStyle(3, 0x87CEEB, 0.9);
            crack.beginPath();
            crack.moveTo(strikeX, strikeY);
            crack.lineTo(strikeX + 20, strikeY - 30);
            crack.lineTo(strikeX + 40, strikeY - 10);
            crack.lineTo(strikeX + 60, strikeY - 40);
            crack.strokePath();

            this.scene.tweens.add({ targets: crack, alpha: 0, scale: 1.5, duration: 400, onComplete: () => crack.destroy() });

            // Shockwave projectile
            const proj = new Projectile(this.scene, strikeX, strikeY, {
                owner: this,
                damage: 45 * this.power,
                knockbackX: 300,
                knockbackY: -200,
                stunDuration: 500,
                speed: 800,
                direction: this.facing,
                color: 0x87CEEB,
                size: { w: 40, h: 80 },
                lifetime: 800,
                type: 'normal'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H2: Flight / Ascend
    castFlight() {
        if (!this.domainActive && !this.ceSystem.spend(50)) return;
        this.isCasting = true; this.stateMachine.lock(400);

        try { this.scene.sound.play('sfx_dash', { volume: 0.8 }); } catch(e) {}

        // Visual distortion ring
        const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0xFFB6C1, 0.5).setDepth(15);
        this.scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });

        this.sprite.body.setVelocityY(-800);
        this.isFlying = true;
        this.flightTimer = 3000; // 3 seconds of hover

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('fall');
        });
    }

    // H4: Ice Missile (Maximum)
    castIceMissile() {
        if (!this.domainActive && !this.ceSystem.spend(120)) return;
        this.isCasting = true; this.stateMachine.lock(1200);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x87CEEB, 200, 0.5);
            this.scene.screenEffects.shake(0.04, 500);
        }

        try { this.scene.sound.play('sfx_beam', { volume: 1.2 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const targetX = target ? target.sprite.x : this.sprite.x + 400 * this.facing;
        
        const missile = this.scene.add.rectangle(this.sprite.x + 50 * this.facing, this.sprite.y - 50, 80, 20, 0x87CEEB).setDepth(20);
        
        this.scene.tweens.add({
            targets: missile,
            x: targetX,
            y: target ? target.sprite.y : this.sprite.y,
            duration: 400,
            ease: 'Linear',
            onComplete: () => {
                if (target && !target.isDead) {
                    const dist = Phaser.Math.Distance.Between(missile.x, missile.y, target.sprite.x, target.sprite.y);
                    if (dist < 100) {
                        target.takeDamage(120 * this.power, 600 * this.facing, -400, 800, true);
                    }
                }
                
                // Explosion
                const exp = this.scene.add.circle(missile.x, missile.y, 100, 0x87CEEB, 0.8).setDepth(20);
                this.scene.tweens.add({ targets: exp, alpha: 0, duration: 300, onComplete: () => exp.destroy() });
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.08, 400);

                missile.destroy();
            }
        });

        this.scene.time.delayedCall(1200, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // Uro's Domain: Auto-counter
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');

        try { this.scene.sound.play('sfx_heal', { volume: 0.8 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'sky_manipulation');

        this.domainTimer = 15000;
        this.spaceDistortionActive = true; // Any physical attack gets countered
    }

    takeDamage(damage, kbX, kbY, stunDuration, bypassBlock = false) {
        if (this.spaceDistortionActive && !bypassBlock) {
            // Space Distortion Auto-Counter!
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFB6C1, 100, 0.4);
            try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
            
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                // Reflect a portion of the attack back to the opponent
                target.takeDamage(damage, -kbX, -kbY, stunDuration, true);
            }
            return; // Uro takes NO damage
        }
        super.takeDamage(damage, kbX, kbY, stunDuration, bypassBlock);
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.isFlying) {
            this.flightTimer -= dt;
            if (this.flightTimer > 0) {
                this.sprite.body.setAllowGravity(false);
                this.sprite.body.setVelocityY(0); // hover
            } else {
                this.isFlying = false;
                this.sprite.body.setAllowGravity(true);
            }
        }

        if (this.domainActive) {
            this.domainTimer -= dt;

            if (this.domainTimer <= 0) {
                this.domainActive = false;
                this.spaceDistortionActive = false;
                this.ceSystem.endDomain();
                if (this.scene.onDomainEnded) this.scene.onDomainEnded();
            }
        }
    }

    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 60, 20); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        
        // Colors
        const skinColor = isFlashing ? 0xFFFFFF : 0xFFE0CC;
        const hairColor = isFlashing ? 0xFFFFFF : 0xFF69B4;
        const armExtend = this.attackSwing * 30;

        // Legs
        const legY = masterY + 10;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle; rightLeg -= this.walkCycle; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 10; rightLeg = 10; }
        
        g.fillStyle(skinColor, 1);
        g.fillTriangle(x - 8, legY, x - 8 - 10, legY + leftLeg, x - 8 + 10, legY + leftLeg - 5);
        g.fillTriangle(x + 8, legY, x + 8 - 12 * f, legY + rightLeg, x + 8 + 12 * f, legY + rightLeg - 2);

        // Torso
        g.fillStyle(skinColor, 1);
        g.beginPath();
        g.moveTo(x - 12, masterY - 30);
        g.lineTo(x + 12, masterY - 30);
        g.lineTo(x + 10, masterY + 15);
        g.lineTo(x - 10, masterY + 15);
        g.fillPath();

        // Sky Distortion overlay on Torso (since she wears nothing but distorted sky)
        g.fillStyle(0x87CEEB, 0.6);
        g.fillEllipse(x, masterY - 10, 15, 30);

        // Arms
        const armY = masterY - 26;
        g.lineStyle(8, skinColor, 1);
        g.beginPath();
        g.moveTo(x - 10 * f, armY);
        g.lineTo(x - 20 * f, armY + 15);
        g.strokePath();

        g.beginPath();
        g.moveTo(x + 10 * f, armY);
        g.lineTo(x + (20 + armExtend) * f, armY + 5);
        g.strokePath();

        // Head
        const hx = x; const hy = masterY - 45;
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 12);
        
        // Hair (Pink flowing)
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(hx - 12, hy - 5);
        g.lineTo(hx - 15, hy + 20);
        g.lineTo(hx - 8, hy + 25);
        g.lineTo(hx, hy - 15);
        g.lineTo(hx + 8, hy + 25);
        g.lineTo(hx + 15, hy + 20);
        g.lineTo(hx + 12, hy - 5);
        g.fillPath();
    }
}
