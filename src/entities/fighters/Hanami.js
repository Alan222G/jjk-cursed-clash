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
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(this.charData.skills.domain.cost)) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(this.charData.skills.domain.cost);
        
        this.stateMachine.setState('idle');
        this.stateMachine.lock(1500);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_beam', { volume: 0.8 }); } catch(e) {}

        // Fire a beam first
        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 40, {
            owner: this,
            damage: 80 * this.power,
            knockbackX: 400, knockbackY: -100,
            stunDuration: 500, speed: 1200,
            direction: this.facing, color: 0x32CD32,
            size: { w: 100, h: 20 }, lifetime: 1000, type: 'beam'
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);

        this.scene.time.delayedCall(1000, () => {
            this.domainActive = true;
            this.ceSystem.startDomain();
            
            this.hanamiAwakened = true;
            this.hanamiAwakenedTimer = 15000;
            
            if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'HANAMI');
        });
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
                    // Heal Hanami if enemy is NOT inside
                    this.hp = Math.min(this.charData.stats.maxHp || 4200, this.hp + (40 * dt / 1000));
                }
            } else {
                this.hp = Math.min(this.charData.stats.maxHp || 4200, this.hp + (40 * dt / 1000));
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

    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.004);

        const colorHueso = isFlashing ? 0xFFFFFF : 0xf4f6f7;
        const colorManto = isFlashing ? 0xFFFFFF : 0x800c0c;
        const colorDetalles = isFlashing ? 0xFFFFFF : 0x111111;
        const colorRamas = isFlashing ? 0xFFFFFF : 0x4d3219;

        const ox = x;
        const oy = masterY - 15;

        // Helper drawing methods
        const drawRelRect = (dx, dy, w, h, color, rotDeg = 0) => {
            g.save();
            g.translate(ox + dx * f, oy + dy);
            g.rotate(rotDeg * f * Math.PI / 180);
            g.fillStyle(color, 1);
            g.fillRect(-w/2, -h/2, w, h);
            g.lineStyle(1.5, 0x000000, 1);
            g.strokeRect(-w/2, -h/2, w, h);
            g.restore();
        };

        const drawRelCircle = (dx, dy, r, color) => {
            const rx = ox + dx * f;
            const ry = oy + dy;
            g.fillStyle(color, 1);
            g.fillCircle(rx, ry, r);
            g.lineStyle(1.5, 0x000000, 1);
            g.strokeCircle(rx, ry, r);
        };

        const drawRelLine = (dx1, dy1, dx2, dy2, width, color) => {
            const rx1 = ox + dx1 * f;
            const ry1 = oy + dy1;
            const rx2 = ox + dx2 * f;
            const ry2 = oy + dy2;
            g.lineStyle(width, color, 1);
            g.lineBetween(rx1, ry1, rx2, ry2);
        };

        const drawRelTrapezoid = (dx, dy, topW, bottomW, h, color, rotDeg = 0) => {
            g.save();
            g.translate(ox + dx * f, oy + dy);
            g.rotate(rotDeg * f * Math.PI / 180);
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(-topW / 2, -h / 2);
            g.lineTo(topW / 2, -h / 2);
            g.lineTo(bottomW / 2, h / 2);
            g.lineTo(-bottomW / 2, h / 2);
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0x000000, 1);
            g.strokePath();
            g.restore();
        };

        // 1. LEGS (Wood legs with black crease texture)
        const legAngle = isMoving ? Math.sin(time) * 12 : 0;
        
        // Left Leg
        g.save();
        g.translate(ox - 9 * f, oy + 45);
        g.rotate(legAngle * f * Math.PI / 180);
        g.fillStyle(colorHueso, 1);
        g.fillRect(-8/2, -30/2, 8, 30);
        g.lineStyle(1.5, 0x000000, 1);
        g.strokeRect(-8/2, -30/2, 8, 30);
        if (!isFlashing) {
            g.lineStyle(1.8, 0x111111, 1);
            g.lineBetween(0, -13, 0, 13);
        }
        g.restore();

        // Right Leg
        g.save();
        g.translate(ox + 9 * f, oy + 45);
        g.rotate(-legAngle * f * Math.PI / 180);
        g.fillStyle(colorHueso, 1);
        g.fillRect(-8/2, -30/2, 8, 30);
        g.lineStyle(1.5, 0x000000, 1);
        g.strokeRect(-8/2, -30/2, 8, 30);
        if (!isFlashing) {
            g.lineStyle(1.8, 0x111111, 1);
            g.lineBetween(0, -13, 0, 13);
        }
        g.restore();

        // 2. TORSO & WAIST
        drawRelTrapezoid(0, 22, 16, 24, 20, 0x1a1a1f); // Black hakama waist
        drawRelTrapezoid(0, -8, 15, 19, 32, colorHueso); // Bone chest

        if (!isFlashing) {
            // Chest markings
            drawRelLine(-6, -18, -6, 2, 2.5, 0x111111);
            drawRelLine(6, -18, 6, 2, 2.5, 0x111111);
            drawRelCircle(-6, -8, 3, 0x111111);
            drawRelCircle(6, -8, 3, 0x111111);

            // Black belt
            drawRelRect(0, 9, 21, 5, 0x111111);
        }

        // 3. SHOULDER MANTO (Red cloak on left shoulder/back)
        drawRelTrapezoid(-14, -15, 10, 16, 18, colorManto, -15);

        // 4. ARMS
        const drawHanamiArm = (sideSign, angle, extend = 0) => {
            g.save();
            g.translate(ox + (sideSign * 12) * f, oy - 18);
            g.rotate(angle * f * Math.PI / 180);
            
            const armLen = 26 + extend;
            g.fillStyle(colorHueso, 1);
            g.fillRect(-8/2, 14 + extend/2 - armLen/2, 8, armLen);
            g.lineStyle(1.5, 0x000000, 1);
            g.strokeRect(-8/2, 14 + extend/2 - armLen/2, 8, armLen);
            
            if (!isFlashing) {
                g.lineStyle(2, 0x111111, 1);
                g.lineBetween(0, 4, 0, 24 + extend);
            }
            
            g.fillStyle(0x111111, 1);
            g.fillCircle(0, 26 + extend, 4.5);
            g.strokeCircle(0, 26 + extend, 4.5);
            
            g.restore();
        };

        const armAngleL = isMoving ? -25 + Math.sin(time) * 15 : -25;
        let rightArmAngle = isMoving ? 35 - Math.sin(time) * 15 : 35;
        let rightArmExtend = 0;
        if (this.attackSwing > 0) {
            rightArmAngle = 90;
            rightArmExtend = this.attackSwing * 35;
        }

        drawHanamiArm(-1, armAngleL, 0); // Left Arm (Back)
        drawHanamiArm(1, rightArmAngle, rightArmExtend); // Right Arm (Front)

        // 5. HEAD (White face with organic branching horns)
        drawRelCircle(0, -38, 13, colorHueso);

        if (!isFlashing) {
            // Shadow slits in face
            drawRelLine(-4, -48, -4, -28, 2.5, 0x111111);
            drawRelLine(4, -48, 4, -28, 2.5, 0x111111);

            // Horn branches coming from eye sockets
            drawRelLine(-5, -39, -15, -53, 3, colorRamas);
            drawRelLine(-10, -46, -16, -45, 1.8, colorRamas);
            drawRelLine(5, -39, 15, -53, 3, colorRamas);
            drawRelLine(10, -46, 16, -45, 1.8, colorRamas);
        }
    }
}
