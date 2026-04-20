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
                this.chargeVfx = this.scene.add.circle(px, py, 5, 0xFFAA33, 0.8).setDepth(15);
                
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
                        this.chargeVfx.setFillStyle(t % 200 > 100 ? 0xFFAA33 : 0xFFCC00, 0.8 + Math.random() * 0.2);
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
            this.scene.screenEffects.flash(0xFFAA33, 100, 0.4);
            this.scene.screenEffects.shake(0.015, 300);
        }

        const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 40, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 800,
            knockbackY: -200,
            stunDuration: 600,
            speed: 1200,
            direction: this.facing,
            color: 0xFFAA33,
            size: { w: 100, h: 40 }, // Flat beam
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

    fireMaximumOutput() {
        this.isCasting = true;
        this.stateMachine.lock(1500);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0xFFAA33);
            this.scene.screenEffects.slowMotion(0.2, 1000);
        }

        const skill = this.charData.skills.maximum;

        // Big orb charging above him
        const orbX = this.sprite.x;
        const orbY = this.sprite.y - 120;
        const orb = this.scene.add.circle(orbX, orbY, 10, 0xFFCC00, 0.9).setDepth(20);

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
                    speed: 2000,
                    direction: this.facing,
                    color: 0xFFCC00,
                    size: { w: 400, h: 200 }, // Massive beam
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

        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clashPossible = this.scene.attemptDomainClash(this);
                if (!clashPossible) return;
            } else {
                return; // Own domain
            }
        } else if (this.domainActive) {
            return;
        }

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();

        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        try {
            this.scene.sound.play('heavy_smash', { volume: 0.5 });
        } catch (e) {}

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'ishigori_domain');
        }
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        
        // Time Cell Moon Palace - Paralysis + DPS
        opponent.stateMachine.unlock();
        if (!opponent.stateMachine.is('domain_stunned')) {
            opponent.stateMachine.setState('domain_stunned');
        }
        opponent.sprite.body.setVelocity(0, 0);

        // Constant tracking blasts
        const py = opponent.sprite.y - 10;
        const px = opponent.sprite.x;
        
        try { this.scene.sound.play('sfx_beam', { volume: 0.2 }); } catch(e) {}
        
        const blast = this.scene.add.circle(px, py, 20, 0xFFAA33, 0.8).setDepth(20);
        this.scene.tweens.add({
            targets: blast, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => blast.destroy()
        });

        opponent.takeDamage(40, 0, 0, 200);
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
        const finalSpeed = 600 + (chargeT * 400);
        const finalW = 40 + (chargeT * 80);
        const finalH = 40 + (chargeT * 80);
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
            color: 0xFFAA33,
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
        this.comboCooldown = 2000;

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
            speed: finalSpeed,
            direction: this.facing,
            color: 0xFFAA33,
            size: { w: finalW, h: finalH },
            lifetime: 1500,
            type: 'circle',
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

        const uniformColor = isFlashing ? 0xFFFFFF : colors.primary; // Dark delinquent jacket
        const pantColor = isFlashing ? 0xFFFFFF : 0x221105;
        const skinColor = isFlashing ? 0xFFFFFF : colors.skin;
        const pompadourColor = isFlashing ? 0xFFFFFF : colors.hair;

        const armExtend = this.attackSwing * 40;

        // ── 1. LEGS (Loose Pants) ──
        const legY = masterY + 5;
        let leftLeg = 35, rightLeg = 35;
        if (this.stateMachine.is('walk')) {
            leftLeg += this.walkCycle * 1.5;
            rightLeg -= this.walkCycle * 1.5;
        } else if (this.stateMachine.is('jump') || this.stateMachine.is('fall')) {
            leftLeg = 20; rightLeg = 20;
        }

        g.lineStyle(6, pantColor, 1);
        g.beginPath();
        g.moveTo(x - 8, legY); g.lineTo(x - 12 - (f*10), legY + leftLeg); // Back leg
        g.moveTo(x + 8, legY); g.lineTo(x + 12 + (f*10), legY + rightLeg); // Front leg
        g.strokePath();

        // ── 2. TORSO (Open Jacket) ──
        g.fillStyle(uniformColor, 1);
        g.fillRect(x - 15, masterY - 35, 30, 45); // Open jacket body
        
        g.fillStyle(skinColor, 1);
        g.fillRect(x - 5, masterY - 30, 10, 35); // Exposed chest

        // ── 3. BACK ARM ──
        const armY = masterY - 30;
        g.lineStyle(10, uniformColor, 0.8);
        g.beginPath();
        g.moveTo(x - 12 * f, armY + 2);
        g.lineTo(x - 22 * f, armY + 18);
        g.strokePath();

        // ── 4. HEAD & POMPADOUR ──
        const hx = x;
        const hy = masterY - 50;

        // Head Base
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 12);

        // Pompadour Hair
        g.fillStyle(pompadourColor, 1);
        // Main slick back
        g.fillEllipse(hx - 5 * f, hy - 5, 20, 15);
        // The Pompadour Extrusion (points forward)
        g.beginPath();
        g.moveTo(hx - 2 * f, hy - 14);
        g.lineTo(hx + 12 * f, hy - 6);
        g.lineTo(hx + 28 * f, hy - 15); // The tip!
        g.lineTo(hx + 8 * f, hy - 22);
        g.fillPath();

        // Face details
        g.fillStyle(0x000000, 1);
        g.fillCircle(hx + 5 * f, hy - 2, 2); // Eye

        // ── CHARGING VFX ON POMPADOUR TIP ──
        if (this.stateMachine.is('charge_granite') && this.chargeLevel > 0) {
            const tipX = hx + 28 * f;
            const tipY = hy - 15;
            const chargeT = this.chargeLevel / 2500;
            const radius = 4 + chargeT * 16;
            const pulse = Math.sin(this.scene.time.now * 0.015) * 3;

            // Outer glow
            g.fillStyle(0xFFCC00, 0.2 + chargeT * 0.3);
            g.fillCircle(tipX, tipY, radius + 10 + pulse);

            // Core orb
            g.fillStyle(0xFFAA33, 0.8 + chargeT * 0.2);
            g.fillCircle(tipX, tipY, radius);

            // Inner white-hot core at high charge
            if (chargeT > 0.5) {
                g.fillStyle(0xFFFFDD, 0.6 + chargeT * 0.3);
                g.fillCircle(tipX, tipY, radius * 0.4);
            }

            // Sparks / energy lines radiating
            g.lineStyle(2, 0xFFCC00, 0.5 + chargeT * 0.3);
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

        // ── 5. FRONT ARM ──
        g.lineStyle(10, uniformColor, 1);
        g.beginPath();
        g.moveTo(hx + 10 * f, armY + 2);

        if (this.stateMachine.is('block')) {
            g.lineTo(hx + 20 * f, armY - 5);
            g.lineTo(hx + 5 * f, armY - 15);
        } else if (this.stateMachine.is('charge_granite')) {
            // Arm raised towards pompadour
            g.lineTo(hx + 20 * f, armY - 15);
            g.lineTo(hx + 25 * f, hy - 10);
        } else if (this.attackSwing > 0) {
            g.lineTo(hx + (25 + armExtend) * f, armY - 5);
            g.fillStyle(skinColor, 1);
            g.fillCircle(hx + (28 + armExtend) * f, armY - 5, 6);
        } else {
            g.lineTo(hx + 16 * f, armY + 20);
        }
        g.strokePath();

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
}
