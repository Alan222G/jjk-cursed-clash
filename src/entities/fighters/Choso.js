import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Choso extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.CHOSO);
        
        this.redScaleActive = false;
        this.redScaleTimer = 0;

        this.chosoAwakened = false;
        this.chosoAwakenedTimer = 0;
        this.wingKingShootTimer = 0;
    }

    // Override normal attacks to apply blood poison
    getBasicAttackData(type) {
        const base = { ...super.getBasicAttackData(type) };
        if (!base) return base;
        base.onHit = (attacker, victim, dmg) => {
            this.applyBloodPoison(victim);
        };
        return base;
    }

    // Blood Poison — 5 ticks of 10 damage over 2.5 seconds
    applyBloodPoison(victim) {
        if (!victim || victim.isDead || !victim.sprite) return;
        let ticks = 0;
        const poisonInterval = this.scene.time.addEvent({
            delay: 500, repeat: 4,
            callback: () => {
                ticks++;
                if (victim && !victim.isDead && victim.takeDamage) {
                    victim.takeDamage(30, 0, 0, 0); // Increased damage
                    victim.sprite.setTintFill(0x8B008B); // Purple poison tint
                    this.scene.time.delayedCall(150, () => victim.sprite.clearTint());
                    
                    // Crimson drip visual
                    const drip = this.scene.add.circle(
                        victim.sprite.x + (Math.random() - 0.5) * 20,
                        victim.sprite.y + 10,
                        4, 0x8B008B, 0.9
                    ).setDepth(12);
                    this.scene.tweens.add({
                        targets: drip, y: drip.y + 40, alpha: 0,
                        duration: 800, onComplete: () => drip.destroy()
                    });
                }
                if (ticks >= 5) poisonInterval.destroy();
            }
        });
    }

    trySpecialAttack() {
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            if (this.ceSystem.spend(CE_COSTS.MAXIMUM)) {
                this.castSlicingExorcism();
            }
        } else if (tier >= 3 && this.input.isDown('UP')) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1 * 2)) {
                this.castBloodTsunami();
            }
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_2)) {
                this.castSupernova();
            }
        } else if (tier >= 1) {
            if (this.ceSystem.spend(CE_COSTS.SKILL_1)) {
                this.castPiercingBlood();
            }
        }
    }

    // H1: Piercing Blood
    castPiercingBlood() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(600); // Startup
        this.sprite.body.setVelocityX(0);

        // Convergence VFX
        const px = this.sprite.x + 30 * this.facing;
        const py = this.sprite.y - 40;
        const prep = this.scene.add.circle(px, py, 10, 0xDC143C, 0.8).setDepth(15);
        this.scene.tweens.add({ targets: prep, scaleX: 0.2, scaleY: 0.2, duration: 400 });

        this.scene.time.delayedCall(400, () => {
            prep.destroy();
            try { this.scene.sound.play('sfx_beam', { volume: 0.9 }); } catch(e) {}
            
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0xDC143C, 100, 0.3);
            }

            const proj = new Projectile(this.scene, px, py, {
                owner: this,
                damage: this.charData.skills.skill1.damage * this.power,
                knockbackX: 600,
                knockbackY: -100,
                stunDuration: 400,
                speed: 2500, // Very fast
                direction: this.facing,
                color: 0xDC143C,
                size: { w: 80, h: 8 },
                lifetime: 1000,
                type: 'normal',
                onHitCallback: (p, victim) => { this.applyBloodPoison(victim); return false; }
            });

            // Projectile clash logic
            proj.update = function(dt) {
                if (!this.alive) return;
                
                // Call original Projectile update so trail and graphics render properly
                Projectile.prototype.update.call(this, dt);

                // If the prototype update destroyed us (lifetime expired), bail out
                if (!this.alive || !this.sprite || !this.sprite.active) return;

                // Check collision with other projectiles (Hanami's Wood Buds, etc.)
                if (this.scene && this.scene.projectiles) {
                    for (let other of this.scene.projectiles) {
                        if (other === this) continue;
                        if (other.owner !== this.owner && other.alive && other.sprite && other.sprite.active) {
                            try {
                                const bounds1 = this.sprite.getBounds();
                                const bounds2 = other.sprite.getBounds();
                                if (Phaser.Geom.Intersects.RectangleToRectangle(bounds1, bounds2)) {
                                    other.destroy();
                                    this.damage = Math.floor(this.damage * 0.7);
                                }
                            } catch(e) {}
                        }
                    }
                }
            };

            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        });
    }

    // H2: Supernova
    castSupernova() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(1200);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_charge', { volume: 0.6 }); } catch(e) {}

        const orbs = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const ox = this.sprite.x + Math.cos(angle) * 40;
            const oy = this.sprite.y - 40 + Math.sin(angle) * 40;
            const orb = this.scene.add.circle(ox, oy, 8, 0xDC143C, 1).setDepth(15);
            orbs.push({ sprite: orb, angle });
        }

        this.scene.time.delayedCall(800, () => {
            try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
            
            for (let orbObj of orbs) {
                orbObj.sprite.destroy();
                // Fire them in a fan forward
                const spreadAngle = (orbObj.angle % (Math.PI)) - Math.PI/2; // roughly -90 to 90
                const dirY = Math.sin(spreadAngle) * 0.5;

                const proj = new Projectile(this.scene, this.sprite.x + 20 * this.facing, this.sprite.y - 40, {
                    owner: this,
                    damage: this.charData.skills.skill2.damage * this.power / 2,
                    knockbackX: 150,
                    knockbackY: -50,
                    stunDuration: 200,
                    speed: 900,
                    direction: this.facing,
                    color: 0x8B0000,
                    size: { w: 15, h: 15 },
                    lifetime: 1500,
                    type: 'circle',
                    onHitCallback: (p, victim) => { this.applyBloodPoison(victim); return false; }
                });
                proj.sprite.body.setVelocityY(dirY * 900);
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            }
        });
    }

    // H3: Slicing Exorcism
    castSlicingExorcism() {
        this.stateMachine.setState('idle');
        this.stateMachine.lock(1000);
        this.sprite.body.setVelocityX(0);

        // Blade visual
        const blade = this.scene.add.rectangle(this.sprite.x + 30 * this.facing, this.sprite.y, 60, 10, 0xDC143C).setDepth(15);
        this.scene.tweens.add({ targets: blade, angle: 360 * 3, duration: 600 });

        this.scene.time.delayedCall(200, () => {
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.7 }); } catch(e) {}
            this.sprite.body.setVelocityX(600 * this.facing);

            let hitCount = 0;
            const hitInterval = this.scene.time.addEvent({
                delay: 100,
                callback: () => {
                    blade.setPosition(this.sprite.x + 40 * this.facing, this.sprite.y);
                    const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                    if (target && !target.isDead) {
                        const dist = Math.abs(target.sprite.x - this.sprite.x);
                        if (dist < 80) {
                            target.takeDamage(this.charData.skills.maximum.damage * this.power / 4, 100 * this.facing, -20, 150);
                            this.applyBloodPoison(target);
                        }
                    }
                    hitCount++;
                    if (hitCount >= 4) {
                        hitInterval.destroy();
                        blade.destroy();
                        this.sprite.body.setVelocityX(0);
                    }
                },
                loop: true
            });
        });
    }

    // H4: Blood Tsunami (UP+U)
    castBloodTsunami() {
        if (this.isCasting) return;
        
        if (!this.ceSystem.spend(100)) return;
        
        this.isCasting = true;
        this.stateMachine.setState('idle');
        this.stateMachine.lock(2000);
        this.sprite.body.setVelocityX(0);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'BLOOD TSUNAMI!', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#DC143C', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 60, scale: 1.2, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xDC143C, 300, 0.5);
            this.scene.screenEffects.shake(0.06, 1200);
        }
        try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}

        // Blood gathering effect
        const gatherAura = this.scene.add.circle(this.sprite.x, this.sprite.y, 100, 0xDC143C, 0.3).setDepth(5);
        this.scene.tweens.add({ targets: gatherAura, scale: 0.1, alpha: 1, duration: 800 });

        this.scene.time.delayedCall(800, () => {
            gatherAura.destroy();
            try { this.scene.sound.play('sfx_slash', { volume: 1.0 }); } catch(e) {}
            
            // Massive wave projectile
            const proj = new Projectile(this.scene, this.sprite.x + 80 * this.facing, PHYSICS.GROUND_Y - 120, {
                owner: this,
                damage: 150 * this.power,
                knockbackX: 800, knockbackY: -400,
                stunDuration: 1000, speed: 600,
                direction: this.facing, color: 0x8B0000,
                size: { w: 100, h: 200 }, lifetime: 3000, type: 'slash',
                onHitCallback: (p, victim) => { this.applyBloodPoison(victim); return false; }
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        });

        this.scene.time.delayedCall(1500, () => {
            this.isCasting = false;
        });
    }

    // ═══════════════════════════════════════
    // DOMAIN -> AWAKENING (Flowing Red Scale: Stack)
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.chosoAwakened) return;

        if (!this.ceSystem.spend(100)) return;
        
        this.chosoAwakened = true;
        this.chosoAwakenedTimer = 15000;
        
        // Massive Boosts
        this.power = (this.charData.stats.power || 1.0) * 1.5;
        this.speed = (this.charData.stats.speed || 300) * 1.3;
        this.defense = (this.charData.stats.defense || 0.95) * 1.5;
        this.charData.stats.ceRegen = (this.charData.stats.ceRegen || 3.5) * 2.0;
        this.ceRegen = this.charData.stats.ceRegen;

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xDC143C, 300, 0.5);
            this.scene.screenEffects.shake(0.04, 500);
        }
        try { this.scene.sound.play('sfx_heal', { volume: 1.0 }); } catch(e) {}

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'FLOWING RED SCALE:\nSTACK!', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#DC143C', stroke: '#000000', strokeThickness: 5, align: 'center'
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }

    update(time, dt) {
        super.update(time, dt);
        
        if (this.chosoAwakened) {
            this.chosoAwakenedTimer -= dt;

            // Visual aura
            if (Math.floor(time) % 100 < 40) {
                const cx = this.sprite.x + (Math.random() - 0.5) * 50;
                const cy = this.sprite.y + (Math.random() - 0.5) * 90;
                const spark = this.scene.add.circle(cx, cy, 4, 0xDC143C, 0.8).setDepth(15);
                this.scene.tweens.add({ targets: spark, y: cy - 50, alpha: 0, duration: 500, onComplete: () => spark.destroy() });
            }

            if (this.chosoAwakenedTimer <= 0) {
                this.chosoAwakened = false;
                this.power = this.charData.stats.power || 1.0;
                this.speed = this.charData.stats.speed || 300;
                this.defense = this.charData.stats.defense || 0.95;
            }
        }
    }
}
