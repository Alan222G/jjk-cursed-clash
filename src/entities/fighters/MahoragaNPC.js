import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { PHYSICS, GAME_WIDTH } from '../../config.js';

const MAHORAGA_DATA = {
    id: 'mahoraga', // Placeholder sprite
    name: 'Mahoraga',
    stats: { maxHp: 5000, speed: 200, power: 1.5, defense: 1.5, ceRegen: 0, weight: 300, jumpForce: -500 },
    skills: {},
    colors: { primary: 0xFFFFFF }
};

export default class MahoragaNPC extends Fighter {
    constructor(scene, x, y, owner) {
        // playerIndex is 3 to avoid input conflicts
        super(scene, x, y, 3, MAHORAGA_DATA);
        
        this.owner = owner;
        this.target = owner.opponent;
        
        // Scale and aesthetics
        this.sprite.setScale(1.8);
        this.sprite.setTint(0xFFFFFF); // White/Divine look
        
        // Disable regular UI
        this.hasUI = false;

        // Adaptation System
        // Tracks how many times a category has hit
        this.adaptationTracker = {
            light_physical: 0,
            heavy_physical: 0,
            light_projectile: 0,
            heavy_projectile: 0,
            domain: 0
        };
        // Categories fully adapted to
        this.adaptedCategories = new Set();
        
        // Wheel graphic
        this.wheel = this.scene.add.graphics();
        this.wheel.setDepth(20);
        this.wheelRotation = 0;

        // Lifetime
        this.lifetimeTimer = 0;
        this.ultimateReady = false;

        // AI Logic
        this.aiTimer = 0;
        this.actionCooldown = 0;
    }

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

        // Determine if attack is from a domain
        const fromDomain = this.scene.domainActive && this.scene.domainOwner !== this.owner && this.scene.domainOwner === this.target;
        
        const category = this.categorizeAttack(damage, isProjectile, fromDomain);

        // Check if fully adapted
        if (this.adaptedCategories.has(category)) {
            // Adapted! 80% damage reduction, no stun, no knockback
            damage = Math.floor(damage * 0.2);
            kbX = 0;
            kbY = 0;
            stunDuration = 0;

            if (fromDomain) {
                // If adapted to domains, literally ignore it completely
                damage = 0;
            }

            // Visual indicator of adaptation blocking
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFFFFF, 100, 0.2);
        } else {
            // Not yet adapted. Record hit.
            this.adaptationTracker[category]++;
            
            // Reached adaptation threshold? (3 hits for normal, 1 for domain)
            const threshold = category === 'domain' ? 1 : 3;
            if (this.adaptationTracker[category] >= threshold) {
                this.triggerAdaptation(category);
            }
        }

        // Apply defense stat
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

        this.sprite.body.setVelocity(kbX, kbY);

        if (stunDuration > 0 && !this.adaptedCategories.has(category)) {
            this.stateMachine.setState('hitstun');
            this.stunTimer = stunDuration;
        }
    }

    triggerAdaptation(category) {
        this.adaptedCategories.add(category);
        
        // Spin the wheel
        this.scene.tweens.add({
            targets: this,
            wheelRotation: this.wheelRotation + Math.PI / 2,
            duration: 500,
            ease: 'Power2'
        });

        // Heal
        this.hp += 500;
        if (this.hp > this.maxHp) this.hp = this.maxHp;

        // Clear Debuffs (Poison, Fire)
        this.bloodPoisonActive = false;
        this.fireDoTActive = false;

        // Visual FX
        const aura = this.scene.add.circle(this.sprite.x, this.sprite.y, 100, 0xFFFFFF, 0.5);
        this.scene.tweens.add({ targets: aura, scale: 3, alpha: 0, duration: 600, onComplete: () => aura.destroy() });
        
        try { this.scene.sound.play('sfx_heal', { volume: 1.0 }); } catch(e) {}
    }

    die() {
        this.isDead = true;
        this.hp = 0;
        try { this.sprite.setTint(0x555555); } catch(e) {}
        try { this.stateMachine.setState('knockdown'); } catch(e) {}
        if (this.wheel) { this.wheel.destroy(); this.wheel = null; }
        
        // Mahoraga dies, owner survives but loses Mahoraga
        this.owner.mahoragaSummoned = false;
        this.scene.time.delayedCall(2000, () => {
            try {
                if (this.sprite && this.sprite.active) this.sprite.destroy();
                if (this.graphics) this.graphics.destroy();
                if (this.auraGraphics) this.auraGraphics.destroy();
                if (this.hitbox && this.hitbox.active) this.hitbox.destroy();
            } catch(e) {}
        });
    }

    // AI Loop
    update(time, dt) {
        // Skip default Fighter update to avoid player inputs overriding AI
        // Handle basic physics and states
        if (this.isDead) return;

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

        // Status effects (Poison, etc) should be processed here if needed,
        // but Fighter normally handles them in super.update. 
        // We will manually call state machine updates.
        this.stateMachine.update(dt);
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0 && this.stateMachine.is('hitstun')) {
                this.stateMachine.setState('idle');
            }
        }

        // AI Logic
        if (!this.stateMachine.is('idle') && !this.stateMachine.is('walk')) return;
        
        this.actionCooldown -= dt;
        if (this.actionCooldown > 0) return;

        if (!this.target || this.target.isDead || !this.target.sprite || !this.target.sprite.active) return;

        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
        this.facing = this.target.sprite.x > this.sprite.x ? 1 : -1;
        this.sprite.setFlipX(this.facing < 0);

        if (this.ultimateReady) {
            this.castWorldSlash();
            return;
        }

        if (dist > 300) {
            // Chase
            this.sprite.body.setVelocityX(this.speed * this.facing);
            this.stateMachine.setState('walk');
            
            // Occasionally use Adaptation Charge (H2)
            if (Math.random() < 0.02) {
                this.castAdaptationCharge();
            }
        } else {
            this.sprite.body.setVelocityX(0);
            this.stateMachine.setState('idle');
            
            if (Math.random() < 0.05) {
                if (Math.random() < 0.5) {
                    this.castExterminationSword();
                } else {
                    this.castGroundSmash();
                }
            }
        }
    }

    // H1: Extermination Sword
    castExterminationSword() {
        this.stateMachine.setState('attack');
        this.stateMachine.lock(800);
        this.actionCooldown = 1500;
        
        // Logic: Downward slash. 2x dmg to curses, guard break.
        const sword = this.scene.add.rectangle(this.sprite.x + 80 * this.facing, this.sprite.y, 20, 150, 0xFFFFFF).setDepth(15);
        this.scene.tweens.add({
            targets: sword,
            rotation: this.facing > 0 ? Math.PI/2 : -Math.PI/2,
            duration: 200,
            onComplete: () => {
                const isCurse = ['jogo', 'dagon', 'hanami', 'mahito', 'sukuna', 'sukuna_20'].includes(this.target.charData.id);
                const mult = isCurse ? 2.0 : 1.0;
                
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
                if (dist < 150) {
                    this.target.takeDamage(50 * mult * this.power, 300 * this.facing, -100, 400);
                }
                sword.destroy();
            }
        });
    }

    // H2: Adaptation Charge
    castAdaptationCharge() {
        this.stateMachine.setState('attack');
        this.stateMachine.lock(600);
        this.actionCooldown = 2000;
        
        // Hyper armor dash
        this.sprite.body.setVelocityX(800 * this.facing);
        this.isInvulnerable = true; // Simulating Hyper Armor for simplicity
        
        this.scene.time.delayedCall(400, () => {
            this.sprite.body.setVelocityX(0);
            this.isInvulnerable = false;
            const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
            if (dist < 120) {
                this.target.takeDamage(40 * this.power, 400 * this.facing, -200, 500);
            }
        });
    }

    // H3: Ground Smash
    castGroundSmash() {
        this.stateMachine.setState('attack');
        this.stateMachine.lock(1000);
        this.actionCooldown = 2500;
        
        this.sprite.body.setVelocityY(-300); // Small jump
        
        this.scene.time.delayedCall(300, () => {
            this.sprite.body.setVelocityY(800); // Smash down
            this.scene.time.delayedCall(200, () => {
                // Shockwave
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

                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
                if (dist < 250 && this.target.sprite.body.onFloor()) {
                    this.target.takeDamage(60 * this.power, 100 * this.facing, -600, 800);
                }
            });
        });
    }

    // Ultimate: World Slash
    castWorldSlash() {
        this.ultimateReady = false;
        this.stateMachine.setState('attack');
        this.stateMachine.lock(2000);
        this.actionCooldown = 5000;
        
        if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFFFFF, 500, 0.8);
        
        const slash = this.scene.add.rectangle(GAME_WIDTH/2, this.sprite.y, GAME_WIDTH, 10, 0x000000).setDepth(50);
        
        this.scene.time.delayedCall(500, () => {
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.5 }); } catch(e) {}
            // Reduce HP to 5% instantly, bypassing defense
            const fivePercent = this.target.maxHp * 0.05;
            if (this.target.hp > fivePercent) {
                this.target.hp = fivePercent;
            }
            this.target.takeDamage(1, 800 * this.facing, 0, 1500, true);
            
            this.scene.tweens.add({
                targets: slash,
                alpha: 0,
                scaleY: 5,
                duration: 500,
                onComplete: () => slash.destroy()
            });
        });
    }
}
