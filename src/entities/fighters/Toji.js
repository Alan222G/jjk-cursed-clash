// ========================================================
// Toji Fushiguro — The Sorcerer Killer
// Zero CE Fighter — Stances, Counters, and \% Damage
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, ATTACKS } from '../../config.js';

const WEAPONS = [
    { name: 'Playful Cloud', key: 'cloud', color: 0x55FF55 },
    { name: 'Soul Katana', key: 'katana', color: 0xFF44AA },
    { name: 'Inverted Spear', key: 'spear', color: 0x88CCFF },
];

export default class Toji extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.TOJI);
        this.isCasting = false;
        
        // Weapon switching
        this.currentWeaponIndex = 0;
        this.switchCooldown = 0;
        this.weaponSwitchText = null;

        // Weapon states
        this.cloudSharp = false; // Bleed toggle
        this.katanaLifestealTimer = 0; // Lifesteal toggle
        this.spearChainMode = false; // Chain range toggle

        // Buff state
        this.buffTimer = 0;
        
        // Counter Stance tracking
        this.counterStanceWeapon = null; // 'katana' or 'spear'
        this.counterTimer = 0;
    }

    get currentWeapon() {
        return WEAPONS[this.currentWeaponIndex];
    }

    /** Overrides default basic attacks depending on active weapon & state */
    getBasicAttackData(type) {
        const base = { ...ATTACKS[type] }; // clone

        // If in counter stance, you cannot do basic attacks until it finishes
        if (this.counterTimer > 0) return null;

        if (this.currentWeapon.key === 'cloud') {
            // Playful Cloud Overrides
            if (type === 'LIGHT') {
                base.breaksBlock = true;
                base.knockbackX = 350;
                base.damage = 30;
                base.stunDuration = 400;
            } else if (type === 'HEAVY') {
                base.knockbackX = 1200; // Launch across map
                base.knockbackY = -400;
                base.damage = 60;
            }
            if (this.cloudSharp) {
                base.onHit = (attacker, victim, dmg) => {
                    victim.applyBleed(3000); // 3 seconds of bleed
                };
            }
        } 
        else if (this.currentWeapon.key === 'katana') {
            // Katana Overrides
            base.ignoresBlockDamage = true; // Damage passes through shield
            
            // Set percent damage based on attack type
            if (type === 'LIGHT') base.percentDamage = 0.02; // 2%
            if (type === 'MEDIUM') base.percentDamage = 0.04; // 4%
            if (type === 'HEAVY') base.percentDamage = 0.07; // 7%

            if (this.katanaLifestealTimer > 0) {
                base.onHit = (attacker, victim, dmg) => {
                    attacker.hp = Math.min(attacker.charData.stats.maxHp, attacker.hp + Math.floor(dmg * 0.5));
                };
            }
        }
        else if (this.currentWeapon.key === 'spear') {
            // Inverted Spear Overrides
            if (this.spearChainMode) {
                // Extended range
                base.range = 300;
                base.hitboxW = 100;
                base.startup += 50; // Slower because of chain
                base.recovery += 100;
            }
        }

        return base;
    }

    drawFace(g, x, y, facing) {
        g.fillStyle(0x222222, 1);
        g.fillRect(x - 7 * facing, y - 3, 4, 2);
        g.fillRect(x + 3 * facing, y - 3, 4, 2);
        g.lineStyle(1, 0x884444, 0.8);
        g.beginPath();
        g.moveTo(x - 3, y + 3);
        g.lineTo(x + 4, y + 5);
        g.strokePath();
    }

    /** Override drawBody to add the Inventory Curse and active weapon during basic attacks */
    drawBody(dt) {
        super.drawBody(dt); // Draws base torso, limbs, and face

        const g = this.graphics;
        const f = this.facing;
        const x = this.sprite.x;
        const y = this.sprite.y;

        // Draw Storage Curse (Purple Blob) on shoulder/back
        const curseX = x - 12 * f;
        const curseY = y - 70; // Hombro/Espalda Alta elevada
        // Body of curse
        g.fillStyle(0x331144, 1);
        g.fillEllipse(curseX, curseY + 10, 18, 25);
        // Head / eyes of curse
        g.fillEllipse(curseX + 5 * f, curseY, 12, 10);
        g.fillStyle(0x000000, 1);
        g.fillCircle(curseX + 8 * f, curseY - 2, 2);
        g.fillCircle(curseX + 2 * f, curseY - 2, 2);
        // Mouth
        g.lineStyle(2, 0x110011, 1);
        g.beginPath();
        g.moveTo(curseX + 3 * f, curseY + 3);
        g.lineTo(curseX + 7 * f, curseY + 3);
        g.strokePath();

        // Weapon indicator in HAND when idle
        const armX = x + 15 * f;
        const armY = y - 55;
        if (!this.stateMachine.is('attack')) {
            g.fillStyle(this.currentWeapon.color, 0.8);
            g.fillRect(armX - 2, armY - 10, 4, 30);
        } else {
            // Draw active weapon during attack swing
            const swing = this.attackSwing; // 0 to 1
            
            // Re-calculate Hand Position matching Fighter.js extension
            const armExtend = swing * 40;
            const handX = x + (34 + armExtend) * f;
            const handY = y - 55;
            
            if (this.currentWeapon.key === 'spear' && this.spearChainMode) {
                // Chain of a Thousand Miles
                const reach = this.currentAttack?.range || 300;
                const endX = handX + (swing * reach * f);
                const endY = handY;
                
                // Draw linked chain
                g.lineStyle(3, 0x555555, 1);
                // Draw ~16 links
                const links = 16;
                for(let i=0; i<links; i++) {
                    const cx = Phaser.Math.Interpolation.Linear([handX, endX], i/(links-1));
                    const cy = Phaser.Math.Interpolation.Linear([handY, endY], i/(links-1));
                    // Alternate link rotation by drawing horizontal/vertical pulses
                    if (i % 2 === 0) {
                        g.strokeEllipse(cx, cy, 6, 3);
                    } else {
                        g.strokeEllipse(cx, cy, 3, 6);
                    }
                }
                
                // Draw Spear Tip
                g.fillStyle(0x88CCFF, 1);
                g.beginPath();
                g.moveTo(endX, endY - 6);
                g.lineTo(endX + 20 * f, endY);
                g.lineTo(endX, endY + 6);
                g.fillPath();
            } else {
                // Normal weapon swing (Katana, Cloud, or unchained Spear)
                g.lineStyle(6, this.currentWeapon.color, 1);
                g.beginPath();
                g.moveTo(handX, handY);
                // Swing arc calculation
                let angle;
                if (f > 0) {
                    angle = (swing * Math.PI) - Math.PI/2;
                } else {
                    angle = Math.PI + Math.PI/2 - (swing * Math.PI);
                }
                const len = 70;
                g.lineTo(handX + Math.cos(angle)*len, handY + Math.sin(angle)*len);
                g.strokePath();
                
                // Draw blade/tip variations
                if (this.currentWeapon.key === 'katana') {
                    g.lineStyle(2, 0xFFFFFF, 0.5);
                    g.beginPath();
                    g.moveTo(handX, handY);
                    g.lineTo(handX + Math.cos(angle)*len, handY + Math.sin(angle)*len);
                    g.strokePath();
                }
            }
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        if (this.counterTimer > 0) return;

        // "U + Abajo/S" = Swap weapon
        if (this.input.isDown('DOWN')) {
            this.switchWeapon();
            return;
        }

        // "U + Izquierda/Derecha" = Weapon Special
        if (this.input.isDown('LEFT') || this.input.isDown('RIGHT')) {
            this.executeWeaponSpecial();
            return;
        }

        // "U" solo = Physical Buff (Uses CE stamina)
        this.castPhysicalBuff();
    }

    switchWeapon() {
        if (this.switchCooldown > 0) return;
        this.switchCooldown = 400;

        // Reset states from previous weapon
        this.spearChainMode = false;
        
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % WEAPONS.length;
        
        if (this.weaponSwitchText) this.weaponSwitchText.destroy();
        this.weaponSwitchText = this.scene.add.text(
            this.sprite.x, this.sprite.y - 70, 
            `⚔ ${this.currentWeapon.name}`, {
                fontSize: '14px', fontFamily: 'Arial Black',
                color: '#' + this.currentWeapon.color.toString(16).padStart(6, '0'),
                stroke: '#000000', strokeThickness: 3,
            }
        ).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: this.weaponSwitchText,
            y: this.sprite.y - 100, alpha: 0,
            duration: 1000, ease: 'Power2',
            onComplete: () => {
                if (this.weaponSwitchText) {
                    this.weaponSwitchText.destroy();
                    this.weaponSwitchText = null;
                }
            }
        });
    }

    castPhysicalBuff() {
        if (this.buffTimer > 0) return;
        if (!this.ceSystem.spend(50)) return; // Requires some CE/Stamina to buff

        this.buffTimer = 8000; // 8 seconds
        
        // Apply buffs
        this.speed *= 1.4;
        this.power *= 1.3;
        this.defense *= 1.2;
        this.jumpForce *= 1.2;

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x55FF55, 300, 0.3);
        }
    }

    executeWeaponSpecial() {
        switch (this.currentWeapon.key) {
            case 'cloud': 
                this.castCloudRush(); 
                break;
            case 'katana': 
                this.enterCounterStance('katana'); 
                break;
            case 'spear': 
                this.enterCounterStance('spear'); 
                break;
        }
    }

    // ── Weapon 1: Playful Cloud ──
    castCloudRush() {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        // Flurry rush multi-hits
        let hits = 0;
        const rushTimer = this.scene.time.addEvent({
            delay: 150,
            repeat: 4,
            callback: () => {
                hits++;
                this.sprite.body.setVelocityX(400 * this.facing);
                this.spawnPlayfulCloudEffect(0.5); // Smaller effect

                if (this.opponent) {
                    const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                    if (dist < 100) {
                        this.opponent.takeDamage(Math.floor(20 * this.power), 100 * this.facing, -50, 200);
                        this.comboSystem.registerHit('SPECIAL');
                    }
                }

                if (hits >= 5) {
                    this.scene.time.delayedCall(200, () => {
                        this.isCasting = false;
                        this.stateMachine.unlock();
                        this.stateMachine.setState('idle');
                    });
                }
            }
        });
    }

    // ── Weapon 2 & 3: Counter Mechanics ──
    enterCounterStance(weaponKey) {
        this.counterStanceWeapon = weaponKey;
        this.counterTimer = 1500; // Active for 1.5s
        this.stateMachine.lock(1500); 
        this.sprite.body.setVelocityX(0);

        // Visual indicator of stance
        const color = weaponKey === 'katana' ? 0xFF44AA : 0x88CCFF;
        this.stanceAura = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, color, 0.4).setDepth(10);
    }

    triggerKatanaCounter(projectile) {
        if (!this.opponent) return;

        // Teleport behind opponent
        const teleportX = this.opponent.sprite.x - (50 * this.facing);
        this.sprite.setPosition(teleportX, this.opponent.sprite.y);
        this.facing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;

        // Instant Heavy Attack
        this.spawnSoulKatanaEffect();
        this.opponent.takeDamage(Math.floor(this.opponent.hp * 0.1 * this.power), 600 * this.facing, -300, 600);
        this.comboSystem.registerHit('HEAVY');
        
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xFF44AA, 200, 0.4);
            this.scene.screenEffects.shake(0.04, 300);
        }

        // End stance immediately
        this.counterTimer = 0;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');
    }

    triggerSpearCounter(projectile) {
        // Just destroy the projectile cleanly with a visual
        this.spawnSpearEffect();
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x88CCFF, 150, 0.3);
        }

        // End stance immediately
        this.counterTimer = 0;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');
    }

    // ── Button 'I' (Domain Key) ──
    tryActivateDomain() {
        if (this.isCasting) return;

        if (this.currentWeapon.key === 'cloud') {
            // Sharpen Cloud -> Bleed
            this.cloudSharp = true;
            this.showWeaponBuffText("SHARPENED!");
        } 
        else if (this.currentWeapon.key === 'katana') {
            // Lifesteal for 10s
            this.katanaLifestealTimer = 10000;
            this.showWeaponBuffText("SOUL SIPHON!");
        } 
        else if (this.currentWeapon.key === 'spear') {
            if (this.scene.domainActive && this.scene.domainOwner !== this) {
                // BREAK DOMAIN
                this.breakDomain();
            } else {
                // Toggle Chain Mode
                this.spearChainMode = !this.spearChainMode;
                this.showWeaponBuffText(this.spearChainMode ? "CHAIN EQUIPPED" : "CHAIN UNEQUIPPED");
            }
        }
    }

    breakDomain() {
        this.isCasting = true;
        this.stateMachine.lock(1500);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 1000);
            this.scene.screenEffects.flash(0xFFFFFF, 800, 0.6);
        }

        // Visual: multiple slashes shattering the screen
        const g = this.scene.add.graphics().setDepth(100);
        for(let i=0; i<10; i++) {
            const x1 = Math.random() * 1280;
            const y1 = Math.random() * 720;
            const x2 = x1 + (Math.random() - 0.5) * 800;
            const y2 = y1 + (Math.random() - 0.5) * 800;
            g.lineStyle(8, 0x88CCFF, 0.9);
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
            g.lineStyle(4, 0xFFFFFF, 1);
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
        }

        this.scene.time.delayedCall(600, () => {
            g.destroy();
            // End the domain directly and force fatigue on the owner
            if (this.scene.domainOwner) {
                const owner = this.scene.domainOwner;
                owner.ceSystem.ce = 0;
                owner.ceSystem.endDomain();
                this.scene.onDomainEnd(owner);
                
                // Stop domain audio
                try { this.scene.sound.stopAll(); } catch(e) {}
            }
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    showWeaponBuffText(text) {
        const txt = this.scene.add.text(
            this.sprite.x, this.sprite.y - 70, 
            text, {
                fontSize: '16px', fontFamily: 'Arial Black',
                color: '#' + this.currentWeapon.color.toString(16).padStart(6, '0'),
                stroke: '#000000', strokeThickness: 4,
            }
        ).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: txt, y: '-=40', alpha: 0, duration: 1500, onComplete: () => txt.destroy()
        });
    }

    // ── Update ──
    update(time, dt) {
        super.update(time, dt);

        if (this.switchCooldown > 0) this.switchCooldown -= dt;
        
        // Counter Stance tracking & Projectile collision override
        if (this.counterTimer > 0) {
            this.counterTimer -= dt;
            if (this.stanceAura) {
                this.stanceAura.setPosition(this.sprite.x, this.sprite.y);
            }

            // Check projectile collisions manually to intercept them
            if (this.scene.projectiles) {
                for (let i = this.scene.projectiles.length - 1; i >= 0; i--) {
                    const proj = this.scene.projectiles[i];
                    if (proj.owner === this) continue; // Ignore own projectiles

                    // Exclude massive/super projectiles from counter
                    const isSuper = proj.type === 'fire' || proj.damage > 100 || proj.size.w > 100;
                    
                    if (!isSuper) {
                        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, proj.sprite.x, proj.sprite.y);
                        if (dist < 100) {
                            // Intercepted!
                            if (this.counterStanceWeapon === 'katana') {
                                this.triggerKatanaCounter(proj);
                            } else if (this.counterStanceWeapon === 'spear') {
                                this.triggerSpearCounter(proj);
                            }
                            proj.destroy(); // Destroy it
                            this.scene.projectiles.splice(i, 1);
                        }
                    }
                }
            }

            if (this.counterTimer <= 0) {
                if (this.stanceAura) { this.stanceAura.destroy(); this.stanceAura = null; }
                if (this.stateMachine.is('block')) this.stateMachine.unlock();
            }
        } else {
            if (this.stanceAura) { this.stanceAura.destroy(); this.stanceAura = null; }
        }

        // Buff timer tracking
        if (this.buffTimer > 0) {
            this.buffTimer -= dt;
            
            // Draw green flash effect behind
            if (Math.random() < 0.1) {
                const g = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0x55FF55, 0.4).setDepth(9);
                this.scene.tweens.add({ targets: g, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 300, onComplete: () => g.destroy() });
            }

            if (this.buffTimer <= 0) {
                // Revert buffs
                this.speed /= 1.4;
                this.power /= 1.3;
                this.defense /= 1.2;
                this.jumpForce /= 1.2;
            }
        }

        if (this.katanaLifestealTimer > 0) {
            this.katanaLifestealTimer -= dt;
        }
    }

    applySureHitTick(opponent) {
        // None
    }

    // ── VFX ──
    spawnSpearEffect() {
        const x = this.sprite.x + 30 * this.facing;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        
        g.lineStyle(3, 0xCCCCCC, 1);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 90 * this.facing, y); g.strokePath();
        
        g.fillStyle(0x88CCFF, 1);
        g.beginPath();
        const tipX = x + 90 * this.facing;
        g.moveTo(tipX, y - 7); g.lineTo(tipX + 18 * this.facing, y); g.lineTo(tipX, y + 7);
        g.closePath(); g.fillPath();

        this.scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
    }

    spawnPlayfulCloudEffect(scale = 1.0) {
        const x = this.sprite.x + (40 * scale) * this.facing;
        const y = this.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(16);
        
        for (let s = 0; s < 3; s++) {
            const sx = x + (s * 25 - 25) * this.facing * scale;
            g.fillStyle(0x886633, 1);
            g.fillRect(sx - 3, y - 15*scale, 6, 30*scale);
        }

        const flash = this.scene.add.circle(x, y, 30*scale, 0x55FF55, 0.6).setDepth(17);
        this.scene.tweens.add({
            targets: [g, flash], alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 300,
            onComplete: () => { g.destroy(); flash.destroy(); }
        });
    }

    spawnSoulKatanaEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 15;
        const g = this.scene.add.graphics().setDepth(15);

        const startAngle = this.facing > 0 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
        const sweep = Math.PI * 0.8;
        
        for (let i = 0; i < 15; i++) {
            const angle = startAngle + (i / 14) * sweep * this.facing;
            const len = 120 + Math.sin(i * 0.5) * 20;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            g.lineStyle(6, 0xFF44AA, 0.8 - (i / 15) * 0.4);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
        }

        const bladeEnd = x + 100 * this.facing;
        g.lineStyle(4, 0xCCCCDD, 1);
        g.beginPath(); g.moveTo(x + 10 * this.facing, y); g.lineTo(bladeEnd, y - 20); g.strokePath();

        this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    }
}
