// ========================================================
// Mahoraga NPC — Standalone AI Shikigami (NOT a Fighter)
// Does NOT extend Fighter to avoid InputManager/CE crashes.
// Has its own sprite, physics, HP, AI, and attack logic.
// ========================================================

import { PHYSICS, GAME_WIDTH } from '../../config.js';

export default class MahoragaNPC {
    constructor(scene, x, y, owner) {
        this.scene = scene;
        this.owner = owner;

        // Resolve target: the opponent of the owner
        this.target = (owner === scene.p1) ? scene.p2 : scene.p1;

        // Stats
        this.maxHp = 6000;
        this.hp = this.maxHp;
        this.speed = 380;
        this.power = 1.5;
        this.defense = 1.5;
        this.facing = 1;
        this.isDead = false;
        this.isInvulnerable = false;
        this.stunTimer = 0;
        this.actionCooldown = 0;
        this.lifetimeTimer = 0;
        this.ultimateReady = false;
        this.state = 'idle'; // 'idle', 'walk', 'attack', 'hitstun', 'dead'

        // ── Physics Body (Giant Colossal General — 1.25x size) ──
        this.sprite = scene.add.rectangle(x, y, 95, 190, 0x000000, 0);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(95, 190);
        this.sprite.body.setGravityY(PHYSICS.GRAVITY);
        this.sprite.body.setDragX(PHYSICS.DRAG_X);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setBounce(0);
        this.sprite.body.setMaxVelocityX(600);
        this.sprite.setDepth(10);

        // ── Hitbox (attack zone) ──
        this.hitbox = scene.add.rectangle(x, y, 70, 60, 0xff0000, 0);
        scene.physics.add.existing(this.hitbox, false);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.enable = false;
        this.hitbox.setDepth(11);

        // ── Visual Graphics ──
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(10);

        // ── Adaptation System ──
        this.adaptationTracker = {
            light_physical: 0,
            heavy_physical: 0,
            light_projectile: 0,
            heavy_projectile: 0,
            domain: 0
        };
        this.adaptedCategories = new Set();

        // ── Wheel Graphic ──
        this.wheel = scene.add.graphics();
        this.wheel.setDepth(20);
        this.wheelRotation = 0;

        // Store ref on sprite for collision callbacks
        this.sprite.fighterRef = this;
        this.hitbox.fighterRef = this;
    }

    // ── Damage Handling ──
    categorizeAttack(damage, isProjectile, fromDomain) {
        if (fromDomain) return 'domain';
        if (isProjectile) {
            return damage >= 40 ? 'heavy_projectile' : 'light_projectile';
        } else {
            return damage >= 30 ? 'heavy_physical' : 'light_physical';
        }
    }

    takeDamage(damage, kbX, kbY, stunDuration, isProjectile = false) {
        if (this.isInvulnerable) return;
        if (this.isDead) return;

        const fromDomain = this.scene.domainActive && this.scene.domainOwner !== this.owner && this.scene.domainOwner === this.target;
        const category = this.categorizeAttack(damage, isProjectile, fromDomain);

        if (this.adaptedCategories.has(category)) {
            damage = Math.floor(damage * 0.2);
            kbX = 0; kbY = 0; stunDuration = 0;
            if (fromDomain) damage = 0;
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFFFFF, 100, 0.2);
        } else {
            this.adaptationTracker[category]++;
            const threshold = category === 'domain' ? 1 : 3;
            if (this.adaptationTracker[category] >= threshold) {
                this.triggerAdaptation(category);
            }
        }

        damage = Math.floor(damage / this.defense);
        if (damage < 1) damage = 1;
        this.hp -= damage;

        if (this.scene.spawnDamageNumber) {
            this.scene.spawnDamageNumber(this.sprite.x, this.sprite.y - 120, damage);
        }

        if (this.hp <= 0) {
            this.die();
            return;
        }

        if (this.sprite.body) {
            this.sprite.body.setVelocity(kbX, kbY);
        }

        if (stunDuration > 0 && !this.adaptedCategories.has(category)) {
            this.state = 'hitstun';
            this.stunTimer = stunDuration;
        }
    }

    onHitOpponent(target) {
        // Placeholder for hit registration
    }

    triggerAdaptation(category) {
        this.adaptedCategories.add(category);

        this.scene.tweens.add({
            targets: this,
            wheelRotation: this.wheelRotation + Math.PI / 2,
            duration: 500,
            ease: 'Power2'
        });

        this.hp = Math.min(this.maxHp, this.hp + 500);
        this.bloodPoisonActive = false;
        this.fireDoTActive = false;

        const aura = this.scene.add.circle(this.sprite.x, this.sprite.y, 100, 0xFFFFFF, 0.5);
        this.scene.tweens.add({ targets: aura, scale: 3, alpha: 0, duration: 600, onComplete: () => aura.destroy() });
        try { this.scene.sound.play('sfx_heal', { volume: 1.0 }); } catch(e) {}
    }

    die() {
        this.isDead = true;
        this.hp = 0;
        this.state = 'dead';
        try { this.sprite.setTint(0x555555); } catch(e) {}
        if (this.wheel) { this.wheel.destroy(); this.wheel = null; }

        this.owner.mahoragaSummoned = false;
        this.scene.time.delayedCall(2000, () => {
            try {
                if (this.sprite && this.sprite.active) this.sprite.destroy();
                if (this.graphics) this.graphics.destroy();
                if (this.hitbox && this.hitbox.active) this.hitbox.destroy();
            } catch(e) {}
        });
    }

    // ── Drawing (Colossal Divine General from Mahoraga.html template) ──
    drawCharacter() {
        if (!this.graphics || this.isDead) return;
        this.graphics.clear();

        const sx = this.sprite.x;
        const sy = this.sprite.y;
        const f = this.facing;
        const g = this.graphics;

        const skinColor = 0xe2e8f0;
        const hakamaColor = 0x14151f;
        const beltColor = 0xf1f5f9;
        const bladeColor = 0xcbd5e1;
        const muscleLineColor = 0x94a3b8;
        const outlineColor = 0x05060b;

        // Breathing bob
        const bob = Math.sin((this.lifetimeTimer || 0) * 0.002) * 2;

        // ══════════════════════════════════════
        // 1. LEGS (Dark Hakama + Bare Calves + Feet)
        // ══════════════════════════════════════
        const legOff = 14;

        // Bare feet
        g.fillStyle(skinColor, 1);
        g.fillRect(sx - legOff - 9, sy + 68, 18, 8);
        g.fillRect(sx + legOff - 9, sy + 68, 18, 8);

        // Bare calves
        g.fillStyle(skinColor, 1);
        g.beginPath();
        g.moveTo(sx - legOff - 8, sy + 42); g.lineTo(sx - legOff + 8, sy + 42);
        g.lineTo(sx - legOff + 6, sy + 68); g.lineTo(sx - legOff - 6, sy + 68);
        g.closePath(); g.fillPath();
        g.beginPath();
        g.moveTo(sx + legOff - 8, sy + 42); g.lineTo(sx + legOff + 8, sy + 42);
        g.lineTo(sx + legOff + 6, sy + 68); g.lineTo(sx + legOff - 6, sy + 68);
        g.closePath(); g.fillPath();

        // Hakama pants (wide trapezoidal)
        g.fillStyle(hakamaColor, 1);
        g.beginPath();
        g.moveTo(sx - legOff - 14, sy + 5); g.lineTo(sx - legOff + 14, sy + 5);
        g.lineTo(sx - legOff + 16, sy + 45); g.lineTo(sx - legOff - 16, sy + 45);
        g.closePath(); g.fillPath();
        g.beginPath();
        g.moveTo(sx + legOff - 14, sy + 5); g.lineTo(sx + legOff + 14, sy + 5);
        g.lineTo(sx + legOff + 16, sy + 45); g.lineTo(sx + legOff - 16, sy + 45);
        g.closePath(); g.fillPath();

        // White rope belt
        g.fillStyle(beltColor, 1);
        g.fillRect(sx - 30, sy + 2, 60, 10);
        // Belt buckle
        g.fillStyle(0xd1d5db, 1);
        g.fillCircle(sx, sy + 9, 5);

        // ══════════════════════════════════════
        // 2. UPPER BODY (Colossal Musculature)
        // ══════════════════════════════════════

        // Abdomen (trapezoid, marked muscles)
        g.fillStyle(skinColor, 1);
        g.beginPath();
        g.moveTo(sx - 22, sy - 20 + bob); g.lineTo(sx + 22, sy - 20 + bob);
        g.lineTo(sx + 16, sy + 5); g.lineTo(sx - 16, sy + 5);
        g.closePath(); g.fillPath();
        // Ab lines
        g.lineStyle(1.5, muscleLineColor, 0.6);
        g.lineBetween(sx - 9, sy - 15, sx + 9, sy - 15);
        g.lineBetween(sx - 9, sy - 7, sx + 9, sy - 7);
        g.lineBetween(sx - 9, sy + 1, sx + 9, sy + 1);
        g.lineBetween(sx, sy - 20 + bob, sx, sy + 5);

        // Pectorals (wide trapezoid)
        g.fillStyle(skinColor, 1);
        g.beginPath();
        g.moveTo(sx - 35, sy - 42 + bob); g.lineTo(sx + 35, sy - 42 + bob);
        g.lineTo(sx + 24, sy - 18 + bob); g.lineTo(sx - 24, sy - 18 + bob);
        g.closePath(); g.fillPath();
        // Chest division
        g.lineStyle(2, 0x64748b, 0.5);
        g.lineBetween(sx - 26, sy - 30, sx + 26, sy - 30);
        g.lineStyle(2.5, 0x64748b, 0.5);
        g.lineBetween(sx, sy - 42 + bob, sx, sy - 18 + bob);

        // Trapezius muscles
        g.fillStyle(skinColor, 1);
        g.beginPath();
        g.moveTo(sx - 35, sy - 42 + bob); g.lineTo(sx - 10, sy - 60 + bob);
        g.lineTo(sx + 10, sy - 60 + bob); g.lineTo(sx + 35, sy - 42 + bob);
        g.closePath(); g.fillPath();

        // Giant deltoid shoulders
        g.fillStyle(skinColor, 1);
        g.fillCircle(sx - 38, sy - 40 + bob, 16);
        g.fillCircle(sx + 38, sy - 40 + bob, 16);

        // ── BACK ARMS (2 behind, smaller/transparent) ──
        g.lineStyle(5, skinColor, 0.5);
        g.beginPath(); g.moveTo(sx - 38 * f, sy - 40 + bob); g.lineTo(sx - 50 * f, sy - 20 + bob); g.strokePath();
        g.lineStyle(4, skinColor, 0.4);
        g.beginPath(); g.moveTo(sx - 38 * f, sy - 35 + bob); g.lineTo(sx - 45 * f, sy - 5 + bob); g.strokePath();

        // ── FRONT LEFT ARM (Free fist) ──
        g.fillStyle(skinColor, 1);
        g.fillCircle(sx - 48 * f, sy - 20 + bob, 10); // Bicep
        g.fillRect(sx - 52 * f - 5, sy - 5 + bob, 10, 22); // Forearm
        g.fillCircle(sx - 55 * f, sy + 18 + bob, 7); // Fist

        // ── FRONT RIGHT ARM (Sword of Extermination strapped) ──
        g.fillStyle(skinColor, 1);
        g.fillCircle(sx + 48 * f, sy - 20 + bob, 10); // Bicep
        g.fillRect(sx + 48 * f - 5, sy - 5 + bob, 10, 22); // Forearm
        g.fillCircle(sx + 52 * f, sy + 18 + bob, 7); // Hand

        // Sword of Extermination (strapped to forearm)
        if (this.state === 'attack') {
            // Extended blade during attack
            g.fillStyle(bladeColor, 1);
            g.beginPath();
            g.moveTo(sx + 45 * f, sy - 10 + bob); g.lineTo(sx + 55 * f, sy - 10 + bob);
            g.lineTo(sx + 65 * f, sy - 55 + bob); g.lineTo(sx + 50 * f, sy - 55 + bob);
            g.closePath(); g.fillPath();
            // Blade tip
            g.fillTriangle(sx + 50 * f, sy - 55 + bob, sx + 65 * f, sy - 55 + bob, sx + 57 * f, sy - 70 + bob);
            // Glow
            g.lineStyle(2, 0xFFD700, 0.6);
            g.lineBetween(sx + 52 * f, sy - 15 + bob, sx + 57 * f, sy - 55 + bob);
        } else {
            // Resting blade (pointing down alongside forearm)
            g.fillStyle(bladeColor, 1);
            g.beginPath();
            g.moveTo(sx + 44 * f, sy + bob); g.lineTo(sx + 54 * f, sy + bob);
            g.lineTo(sx + 58 * f, sy + 50 + bob); g.lineTo(sx + 48 * f, sy + 50 + bob);
            g.closePath(); g.fillPath();
            // Blade tip
            g.fillTriangle(sx + 48 * f, sy + 50 + bob, sx + 58 * f, sy + 50 + bob, sx + 53 * f, sy + 62 + bob);
        }
        // Bandage straps on forearm
        g.lineStyle(2.5, 0xf8fafc, 0.8);
        g.lineBetween(sx + 43 * f, sy - 3 + bob, sx + 57 * f, sy + bob);
        g.lineBetween(sx + 42 * f, sy + 6 + bob, sx + 56 * f, sy + 9 + bob);
        g.lineBetween(sx + 41 * f, sy + 14 + bob, sx + 55 * f, sy + 17 + bob);

        // Thick neck
        g.fillStyle(skinColor, 1);
        g.fillRect(sx - 8, sy - 62 + bob, 16, 14);

        // ══════════════════════════════════════
        // 3. HEAD, SENSORIAL WINGS & HEAD TAIL
        // ══════════════════════════════════════

        // Head tail (flowing horizontally from back of head)
        g.fillStyle(skinColor, 0.8);
        g.beginPath();
        g.moveTo(sx - 2 * f, sy - 72 + bob);
        g.lineTo(sx - 30 * f, sy - 68 + bob);
        g.lineTo(sx - 55 * f, sy - 80 + bob);
        g.lineTo(sx - 70 * f, sy - 72 + bob);
        g.lineTo(sx - 55 * f, sy - 65 + bob);
        g.lineTo(sx - 30 * f, sy - 60 + bob);
        g.lineTo(sx - 2 * f, sy - 64 + bob);
        g.closePath(); g.fillPath();

        // Head
        g.fillStyle(skinColor, 1);
        g.fillCircle(sx, sy - 70 + bob, 12);

        // Monstrous jaw/fauces (no eyes, rectangular teeth area)
        g.fillStyle(0xFFFFFF, 1);
        g.fillRect(sx - 5, sy - 64 + bob, 10, 5);
        g.lineStyle(1, outlineColor, 0.7);
        g.strokeRect(sx - 5, sy - 64 + bob, 10, 5);
        // Teeth division lines
        g.lineBetween(sx - 5, sy - 62 + bob, sx + 5, sy - 62 + bob);
        g.lineBetween(sx, sy - 64 + bob, sx, sy - 59 + bob);

        // Sensorial Wings (angular approximations of bezier curves)
        // Left upper wing
        g.fillStyle(skinColor, 0.8);
        g.beginPath();
        g.moveTo(sx - 2, sy - 70 + bob);
        g.lineTo(sx - 20, sy - 78 + bob);
        g.lineTo(sx - 40, sy - 82 + bob);
        g.lineTo(sx - 50, sy - 76 + bob);
        g.lineTo(sx - 35, sy - 72 + bob);
        g.lineTo(sx - 15, sy - 68 + bob);
        g.closePath(); g.fillPath();
        // Left lower wing
        g.beginPath();
        g.moveTo(sx - 2, sy - 66 + bob);
        g.lineTo(sx - 20, sy - 68 + bob);
        g.lineTo(sx - 40, sy - 64 + bob);
        g.lineTo(sx - 30, sy - 60 + bob);
        g.lineTo(sx - 15, sy - 62 + bob);
        g.closePath(); g.fillPath();
        // Right upper wing
        g.beginPath();
        g.moveTo(sx + 2, sy - 70 + bob);
        g.lineTo(sx + 20, sy - 78 + bob);
        g.lineTo(sx + 40, sy - 82 + bob);
        g.lineTo(sx + 50, sy - 76 + bob);
        g.lineTo(sx + 35, sy - 72 + bob);
        g.lineTo(sx + 15, sy - 68 + bob);
        g.closePath(); g.fillPath();
        // Right lower wing
        g.beginPath();
        g.moveTo(sx + 2, sy - 66 + bob);
        g.lineTo(sx + 20, sy - 68 + bob);
        g.lineTo(sx + 40, sy - 64 + bob);
        g.lineTo(sx + 30, sy - 60 + bob);
        g.lineTo(sx + 15, sy - 62 + bob);
        g.closePath(); g.fillPath();
    }

    // ── AI Loop ──
    update(time, dt) {
        if (this.isDead) return;
        if (!this.sprite || !this.sprite.active) return;

        this.lifetimeTimer += dt;
        if (this.lifetimeTimer >= 30000 && !this.ultimateReady) {
            this.ultimateReady = true;
        }

        // ══════════════════════════════════════
        // DHARMA WHEEL (8-spoke golden wheel floating above head)
        // ══════════════════════════════════════
        if (this.wheel) {
            this.wheel.clear();
            this.wheelRotation += dt * 0.003;
            const wx = this.sprite.x;
            const wy = this.sprite.y - 100;
            const wheelRadius = 20;
            const goldColor = 0xeab308;

            // Outer golden ring
            this.wheel.lineStyle(3.5, goldColor, 1);
            this.wheel.strokeCircle(wx, wy, wheelRadius);

            // Central hub
            this.wheel.fillStyle(goldColor, 1);
            this.wheel.fillCircle(wx, wy, 5);

            // 8 spokes + celestial spheres
            for (let i = 0; i < 8; i++) {
                const angle = this.wheelRotation + (i * Math.PI / 4);
                const tipX = wx + Math.cos(angle) * wheelRadius;
                const tipY = wy + Math.sin(angle) * wheelRadius;

                // Spoke line
                this.wheel.lineStyle(2, goldColor, 1);
                this.wheel.beginPath();
                this.wheel.moveTo(wx, wy);
                this.wheel.lineTo(tipX, tipY);
                this.wheel.strokePath();

                // Celestial sphere at tip
                this.wheel.fillStyle(goldColor, 1);
                this.wheel.fillCircle(tipX, tipY, 3.5);
                // White highlight
                this.wheel.fillStyle(0xFFFFFF, 0.8);
                this.wheel.fillCircle(tipX, tipY, 1.5);
            }
        }

        // Draw character visuals
        this.drawCharacter();

        // Sync hitbox
        this.hitbox.setPosition(this.sprite.x + 30 * this.facing, this.sprite.y);

        // Handle stun
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.state = 'idle';
            }
            return; // Don't act while stunned
        }

        if (this.state === 'attack') return; // Don't act while attacking

        // Verify target is still valid
        if (!this.target || this.target.isDead || !this.target.sprite || !this.target.sprite.active) return;

        const dx = Math.abs(this.target.sprite.x - this.sprite.x);
        this.facing = this.target.sprite.x > this.sprite.x ? 1 : -1;

        // ── JUMP LOGIC (pursue vertical targets) ──
        const isOnGround = this.sprite.body.blocked.down;
        if (isOnGround && this.target.sprite.y < this.sprite.y - 120 && Math.random() < 0.05) {
            this.sprite.body.setVelocityY(-750);
        }

        // ── MOVEMENT/CHASE (relentless chase if not in active attack state) ──
        if (dx > 100) {
            this.sprite.body.setVelocityX(this.speed * this.facing);
            this.state = 'walk';
        } else {
            this.sprite.body.setVelocityX(0);
            this.state = 'idle';
        }

        // ── ATTACK TRIGGER LOGIC (governed by actionCooldown) ──
        this.actionCooldown -= dt;
        if (this.actionCooldown <= 0) {
            if (this.ultimateReady) {
                this.castWorldSlash();
            } else if (dx <= 120) {
                // Close range choices
                if (Math.random() < 0.5) {
                    this.castExterminationSword();
                } else {
                    this.castGroundSmash();
                }
            } else if (dx > 220 && Math.random() < 0.15) {
                // Charge from distance
                this.castAdaptationCharge();
            }
        }
    }

    // ── H1: Extermination Sword ──
    castExterminationSword() {
        this.state = 'attack';
        this.actionCooldown = 1500;

        const sword = this.scene.add.rectangle(this.sprite.x + 80 * this.facing, this.sprite.y, 20, 150, 0xFFFFFF).setDepth(15);
        this.scene.tweens.add({
            targets: sword,
            rotation: this.facing > 0 ? Math.PI/2 : -Math.PI/2,
            duration: 200,
            onComplete: () => {
                if (!this.target || this.target.isDead || !this.target.sprite) {
                    sword.destroy();
                    this.state = 'idle';
                    return;
                }
                const isCurse = ['jogo', 'dagon', 'hanami', 'mahito', 'sukuna', 'sukuna_20'].includes(this.target.charData?.id);
                const mult = isCurse ? 2.0 : 1.0;

                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
                if (dist < 150 && this.target.takeDamage) {
                    this.target.takeDamage(Math.floor(50 * mult * this.power), 300 * this.facing, -100, 400);
                }
                sword.destroy();
                this.scene.time.delayedCall(400, () => { this.state = 'idle'; });
            }
        });
    }

    // ── H2: Adaptation Charge ──
    castAdaptationCharge() {
        this.state = 'attack';
        this.actionCooldown = 2000;

        this.sprite.body.setVelocityX(800 * this.facing);
        this.isInvulnerable = true;

        this.scene.time.delayedCall(400, () => {
            if (this.sprite && this.sprite.body) this.sprite.body.setVelocityX(0);
            this.isInvulnerable = false;
            if (!this.target || this.target.isDead || !this.target.sprite) {
                this.state = 'idle';
                return;
            }
            const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
            if (dist < 120 && this.target.takeDamage) {
                this.target.takeDamage(Math.floor(40 * this.power), 400 * this.facing, -200, 500);
            }
            this.scene.time.delayedCall(200, () => { this.state = 'idle'; });
        });
    }

    // ── H3: Ground Smash ──
    castGroundSmash() {
        this.state = 'attack';
        this.actionCooldown = 2500;

        this.sprite.body.setVelocityY(-300);

        this.scene.time.delayedCall(300, () => {
            if (!this.sprite || !this.sprite.body) return;
            this.sprite.body.setVelocityY(800);
            this.scene.time.delayedCall(200, () => {
                try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 300);

                const wave = this.scene.add.circle(this.sprite.x, this.sprite.y + 70, 10, 0x555555, 0.6);
                this.scene.tweens.add({
                    targets: wave,
                    scale: 25,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => wave.destroy()
                });

                if (!this.target || this.target.isDead || !this.target.sprite) {
                    this.state = 'idle';
                    return;
                }
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
                if (dist < 250 && this.target.takeDamage) {
                    this.target.takeDamage(Math.floor(60 * this.power), 100 * this.facing, -600, 800);
                }
                this.scene.time.delayedCall(500, () => { this.state = 'idle'; });
            });
        });
    }

    // ── Ultimate: World Slash ──
    castWorldSlash() {
        this.ultimateReady = false;
        this.lifetimeTimer = 0; // Reset timer so it takes another 30 seconds to charge
        this.state = 'attack';
        this.actionCooldown = 5000;

        if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFFFFF, 500, 0.8);

        const worldW = this.scene.worldWidth || 2560;
        const slash = this.scene.add.rectangle(worldW / 2, this.sprite.y, worldW, 10, 0x000000).setDepth(50);

        this.scene.time.delayedCall(500, () => {
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.5 }); } catch(e) {}

            if (this.target && !this.target.isDead && this.target.takeDamage) {
                const fivePercent = (this.target.maxHp || 3000) * 0.05;
                if (this.target.hp > fivePercent) {
                    this.target.hp = fivePercent;
                }
                this.target.takeDamage(1, 800 * this.facing, 0, 1500, true);
            }

            this.scene.tweens.add({
                targets: slash,
                alpha: 0,
                scaleY: 5,
                duration: 500,
                onComplete: () => slash.destroy()
            });
            this.scene.time.delayedCall(1000, () => { this.state = 'idle'; });
        });
    }
}
