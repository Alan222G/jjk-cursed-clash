// ========================================================
// Kuroroshi — The Cursed Cockroach
// Festering Life Blade, Poison DoT, Swarm Denial
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

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
        } else if (tier >= 2 && this.input.isDown('UP')) {
            // UP + U: Festering Life Rush
            if (this.ceSystem.spend(40)) {
                this.castFesteringLifeRush();
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
    // FESTERING LIFE RUSH (UP + U)
    // Fast dash attack that leaves a trail of bugs
    // ════════════════════════════════════════════
    castFesteringLifeRush() {
        this.isCasting = true;
        this.stateMachine.lock(600);
        
        try { this.scene.sound.play('sfx_dash', { volume: 0.6 }); } catch(e){}

        // Dash forward
        this.sprite.body.setVelocityX(650 * this.facing);

        // Trail of bugs
        const trailTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: 6,
            callback: () => {
                const bug = this.scene.add.ellipse(this.sprite.x, this.sprite.y - 20, 6, 4, 0x332211, 0.9).setDepth(7);
                this.scene.tweens.add({
                    targets: bug, x: this.sprite.x + (Math.random()-0.5)*40, y: this.sprite.y - 40, alpha: 0, duration: 600, onComplete: () => bug.destroy()
                });
            }
        });

        this.scene.time.delayedCall(200, () => {
            this.sprite.body.setVelocityX(0);

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 100) {
                    const dmg = Math.floor(35 * this.power);
                    this.opponent.takeDamage(dmg, 300 * this.facing, -200, 400);
                    if (this.opponent.applyBurn) this.opponent.applyBurn(2000); // Minor poison
                    this.comboSystem.registerHit('SPECIAL');
                    
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.01, 150);
                    }
                    try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e){}
                }
            }

            this.scene.time.delayedCall(200, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            });
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
            const stain = this.scene.add.graphics().setDepth(200).setScrollFactor(0);
            stain.fillStyle(0x000000, 0.98); // Almost pitch black
            stain.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Cover entire screen
            
            // Add some organic bug texture dots
            for (let i = 0; i < 40; i++) {
                stain.fillStyle(0x1a2b1a, 1);
                stain.fillCircle(
                    Math.random() * GAME_WIDTH,
                    Math.random() * GAME_HEIGHT,
                    10 + Math.random() * 30
                );
            }

            // Fade out the stain over 6 seconds
            this.scene.tweens.add({
                targets: stain,
                alpha: 0,
                duration: 6000,
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
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x30231d, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.004);

        const bodyColor = isFlashing ? 0xFFFFFF : 0x30231d;
        const eyeColor = isFlashing ? 0xFFFFFF : 0xef4444;
        const wingColor = isFlashing ? 0xFFFFFF : 0x1a120e;
        const darkParts = isFlashing ? 0xFFFFFF : 0x160e0a;

        const ox = x;
        const oy = masterY;

        // ── 1. Elytra / large wings on back ──
        const alaRotL = -20 + (isMoving ? Math.sin(time * 2.5) * 8 : 0);
        const alaRotR = 20 - (isMoving ? Math.sin(time * 2.5) * 8 : 0);
        this.drawRect(g, ox - 10, oy - 15, 12, 38, wingColor, alaRotL);
        this.drawRect(g, ox + 10, oy - 15, 12, 38, wingColor, alaRotR);

        // ── 2. Thorax and segmented abdomen ──
        this.drawRect(g, ox, oy + 25, 20, 16, 0x1c1410);
        this.drawRect(g, ox, oy + 12, 24, 14, darkParts);
        this.drawRect(g, ox, oy - 4, 32, 26, bodyColor);

        // ── 3. 6 Insectoid Legs ──
        const legSwing = isMoving ? Math.sin(time * 2) * 12 : 0;
        
        // Left legs
        g.save();
        g.translate(ox - 14, oy);
        this.drawRect(g, -8, 4, 6, 22, bodyColor, -60 + legSwing);
        this.drawRect(g, -18, 14, 4.5, 24, darkParts, -15 + legSwing);
        this.drawRect(g, -8, 14, 6, 22, bodyColor, -45 - legSwing);
        this.drawRect(g, -16, 24, 4.5, 24, darkParts, 0 - legSwing);
        this.drawRect(g, -6, 24, 6, 22, bodyColor, -30 + legSwing);
        this.drawRect(g, -12, 32, 4.5, 24, darkParts, 15 + legSwing);
        g.restore();

        // Right legs
        g.save();
        g.translate(ox + 14, oy);
        this.drawRect(g, 8, 4, 6, 22, bodyColor, 60 - legSwing);
        this.drawRect(g, 18, 14, 4.5, 24, darkParts, 15 - legSwing);
        this.drawRect(g, 8, 14, 6, 22, bodyColor, 45 + legSwing);
        this.drawRect(g, 16, 24, 4.5, 24, darkParts, 0 + legSwing);
        this.drawRect(g, 6, 24, 6, 22, bodyColor, 30 - legSwing);
        this.drawRect(g, 12, 32, 4.5, 24, darkParts, -15 - legSwing);
        g.restore();

        // ── 4. Upper Arm claws ──
        const armSwing = isMoving ? Math.sin(time * 1.8) * 15 : 0;
        const armY = masterY - 28;

        // Left Arm
        g.save();
        g.translate(ox - 16, oy - 12);
        g.rotate((-20 + armSwing) * Math.PI / 180);
        this.drawRect(g, 0, 10, 8, 20, bodyColor);
        this.drawCircle(g, 0, 20, 4.5, darkParts);
        this.drawTriangle(g, -2, 28, 4, 10, 0x110b08, -30);
        this.drawTriangle(g, 2, 28, 4, 10, 0x110b08, 30);
        g.restore();

        // Right Arm (holding the Festering Life Blade)
        g.save();
        g.translate(ox + 16, oy - 12);
        if (this.attackSwing > 0) {
            g.rotate((15 - armSwing - this.attackSwing * 90) * f * Math.PI / 180);
        } else {
            g.rotate((15 - armSwing) * Math.PI / 180);
        }
        this.drawRect(g, 0, 10, 8, 20, bodyColor);
        this.drawCircle(g, 0, 20, 4.5, darkParts);
        
        // Festering Life Blade
        g.translate(0, 20);
        g.rotate(45 * Math.PI / 180);
        // Handle
        this.drawRect(g, 0, 4, 4, 12, isFlashing ? 0xFFFFFF : 0x2d2e2e);
        // Blade
        this.drawRect(g, 0, -20, 12, 38, isFlashing ? 0xFFFFFF : 0x454d52);
        // Holes in the blade
        if (!isFlashing) {
            this.drawCircle(g, -2, -30, 2, 0x000000);
            this.drawCircle(g, 2, -20, 2, 0x000000);
            this.drawCircle(g, -2, -10, 2, 0x000000);
        }
        g.restore();

        // ── 5. Head and Face ──
        this.drawCircle(g, ox, oy - 27, 11, bodyColor);
        // Eyes
        this.drawCircle(g, ox - 4.5, oy - 27, 3.5, eyeColor);
        this.drawCircle(g, ox + 4.5, oy - 27, 3.5, eyeColor);
        this.drawCircle(g, ox - 4.5, oy - 27, 1.5, isFlashing ? 0xFFFFFF : 0xfb923c);
        this.drawCircle(g, ox + 4.5, oy - 27, 1.5, isFlashing ? 0xFFFFFF : 0xfb923c);

        // Antennae
        this.drawLine(g, ox - 3, oy - 35, ox - 10, oy - 48, 2, 0x000000);
        this.drawLine(g, ox - 10, oy - 48, ox - 18, oy - 58, 1.5, 0x000000);
        this.drawLine(g, ox + 3, oy - 35, ox + 10, oy - 48, 2, 0x000000);
        this.drawLine(g, ox + 10, oy - 48, ox + 18, oy - 58, 1.5, 0x000000);

        // Mandibles
        this.drawTriangle(g, ox - 3, oy - 19, 3, 8, 0x110b08, -45);
        this.drawTriangle(g, ox + 3, oy - 19, 3, 8, 0x110b08, 45);

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
