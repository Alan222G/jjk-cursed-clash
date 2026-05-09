// ========================================================
// Takako Uro — Sky Manipulation
// Sky Shield, Flight, Aerial Slam, Space Distortion
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS, ATTACKS } from '../../config.js';

export default class Uro extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.URO);
        this.isCasting = false;
        
        // Flight state
        this.isFlying = false;
        this.flightTimer = 0;

        // Shield state
        this.shieldActive = false;
        this.shieldTimer = 0;

        // Auto-counter (Domain utility)
        this.spaceDistortionActive = false;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        // While flying, U+Down = aerial slam attack
        if (this.isFlying && this.input.isDown('DOWN')) {
            this.castAerialSlam();
            return;
        }

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castIceMissile();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.castFlight();
        } else if (tier >= 1) {
            this.castSkyShield();
        }
    }

    // H1: Sky Shield — Reflects all incoming projectiles for 3 seconds
    castSkyShield() {
        if (this.shieldActive) return;
        if (!this.ceSystem.spend(30)) return;
        this.isCasting = true; this.stateMachine.lock(400);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_charge', { volume: 0.8 }); } catch(e) {}

        this.shieldActive = true;
        this.shieldTimer = 3000; // 3 seconds of reflection

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'SKY SHIELD!', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#87CEEB', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1200, onComplete: () => txt.destroy() });

        if (this.scene.screenEffects) this.scene.screenEffects.flash(0x87CEEB, 100, 0.3);

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H2: Flight / Ascend (U + Up)
    castFlight() {
        if (!this.ceSystem.spend(25)) return;
        this.isCasting = true; this.stateMachine.lock(300);

        try { this.scene.sound.play('sfx_dash', { volume: 0.8 }); } catch(e) {}

        const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0xFFB6C1, 0.5).setDepth(15);
        this.scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });

        this.sprite.body.setVelocityY(-1200);
        this.isFlying = true;
        this.flightTimer = 3000;

        this.scene.time.delayedCall(300, () => {
            this.isCasting = false; this.stateMachine.unlock();
        });
    }

    // Aerial Slam — Available only while flying (U + Down while airborne)
    castAerialSlam() {
        this.isCasting = true; this.stateMachine.lock(600);
        this.isFlying = false;
        this.sprite.body.setAllowGravity(true);

        try { this.scene.sound.play('sfx_dash', { volume: 1.0 }); } catch(e) {}

        this.sprite.body.setVelocityY(1200);
        this.sprite.body.setVelocityX(300 * this.facing);

        this.scene.time.delayedCall(300, () => {
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.05, 400);
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}

            const wave = this.scene.add.circle(this.sprite.x, this.sprite.y + 30, 60, 0x87CEEB, 0.7).setDepth(15);
            this.scene.tweens.add({ targets: wave, scale: 3, alpha: 0, duration: 500, onComplete: () => wave.destroy() });

            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 150) {
                target.takeDamage(60 * this.power, 400 * this.facing, -500, 600);
            }
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H4: Ice Missile (Maximum — U + Down on ground)
    castIceMissile() {
        if (!this.ceSystem.spend(120)) return;
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

    // Uro does NOT have a domain — she has a special instead
    tryActivateDomain() {
        if (this.isCasting) return;
        if (this.spaceDistortionActive) return;
        if (!this.ceSystem.spend(80)) return;

        this.isCasting = true; this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);
        this.spaceDistortionActive = true;

        try { this.scene.sound.play('sfx_heal', { volume: 0.8 }); } catch(e) {}
        if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFB6C1, 200, 0.5);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'SPACE DISTORTION!', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FFB6C1', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // Lasts 8 seconds — any physical hit is reflected
        this.distortionTimer = 8000;

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    takeDamage(damage, kbX, kbY, stunDuration, bypassBlock = false) {
        if (this.spaceDistortionActive && !bypassBlock) {
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFB6C1, 100, 0.4);
            try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
            
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                target.takeDamage(damage, -kbX, -kbY, stunDuration, true);
            }
            return;
        }
        super.takeDamage(damage, kbX, kbY, stunDuration, bypassBlock);
    }

    update(time, dt) {
        super.update(time, dt);

        // Flight
        if (this.isFlying) {
            this.flightTimer -= dt;
            if (this.flightTimer > 0) {
                this.sprite.body.setAllowGravity(false);
                if (this.input.isDown('LEFT')) this.sprite.body.setVelocityX(-this.speed * 1.3);
                else if (this.input.isDown('RIGHT')) this.sprite.body.setVelocityX(this.speed * 1.3);
                else this.sprite.body.setVelocityX(0);
                this.sprite.body.setVelocityY(0);
            } else {
                this.isFlying = false;
                this.sprite.body.setAllowGravity(true);
            }
        }

        // Shield — reflect projectiles
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
            } else if (this.scene.projectiles) {
                // Reflect any incoming projectile within range
                for (let p of this.scene.projectiles) {
                    if (!p.alive || p.owner === this) continue;
                    const dist = Math.abs(p.sprite.x - this.sprite.x);
                    if (dist < 80) {
                        p.direction *= -1;
                        p.sprite.body.setVelocityX(p.speed * p.direction);
                        p.owner = this; // Now it belongs to Uro
                        p.damage = Math.floor(p.damage * 1.2); // +20% reflected damage

                        if (this.scene.screenEffects) this.scene.screenEffects.flash(0x87CEEB, 50, 0.2);
                        try { this.scene.sound.play('sfx_teleport', { volume: 0.5 }); } catch(e) {}
                    }
                }
            }
        }

        // Space distortion timer
        if (this.spaceDistortionActive) {
            this.distortionTimer -= dt;
            if (this.distortionTimer <= 0) {
                this.spaceDistortionActive = false;
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
        
        const skinColor = isFlashing ? 0xFFFFFF : 0xFFE0CC;
        const hairColor = isFlashing ? 0xFFFFFF : 0xFF69B4;
        const armExtend = this.attackSwing * 30;

        // Legs
        const legY = masterY + 10;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle; rightLeg -= this.walkCycle; }
        else if (this.stateMachine.isAny('jump', 'fall') || this.isFlying) { leftLeg = 10; rightLeg = 10; }
        
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

        // Sky overlay on torso
        g.fillStyle(0x87CEEB, 0.6);
        g.fillEllipse(x, masterY - 10, 15, 30);

        // Arms
        const armY = masterY - 26;
        g.lineStyle(8, skinColor, 1);
        g.beginPath(); g.moveTo(x - 10 * f, armY); g.lineTo(x - 20 * f, armY + 15); g.strokePath();
        g.beginPath(); g.moveTo(x + 10 * f, armY); g.lineTo(x + (20 + armExtend) * f, armY + 5); g.strokePath();

        // Head
        const hx = x; const hy = masterY - 45;
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 12);
        
        // Hair
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

        // Shield visual
        if (this.shieldActive) {
            g.lineStyle(3, 0x87CEEB, 0.7);
            g.strokeCircle(x + 20 * f, masterY - 10, 30);
            g.fillStyle(0x87CEEB, 0.2);
            g.fillCircle(x + 20 * f, masterY - 10, 30);
        }

        // Flying aura
        if (this.isFlying) {
            g.lineStyle(2, 0x87CEEB, 0.5);
            g.strokeCircle(x, masterY, 35);
            g.strokeCircle(x, masterY, 45);
        }

        // Distortion aura
        if (this.spaceDistortionActive) {
            g.lineStyle(2, 0xFFB6C1, 0.4 + Math.sin(Date.now() * 0.005) * 0.2);
            g.strokeCircle(x, masterY, 40);
        }
    }
}
