// ========================================================
// Hajime Kashimo — God of Lightning
// Electric trait, Mythical Beast Amber, Thunder Clap
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Kashimo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.KASHIMO);
        this.isCasting = false;
        
        // Electric charge on opponent
        this.chargeLevel = 0;
        
        // Mythical Beast Amber state
        this.mbaActive = false;
        this.mbaTimer = 0;
        
        // HWB State
        this.hwbActive = false;
        this.hwbTimer = 0;
    }

    // Passive: Build charge on hit (with 200ms cooldown to avoid multi-hit bugs)
    onHitOpponent(target) {
        super.onHitOpponent(target);
        if (target && !target.isDead) {
            const now = this.scene.time.now;
            if (!this.lastChargeTime || now - this.lastChargeTime >= 200) {
                this.chargeLevel += 25;
                if (this.chargeLevel > 100) this.chargeLevel = 100;
                this.lastChargeTime = now;
                
                // Visual spark
                const spark = this.scene.add.circle(target.sprite.x, target.sprite.y - 40, 5, 0x00FFFF, 0.8).setDepth(20);
                this.scene.tweens.add({ targets: spark, scale: 3, alpha: 0, duration: 300, onComplete: () => spark.destroy() });
                
                // Chance to stun with electricity
                if (Math.random() < 0.1 || (this.mbaActive && Math.random() < 0.3)) {
                    target.takeDamage(0, 0, 0, 400); // 400ms mini-stun
                    if (this.scene.screenEffects) this.scene.screenEffects.flash(0x00FFFF, 50, 0.2);
                }
            }
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castThunderClap();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castLightningStrike();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castHollowWickerBasket();
        } else if (tier >= 1) {
            this.castStaffCombo();
        }
    }

    // H1: Staff Combo
    castStaffCombo() {
        if (!this.ceSystem.spend(30)) return;
        this.isCasting = true; this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        // Staff Visual
        const staff = this.scene.add.rectangle(this.sprite.x + 30 * this.facing, this.sprite.y - 10, 80, 8, 0xFFDD00).setDepth(15);
        this.scene.tweens.add({ targets: staff, angle: 360 * 2, duration: 500 });

        this.scene.time.delayedCall(100, () => {
            try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
            this.sprite.body.setVelocityX(500 * this.facing);
            
            let hits = 0;
            const hitInterval = this.scene.time.addEvent({
                delay: 100,
                callback: () => {
                    staff.setPosition(this.sprite.x + 40 * this.facing, this.sprite.y);
                    const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                    if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 90) {
                        const dmgMultiplier = 1 + (this.chargeLevel / 100);
                        target.takeDamage(20 * this.power * dmgMultiplier, 50 * this.facing, -20, 200);
                        this.chargeLevel = 0;
                    }
                    hits++;
                    if (hits >= 4) {
                        hitInterval.destroy();
                        staff.destroy();
                        this.sprite.body.setVelocityX(0);
                    }
                },
                loop: true
            });
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H2: Hollow Wicker Basket (HWB)
    castHollowWickerBasket() {
        if (!this.ceSystem.spend(40)) return;
        this.isCasting = true; this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        this.hwbActive = true;
        this.hwbTimer = 8000;
        const defMult = 1.5 + (this.chargeLevel / 100);
        this.defense = (this.charData.stats.defense || 0.9) * defMult;
        this.chargeLevel = 0; // Drains charge for extra defense

        // Visual HWB Grid
        const hwb = this.scene.add.graphics().setDepth(14);
        hwb.lineStyle(2, 0xFFDD00, 0.6);
        for (let i = 0; i < 5; i++) {
            hwb.strokeCircle(this.sprite.x, this.sprite.y, 30 + i * 15);
        }
        this.scene.tweens.add({ targets: hwb, alpha: 0, scale: 1.5, duration: 800, onComplete: () => hwb.destroy() });

        try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'HOLLOW WICKER BASKET', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#FFDD00', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1000, onComplete: () => txt.destroy() });

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H3: Lightning Strike (Guaranteed hit based on charge)
    castLightningStrike() {
        if (this.chargeLevel < 50) {
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'NOT ENOUGH CHARGE', {
                fontFamily: 'Arial Black', fontSize: '14px', color: '#00FFFF', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(40);
            this.scene.tweens.add({ targets: txt, y: '-=20', alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            return;
        }

        if (!this.ceSystem.spend(50)) return;
        this.isCasting = true; this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_charge', { volume: 0.8 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        
        this.scene.time.delayedCall(400, () => {
            if (!target || target.isDead) return;
            try { this.scene.sound.play('sfx_beam', { volume: 1.2 }); } catch(e) {}
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0x00FFFF, 200, 0.8);
                this.scene.screenEffects.shake(0.06, 500);
            }

            // Guaranteed hit lightning bolt from sky to target
            const bolt = this.scene.add.rectangle(target.sprite.x, PHYSICS.GROUND_Y - 400, 40, 800, 0x00FFFF).setDepth(20);
            const core = this.scene.add.rectangle(target.sprite.x, PHYSICS.GROUND_Y - 400, 15, 800, 0xFFFFFF).setDepth(21);
            
            this.scene.tweens.add({
                targets: [bolt, core], alpha: 0, duration: 400, onComplete: () => { bolt.destroy(); core.destroy(); }
            });

            // Damage scaling with charge level
            const dmgMultiplier = 1 + (this.chargeLevel / 100);
            const dmg = Math.floor(100 * this.power * dmgMultiplier);
            
            target.takeDamage(dmg, 100 * this.facing, -300, 800, true); // bypassBlock=true
            this.chargeLevel = 0; // consume charge
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H4: Thunder Clap
    castThunderClap() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        this.isCasting = true; this.stateMachine.lock(1200);

        this.sprite.body.setVelocityY(-600);
        this.sprite.body.setVelocityX(300 * this.facing);

        try { this.scene.sound.play('sfx_dash', { volume: 0.8 }); } catch(e) {}

        this.scene.time.delayedCall(400, () => {
            this.sprite.body.setVelocityY(1000);
            this.sprite.body.setVelocityX(0);

            this.scene.time.delayedCall(200, () => {
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.shake(0.08, 800);
                    this.scene.screenEffects.flash(0x00FFFF, 300, 0.6);
                }
                try { this.scene.sound.play('heavy_smash', { volume: 1.2 }); } catch(e) {}

                const wave = this.scene.add.circle(this.sprite.x, this.sprite.y + 40, 50, 0x00FFFF, 0.8).setDepth(15);
                this.scene.tweens.add({ targets: wave, scale: 6, alpha: 0, duration: 600, onComplete: () => wave.destroy() });

                const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 250) {
                    const dmgMultiplier = 1 + (this.chargeLevel / 100);
                    target.takeDamage(120 * this.power * dmgMultiplier, 600 * this.facing, -500, 1000);
                    this.chargeLevel = 0;
                }
            });
        });

        this.scene.time.delayedCall(1200, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // DOMAIN: Mythical Beast Amber
    tryActivateDomain() {
        if (this.mbaActive) return;
        if (!this.ceSystem.spend(100)) return;

        this.mbaActive = true;
        this.mbaTimer = 60000;

        this.power = (this.charData.stats.power || 1.2) * 1.6;
        this.speed = (this.charData.stats.speed || 370) * 1.5;
        this.charData.stats.ceRegen = (this.charData.stats.ceRegen || 5.0) * 2.5;
        this.ceRegen = this.charData.stats.ceRegen;

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x00FFFF, 500, 0.7);
            this.scene.screenEffects.shake(0.06, 800);
        }
        try { this.scene.sound.play('sfx_heal', { volume: 1.5 }); } catch(e) {}

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'MYTHICAL BEAST AMBER', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#00FFFF', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=60', alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.hwbActive) {
            this.hwbTimer -= dt;
            if (this.hwbTimer <= 0) {
                this.hwbActive = false;
                this.defense = this.charData.stats.defense || 0.9;
            }
        }

        if (this.mbaActive) {
            this.mbaTimer -= dt;

            // Electric aura
            if (Math.floor(time) % 50 < 20) {
                const cx = this.sprite.x + (Math.random() - 0.5) * 60;
                const cy = this.sprite.y + (Math.random() - 0.5) * 100;
                const spark = this.scene.add.circle(cx, cy, 3, 0x00FFFF, 0.9).setDepth(15);
                this.scene.tweens.add({ targets: spark, alpha: 0, scale: 2, duration: 300, onComplete: () => spark.destroy() });
            }

            // At end of MBA, Kashimo's body breaks down (drains to 1 HP slowly)
            if (this.mbaTimer <= 0 && !this.isDead) {
                if (this.hp > 1) {
                    this.hp = Math.max(1, this.hp - Math.floor(100 * (dt / 1000))); // Drains 100 HP per second
                    if (Math.floor(time) % 100 < 50) this.hitFlash = 1; // Flashing indicator of dying
                }
            }
        }

        // Passive CE Regen scaling with charge
        if (!this.mbaActive && this.chargeLevel > 0) {
            const baseRegen = (this.charData.stats.ceRegen || 5.0) * 1.3;
            this.ceSystem.regenRate = baseRegen * (1 + (this.chargeLevel / 100));
        } else if (!this.mbaActive) {
            this.ceSystem.regenRate = (this.charData.stats.ceRegen || 5.0) * 1.3;
        }

        // Draw charge UI above character
        if (!this.chargeText && !this.isDead) {
            this.chargeText = this.scene.add.text(0, 0, '', {
                fontSize: '12px', fontFamily: 'Arial Black', color: '#00FFFF', stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(30);
        }
        if (this.chargeText) {
            if (this.isDead) {
                this.chargeText.destroy();
                this.chargeText = null;
            } else {
                this.chargeText.setPosition(this.sprite.x, this.sprite.y - 100);
                this.chargeText.setText(`CHARGE: ${this.chargeLevel}%`);
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
        
        // MBA Color swap
        const skinColor = isFlashing ? 0xFFFFFF : (this.mbaActive ? 0x00FFFF : 0xFFE0CC);
        const robeColor = isFlashing ? 0xFFFFFF : (this.mbaActive ? 0x0088CC : 0x2288CC);
        const hairColor = isFlashing ? 0xFFFFFF : (this.mbaActive ? 0xFFFFFF : 0x00FFFF);
        const armExtend = this.attackSwing * 30;

        // Legs
        const legY = masterY + 10;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle; rightLeg -= this.walkCycle; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 10; rightLeg = 10; }
        g.fillStyle(0x111111, 1);
        g.fillTriangle(x - 8, legY, x - 8 - 10, legY + leftLeg, x - 8 + 10, legY + leftLeg - 5);
        g.fillTriangle(x + 8, legY, x + 8 - 12 * f, legY + rightLeg, x + 8 + 12 * f, legY + rightLeg - 2);

        // Torso
        g.fillStyle(robeColor, 1);
        g.beginPath();
        g.moveTo(x - 14, masterY - 30);
        g.lineTo(x + 14, masterY - 30);
        g.lineTo(x + 10, masterY + 15);
        g.lineTo(x - 10, masterY + 15);
        g.fillPath();

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
        
        // Hair (Spiky)
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(hx - 15, hy - 5);
        g.lineTo(hx - 20, hy - 25);
        g.lineTo(hx - 5, hy - 15);
        g.lineTo(hx, hy - 30);
        g.lineTo(hx + 5, hy - 15);
        g.lineTo(hx + 20, hy - 25);
        g.lineTo(hx + 15, hy - 5);
        g.fillPath();
    }
}
