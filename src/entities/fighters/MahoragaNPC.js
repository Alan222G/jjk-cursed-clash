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
        this.maxHp = 5000;
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

        // ── Physics Body (same size as Sukuna 20 fingers) ──
        this.sprite = scene.add.rectangle(x, y, 75, 150, 0x000000, 0);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(75, 150);
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

    // ── Drawing (Sukuna 20-sized imposing divine shikigami) ──
    drawCharacter() {
        if (!this.graphics || this.isDead) return;
        this.graphics.clear();

        const sx = this.sprite.x;
        const sy = this.sprite.y;
        const f = this.facing;

        // === LEGS ===
        // Left leg
        this.graphics.fillStyle(0xBBBBBB, 1);
        this.graphics.fillRoundedRect(sx - 18, sy + 25, 14, 50, 4);
        // Right leg
        this.graphics.fillRoundedRect(sx + 4, sy + 25, 14, 50, 4);
        // Feet
        this.graphics.fillStyle(0x999999, 1);
        this.graphics.fillRoundedRect(sx - 20, sy + 70, 18, 8, 3);
        this.graphics.fillRoundedRect(sx + 2, sy + 70, 18, 8, 3);

        // === TORSO (muscular) ===
        this.graphics.fillStyle(0xDDDDDD, 1);
        this.graphics.fillRoundedRect(sx - 25, sy - 50, 50, 80, 8);
        // Chest definition
        this.graphics.lineStyle(2, 0xAAAAAA, 0.4);
        this.graphics.beginPath();
        this.graphics.moveTo(sx, sy - 45);
        this.graphics.lineTo(sx, sy + 10);
        this.graphics.strokePath();

        // === SHOULDERS ===
        this.graphics.fillStyle(0xCCCCCC, 1);
        this.graphics.fillCircle(sx - 28, sy - 45, 12);
        this.graphics.fillCircle(sx + 28, sy - 45, 12);

        // === 4 ARMS (divine shikigami has multiple arms) ===
        this.graphics.lineStyle(6, 0xCCCCCC, 1);
        // Front arm (main - holding sword)
        this.graphics.beginPath();
        this.graphics.moveTo(sx + 28 * f, sy - 45);
        this.graphics.lineTo(sx + 55 * f, sy - 25);
        this.graphics.strokePath();
        // Back arm
        this.graphics.lineStyle(5, 0xBBBBBB, 0.8);
        this.graphics.beginPath();
        this.graphics.moveTo(sx + 28 * f, sy - 40);
        this.graphics.lineTo(sx + 50 * f, sy - 5);
        this.graphics.strokePath();
        // Other side arms (behind)
        this.graphics.lineStyle(5, 0xBBBBBB, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(sx - 28 * f, sy - 45);
        this.graphics.lineTo(sx - 45 * f, sy - 20);
        this.graphics.strokePath();
        this.graphics.beginPath();
        this.graphics.moveTo(sx - 28 * f, sy - 40);
        this.graphics.lineTo(sx - 40 * f, sy - 5);
        this.graphics.strokePath();

        // === HEAD ===
        this.graphics.fillStyle(0xFFFFFF, 1);
        this.graphics.fillCircle(sx, sy - 68, 20);
        // Eye (single divine cyclopean eye)
        this.graphics.fillStyle(0xFF0000, 1);
        this.graphics.fillCircle(sx + 4 * f, sy - 70, 5);
        // Eye glow
        this.graphics.fillStyle(0xFF4444, 0.4);
        this.graphics.fillCircle(sx + 4 * f, sy - 70, 8);

        // === SWORD (Sword of Extermination) ===
        if (this.state === 'attack') {
            // Extended divine blade when attacking
            this.graphics.lineStyle(4, 0xFFD700, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(sx + 55 * f, sy - 25);
            this.graphics.lineTo(sx + 95 * f, sy - 60);
            this.graphics.strokePath();
            // Blade glow
            this.graphics.lineStyle(8, 0xFFD700, 0.3);
            this.graphics.beginPath();
            this.graphics.moveTo(sx + 55 * f, sy - 25);
            this.graphics.lineTo(sx + 95 * f, sy - 60);
            this.graphics.strokePath();
        } else {
            // Resting blade
            this.graphics.lineStyle(3, 0xFFD700, 0.8);
            this.graphics.beginPath();
            this.graphics.moveTo(sx + 55 * f, sy - 25);
            this.graphics.lineTo(sx + 65 * f, sy + 10);
            this.graphics.strokePath();
        }
    }

    // ── AI Loop ──
    update(time, dt) {
        if (this.isDead) return;
        if (!this.sprite || !this.sprite.active) return;

        this.lifetimeTimer += dt;
        if (this.lifetimeTimer >= 30000 && !this.ultimateReady) {
            this.ultimateReady = true;
        }

        // Wheel rendering
        if (this.wheel) {
            this.wheel.clear();
            this.wheel.lineStyle(4, 0xFFD700, 1);
            this.wheel.strokeCircle(this.sprite.x, this.sprite.y - 120, 20);
            const wx = this.sprite.x + Math.cos(this.wheelRotation) * 20;
            const wy = this.sprite.y - 120 + Math.sin(this.wheelRotation) * 20;
            this.wheel.lineBetween(this.sprite.x, this.sprite.y - 120, wx, wy);
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

        // AI Logic
        this.actionCooldown -= dt;
        if (this.actionCooldown > 0) return;

        // Verify target is still valid
        if (!this.target || this.target.isDead || !this.target.sprite || !this.target.sprite.active) return;

        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
        this.facing = this.target.sprite.x > this.sprite.x ? 1 : -1;

        if (this.ultimateReady) {
            this.castWorldSlash();
            return;
        }

        if (dist > 110) {
            // Chase
            this.sprite.body.setVelocityX(this.speed * this.facing);
            this.state = 'walk';

            if (Math.random() < 0.02) {
                this.castAdaptationCharge();
            }
        } else {
            this.sprite.body.setVelocityX(0);
            this.state = 'idle';

            if (Math.random() < 0.05) {
                if (Math.random() < 0.5) {
                    this.castExterminationSword();
                } else {
                    this.castGroundSmash();
                }
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
        this.state = 'attack';
        this.actionCooldown = 5000;

        if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFFFFF, 500, 0.8);

        const slash = this.scene.add.rectangle(GAME_WIDTH/2, this.sprite.y, GAME_WIDTH, 10, 0x000000).setDepth(50);

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
