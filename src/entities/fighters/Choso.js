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

    // ── Choso's unique design: dark purple tunic, white hakama, blood mark ──
    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x;
        const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;

        if (this.isDead) {
            g.fillStyle(0x111118, 0.5);
            g.fillEllipse(x, y + 20, 80, 25);
            return;
        }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.004);

        const skinColor = isFlashing ? 0xFFFFFF : 0xfceade;
        const tunicColor = isFlashing ? 0xFFFFFF : 0x4a325c;
        const whiteCloth = isFlashing ? 0xFFFFFF : 0xffffff;
        const hairColor = isFlashing ? 0xFFFFFF : 0x261b17;
        const bootColor = isFlashing ? 0xFFFFFF : 0x4a3b32;
        const scarfDark = isFlashing ? 0xFFFFFF : 0x332140;
        const scarfDarker = isFlashing ? 0xFFFFFF : 0x281a33;

        const ox = x;
        const oy = masterY;

        const rotArmSup = isMoving ? Math.sin(time) * 10 : 5;
        const rotArmInf = isMoving ? Math.sin(time + 0.5) * 8 : 10;
        const rotLegSup = isMoving ? Math.cos(time) * 5 : 0;
        const rotLegInf = isMoving ? Math.cos(time + 0.5) * 3 : 0;

        // ── Legs (white hakama pants) ──
        this.drawRect(g, ox - 8, oy + 39, 11, 28, whiteCloth, rotLegSup);
        this.drawRect(g, ox - 8 + (rotLegSup * 0.2), oy + 65, 9, 25, whiteCloth, rotLegInf);
        this.drawRect(g, ox + 8, oy + 39, 11, 28, whiteCloth, -rotLegSup);
        this.drawRect(g, ox + 8 - (rotLegSup * 0.2), oy + 65, 9, 25, whiteCloth, -rotLegInf);

        // ── Boots ──
        this.drawRect(g, ox - 8, oy + 80, 13, 5, bootColor);
        this.drawRect(g, ox + 8, oy + 80, 13, 5, bootColor);

        // ── Torso (purple tunic) ──
        this.drawRect(g, ox, oy - 10, 22, 35, tunicColor);

        // ── Waist belt / obi ──
        this.drawRect(g, ox, oy + 16, 22, 10, tunicColor);

        // ── Lower tunic apron ──
        this.drawRect(g, ox, oy + 28, 24, 16, tunicColor);

        // ── Scarf / high collar ──
        this.drawRect(g, ox, oy - 18, 18, 11, scarfDark);
        this.drawRect(g, ox, oy - 23, 16, 6, scarfDarker);

        // ── Arms (wide white sleeves) ──
        this.drawRect(g, ox - 14, oy - 5, 10, 24, whiteCloth, rotArmSup - 15);
        this.drawRect(g, ox + 14, oy - 5, 10, 24, whiteCloth, -rotArmSup + 15);

        // ── Hands ──
        this.drawCircle(g, ox - 20, oy + 11, 4.5, skinColor);
        this.drawCircle(g, ox + 20, oy + 11, 4.5, skinColor);

        // ── Head ──
        this.drawCircle(g, ox, oy - 35, 11, skinColor);

        // ── Blood mark (horizontal dark band across face) ──
        if (!isFlashing) {
            this.drawRect(g, ox, oy - 35, 16, 3, 0x241a24);
        }

        // ── Eyes (tired purple) ──
        this.drawCircle(g, ox - 4, oy - 37, 2, isFlashing ? 0xFFFFFF : 0x7a5a73);
        this.drawCircle(g, ox + 4, oy - 37, 2, isFlashing ? 0xFFFFFF : 0x7a5a73);
        this.drawCircle(g, ox - 4, oy - 37, 0.8, isFlashing ? 0xFFFFFF : 0x111111);
        this.drawCircle(g, ox + 4, oy - 37, 0.8, isFlashing ? 0xFFFFFF : 0x111111);

        // ── Hair (dark brown with twin pigtails) ──
        this.drawCircle(g, ox, oy - 45, 9, hairColor);
        this.drawTriangle(g, ox - 7, oy - 54, 8, 16, hairColor, -25);
        this.drawTriangle(g, ox + 7, oy - 54, 8, 16, hairColor, 25);
        this.drawTriangle(g, ox - 12, oy - 44, 4, 10, hairColor, -65);
        this.drawTriangle(g, ox + 12, oy - 44, 4, 10, hairColor, 65);

        // ── Hitstun stars ──
        if (this.stateMachine.is('hitstun')) {
            const starT = this.animTimer * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(
                    x + Math.cos(angle) * 22, y - 55 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.3) * 16, y - 60 + Math.sin(angle + 0.3) * 6,
                    x + Math.cos(angle - 0.3) * 16, y - 60 + Math.sin(angle - 0.3) * 6
                );
            }
        }
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
                    victim.takeDamage(10, 0, 0, 0);
                    // Crimson drip visual
                    const drip = this.scene.add.circle(
                        victim.sprite.x + (Math.random() - 0.5) * 20,
                        victim.sprite.y + 10,
                        3, 0xDC143C, 0.8
                    ).setDepth(12);
                    this.scene.tweens.add({
                        targets: drip, y: drip.y + 30, alpha: 0,
                        duration: 600, onComplete: () => drip.destroy()
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
