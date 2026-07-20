// ========================================================
// Ryu Ishigori — The Reincarnated Sorcerer
// Granite Blast focus & Pompadour Design
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS } from '../../config.js';

export default class Ishigori extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.ISHIGORI);
        
        this.isCasting = false;
        this.chargeLevel = 0;
        this.chargeVfx = null;
        this.chargeParticles = null;
        this.graniteFortressTimer = 0;
    }

    setupStates() {
        super.setupStates();
        
        const sm = this.stateMachine;
        
        sm.addState('charge_granite', {
            onEnter: function () {
                this.chargeLevel = 0;
                this.sprite.body.setVelocityX(0);
                this.isCasting = true;
                
                // Start VFX on pompadour tip
                const px = this.sprite.x + 20 * this.facing;
                const py = this.sprite.y - 65;
                this.chargeVfx = this.scene.add.circle(px, py, 5, 0x44CCFF, 0.8).setDepth(15);
                
                try {
                    this.chargeSfx = this.scene.sound.add('sfx_charge', { volume: 0.5 });
                    this.chargeSfx.play();
                } catch(e) {}
            },
            onUpdate: function (dt) {
                // Update VFX position to follow character
                const px = this.sprite.x + (20 + (this.attackSwing * 10)) * this.facing;
                const py = this.sprite.y - 65 + this.idleBob;
                if (this.chargeVfx) {
                    this.chargeVfx.setPosition(px, py);
                }

                if (this.input.isDown('SPECIAL')) {
                    this.chargeLevel += dt;
                    if (this.chargeLevel > 2500) {
                        this.chargeLevel = 2500; // Max charge
                    }
                    if (this.chargeVfx) {
                        const radius = 5 + (this.chargeLevel / 2500) * 20;
                        this.chargeVfx.setRadius(radius);
                        // Random fluctuations in alpha/color
                        const t = this.scene.time.now;
                        this.chargeVfx.setFillStyle(t % 200 > 100 ? 0x44CCFF : 0xFFFFFF, 0.8 + Math.random() * 0.2);
                    }
                } else {
                    // Released
                    this.fireGraniteBlast(this.chargeLevel);
                }
            },
            onExit: function () {
                this.isCasting = false;
                if (this.chargeVfx) {
                    this.chargeVfx.destroy();
                    this.chargeVfx = null;
                }
                if (this.chargeSfx) {
                    this.chargeSfx.stop();
                    this.chargeSfx = null;
                }
            }
        });
    }

    // ── Combo Finisher Override ──
    handleSpecialAttackInput(action) {
        if (action === 'SPECIAL') {
            // Check if we are at Combo Hit 3 and trigger quick finisher
            if (this.stateMachine.isAny('idle', 'walk', 'jump', 'fall') && this.comboStep === 3) {
                this.fireComboGraniteBlast();
                return true; // We handled it
            }
        }
        return false;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            if (this.ceSystem.spend(CE_COSTS.MAXIMUM)) {
                this.fireMaximumOutput();
            }
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_2)) {
                this.fireDischarge();
            }
        } else if (tier >= 2 && this.input.isDown('UP')) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_2)) {
                this.castGraniteUppercut();
            }
        } else if (tier >= 1) {
            // Spend CE upfront
            if (this.ceSystem.spend(CE_COSTS.SKILL_1)) {
                this.stateMachine.setState('charge_granite');
            }
        }
    }

    fireDischarge() {
        this.isCasting = true;
        this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        const skill = this.charData.skills.skill2;

        try {
            this.scene.sound.play('sfx_beam', { volume: 0.8 });
        } catch(e) {}

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x44CCFF, 100, 0.4);
            this.scene.screenEffects.shake(0.015, 300);
        }

        const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 40, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 800,
            knockbackY: -200,
            stunDuration: 600,
            speed: 1200, // Reduced speed from 4000 to 1200
            direction: this.facing,
            color: 0x44CCFF,
            size: { w: 100, h: 30 }, // Flat beam
            lifetime: 1000,
            type: 'beam',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // GRANITE UPPERCUT (UP + U)
    // ════════════════════════════════════════════
    castGraniteUppercut() {
        this.isCasting = true;
        this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(400 * this.facing); // small dash

        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.6 }); } catch(e){}

        this.scene.time.delayedCall(150, () => {
            this.sprite.body.setVelocityX(0);
            this.sprite.body.setVelocityY(-400); // uppercut jump

            if (this.scene.screenEffects) this.scene.screenEffects.flash(0x44CCFF, 150, 0.4);

            // Explosive blast visual
            const blast = this.scene.add.circle(this.sprite.x + 30 * this.facing, this.sprite.y - 60, 40, 0x44CCFF, 0.9).setDepth(20);
            this.scene.tweens.add({ targets: blast, scale: 1.5, alpha: 0, duration: 300, onComplete: () => blast.destroy() });

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 100) {
                    const dmg = Math.floor(45 * this.power);
                    this.opponent.takeDamage(dmg, 100 * this.facing, -800, 600);
                    this.comboSystem.registerHit('SPECIAL');
                }
            }
        });

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('fall');
        });
    }

    fireMaximumOutput() {
        this.isCasting = true;
        this.stateMachine.lock(1500);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0x44CCFF);
            this.scene.screenEffects.slowMotion(0.2, 1000);
        }

        const skill = this.charData.skills.maximum;

        // Big orb charging above him
        const orbX = this.sprite.x;
        const orbY = this.sprite.y - 120;
        const orb = this.scene.add.circle(orbX, orbY, 10, 0xFFFFFF, 0.9).setDepth(20);

        this.scene.tweens.add({
            targets: orb, scaleX: 10, scaleY: 10, alpha: 0.8, duration: 1000,
            onComplete: () => {
                orb.destroy();
                try { this.scene.sound.play('sfx_purple', { volume: 1.0 }); } catch(e) {}
                
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.shake(0.05, 800);
                }

                const proj = new Projectile(this.scene, this.sprite.x + 100 * this.facing, this.sprite.y - 50, {
                    owner: this,
                    damage: Math.floor(skill.damage * this.power),
                    knockbackX: 1500,
                    knockbackY: -500,
                    stunDuration: 1000,
                    speed: 1400, // Reduced speed from 6000 to 1400
                    direction: this.facing,
                    color: 0x44CCFF,
                    size: { w: 400, h: 100 }, // Huge beam, but not screen-covering
                    lifetime: 2000,
                    type: 'beam',
                });

                if (this.scene.projectiles) {
                    this.scene.projectiles.push(proj);
                }

                this.scene.time.delayedCall(500, () => {
                    this.isCasting = false;
                    this.stateMachine.unlock();
                    this.stateMachine.setState('idle');
                });
            }
        });
    }

    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.graniteFortressTimer > 0) return; // already active

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.graniteFortressTimer = 10000; // 10 seconds of super armor and damage boost
        
        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        try {
            this.scene.sound.play('heavy_smash', { volume: 0.8 });
            this.scene.sound.play('sfx_charge', { volume: 0.6 });
        } catch (e) {}

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xFFCC00, 150, 0.4);
            this.scene.screenEffects.shake(0.02, 500);
        }
        
        // Spawn floating rocks
        this.fortressRocks = [];
        for (let i = 0; i < 5; i++) {
            const rock = this.scene.add.graphics().setDepth(25);
            this.fortressRocks.push({ g: rock, angle: (Math.PI * 2 / 5) * i });
        }
    }

    takeDamage(damage, knockbackX, knockbackY, stunDuration) {
        if (this.graniteFortressTimer > 0) {
            // Super Armor: takes 70% damage (absorbs 30%), no knockback, no stun
            super.takeDamage(Math.floor(damage * 0.7), 0, 0, 0);
            
            // Visual feedback for tanking
            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.005, 100);
            }
            try { this.scene.sound.play('heavy_smash', { volume: 0.3 }); } catch(e){}
            return;
        }
        
        super.takeDamage(damage, knockbackX, knockbackY, stunDuration);
    }

    update(time, dt) {
        super.update(time, dt);
        
        if (this.graniteFortressTimer > 0) {
            this.graniteFortressTimer -= dt;
            this.power = 1.5; // +50% power during buff
            
            if (this.fortressRocks) {
                this.fortressRocks.forEach(rockData => {
                    rockData.angle += dt * 0.003;
                    const r = 50 + Math.sin(time * 0.005) * 10;
                    const rx = this.sprite.x + Math.cos(rockData.angle) * r;
                    const ry = this.sprite.y - 40 + Math.sin(rockData.angle) * (r * 0.3);
                    
                    rockData.g.clear();
                    rockData.g.fillStyle(0x555555, 1);
                    rockData.g.fillCircle(rx, ry, 6);
                    rockData.g.lineStyle(1, 0x44CCFF, 0.8);
                    rockData.g.strokeCircle(rx, ry, 6);
                });
            }
            
            if (this.graniteFortressTimer <= 0) {
                this.power = this.charData.stats.power; // reset power
                if (this.fortressRocks) {
                    this.fortressRocks.forEach(r => r.g.destroy());
                    this.fortressRocks = null;
                }
            }
        }
    }

    fireGraniteBlast(chargeMs) {
        // Change state to attack (recovery phase)
        this.stateMachine.setState('attack');
        this.currentAttack = { ...this.getBasicAttackData('HEAVY') };
        this.attackPhase = 'recovery';
        this.attackTimer = 0;
        this.currentAttack.recovery = 500; // Slight recovery

        const skill = this.charData.skills.skill1;
        
        // Calculate power based on charge
        // 0 to 2500 ms -> 1.0 to 3.0 multiplier
        const chargeT = chargeMs / 2500;
        const multiplier = 1.0 + (chargeT * 2.0);
        
        const finalDamage = Math.floor(skill.damage * this.power * multiplier);
        const finalSpeed = 1000 + (chargeT * 800); // Reduced speed from 3000-6000 to 1000-1800
        const finalW = 100;
        const finalH = 30 + (chargeT * 20);
        const kbX = 400 + (chargeT * 600);

        const px = this.sprite.x + 30 * this.facing;
        const py = this.sprite.y - 65;

        try {
            const snd = this.scene.sound.add('sfx_beam', { volume: 0.8 });
            snd.play();
        } catch(e) {}

        const proj = new Projectile(this.scene, px, py, {
            owner: this,
            damage: finalDamage,
            knockbackX: kbX,
            knockbackY: -200,
            stunDuration: 500,
            speed: finalSpeed,
            direction: this.facing,
            color: 0x44CCFF,
            size: { w: finalW, h: finalH },
            lifetime: 2000,
            type: 'beam',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }
        
        if (this.scene.screenEffects && chargeT > 0.5) {
            this.scene.screenEffects.shake(0.01 + chargeT * 0.02, 300);
        }
    }

    fireComboGraniteBlast() {
        // Quick version replacing combo hit 4
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1 / 2)) return; // Half cost for combo version

        this.stateMachine.setState('attack');
        this.currentAttack = { ...this.getBasicAttackData('HEAVY') };
        this.attackPhase = 'active'; // Very quick startup
        this.attackTimer = 0;
        this.currentAttack.recovery = 400; 

        // Set cooldown after doing full combo variation
        this.comboStep = 0;

        const skill = this.charData.skills.skill1;
        
        const finalDamage = Math.floor(skill.damage * this.power * 0.8); // 80% of uncharged
        const finalSpeed = 800;
        const finalW = 35;
        const finalH = 35;

        const px = this.sprite.x + 30 * this.facing;
        const py = this.sprite.y - 65; // Fires from pompadour

        try {
            const snd = this.scene.sound.add('sfx_beam', { volume: 0.5 });
            snd.play();
        } catch(e) {}

        const proj = new Projectile(this.scene, px, py, {
            owner: this,
            damage: finalDamage,
            knockbackX: 300,
            knockbackY: -50,
            stunDuration: 300,
            speed: 1200, // Reduced speed from 4000 to 1200
            direction: this.facing,
            color: 0x44CCFF,
            size: { w: 80, h: 30 },
            lifetime: 1500,
            type: 'beam',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }
    }

    drawBody(dt) {
        const g = this.graphics;
        g.clear();

        const x = this.sprite.x;
        const y = this.sprite.y;
        const f = this.facing;
        const colors = this.colors;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;

        if (this.isDead) {
            g.fillStyle(colors.primary, 0.5);
            g.fillEllipse(x, y + 20, 80, 25);
            return;
        }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;

        const jacketColor = isFlashing ? 0xFFFFFF : 0x2b1f1d;
        const pantColor = isFlashing ? 0xFFFFFF : 0x1a1a24;
        const skinColor = isFlashing ? 0xFFFFFF : 0xebd0c5;
        const pompadourColor = isFlashing ? 0xFFFFFF : 0x0d0d10;
        const beltColor = isFlashing ? 0xFFFFFF : 0x111115;
        const goldColor = isFlashing ? 0xFFFFFF : 0xf59e0b;
        const greenJoint = isFlashing ? 0xFFFFFF : 0x22c55e;
        const fluffColor = isFlashing ? 0xFFFFFF : 0xe2e8f0;

        const armExtend = this.attackSwing * 40;
        const hx = x;
        const hy = masterY - 49;

        // ── 1. LEGS (Dark pants with green knee joints) ──
        const legY = masterY + 5;
        let leftLegLen = 28, rightLegLen = 28;
        let leftShinLen = 25, rightShinLen = 25;
        if (this.stateMachine.is('walk')) {
            leftLegLen += this.walkCycle * 1.2;
            rightLegLen -= this.walkCycle * 1.2;
        } else if (this.stateMachine.isAny('jump', 'fall')) {
            leftLegLen = 18; rightLegLen = 18;
        }

        // Left leg: thigh → knee → shin
        g.fillStyle(pantColor, 1);
        g.fillRect(x - 7 - 3, legY, 10, leftLegLen);
        g.fillStyle(greenJoint, 1);
        g.fillCircle(x - 7, legY + leftLegLen, 4);
        g.fillStyle(pantColor, 1);
        g.fillRect(x - 7 - 4, legY + leftLegLen + 2, 8.5, leftShinLen);

        // Right leg: thigh → knee → shin
        g.fillStyle(pantColor, 1);
        g.fillRect(x + 7 - 3, legY, 10, rightLegLen);
        g.fillStyle(greenJoint, 1);
        g.fillCircle(x + 7, legY + rightLegLen, 4);
        g.fillStyle(pantColor, 1);
        g.fillRect(x + 7 - 4, legY + rightLegLen + 2, 8.5, rightShinLen);

        // ── 2. FLUFFY COLLAR (behind neck, drawn BEFORE torso) ──
        g.fillStyle(fluffColor, 1);
        g.fillCircle(x - 9, masterY - 27, 6);
        g.fillCircle(x + 9, masterY - 27, 6);
        g.fillCircle(x - 13, masterY - 18, 5);
        g.fillCircle(x + 13, masterY - 18, 5);

        // ── 3. TORSO (Exposed chest + jacket side panels) ──
        // Exposed chest/skin center
        g.fillStyle(skinColor, 1);
        g.fillRect(x - 12.5, masterY - 29, 25, 38);
        // Jacket left panel
        g.fillStyle(jacketColor, 1);
        g.fillRect(x - 16, masterY - 29, 7, 38);
        // Jacket right panel
        g.fillStyle(jacketColor, 1);
        g.fillRect(x + 9, masterY - 29, 7, 38);
        // Belt
        g.fillStyle(beltColor, 1);
        g.fillRect(x - 13, masterY + 7, 26, 6);

        // Musculature lines on exposed chest
        g.lineStyle(1.5, 0x9e7365, 0.5);
        g.lineBetween(x - 6, masterY - 22, x + 6, masterY - 22);
        g.lineBetween(x, masterY - 16, x, masterY + 2);

        // ── 4. NECK CONNECTOR ──
        g.fillStyle(skinColor, 1);
        g.fillRect(x - 5, masterY - 39, 10, 12);

        // ── 5. BACK ARM (jacket sleeve + gold elbow + skin forearm + bracelet + hand) ──
        const armY = masterY - 25;
        // Upper arm (jacket sleeve)
        g.lineStyle(9, jacketColor, 0.85);
        g.beginPath();
        g.moveTo(x - 14 * f, armY);
        g.lineTo(x - 20 * f, armY + 16);
        g.strokePath();
        // Gold elbow joint
        g.fillStyle(goldColor, 1);
        g.fillCircle(x - 20 * f, armY + 16, 4);
        // Skin forearm
        g.lineStyle(7, skinColor, 0.85);
        g.beginPath();
        g.moveTo(x - 20 * f, armY + 16);
        g.lineTo(x - 22 * f, armY + 32);
        g.strokePath();
        // Gold bracelet
        g.fillStyle(goldColor, 0.9);
        g.fillRect(x - 22 * f - 4, armY + 22, 8.5, 6);
        // Hand
        g.fillStyle(skinColor, 1);
        g.fillCircle(x - 22 * f, armY + 35, 4);

        // ── 6. HEAD & POMPADOUR ──
        // Head base
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 13);

        // Hair base cranium
        g.fillStyle(pompadourColor, 1);
        g.fillCircle(hx, hy - 9, 14);

        // === THE HORIZONTAL CANNON POMPADOUR ===
        // Rectangular cannon extending horizontally in facing direction
        g.fillStyle(pompadourColor, 1);
        g.fillRect(hx + 7 * f, hy - 20, 28 * Math.abs(f), 12);
        // Rounded tip at end of cannon
        g.fillCircle(hx + 28 * f, hy - 14, 6);
        // Golden energy dot at very tip
        g.fillStyle(goldColor, 1);
        g.fillCircle(hx + 29 * f, hy - 14, 2.5);

        // Eyes
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(hx + 4 * f - 1, hy - 1, 2);
        g.fillCircle(hx + 4 * f + 3, hy - 1, 2);

        // ── CHARGING VFX ON POMPADOUR TIP ──
        if (this.stateMachine.is('charge_granite') && this.chargeLevel > 0) {
            const tipX = hx + 29 * f;
            const tipY = hy - 14;
            const chargeT = this.chargeLevel / 2500;
            const radius = 4 + chargeT * 16;
            const pulse = Math.sin(this.scene.time.now * 0.015) * 3;

            // Outer glow
            g.fillStyle(0xFFFFFF, 0.2 + chargeT * 0.3);
            g.fillCircle(tipX, tipY, radius + 10 + pulse);

            // Core orb
            g.fillStyle(0x44CCFF, 0.8 + chargeT * 0.2);
            g.fillCircle(tipX, tipY, radius);

            // Inner white-hot core at high charge
            if (chargeT > 0.5) {
                g.fillStyle(0xFFFFFF, 0.6 + chargeT * 0.3);
                g.fillCircle(tipX, tipY, radius * 0.4);
            }

            // Sparks / energy lines radiating
            g.lineStyle(2, 0xFFFFFF, 0.5 + chargeT * 0.3);
            for (let s = 0; s < 4; s++) {
                const angle = (this.scene.time.now * 0.01 + s * Math.PI / 2);
                const sparkLen = 8 + chargeT * 18;
                g.beginPath();
                g.moveTo(tipX, tipY);
                g.lineTo(
                    tipX + Math.cos(angle) * sparkLen,
                    tipY + Math.sin(angle) * sparkLen
                );
                g.strokePath();
            }
        }

        // ── 7. FRONT ARM (jacket sleeve + gold elbow + skin forearm + bracelet + hand) ──
        // Upper arm (jacket sleeve)
        const frontArmRot = this.stateMachine.is('walk') ? Math.sin((this.walkCycle || 0) * 0.05) * 5 : 0;
        g.lineStyle(9, jacketColor, 1);
        g.beginPath();
        g.moveTo(x + 14 * f, armY);

        if (this.stateMachine.is('block')) {
            g.lineTo(hx + 20 * f, armY - 8);
            g.strokePath();
            // Guard position forearm
            g.lineStyle(7, skinColor, 1);
            g.beginPath();
            g.moveTo(hx + 20 * f, armY - 8);
            g.lineTo(hx + 5 * f, armY - 18);
            g.strokePath();
        } else if (this.stateMachine.is('charge_granite')) {
            // Arm raised towards pompadour
            g.lineTo(hx + 20 * f, armY - 12);
            g.strokePath();
            g.fillStyle(goldColor, 1);
            g.fillCircle(hx + 20 * f, armY - 12, 4);
            g.lineStyle(7, skinColor, 1);
            g.beginPath();
            g.moveTo(hx + 20 * f, armY - 12);
            g.lineTo(hx + 25 * f, hy - 5);
            g.strokePath();
        } else if (this.attackSwing > 0) {
            g.lineTo(x + (20 + armExtend * 0.5) * f, armY + 2);
            g.strokePath();
            // Gold elbow
            g.fillStyle(goldColor, 1);
            g.fillCircle(x + (20 + armExtend * 0.5) * f, armY + 2, 4);
            // Forearm extended
            g.lineStyle(7, skinColor, 1);
            g.beginPath();
            g.moveTo(x + (20 + armExtend * 0.5) * f, armY + 2);
            g.lineTo(x + (28 + armExtend) * f, armY - 3);
            g.strokePath();
            // Gold bracelet
            g.fillStyle(goldColor, 0.9);
            g.fillRect(x + (24 + armExtend * 0.7) * f - 4, armY - 2, 8.5, 5);
            // Fist
            g.fillStyle(skinColor, 1);
            g.fillCircle(x + (30 + armExtend) * f, armY - 4, 5);
        } else {
            // Idle arm down
            g.lineTo(x + 18 * f, armY + 14);
            g.strokePath();
            // Gold elbow
            g.fillStyle(goldColor, 1);
            g.fillCircle(x + 18 * f, armY + 14, 4);
            // Forearm down
            g.lineStyle(7, skinColor, 1);
            g.beginPath();
            g.moveTo(x + 18 * f, armY + 14);
            g.lineTo(x + 20 * f, armY + 30);
            g.strokePath();
            // Gold bracelet
            g.fillStyle(goldColor, 0.9);
            g.fillRect(x + 19 * f - 4, armY + 22, 8.5, 5);
            // Hand
            g.fillStyle(skinColor, 1);
            g.fillCircle(x + 20 * f, armY + 33, 4);
        }

        // ── HITSTUN STARS ──
        if (this.stateMachine.is('hitstun')) {
            const starT = (this.animTimer || 0) * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(
                    x + Math.cos(angle) * 22, y - 60 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.2) * 25, y - 60 + Math.sin(angle + 0.2) * 12,
                    x + Math.cos(angle - 0.2) * 25, y - 60 + Math.sin(angle - 0.2) * 12
                );
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (this.graniteFortressTimer > 0 && !this.isDead) {
            const ag = this.auraGraphics;
            const x = this.sprite.x;
            const y = this.sprite.y;
            const pulse = 0.3 + Math.sin(this.scene.time.now * 0.01) * 0.2;
            
            ag.fillStyle(0x44CCFF, pulse);
            ag.fillEllipse(x, y - 40, 90, 140);
            ag.lineStyle(2, 0xFFFFFF, pulse + 0.2);
            ag.strokeEllipse(x, y - 40, 90 + pulse * 10, 140 + pulse * 10);
        }
    }
}
