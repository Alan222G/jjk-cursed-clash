// ========================================================
// Kuroroshi — The Cursed Cockroach
// Festering Life Blade, Poison DoT, Swarm Denial
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Kuroroshi extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.KUROROSHI);
        this.isCasting = false;

        // Wing flutter animation
        this.wingTimer = 0;
        this.wingAngle = 0;

        // Life Blade poison passive
        this.poisonChance = 0.25; // 25% basic attack poison
        
        this.swarmShieldTimer = 0;
    }

    // ════════════════════════════════════════════
    // PASSIVE: Festering Life Blade
    // Basic attacks have a chance to inflict poison
    // ════════════════════════════════════════════
    onHitOpponent(opponent) {
        // Run base class hit logic first
        const prevConnected = this.hitConnected;
        super.onHitOpponent(opponent);

        // If the hit connected (base class sets this.hitConnected = true)
        if (!prevConnected && this.hitConnected && this.currentAttack) {
            // Poison chance on basic attacks
            if (this.currentAttack.type === 'COMBO' && Math.random() < this.poisonChance) {
                if (opponent.applyBurn) {
                    // Re-use burn system as poison (green damage ticks)
                    opponent.applyBurn(3000); // 3 seconds of DoT
                }
                // Festering visual
                this.spawnPoisonHitVfx(opponent.sprite.x, opponent.sprite.y - 30);
            }
        }
    }

    spawnPoisonHitVfx(x, y) {
        const txt = this.scene.add.text(x, y, 'ENVENENADO', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#44AA00',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: txt, y: y - 40, alpha: 0, duration: 1200, onComplete: () => txt.destroy()
        });

        // Green splatter particles
        for (let i = 0; i < 5; i++) {
            const p = this.scene.add.circle(
                x + (Math.random() - 0.5) * 40,
                y + (Math.random() - 0.5) * 30,
                3 + Math.random() * 4, 0x44AA00, 0.8
            ).setDepth(19);
            this.scene.tweens.add({
                targets: p, y: p.y + 20, alpha: 0, scaleX: 0.3, scaleY: 0.3,
                duration: 500 + Math.random() * 300, onComplete: () => p.destroy()
            });
        }
    }

    // ════════════════════════════════════════════
    // SPECIALS
    // ════════════════════════════════════════════
    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            // Maximum: Plague of Decay
            if (this.ceSystem.spend(CE_COSTS.MAXIMUM)) {
                this.castPlagueOfDecay();
            }
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            // Skill 2: Festering Plague — melee poison stab
            if (this.ceSystem.spend(CE_COSTS.SKILL_2)) {
                this.castFesteringPlague();
            }
        } else if (tier >= 1) {
            // Skill 1: Cockroach Swarm — cloud projectile
            if (this.ceSystem.spend(CE_COSTS.SKILL_1)) {
                this.castCockroachSwarm();
            }
        }
    }

    // ════════════════════════════════════════════
    // SKILL 1: Cockroach Swarm
    // Slow-moving cloud that hits multiple times
    // ════════════════════════════════════════════
    castCockroachSwarm() {
        this.isCasting = true;
        this.stateMachine.lock(400);
        this.sprite.body.setVelocityX(0);

        const skill = this.charData.skills.skill1;

        try {
            this.scene.sound.play('sfx_slash', { volume: 0.4 });
        } catch(e) {}

        // Spawn a slow, lingering swarm cloud
        const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 30, {
            owner: this,
            damage: 0,
            knockbackX: 0,
            knockbackY: 0,
            stunDuration: 0,
            speed: 200, // Very slow
            direction: this.facing,
            color: 0x664422,
            size: { w: 80, h: 60 },
            lifetime: 3000,
            type: 'normal',
            onHitCallback: (projectile, victim) => {
                // Multi-hit poison cloud
                if (!projectile._tickTimer) projectile._tickTimer = 0;
                const now = projectile.timer;
                if (now - projectile._tickTimer > 300) { // Damage every 300ms
                    projectile._tickTimer = now;
                    victim.takeDamage(
                        Math.floor(skill.damage * this.power * 0.4),
                        30 * this.facing, -20, 200
                    );
                    // Apply poison
                    if (victim.applyBurn) victim.applyBurn(2000);
                }
                return true; // Don't destroy on hit
            }
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }

        // Swarm visual particles on spawn
        for (let i = 0; i < 8; i++) {
            const px = this.sprite.x + 50 * this.facing + (Math.random() - 0.5) * 60;
            const py = this.sprite.y - 30 + (Math.random() - 0.5) * 40;
            const bug = this.scene.add.ellipse(px, py, 6, 4, 0x332211, 0.9).setDepth(7);
            this.scene.tweens.add({
                targets: bug,
                x: px + (Math.random() - 0.5) * 80,
                y: py + (Math.random() - 0.5) * 50,
                alpha: 0,
                duration: 800 + Math.random() * 400,
                onComplete: () => bug.destroy()
            });
        }

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // SKILL 2: Festering Plague
    // Quick forward lunge stab with heavy poison
    // ════════════════════════════════════════════
    castFesteringPlague() {
        this.isCasting = true;
        this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(0);

        const skill = this.charData.skills.skill2;

        // Lunge forward
        this.sprite.body.setVelocityX(500 * this.facing);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x44AA00, 80, 0.3);
        }

        // Melee hitbox check after short delay
        this.scene.time.delayedCall(150, () => {
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 120) {
                    const dmg = Math.floor(skill.damage * this.power);
                    target.takeDamage(dmg, 400 * this.facing, -150, 500);

                    // Heavy poison
                    if (target.applyBurn) target.applyBurn(5000);
                    if (target.applyBleed) target.applyBleed(4000);

                    this.spawnPoisonHitVfx(target.sprite.x, target.sprite.y - 30);

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.012, 200);
                    }

                    // Blade slash visual
                    const g = this.scene.add.graphics().setDepth(20);
                    g.lineStyle(6, 0x44AA00, 0.9);
                    g.beginPath();
                    g.moveTo(this.sprite.x, this.sprite.y - 50);
                    g.lineTo(target.sprite.x, target.sprite.y + 10);
                    g.strokePath();
                    g.lineStyle(2, 0xAAFF44, 0.6);
                    g.beginPath();
                    g.moveTo(this.sprite.x, this.sprite.y - 50);
                    g.lineTo(target.sprite.x, target.sprite.y + 10);
                    g.strokePath();
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
                }
            }
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // MAXIMUM: Plague of Decay
    // Massive swarm explosion + devastating DoT
    // ════════════════════════════════════════════
    castPlagueOfDecay() {
        this.isCasting = true;
        this.stateMachine.lock(2500);
        this.sprite.body.setVelocityX(0);

        const skill = this.charData.skills.maximum;

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0x44AA00);
            this.scene.screenEffects.slowMotion(0.2, 1500);
        }

        // Charge-up: swarm coalescing around Kuroroshi
        const chargeG = this.scene.add.graphics().setDepth(20);
        let chargeTimer = 0;
        const chargeEvent = this.scene.time.addEvent({
            delay: 50,
            repeat: 20,
            callback: () => {
                chargeTimer++;
                const angle = chargeTimer * 0.8;
                const r = 120 - (chargeTimer * 4);
                const px = this.sprite.x + Math.cos(angle) * r;
                const py = this.sprite.y - 20 + Math.sin(angle) * r;
                chargeG.fillStyle(0x332211, 0.8);
                chargeG.fillEllipse(px, py, 8, 5);
            }
        });

        this.scene.time.delayedCall(1200, () => {
            chargeG.destroy();

            try { this.scene.sound.play('sfx_purple', { volume: 0.8 }); } catch(e) {}

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.05, 1000);
            }

            // Massive swarm explosion projectile
            const proj = new Projectile(this.scene, this.sprite.x + 80 * this.facing, this.sprite.y - 30, {
                owner: this,
                damage: 0,
                knockbackX: 0,
                knockbackY: 0,
                stunDuration: 0,
                speed: 0,
                direction: this.facing,
                color: 0x332211,
                size: { w: 500, h: 300 },
                lifetime: 2000,
                type: 'normal',
                onHitCallback: (projectile, victim) => {
                    if (!projectile._maxTickTimer) projectile._maxTickTimer = 0;
                    const now = projectile.timer;
                    if (now - projectile._maxTickTimer > 200) {
                        projectile._maxTickTimer = now;
                        victim.takeDamage(
                            Math.floor(skill.damage * this.power * 0.15),
                            50 * this.facing, -30, 300
                        );
                        if (victim.applyBurn) victim.applyBurn(6000);
                        if (victim.applyBleed) victim.applyBleed(5000);
                    }
                    return true;
                }
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            // Swarm cloud expanding VFX
            const cloud = this.scene.add.circle(
                this.sprite.x + 80 * this.facing, this.sprite.y - 30,
                30, 0x332211, 0.6
            ).setDepth(18);
            this.scene.tweens.add({
                targets: cloud, scaleX: 8, scaleY: 5, alpha: 0.1,
                duration: 2000, onComplete: () => cloud.destroy()
            });

            this.scene.time.delayedCall(1300, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            });
        });
    }

    // ════════════════════════════════════════════
    // SWARM SHIELD COUNTER
    // ════════════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.swarmShieldTimer > 0) return; // already active

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.swarmShieldTimer = 5000; // 5 seconds of swarm shield counter

        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        try {
            this.scene.sound.play('heavy_smash', { volume: 0.6 });
        } catch (e) {}

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x336633, 150, 0.4);
            this.scene.screenEffects.shake(0.015, 300);
        }
        
        // Visual indicator
        this.shieldSwarmParticles = [];
        for (let i = 0; i < 12; i++) {
            this.shieldSwarmParticles.push({
                angle: Math.random() * Math.PI * 2,
                speed: 0.05 + Math.random() * 0.05,
                radius: 30 + Math.random() * 20,
                yOffset: (Math.random() - 0.5) * 60
            });
        }
    }

    takeDamage(damage, knockbackX, knockbackY, stunDuration) {
        // Let damage happen, but if shield is active, counterattack!
        super.takeDamage(damage, knockbackX, knockbackY, stunDuration);

        if (this.swarmShieldTimer > 0 && this.opponent && !this.isDead) {
            // Apply poison counter to opponent
            this.opponent.applyBleed(2000); // reuse bleed for poison
            
            // Visual feedback
            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.01, 200);
            }
            try { this.scene.sound.play('heavy_smash', { volume: 0.2 }); } catch(e){}
            
            // Screen-obscuring "stain" effect (nubla la vista)
            const stain = this.scene.add.graphics().setDepth(200);
            stain.fillStyle(0x0a0f0a, 0.95);
            const cx = GAME_WIDTH / 2;
            const cy = GAME_HEIGHT / 2;
            // Draw a big splat in the middle
            for (let i = 0; i < 15; i++) {
                stain.fillCircle(
                    cx + (Math.random() - 0.5) * 400,
                    cy + (Math.random() - 0.5) * 300,
                    40 + Math.random() * 80
                );
            }
            // Fade out the stain over 3 seconds
            this.scene.tweens.add({
                targets: stain,
                alpha: 0,
                duration: 3000,
                ease: 'Power2',
                onComplete: () => stain.destroy()
            });
            
            // Spawn a visual swarm attacking them
            const swarm = this.scene.add.graphics().setDepth(25);
            this.scene.tweens.addCounter({
                from: 0, to: 1, duration: 400,
                onUpdate: (tw) => {
                    swarm.clear();
                    const v = tw.getValue();
                    const x = Phaser.Math.Interpolation.Linear([this.sprite.x, this.opponent.sprite.x], v);
                    const y = Phaser.Math.Interpolation.Linear([this.sprite.y, this.opponent.sprite.y], v);
                    
                    swarm.fillStyle(0x111111, 0.8);
                    for (let i = 0; i < 5; i++) {
                        swarm.fillCircle(x + (Math.random()-0.5)*30, y - 30 + (Math.random()-0.5)*30, 3 + Math.random()*3);
                    }
                },
                onComplete: () => swarm.destroy()
            });
        }
    }

    // ════════════════════════════════════════════
    // RENDERING: Insectoid Cursed Spirit
    // ════════════════════════════════════════════
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

        const bodyColor = isFlashing ? 0xFFFFFF : colors.primary;     // Deep black-brown
        const shellColor = isFlashing ? 0xFFFFFF : colors.secondary;  // Dark brown
        const skinColor = isFlashing ? 0xFFFFFF : colors.skin;        // Very dark
        const accentColor = isFlashing ? 0xFFFFFF : colors.accent;    // Amber highlights

        const armExtend = this.attackSwing * 40;

        // Update wing flutter
        this.wingTimer += (dt || 16);
        this.wingAngle = Math.sin(this.wingTimer * 0.015) * 0.4;

        // ── 1. LEGS (6 insect legs — 3 pairs) ──
        const legY = masterY + 5;
        g.lineStyle(3, bodyColor, 0.9);

        // Back pair
        let leftLeg = 35, rightLeg = 35;
        if (this.stateMachine.is('walk')) {
            leftLeg += this.walkCycle * 1.2;
            rightLeg -= this.walkCycle * 1.2;
        } else if (this.stateMachine.is('jump') || this.stateMachine.is('fall')) {
            leftLeg = 15; rightLeg = 15;
        }

        // 3 pairs of segmented insect legs
        for (let pair = 0; pair < 3; pair++) {
            const offsetX = (pair - 1) * 8;
            const phase = pair * 0.3;
            const lLen = leftLeg + Math.sin(this.walkCycle + phase) * 3;
            const rLen = rightLeg - Math.sin(this.walkCycle + phase) * 3;

            // Left side
            g.beginPath();
            g.moveTo(x + offsetX - 5, legY);
            g.lineTo(x + offsetX - 15, legY + lLen * 0.5); // Joint
            g.lineTo(x + offsetX - 10 - (f * 8), legY + lLen); // Foot
            g.strokePath();

            // Right side
            g.beginPath();
            g.moveTo(x + offsetX + 5, legY);
            g.lineTo(x + offsetX + 15, legY + rLen * 0.5);
            g.lineTo(x + offsetX + 10 + (f * 8), legY + rLen);
            g.strokePath();
        }

        // ── 2. WINGS (translucent, fluttering) ──
        if (!this.stateMachine.is('hitstun') && !this.stateMachine.is('knockdown')) {
            const wingBaseX = x - 5 * f;
            const wingBaseY = masterY - 25;
            const wingSpread = 35 + Math.sin(this.wingTimer * 0.02) * 8;

            // Left wing
            g.fillStyle(shellColor, 0.25);
            g.beginPath();
            g.moveTo(wingBaseX, wingBaseY);
            g.lineTo(wingBaseX - wingSpread, wingBaseY - 30 + this.wingAngle * 20);
            g.lineTo(wingBaseX - wingSpread * 0.6, wingBaseY + 10);
            g.fillPath();

            // Right wing
            g.beginPath();
            g.moveTo(wingBaseX, wingBaseY);
            g.lineTo(wingBaseX + wingSpread, wingBaseY - 30 - this.wingAngle * 20);
            g.lineTo(wingBaseX + wingSpread * 0.6, wingBaseY + 10);
            g.fillPath();

            // Wing veins
            g.lineStyle(1, accentColor, 0.15);
            g.beginPath();
            g.moveTo(wingBaseX, wingBaseY);
            g.lineTo(wingBaseX - wingSpread * 0.8, wingBaseY - 20);
            g.moveTo(wingBaseX, wingBaseY);
            g.lineTo(wingBaseX + wingSpread * 0.8, wingBaseY - 20);
            g.strokePath();
        }

        // ── 3. TORSO (segmented carapace) ──
        // Abdomen (lower segment)
        g.fillStyle(bodyColor, 1);
        g.fillEllipse(x, masterY + 5, 22, 18);

        // Thorax (upper segment)
        g.fillStyle(shellColor, 1);
        g.fillEllipse(x, masterY - 15, 26, 25);

        // Segment lines
        g.lineStyle(1, 0x000000, 0.4);
        g.beginPath();
        g.moveTo(x - 10, masterY - 5);
        g.lineTo(x + 10, masterY - 5);
        g.moveTo(x - 8, masterY - 20);
        g.lineTo(x + 8, masterY - 20);
        g.strokePath();

        // ── 4. BACK ARM (blade) ──
        const armY = masterY - 28;
        g.lineStyle(8, bodyColor, 0.8);
        g.beginPath();
        g.moveTo(x - 10 * f, armY + 2);
        g.lineTo(x - 18 * f, armY + 16);
        g.strokePath();

        // ── 5. HEAD ──
        const hx = x;
        const hy = masterY - 45;

        // Head (slightly elongated insect shape)
        g.fillStyle(skinColor, 1);
        g.fillEllipse(hx, hy, 16, 13);

        // Compound eyes (large, segmented)
        const eyeColor = isFlashing ? 0xFFFFFF : 0xFF2200;
        g.fillStyle(eyeColor, 1);
        g.fillEllipse(hx - 7 * f, hy - 2, 6, 7); // Large eye
        g.fillEllipse(hx + 3 * f, hy - 2, 5, 6); // Smaller eye

        // Eye facets (tiny circles inside)
        g.fillStyle(0xAA0000, 0.6);
        g.fillCircle(hx - 7 * f, hy - 3, 1.5);
        g.fillCircle(hx - 6 * f, hy, 1);
        g.fillCircle(hx + 3 * f, hy - 3, 1.5);

        // Antennae
        g.lineStyle(2, bodyColor, 0.8);
        const antPhase = Math.sin(this.wingTimer * 0.008);
        g.beginPath();
        g.moveTo(hx - 4, hy - 10);
        g.lineTo(hx - 12 + antPhase * 4, hy - 25);
        g.moveTo(hx + 4, hy - 10);
        g.lineTo(hx + 12 - antPhase * 4, hy - 25);
        g.strokePath();

        // Mandibles
        g.lineStyle(2, 0x221100, 1);
        g.beginPath();
        g.moveTo(hx - 3, hy + 5);
        g.lineTo(hx - 6 * f, hy + 10);
        g.moveTo(hx + 3, hy + 5);
        g.lineTo(hx + 6 * f, hy + 10);
        g.strokePath();

        // ── 6. FRONT ARM + festering life blade ──
        g.lineStyle(8, bodyColor, 1);
        g.beginPath();
        g.moveTo(hx + 8 * f, armY + 2);

        if (this.stateMachine.is('block')) {
            // Crossed guard
            g.lineTo(hx + 18 * f, armY - 5);
            g.lineTo(hx + 3 * f, armY - 15);
        } else if (this.attackSwing > 0) {
            // Blade swing
            g.lineTo(hx + (22 + armExtend) * f, armY - 5);
            g.strokePath();

            // Festering Life Blade (organic, dripping)
            const bladeStartX = hx + (24 + armExtend) * f;
            const bladeEndX = bladeStartX + 50 * f;
            const bladeY = armY - 5;

            g.lineStyle(5, 0x44AA00, 0.9);
            g.beginPath();
            g.moveTo(bladeStartX, bladeY);
            g.lineTo(bladeEndX, bladeY - 8);
            g.strokePath();

            // Blade glow
            g.lineStyle(2, 0xAAFF44, 0.4);
            g.beginPath();
            g.moveTo(bladeStartX, bladeY);
            g.lineTo(bladeEndX, bladeY - 8);
            g.strokePath();

            // Dripping poison
            if (Math.random() > 0.5) {
                const dripX = bladeStartX + Math.random() * 40 * f;
                const drip = this.scene.add.circle(dripX, bladeY + 3, 2, 0x44AA00, 0.7).setDepth(11);
                this.scene.tweens.add({
                    targets: drip, y: bladeY + 25, alpha: 0, duration: 400, onComplete: () => drip.destroy()
                });
            }
        } else {
            // Idle: blade held at side
            g.lineTo(hx + 14 * f, armY + 18);
            g.strokePath();

            // Small blade resting
            g.lineStyle(4, 0x44AA00, 0.7);
            g.beginPath();
            g.moveTo(hx + 14 * f, armY + 18);
            g.lineTo(hx + 14 * f, armY + 40);
            g.strokePath();
        }

        // ── 7. HITSTUN STARS ──
        if (this.stateMachine.is('hitstun')) {
            const starT = this.animTimer * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(
                    x + Math.cos(angle) * 22, y - 55 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.2) * 25, y - 55 + Math.sin(angle + 0.2) * 12,
                    x + Math.cos(angle - 0.2) * 25, y - 55 + Math.sin(angle - 0.2) * 12
                );
            }
        }
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.swarmShieldTimer > 0) {
            this.swarmShieldTimer -= dt;
            if (this.shieldSwarmParticles) {
                this.shieldSwarmParticles.forEach(p => {
                    p.angle += p.speed;
                });
            }
            if (this.swarmShieldTimer <= 0) {
                this.shieldSwarmParticles = null;
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (this.swarmShieldTimer > 0 && !this.isDead) {
            const ag = this.auraGraphics;
            const x = this.sprite.x;
            const y = this.sprite.y;
            
            // Draw swarm shield particles
            if (this.shieldSwarmParticles) {
                ag.fillStyle(0x111111, 0.8);
                this.shieldSwarmParticles.forEach(p => {
                    const px = x + Math.cos(p.angle) * p.radius;
                    const py = y - 40 + p.yOffset + Math.sin(p.angle) * (p.radius * 0.3);
                    ag.fillCircle(px, py, 4);
                });
            }
        }
    }
}
