// ========================================================
// Uraume — Ice Manipulation Cursed Technique
// Frost attacks, Ice Trail, Freeze, Ice Fall
// NO DOMAIN — uses Reverse Cursed Technique heal instead
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Uraume extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.URAUME);
        this.isCasting = false;

        // Frost state
        this.frostArmorActive = false;
        this.frostArmorTimer = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castIceFall();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castFrostArmor();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castIceFreeze();
        } else if (tier >= 1) {
            this.castIceShards();
        }
    }

    // H1: Ice Shards — Fast triple projectile
    castIceShards() {
        if (!this.ceSystem.spend(25)) return;
        this.isCasting = true; this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_dash', { volume: 0.6 }); } catch(e) {}

        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 10 + (i - 1) * 25, {
                    owner: this,
                    damage: 15 * this.power,
                    knockbackX: 200,
                    knockbackY: -50,
                    stunDuration: 200,
                    speed: 1000,
                    direction: this.facing,
                    color: 0xAADDFF,
                    size: { w: 20, h: 10 },
                    lifetime: 800,
                    type: 'normal'
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H2: Ice Freeze — Freezes/immobilizes the opponent in a block of ice
    castIceFreeze() {
        if (!this.ceSystem.spend(50)) return;
        this.isCasting = true; this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_charge', { volume: 0.9 }); } catch(e) {}

        // Shoot a freeze projectile
        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y, {
            owner: this,
            damage: 20 * this.power,
            knockbackX: 0,
            knockbackY: 0,
            stunDuration: 0,
            speed: 700,
            direction: this.facing,
            color: 0x88EEFF,
            size: { w: 40, h: 40 },
            lifetime: 1200,
            type: 'circle',
            onHitCallback: (p, victim) => {
                // FREEZE the target — lock them for 2.5 seconds
                if (victim && !victim.isDead) {
                    victim.takeDamage(20 * this.power, 0, 0, 2500); // 2500ms stun = frozen
                    
                    // Visual: ice block around enemy
                    const iceBlock = this.scene.add.rectangle(victim.sprite.x, victim.sprite.y, 60, 80, 0x88EEFF, 0.5).setDepth(18);
                    iceBlock.isStroked = true; iceBlock.strokeColor = 0xAADDFF; iceBlock.lineWidth = 3;
                    
                    // Ice block follows enemy for freeze duration then shatters
                    const followTimer = this.scene.time.addEvent({
                        delay: 50, loop: true,
                        callback: () => {
                            if (victim && victim.sprite) {
                                iceBlock.setPosition(victim.sprite.x, victim.sprite.y);
                            }
                        }
                    });
                    
                    this.scene.time.delayedCall(2500, () => {
                        followTimer.destroy();
                        // Shatter effect
                        for (let i = 0; i < 6; i++) {
                            const shard = this.scene.add.rectangle(
                                iceBlock.x + (Math.random() - 0.5) * 40,
                                iceBlock.y + (Math.random() - 0.5) * 40,
                                10, 15, 0xAADDFF, 0.8
                            ).setDepth(19);
                            this.scene.tweens.add({
                                targets: shard,
                                x: shard.x + (Math.random() - 0.5) * 100,
                                y: shard.y + Math.random() * 60,
                                alpha: 0, rotation: Math.random() * 6,
                                duration: 500, onComplete: () => shard.destroy()
                            });
                        }
                        iceBlock.destroy();
                    });
                }
                return false; // Destroy projectile after hit
            }
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H3: Frost Armor — Defensive buff + reflects contact damage
    castFrostArmor() {
        if (this.frostArmorActive) return;
        if (!this.ceSystem.spend(60)) return;
        this.isCasting = true; this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        this.frostArmorActive = true;
        this.frostArmorTimer = 12000;
        this.defense = (this.charData.stats.defense || 1.0) * 1.6;

        if (this.scene.screenEffects) this.scene.screenEffects.flash(0xAADDFF, 200, 0.4);
        try { this.scene.sound.play('sfx_charge', { volume: 0.8 }); } catch(e) {}

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'FROST ARMOR', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#AADDFF', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1200, onComplete: () => txt.destroy() });

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H4: Ice Fall (Maximum) — Massive AOE from above
    castIceFall() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        this.isCasting = true; this.stateMachine.lock(1500);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 800);
            this.scene.screenEffects.flash(0xAADDFF, 300, 0.6);
        }
        try { this.scene.sound.play('heavy_smash', { volume: 1.2 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const targetX = target ? target.sprite.x : this.sprite.x + 200 * this.facing;

        for (let i = 0; i < 5; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                const px = targetX + (i - 2) * 60;
                const pillar = this.scene.add.rectangle(px, -50, 30, 200, 0xAADDFF, 0.8).setDepth(18);
                
                this.scene.tweens.add({
                    targets: pillar,
                    y: PHYSICS.GROUND_Y - 80,
                    duration: 300,
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.03, 200);
                        
                        if (target && !target.isDead) {
                            const dist = Math.abs(target.sprite.x - px);
                            if (dist < 50) {
                                target.takeDamage(40 * this.power, 100 * this.facing, -400, 500);
                            }
                        }
                        this.scene.tweens.add({ targets: pillar, alpha: 0, duration: 800, onComplete: () => pillar.destroy() });
                    }
                });
            });
        }

        this.scene.time.delayedCall(1500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // NO DOMAIN — Uraume uses Reverse Cursed Technique (heals 30% HP)
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.spend(80)) return;

        this.isCasting = true; this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_heal', { volume: 1.0 }); } catch(e) {}
        if (this.scene.screenEffects) this.scene.screenEffects.flash(0xAADDFF, 200, 0.5);

        const healAmount = Math.floor(this.charData.stats.maxHp * 0.3);
        this.hp = Math.min(this.charData.stats.maxHp, this.hp + healAmount);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'REVERSE CURSED TECHNIQUE!', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#00FF88', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // Heal VFX
        const healVfx = this.scene.add.circle(this.sprite.x, this.sprite.y, 50, 0x00FF88, 0.5).setDepth(15);
        this.scene.tweens.add({ targets: healVfx, scale: 2, alpha: 0, duration: 600, onComplete: () => healVfx.destroy() });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    takeDamage(damage, kbX, kbY, stunDuration, bypassBlock = false) {
        if (this.frostArmorActive && !bypassBlock) {
            const reflectDmg = Math.floor(damage * 0.2);
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead && reflectDmg > 0) {
                target.takeDamage(reflectDmg, 0, 0, 0, true);
                const crack = this.scene.add.circle(this.sprite.x, this.sprite.y, 20, 0xAADDFF, 0.6).setDepth(15);
                this.scene.tweens.add({ targets: crack, scale: 2, alpha: 0, duration: 300, onComplete: () => crack.destroy() });
            }
        }
        super.takeDamage(damage, kbX, kbY, stunDuration, bypassBlock);
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.frostArmorActive) {
            this.frostArmorTimer -= dt;
            if (this.frostArmorTimer <= 0) {
                this.frostArmorActive = false;
                this.defense = this.charData.stats.defense || 1.0;
            }
        }
    }

    applySureHitTick(opponent) {
        // No domain — no sure-hit
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

        const skinColor = isFlashing ? 0xFFFFFF : 0xFFE4E1;
        const robeColor = isFlashing ? 0xFFFFFF : (this.frostArmorActive ? 0x88CCFF : 0xFFFFFF);
        const hairColor = isFlashing ? 0xFFFFFF : 0xDDDDFF;
        const armExtend = this.attackSwing * 30;

        // Legs
        const legY = masterY + 10;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle; rightLeg -= this.walkCycle; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 10; rightLeg = 10; }
        g.fillStyle(robeColor, 1);
        g.fillTriangle(x - 8, legY, x - 8 - 10, legY + leftLeg, x - 8 + 10, legY + leftLeg - 5);
        g.fillTriangle(x + 8, legY, x + 8 - 12 * f, legY + rightLeg, x + 8 + 12 * f, legY + rightLeg - 2);

        // Torso (Robes)
        g.fillStyle(robeColor, 1);
        g.beginPath();
        g.moveTo(x - 14, masterY - 30);
        g.lineTo(x + 14, masterY - 30);
        g.lineTo(x + 12, masterY + 15);
        g.lineTo(x - 12, masterY + 15);
        g.fillPath();

        // Frost armor overlay
        if (this.frostArmorActive) {
            g.lineStyle(2, 0xAADDFF, 0.8);
            g.strokeCircle(x, masterY - 10, 20);
            g.strokeCircle(x, masterY - 10, 28);
        }

        // Arms (NO weapon — just bare hands)
        const armY = masterY - 26;
        g.lineStyle(8, skinColor, 1);
        g.beginPath(); g.moveTo(x - 10 * f, armY); g.lineTo(x - 20 * f, armY + 15); g.strokePath();
        g.beginPath(); g.moveTo(x + 10 * f, armY); g.lineTo(x + (20 + armExtend) * f, armY + 5); g.strokePath();

        // Head
        const hx = x; const hy = masterY - 45;
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 12);

        // Hair (Silver-white, long and elegant)
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(hx - 12, hy - 5);
        g.lineTo(hx - 16, hy + 25);
        g.lineTo(hx - 6, hy + 30);
        g.lineTo(hx, hy - 12);
        g.lineTo(hx + 6, hy + 30);
        g.lineTo(hx + 16, hy + 25);
        g.lineTo(hx + 12, hy - 5);
        g.fillPath();
    }
}
