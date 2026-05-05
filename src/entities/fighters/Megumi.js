import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import MahoragaNPC from './MahoragaNPC.js';
import { CHARACTERS, CE_COSTS, PHYSICS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Megumi extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.MEGUMI);
        
        this.rabbitEscapeActive = false;
        this.rabbitTimer = 0;
        
        this.isSinking = false;
        this.sinkTimer = 0;

        this.mahoragaSummoned = false;
        
        // Clones in domain
        this.cloneSpawnTimer = 0;
    }

    trySpecialAttack() {
        if (this.isSinking) return;
        const tier = this.ceSystem.getTier();

        // Check for Mahoraga (Maximum)
        if (tier >= 4 && this.input.isDown('DOWN')) {
            if (this.ceSystem.spend(CE_COSTS.MAXIMUM)) {
                this.summonMahoraga();
            }
        } 
        // H4: Rabbit Escape
        else if (tier >= 2 && this.input.isDown('UP')) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1 * 1.5)) {
                this.castRabbitEscape();
            }
        }
        // H3: Toad & Serpent
        else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_2)) {
                this.castToadSerpent();
            }
        }
        // H2: Nue
        else if (tier >= 1 && this.stateMachine.is('jump')) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1)) {
                this.castNue();
            }
        }
        // H1: Divine Dogs
        else if (tier >= 1) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1)) {
                this.castDivineDogs();
            }
        }
    }

    // H1: Divine Dogs: Totality
    castDivineDogs() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(400 * this.facing);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y, {
            owner: this,
            damage: this.charData.skills.skill1.damage * this.power,
            knockbackX: 300 * this.facing,
            knockbackY: 100, // Spike effect if hit in air
            stunDuration: 400,
            speed: 1000,
            direction: this.facing,
            color: 0x333333,
            size: { w: 60, h: 40 },
            lifetime: 500,
            type: 'worm', // Dog visual using worm-like logic
            onHitCallback: (p, victim) => {
                if (!victim.sprite.body.onFloor()) {
                    // Spike down
                    victim.sprite.body.setVelocityY(800);
                    victim.stateMachine.setState('knockdown');
                }
                return false;
            }
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);
    }

    // H2: Nue: Electric Dive
    castNue() {
        this.sprite.body.setVelocityY(-400);
        this.sprite.body.setVelocityX(300 * this.facing);
        
        try { this.scene.sound.play('sfx_charge', { volume: 0.6 }); } catch(e) {}

        const proj = new Projectile(this.scene, this.sprite.x, this.sprite.y, {
            owner: this,
            damage: this.charData.skills.skill2.damage * this.power,
            knockbackX: 400 * this.facing,
            knockbackY: -200,
            stunDuration: 500, // Electrification stun
            speed: 1200,
            direction: this.facing,
            color: 0xFFFF00,
            size: { w: 80, h: 30 },
            lifetime: 800,
            type: 'slash',
            onHitCallback: (p, victim) => {
                // Electric flash effect
                if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFFFF00, 100, 0.3);
                return false;
            }
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);
    }

    // H3: Toad & Serpent
    castToadSerpent() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(1000);
        this.sprite.body.setVelocityX(0);

        // Toad Tongue (Pull)
        const tongue = this.scene.add.rectangle(this.sprite.x + 30 * this.facing, this.sprite.y, 10, 10, 0xAA6633).setDepth(15);
        this.scene.tweens.add({
            targets: tongue,
            scaleX: 30,
            duration: 200,
            onComplete: () => {
                const target = this.opponent;
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y);
                
                if (dist < 350) {
                    // Pull target
                    this.scene.tweens.add({
                        targets: target.sprite,
                        x: this.sprite.x + 80 * this.facing,
                        duration: 150,
                        onComplete: () => {
                            // Serpent Emerge
                            this.summonSerpent(target);
                        }
                    });
                }
                this.scene.time.delayedCall(100, () => tongue.destroy());
            }
        });
    }

    summonSerpent(target) {
        const serpent = this.scene.add.rectangle(target.sprite.x, target.sprite.y + 100, 60, 200, 0x004411).setDepth(14).setOrigin(0.5, 1);
        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e) {}
        
        this.scene.tweens.add({
            targets: serpent,
            y: target.sprite.y,
            duration: 200,
            onComplete: () => {
                target.takeDamage(this.charData.skills.skill3.damage * this.power, 0, -800, 600);
                this.scene.time.delayedCall(300, () => {
                    this.scene.tweens.add({
                        targets: serpent,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => serpent.destroy()
                    });
                });
            }
        });
    }

    // H4: Rabbit Escape
    castRabbitEscape() {
        this.rabbitEscapeActive = true;
        this.rabbitTimer = 2500;
        this.sprite.setAlpha(0.3);
        this.isInvulnerable = true;
        this.speed = this.charData.stats.speed * 1.5;

        // Visual rabbit particles
        const particles = this.scene.add.graphics();
        particles.setDepth(15);
        this.rabbitGraphics = particles;

        try { this.scene.sound.play('sfx_heal', { volume: 0.5 }); } catch(e) {}
    }

    // Maximum: Mahoraga
    summonMahoraga() {
        if (this.mahoragaSummoned) return;
        this.mahoragaSummoned = true;

        this.stateMachine.lock(3000);
        this.sprite.body.setVelocity(0, 0);

        // Ritual text
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 100, "WITH THIS TREASURE I SUMMON...", {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(50);

        this.scene.time.delayedCall(1500, () => {
            txt.setText("EIGHT-HANDLED SWORD DIVERGENT SILA MAHORAGA!");
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.05, 1000);
        });

        this.scene.time.delayedCall(3000, () => {
            txt.destroy();
            
            // Penalty: Health to 1000
            this.hp = Math.min(this.hp, 1000);
            
            // Spawn Mahoraga NPC
            const mahoraga = new MahoragaNPC(this.scene, this.sprite.x + 100 * this.facing, PHYSICS.GROUND_Y - 50, this);
            
            // Register Mahoraga with GameScene
            if (!this.scene.npcs) this.scene.npcs = [];
            this.scene.npcs.push(mahoraga);
            this.scene.mahoraga = mahoraga; // Reference for GameScene collisions

            // Resolve opponent reference safely
            const opponent = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            
            // Add physics overlaps
            if (opponent && opponent.sprite) {
                this.scene.physics.add.overlap(opponent.hitbox, mahoraga.sprite, () => {
                    opponent.onHitOpponent(mahoraga);
                });
                this.scene.physics.add.overlap(mahoraga.hitbox, opponent.sprite, () => {
                    mahoraga.onHitOpponent(opponent);
                });
            }

            // Slow penalty
            this.speed = this.charData.stats.speed * 0.4;
            this.scene.time.delayedCall(10000, () => {
                this.speed = this.charData.stats.speed;
            });
        });
    }

    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(100)) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(100);
        this.domainActive = true;
        this.ceSystem.startDomain();

        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'MEGUMI');
    }

    // ── Update Loop ──
    update(time, dt) {
        super.update(time, dt);

        if (this.rabbitEscapeActive) {
            this.rabbitTimer -= dt;
            
            // Draw rabbit particles
            if (this.rabbitGraphics) {
                this.rabbitGraphics.clear();
                this.rabbitGraphics.fillStyle(0xFFFFFF, 0.8);
                for(let i=0; i<15; i++) {
                    const rx = this.sprite.x + Math.random() * 100 - 50;
                    const ry = this.sprite.y + Math.random() * 150 - 75;
                    this.rabbitGraphics.fillCircle(rx, ry, 3);
                }
            }

            if (this.rabbitTimer <= 0) {
                this.rabbitEscapeActive = false;
                this.sprite.setAlpha(1);
                this.isInvulnerable = false;
                this.speed = this.charData.stats.speed;
                if (this.rabbitGraphics) this.rabbitGraphics.destroy();
            }
        }

        // Domain sinking check (Shift key)
        if (this.domainActive && this.input.isDown('DASH') && !this.isSinking) {
            this.startSinking();
        }

        if (this.isSinking) {
            this.sinkTimer -= dt;
            this.sprite.setAlpha(0);
            this.isInvulnerable = true;
            if (this.sprite.body) this.sprite.body.enable = false;

            if (this.sinkTimer <= 0) {
                this.stopSinking();
            }
        }

        // Domain Clones logic
        if (this.domainActive) {
            // Reduce cooldowns (implicit since CE flows faster or skills are unlocked)
            this.ceSystem.ceRegenRate = 30; // Massive regen in domain
            
            // Clones on M1 handled in onHitOpponent
        }
    }

    startSinking() {
        this.isSinking = true;
        this.sinkTimer = 500;
        try { this.scene.sound.play('sfx_dash', { volume: 0.5 }); } catch(e) {}
        
        // Visual shadow splash
        const splash = this.scene.add.circle(this.sprite.x, this.sprite.y + 70, 40, 0x000000, 0.8).setDepth(5);
        this.scene.tweens.add({ targets: splash, scale: 2, alpha: 0, duration: 400, onComplete: () => splash.destroy() });
    }

    stopSinking() {
        this.isSinking = false;
        this.sprite.setAlpha(1);
        this.isInvulnerable = false;
        if (this.sprite.body) this.sprite.body.enable = true;

        // Teleport to target (simple chase) or mouse? Let's do a dash forward
        this.sprite.x += 200 * this.facing;
        
        const splash = this.scene.add.circle(this.sprite.x, this.sprite.y + 70, 40, 0x000000, 0.8).setDepth(5);
        this.scene.tweens.add({ targets: splash, scale: 2, alpha: 0, duration: 400, onComplete: () => splash.destroy() });
    }

    onHitOpponent(target) {
        super.onHitOpponent(target);
        
        // Shadow Clones in Domain
        if (this.domainActive) {
            // Spawn a shadow clone visual that hits again
            const clone = this.scene.add.rectangle(target.sprite.x + 50 * -this.facing, target.sprite.y, 40, 100, 0x000000, 0.6).setDepth(14);
            this.scene.tweens.add({
                targets: clone,
                x: target.sprite.x,
                duration: 100,
                onComplete: () => {
                    target.takeDamage(10, 20 * this.facing, -10, 100);
                    this.scene.tweens.add({ targets: clone, alpha: 0, duration: 100, onComplete: () => clone.destroy() });
                }
            });
        }
    }
}
