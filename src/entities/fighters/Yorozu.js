// ========================================================
// Yorozu — Construction Cursed Technique
// Bug Armor, Liquid Metal, True Sphere
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Yorozu extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.YOROZU);
        this.isCasting = false;
        
        // Bug Armor state
        this.bugArmorActive = false;
        this.bugArmorTimer = 0;

        // Liquid Metal Sword buff state
        this.swordActive = false;
        this.swordTimer = 0;

        // Domain Weapon state (Toji random weapon)
        this.domainWeapon = null; // 'cloud', 'katana', or 'spear'
        this.domainWeaponTimer = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castTrueSphere();
        } else if (tier >= 3 && this.input.isDown('UP')) {
            this.castBugArmor();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castLiquidMetalWhip();
        } else if (tier >= 1) {
            this.castLiquidMetalSword();
        }
    }

    // H1: Equip Liquid Metal Sword — buffs normal attacks for 10 seconds (or Toji weapon in Domain)
    castLiquidMetalSword() {
        if (this.swordActive || this.domainWeapon) return; // Already equipped something
        
        if (!this.domainActive && !this.ceSystem.spend(30)) return;
        this.isCasting = true; this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}

        if (this.domainActive) {
            // Pick a random Toji weapon for 20 seconds
            const weapons = ['cloud', 'katana', 'spear', 'chain'];
            this.domainWeapon = weapons[Math.floor(Math.random() * weapons.length)];
            this.domainWeaponTimer = 20000;
            
            const weaponNames = { cloud: 'PLAYFUL CLOUD!', katana: 'SOUL KATANA!', spear: 'INVERTED SPEAR!', chain: 'CHAIN OF 1000 MILES!' };
            const weaponColors = { cloud: 0x55FF55, katana: 0xFF44AA, spear: 0x88CCFF, chain: 0x888888 };
            const colorHex = '#' + weaponColors[this.domainWeapon].toString(16).padStart(6, '0');

            const flash = this.scene.add.circle(this.sprite.x, this.sprite.y, 50, weaponColors[this.domainWeapon], 0.6).setDepth(15);
            this.scene.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 600, onComplete: () => flash.destroy() });

            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, weaponNames[this.domainWeapon], {
                fontFamily: 'Arial Black', fontSize: '20px', color: colorHex, stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(40);
            this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        } else {
            // Normal Liquid Metal Sword
            this.swordActive = true;
            this.swordTimer = 10000; // 10 seconds

            // Flash to signal equip
            const flash = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0x777788, 0.6).setDepth(15);
            this.scene.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 500, onComplete: () => flash.destroy() });

            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'LIQUID METAL SWORD!', {
                fontFamily: 'Arial Black', fontSize: '18px', color: '#AABBCC', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(40);
            this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
        }

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // Override normal attacks when sword is equipped — more range, adds bleed
        if (this.domainWeapon) {
            if (this.domainWeapon === 'cloud') {
                base.damage = Math.floor(base.damage * 1.5);
                base.knockbackX = (base.knockbackX || 200) * 1.5;
                base.onHit = (attacker, victim, dmg) => {
                    // Apply bleed: 5 ticks of 8 damage over 2.5 seconds
                    if (victim && victim.sprite && !victim.isDead) {
                        let ticks = 0;
                        const bleedInterval = this.scene.time.addEvent({
                            delay: 500, repeat: 4,
                            callback: () => {
                                ticks++;
                                if (victim && !victim.isDead && victim.takeDamage) {
                                    victim.takeDamage(8, 0, 0, 0);
                                    const drip = this.scene.add.circle(victim.sprite.x, victim.sprite.y + 10, 3, 0xFF0000, 0.8).setDepth(12);
                                    this.scene.tweens.add({ targets: drip, y: drip.y + 30, alpha: 0, duration: 500, onComplete: () => drip.destroy() });
                                }
                                if (ticks >= 5) bleedInterval.destroy();
                            }
                        });
                    }
                };
            } else if (this.domainWeapon === 'katana') {
                base.ignoresBlockDamage = true;
                base.percentDamage = type === 'HEAVY' ? 0.05 : 0.02; // 5% / 2% hp damage
            } else if (this.domainWeapon === 'spear') {
                base.range += 40;
                base.damage = Math.floor(base.damage * 1.3);
            } else if (this.domainWeapon === 'chain') {
                base.range += 150; // Massive range
                base.damage = Math.floor(base.damage * 0.9); // Slightly less damage
            }
        } else if (this.swordActive) {
            base.range += 25; // Extended reach
            base.damage = Math.floor(base.damage * 1.15); // +15% damage
        }

    // H2: Liquid Metal Whip
    castLiquidMetalWhip() {
        if (!this.domainActive && !this.ceSystem.spend(50)) return;
        this.isCasting = true; this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_slash', { volume: 1.0 }); } catch(e) {}

        const whip = this.scene.add.rectangle(this.sprite.x + 100 * this.facing, this.sprite.y - 20, 200, 10, 0x777788).setDepth(15);
        whip.setOrigin(0, 0.5);
        if (this.facing < 0) {
            whip.setOrigin(1, 0.5);
            whip.setPosition(this.sprite.x - 100, this.sprite.y - 20);
        }

        this.scene.tweens.add({
            targets: whip,
            scaleY: 2,
            alpha: 0,
            duration: 400,
            onComplete: () => whip.destroy()
        });

        this.scene.time.delayedCall(200, () => {
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                // Long range hit
                if (dist < 220) {
                    // Pulls target towards Yorozu
                    target.takeDamage(60 * this.power, -500 * this.facing, -100, 600);
                }
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H3: Bug Armor (Awakening)
    castBugArmor() {
        if (this.bugArmorActive) return;
        if (!this.domainActive && !this.ceSystem.spend(100)) return;

        this.isCasting = true; this.stateMachine.lock(1000);
        this.sprite.body.setVelocityX(0);

        this.bugArmorActive = true;
        this.bugArmorTimer = this.domainActive ? 20000 : 15000;

        this.power = (this.charData.stats.power || 1.1) * 1.4;
        this.speed = (this.charData.stats.speed || 340) * 1.5;
        this.defense = (this.charData.stats.defense || 1.0) * 1.5; // Greatly increased defense

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x333344, 300, 0.6);
            this.scene.screenEffects.shake(0.04, 500);
        }
        try { this.scene.sound.play('sfx_charge', { volume: 1.0 }); } catch(e) {}

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'BUG ARMOR', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#777788', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: '-=40', alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        this.scene.time.delayedCall(1000, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H4: True Sphere (Maximum)
    castTrueSphere() {
        if (!this.domainActive && !this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        this.isCasting = true; this.stateMachine.lock(2000);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 1000);
            this.scene.screenEffects.domainFlash(0x111111);
        }

        try { this.scene.sound.play('heavy_smash', { volume: 1.2 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const targetX = target ? target.sprite.x : this.sprite.x + 200 * this.facing;
        
        const sphere = this.scene.add.circle(this.sprite.x, this.sprite.y - 150, 5, 0x111111, 1).setDepth(25);
        sphere.setStrokeStyle(4, 0xFFFFFF);

        this.scene.tweens.add({
            targets: sphere,
            scale: 20,
            y: PHYSICS.GROUND_Y - 50,
            x: targetX,
            duration: 3500, // Make it very slow
            ease: 'Linear',
            onComplete: () => {
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.flash(0xFFFFFF, 300, 1.0);
                    this.scene.screenEffects.shake(0.1, 800);
                }
                
                if (target && !target.isDead) {
                    const dist = Math.abs(target.sprite.x - targetX);
                    if (dist < 150) {
                        // Massive damage (ignores block and defense effectively)
                        target.takeDamage(250 * this.power, 800 * this.facing, -600, 1500, true);
                    }
                }
                
                sphere.destroy();
            }
        });

        this.scene.time.delayedCall(2000, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // Yorozu's Domain
    tryActivateDomain() {
        if (!super.tryActivateDomain()) return;

        // Yorozu domain gives guaranteed True Sphere hit periodically
        // AND utility: massive power boost inside domain
        this.domainTimer = 30000; // Increased duration
        this.trueSphereTick = 3000; // Fires every 3 seconds
        this.power = (this.charData.stats.power || 1.1) * 1.5;
        this.speed = (this.charData.stats.speed || 340) * 1.3;
    }

    takeDamage(damage, kbX, kbY, stunDuration, bypassBlock = false) {
        if (this.bugArmorActive && this.domainActive && !bypassBlock) {
            // Immovable in domain!
            super.takeDamage(damage, 0, 0, 0, bypassBlock);
            return;
        }
        super.takeDamage(damage, kbX, kbY, stunDuration, bypassBlock);
    }

    update(time, dt) {
        super.update(time, dt);

        // Domain Weapon buff countdown
        if (this.domainWeapon) {
            this.domainWeaponTimer -= dt;
            if (this.domainWeaponTimer <= 0) {
                this.domainWeapon = null;
                const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 60, 'WEAPON EXPIRED', {
                    fontFamily: 'Arial Black', fontSize: '14px', color: '#FF4444', stroke: '#000000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(40);
                this.scene.tweens.add({ targets: txt, y: '-=30', alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            }
        }

        // Sword buff countdown
        if (this.swordActive) {
            this.swordTimer -= dt;
            if (this.swordTimer <= 0) {
                this.swordActive = false;
                const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 60, 'SWORD EXPIRED', {
                    fontFamily: 'Arial Black', fontSize: '14px', color: '#FF4444', stroke: '#000000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(40);
                this.scene.tweens.add({ targets: txt, y: '-=30', alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            }
        }

        if (this.bugArmorActive) {
            this.bugArmorTimer -= dt;
            if (this.bugArmorTimer <= 0) {
                this.bugArmorActive = false;
                this.power = this.charData.stats.power || 1.1;
                this.speed = this.charData.stats.speed || 340;
                this.defense = this.charData.stats.defense || 1.0;
            }
        }

        if (this.domainActive) {
            this.domainTimer -= dt;
            this.trueSphereTick -= dt;

            if (this.trueSphereTick <= 0) {
                this.trueSphereTick = 3000;
                const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                if (target && !target.isDead) {
                    target.takeDamage(50 * this.power, 0, -200, 400, true);
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.flash(0x111111, 100, 0.4);
                        this.scene.screenEffects.shake(0.02, 200);
                    }
                }
            }

            if (this.domainTimer <= 0) {
                this.domainActive = false;
                this.power = this.charData.stats.power || 1.1; // Revert power
                if (!this.bugArmorActive) this.speed = this.charData.stats.speed || 340; // Revert speed
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
        const armorColor = isFlashing ? 0xFFFFFF : 0x333344;
        const robeColor = isFlashing ? 0xFFFFFF : 0x992222;
        const hairColor = isFlashing ? 0xFFFFFF : 0x111111;
        const armExtend = this.attackSwing * 30;

        // Legs
        const legY = masterY + 10;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle; rightLeg -= this.walkCycle; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 10; rightLeg = 10; }
        
        g.fillStyle(this.bugArmorActive ? armorColor : robeColor, 1);
        g.fillTriangle(x - 8, legY, x - 8 - 10, legY + leftLeg, x - 8 + 10, legY + leftLeg - 5);
        g.fillTriangle(x + 8, legY, x + 8 - 12 * f, legY + rightLeg, x + 8 + 12 * f, legY + rightLeg - 2);

        // Torso
        g.fillStyle(this.bugArmorActive ? armorColor : robeColor, 1);
        g.beginPath();
        g.moveTo(x - 12, masterY - 30);
        g.lineTo(x + 12, masterY - 30);
        g.lineTo(x + 10, masterY + 15);
        g.lineTo(x - 10, masterY + 15);
        g.fillPath();

            // Bug Armor details
            if (this.bugArmorActive) {
                if (this.domainActive) {
                    // Monstrous version
                    g.lineStyle(3, 0x555566, 1);
                    g.beginPath();
                    g.moveTo(x - 8, masterY - 20); g.lineTo(x + 8, masterY - 20);
                    g.moveTo(x - 12, masterY - 10); g.lineTo(x + 12, masterY - 10);
                    g.moveTo(x - 8, masterY); g.lineTo(x + 8, masterY);
                    // Spikes
                    g.moveTo(x - 10, masterY - 20); g.lineTo(x - 18, masterY - 35);
                    g.moveTo(x + 10, masterY - 20); g.lineTo(x + 18, masterY - 35);
                    g.strokePath();

                    g.fillStyle(0x333344, 0.8);
                    g.fillEllipse(x - 30 * f, masterY - 25, 25, 60);
                    g.fillEllipse(x - 40 * f, masterY - 5, 20, 50);
                } else {
                    g.lineStyle(2, 0x777788, 1);
                    g.beginPath();
                    g.moveTo(x - 8, masterY - 20); g.lineTo(x + 8, masterY - 20);
                    g.moveTo(x - 10, masterY - 10); g.lineTo(x + 10, masterY - 10);
                    g.moveTo(x - 8, masterY); g.lineTo(x + 8, masterY);
                    g.strokePath();
                    
                    // Wings
                    g.fillStyle(0x777788, 0.6);
                    g.fillEllipse(x - 20 * f, masterY - 20, 15, 40);
                    g.fillEllipse(x - 25 * f, masterY, 12, 35);
                }
            }

        // Arms
        const armY = masterY - 26;
        g.lineStyle(8, this.bugArmorActive ? armorColor : skinColor, 1);
        g.beginPath();
        g.moveTo(x - 10 * f, armY);
        g.lineTo(x - 20 * f, armY + 15);
        g.strokePath();

        g.beginPath();
        g.moveTo(x + 10 * f, armY);
        g.lineTo(x + (20 + armExtend) * f, armY + 5);
        g.strokePath();

        // Weapon rendering (Hand weapon)
        if (this.swordActive || this.domainWeapon) {
            const handX = x + (20 + armExtend) * f;
            const handY = armY + 5;
            
            let wColor = 0x777788; // Liquid metal sword default
            if (this.domainWeapon === 'cloud') wColor = 0x55FF55;
            else if (this.domainWeapon === 'katana') wColor = 0xFF44AA;
            else if (this.domainWeapon === 'spear') wColor = 0x88CCFF;
            else if (this.domainWeapon === 'chain') wColor = 0x888888;

            g.lineStyle(6, wColor, 1);
            g.beginPath();
            g.moveTo(handX, handY);

            // Draw swing arc if attacking
            if (this.stateMachine.is('attack')) {
                const swing = this.attackSwing;
                let angle = f > 0 ? (swing * Math.PI) - Math.PI/2 : Math.PI + Math.PI/2 - (swing * Math.PI);
                let len = this.domainWeapon === 'chain' ? 180 : 70;
                
                if (this.domainWeapon === 'chain') {
                    // Draw linked chain
                    g.strokePath(); // Finish hand path
                    g.lineStyle(3, 0x555555, 1);
                    const endX = handX + Math.cos(angle)*len;
                    const endY = handY + Math.sin(angle)*len;
                    const links = 10;
                    for(let i=0; i<links; i++) {
                        const cx = Phaser.Math.Interpolation.Linear([handX, endX], i/(links-1));
                        const cy = Phaser.Math.Interpolation.Linear([handY, endY], i/(links-1));
                        if (i % 2 === 0) g.strokeEllipse(cx, cy, 6, 3);
                        else g.strokeEllipse(cx, cy, 3, 6);
                    }
                    g.beginPath();
                    g.moveTo(endX, endY);
                } else {
                    g.lineTo(handX + Math.cos(angle)*len, handY + Math.sin(angle)*len);
                }
            } else {
                // Idle weapon stance
                if (this.domainWeapon === 'chain') {
                    g.lineTo(handX + 15 * f, handY + 30);
                } else {
                    g.lineTo(handX + 30 * f, handY - 40);
                }
            }
            g.strokePath();

            // Katana core highlight
            if (this.domainWeapon === 'katana' || this.swordActive) {
                g.lineStyle(2, 0xFFFFFF, 0.5);
                g.beginPath();
                g.moveTo(handX, handY);
                if (this.stateMachine.is('attack')) {
                    const swing = this.attackSwing;
                    let angle = f > 0 ? (swing * Math.PI) - Math.PI/2 : Math.PI + Math.PI/2 - (swing * Math.PI);
                    g.lineTo(handX + Math.cos(angle)*70, handY + Math.sin(angle)*70);
                } else {
                    g.lineTo(handX + 30 * f, handY - 40);
                }
                g.strokePath();
            }
        }

        // Head
        const hx = x; const hy = masterY - 45;
        g.fillStyle(this.bugArmorActive ? armorColor : skinColor, 1);
        g.fillCircle(hx, hy, 12);
        
        // Hair (Long dark hair)
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
