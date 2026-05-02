import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Hanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.HANAMI);
        
        this.flowerFieldActive = false;
        this.flowerFieldTimer = 0;
        this.flowerFieldGraphics = null;

        this.hanamiAwakened = false;
        this.hanamiAwakenedTimer = 0;
    }

    // ── Combat Logic ──

    trySpecialAttack() {
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            if (this.ceSystem.spend(CE_COSTS.MAXIMUM)) {
                this.castDisasterArm();
            }
        } else if (tier >= 3 && this.input.isDown('UP')) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1 * 2)) {
                this.castFlowerField();
            }
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_2)) {
                this.castEmergingRoots();
            }
        } else if (tier >= 1) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1)) {
                this.castWoodBuds();
            }
        }
    }

    // H1: Wood Buds
    castWoodBuds() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}

        const castBud = (offsetY, delay) => {
            this.scene.time.delayedCall(delay, () => {
                const px = this.sprite.x + 30 * this.facing;
                const py = this.sprite.y + offsetY;
                
                const proj = new Projectile(this.scene, px, py, {
                    owner: this,
                    damage: this.charData.skills.skill1.damage * this.power,
                    knockbackX: 100,
                    knockbackY: -20,
                    stunDuration: 200,
                    speed: 800,
                    direction: this.facing,
                    color: 0x8B4513, // Brown wood color
                    size: { w: 20, h: 10 },
                    lifetime: 1500,
                    type: 'normal',
                    onHitCallback: (projectile, victim) => {
                        // Drain CE
                        if (victim.ceSystem) {
                            victim.ceSystem.ce = Math.max(0, victim.ceSystem.ce - 15);
                            
                            // Visual drain feedback
                            if (this.scene.damageNumbers) {
                                this.scene.damageNumbers.spawn(victim.sprite.x, victim.sprite.y - 60, '-15 CE', '#8B4513');
                            }
                        }
                        return false;
                    }
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        };

        castBud(-20, 0);
        castBud(20, 200);
    }

    // H2: Emerging Roots
    castEmergingRoots() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.shake(0.02, 400);
        }

        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e) {}

        // Create a fast ground-hugging projectile that launches upward
        const px = this.sprite.x + 40 * this.facing;
        const py = this.sprite.y + 70; // At feet level

        const proj = new Projectile(this.scene, px, py, {
            owner: this,
            damage: this.charData.skills.skill2.damage * this.power,
            knockbackX: 50,
            knockbackY: -800, // Massive Knock-up
            stunDuration: 600,
            speed: 1200,
            direction: this.facing,
            color: 0x228B22, // Green root
            size: { w: 60, h: 40 },
            lifetime: 1000,
            type: 'slash', // invisible base, we draw custom roots
        });

        // Add custom root visuals to the projectile trail
        proj.update = function(dt) {
            if (!this.alive) return;
            this.timer += dt;
            if (this.timer >= this.lifetime || this.sprite.x < -50 || this.sprite.x > 1330) {
                this.destroy(); return;
            }
            
            // Spawn roots as it travels
            if (this.timer % 50 < 20) {
                const groundY = this.sprite.y; // The projectile's Y is already at ground level
                const root = this.scene.add.rectangle(this.sprite.x, groundY, 20, 80, 0x8B4513, 1).setOrigin(0.5, 1);
                root.scaleY = 0; // Start hidden underground
                this.scene.tweens.add({
                    targets: root,
                    scaleY: 1, // Grow upwards
                    duration: 200,
                    yoyo: true, // Shrink back down
                    onComplete: () => root.destroy()
                });
            }
        };

        if (this.scene.projectiles) this.scene.projectiles.push(proj);
    }

    // H3: Flower Field
    castFlowerField() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        this.flowerFieldActive = true;
        this.flowerFieldTimer = 8000;

        if (this.flowerFieldGraphics) this.flowerFieldGraphics.destroy();
        this.flowerFieldGraphics = this.scene.add.graphics();
        this.flowerFieldGraphics.setDepth(2);

        try { this.scene.sound.play('sfx_heal', { volume: 0.7 }); } catch(e) {}
    }

    // H4: Disaster Arm
    castDisasterArm() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(1000);
        this.sprite.body.setVelocityX(0);

        // Windup
        const armObj = this.scene.add.rectangle(this.sprite.x + 20 * this.facing, this.sprite.y, 40, 40, 0x8B4513).setDepth(15);
        this.scene.tweens.add({ targets: armObj, scaleX: 3, scaleY: 3, duration: 400 });

        this.scene.time.delayedCall(400, () => {
            armObj.destroy();
            const armStrike = this.scene.add.rectangle(this.sprite.x + 80 * this.facing, this.sprite.y, 160, 60, 0x8B4513).setDepth(15);
            
            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.04, 300);
            }
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}

            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 180) {
                    target.takeDamage(this.charData.skills.maximum.damage * this.power, 1200 * this.facing, -300, 800, true);
                }
            }

            this.scene.tweens.add({ targets: armStrike, alpha: 0, duration: 200, onComplete: () => armStrike.destroy() });
        });
    }

    tryActivateDomain() {
        if (this.scene.domainActive) return;
        
        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;
        
        this.hanamiAwakened = true;
        this.hanamiAwakenedTimer = 15000;
        
        this.scene.onDomainActivated(this, 'HANAMI');
    }

    // ── Update Loop ──
    update(time, dt) {
        super.update(time, dt);

        if (this.flowerFieldActive) {
            this.flowerFieldTimer -= dt;
            
            this.flowerFieldGraphics.clear();
            this.flowerFieldGraphics.lineStyle(4, 0xFF66AA, 0.5);
            this.flowerFieldGraphics.fillStyle(0xFF66AA, 0.15);
            this.flowerFieldGraphics.fillCircle(this.sprite.x, this.sprite.y + 70, 250);
            this.flowerFieldGraphics.strokeCircle(this.sprite.x, this.sprite.y + 70, 250);

            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 250) {
                    // Disable sprint
                    target.flowerDebuff = true;
                } else {
                    target.flowerDebuff = false;
                }
            }

            if (this.flowerFieldTimer <= 0) {
                this.flowerFieldActive = false;
                this.flowerFieldGraphics.clear();
                if (target) target.flowerDebuff = false;
            }
        }

        if (this.hanamiAwakened) {
            this.hanamiAwakenedTimer -= dt;
            if (this.hanamiAwakenedTimer <= 0) {
                this.hanamiAwakened = false;
            }
        }
    }

    // Hook into takeDamage to disable sprint if flowerDebuff is active
    // We'll just enforce it in Hanami's update loop by modifying the target's speed temporarily, but the actual sprint logic is in Fighter.js.
    // It's better to modify the target's speed.
    
    // In super.update, target is not accessible directly, so we'll do it here:
    // Wait, to properly override, I'll just check if Hanami's awakened state gives lifesteal
    onHitOpponent(target) {
        super.onHitOpponent(target);
        
        // M1 slow in awakened state
        if (this.hanamiAwakened) {
            target.speed = target.charData.stats.speed * 0.7; // Slow
            this.scene.time.delayedCall(2000, () => {
                if (target && !target.isDead) target.speed = target.charData.stats.speed;
            });
        }
    }
}
