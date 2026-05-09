// ========================================================
// Kenjaku (Geto's Body) — The Ancient Sorcerer
// Cursed Spirit Manipulation: Worm, Summoned Spirit, Uzumaki
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Kenjaku extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.KENJAKU);
        this.isCasting = false;
        
        // Custom trackers for specialized projectiles and summons
        this.activeWorms = [];
        this.activeCurses = []; // Array to hold living AI curses
        
        this.selectedAICurse = 0; // 0:Dumb, 1:Strong, 2:Distance, 3:Control
        this.curseNames = ["MALDICIÓN: TONTA", "MALDICIÓN: TANQUE", "MALDICIÓN: DISTANCIA", "MALDICIÓN: CONTROL"];
    }

    swapAICurse() {
        this.selectedAICurse = (this.selectedAICurse + 1) % 4;
        
        // Show pop-up text
        const text = this.scene.add.text(this.sprite.x, this.sprite.y - 120, this.curseNames[this.selectedAICurse], {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#8822CC', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: text,
            y: this.sprite.y - 150,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    /** Stitched forehead with sinister eyes */
    drawFace(g, x, y, facing) {
        // Purple calculating eyes
        g.fillStyle(0xAA66FF, 1);
        g.fillCircle(x - 5 * facing, y - 2, 2.5);
        g.fillCircle(x + 5 * facing, y - 2, 2.5);
        // Forehead stitch line (Kenjaku's signature)
        g.lineStyle(2, 0x333333, 0.9);
        g.beginPath();
        g.moveTo(x - 10, y - 8);
        g.lineTo(x + 10, y - 8);
        g.strokePath();
        // Stitch marks
        for (let i = -8; i <= 8; i += 4) {
            g.lineStyle(1, 0x444444, 0.7);
            g.beginPath();
            g.moveTo(x + i, y - 10);
            g.lineTo(x + i, y - 6);
            g.strokePath();
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 2 && this.input.isDown('DOWN')) {
            this.castUzumaki();
            return;
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.castBirdCurse();
            return;
        }
        
        if (tier >= 1) {
            if (this.input.isDown('LEFT') || this.input.isDown('RIGHT')) {
                // Hookworm guiado direccionalmente
                this.castWormProjectile(this.input.isDown('LEFT') ? -1 : 1);
            } else {
                // Invoca la maldición seleccionada por la IA
                this.castAICurse(this.selectedAICurse);
            }
        }
    }

    update(dt) {
        super.update(dt);
        this.updateAICurses(dt);
    }
    
    // ════════════════════════════════════════════
    // AI SUMMONING LOGIC
    // ════════════════════════════════════════════
    castAICurse(typeIndex) {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        this.spawnWormEffect();

        const xPos = this.sprite.x + ((typeIndex === 2 || typeIndex === 3) ? -40 * this.facing : 80 * this.facing);
        const yPos = this.sprite.y - ((typeIndex === 3) ? 150 : 50);

        let newCurse = {
            type: typeIndex,
            x: xPos,
            y: yPos,
            facing: this.facing,
            timer: 0,
            sprite: this.scene.add.rectangle(xPos, yPos, 40, 40, 0xFFFFFF).setDepth(14),
            alive: true
        };

        if (typeIndex === 0) {
            // Dumb
            newCurse.hp = 9999; 
            newCurse.sprite.fillColor = 0xFF5555;
            newCurse.sprite.setSize(30, 30);
            newCurse.target = null; // Decided by AI
            newCurse.state = 'idle'; 
        } else if (typeIndex === 1) {
            // Strong
            newCurse.hp = 400;
            newCurse.sprite.fillColor = 0x55FF55;
            newCurse.sprite.setSize(80, 100);
            newCurse.state = 'walk';
        } else if (typeIndex === 2) {
            // Distance
            newCurse.hp = 150;
            newCurse.sprite.fillColor = 0x5555FF;
            newCurse.sprite.setSize(40, 40);
        } else if (typeIndex === 3) {
            // Control
            newCurse.hp = 150;
            newCurse.sprite.fillColor = 0xFFFF55;
            newCurse.sprite.setSize(60, 20);
        }

        // Add physical hitbox body if mortal to receive damage
        if (typeIndex !== 0) {
            this.scene.physics.add.existing(newCurse.sprite);
            newCurse.sprite.body.setAllowGravity(false);
            newCurse.sprite.body.setImmovable(true);
        }

        this.activeCurses.push(newCurse);

        // Flash
        const flash = this.scene.add.circle(xPos, yPos, 30, 0x111111, 0.8).setDepth(15);
        this.scene.tweens.add({ targets: flash, alpha: 0, scaleX: 3, scaleY: 3, duration: 400, onComplete: () => flash.destroy() });
    }

    updateAICurses(dt) {
        const opp = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        
        for (let i = this.activeCurses.length - 1; i >= 0; i--) {
            let curse = this.activeCurses[i];
            
            // Vulnerability logic
            if (curse.invulTimer > 0) curse.invulTimer -= dt;

            // Check mortality
            if (curse.hp <= 0 && curse.alive) {
                curse.alive = false;
                this.scene.tweens.add({
                    targets: curse.sprite, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, 
                    onComplete: () => curse.sprite.destroy()
                });
                this.activeCurses.splice(i, 1);
                continue;
            }

            // Check hit from opponent's physical attacks
            if (curse.alive && curse.type !== 0 && opp.hitbox.body.enable && (curse.invulTimer || 0) <= 0) {
                const cb = curse.sprite.getBounds();
                const ob = opp.hitbox.getBounds();
                if (Phaser.Geom.Intersects.RectangleToRectangle(cb, ob)) {
                    curse.sprite.fillColor = 0xFFFFFF; // Flash white
                    this.scene.time.delayedCall(100, () => {
                        if (curse.alive) {
                            if (curse.type===1) curse.sprite.fillColor = 0x55FF55;
                            if (curse.type===2) curse.sprite.fillColor = 0x5555FF;
                            if (curse.type===3) curse.sprite.fillColor = 0xFFFF55;
                        }
                    });
                    curse.hp -= (opp.currentAttack?.damage || 20);
                    curse.invulTimer = 400; // 0.4s iframes
                    
                    if (this.scene.spawnDamageNumber) {
                        this.scene.spawnDamageNumber(curse.sprite.x, curse.sprite.y - 30, (opp.currentAttack?.damage || 20));
                    }
                }
            }

            curse.timer += dt;

            // --- DUMB CURSE AI ---
            if (curse.type === 0) {
                // Every 2 seconds decide what to do
                if (curse.timer > 2000) {
                    curse.timer -= 2000;
                    let roll = Math.random();
                    if (roll < 0.33) {
                        curse.state = 'attack_opp';
                        curse.target = opp;
                    } else if (roll < 0.66) {
                        curse.state = 'attack_self';
                        curse.target = this; // Attack Kenjaku!
                    } else {
                        curse.state = 'dance';
                    }
                }
                
                if (curse.state === 'dance') {
                    curse.sprite.y = this.sprite.y - 50 + Math.sin(this.scene.time.now * 0.01) * 20;
                } else if (curse.state === 'attack_opp' || curse.state === 'attack_self') {
                    let tgt = curse.target;
                    let dir = Math.sign(tgt.sprite.x - curse.sprite.x);
                    curse.sprite.x += dir * (150 * dt / 1000); // Walk speed
                    curse.sprite.y = this.sprite.y - 15; // Ground level

                    // Collision check
                    if (Math.abs(tgt.sprite.x - curse.sprite.x) < 40) {
                        tgt.takeDamage(15, 200 * dir, -100, 300);
                        // Stop attacking after hit
                        curse.state = 'dance';
                    }
                }
            }
            
            // --- STRONG CURSE AI ---
            else if (curse.type === 1) {
                // Walks slowly towards opponent constantly
                let dir = Math.sign(opp.sprite.x - curse.sprite.x);
                curse.sprite.x += dir * (80 * dt / 1000);
                
                if (curse.timer > 2500) {
                    curse.timer -= 2500;
                    // Try to hit if close
                    if (Math.abs(opp.sprite.x - curse.sprite.x) < 70) {
                        curse.sprite.fillColor = 0xFFFFFF; // Flash
                        this.scene.time.delayedCall(100, () => { if(curse.alive) curse.sprite.fillColor = 0x55FF55; });
                        opp.takeDamage(50, 450 * dir, -300, 800);
                    }
                }
            }

            // --- DISTANCE CURSE AI ---
            else if (curse.type === 2) {
                // Floats behind Kenjaku
                let targetX = this.sprite.x - 90 * this.facing;
                curse.sprite.x += (targetX - curse.sprite.x) * 0.1;
                curse.sprite.y = this.sprite.y - 60 + Math.sin(this.scene.time.now * 0.005) * 10;

                // Shoots every 3s
                if (curse.timer > 3000) {
                    curse.timer -= 3000;
                    const proj = new Projectile(this.scene, curse.sprite.x, curse.sprite.y, {
                        owner: this, damage: 15, knockbackX: 150 * this.facing, knockbackY: -50,
                        stunDuration: 300, speed: 600, direction: this.facing,
                        color: 0x5555FF, size: { w: 20, h: 20 }, lifetime: 2000, type: 'circle'
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                }
            }

            // --- CONTROL CURSE AI ---
            else if (curse.type === 3) {
                // Floats high above Kenjaku
                let targetX = this.sprite.x;
                curse.sprite.x += (targetX - curse.sprite.x) * 0.05;
                curse.sprite.y = this.sprite.y - 180 + Math.sin(this.scene.time.now * 0.003) * 15;

                // Sky beam every 4s
                if (curse.timer > 4000) {
                    curse.timer -= 4000;
                    let dropX = opp.sprite.x;
                    
                    // Warning marker
                    const warn = this.scene.add.rectangle(dropX, this.sprite.y, 60, 400, 0xFFFF00, 0.2).setOrigin(0.5, 1);
                    this.scene.time.delayedCall(600, () => {
                        warn.destroy();
                        const beam = this.scene.add.rectangle(dropX, this.sprite.y, 60, 400, 0xFFFF55, 1).setOrigin(0.5, 1);
                        this.scene.tweens.add({ targets: beam, alpha: 0, scaleX: 1.5, duration: 300, onComplete: () => beam.destroy() });
                        
                        // Hit check
                        if (Math.abs(opp.sprite.x - dropX) < 40) {
                            opp.takeDamage(10, 0, 0, 1500); // 1.5s Stun!
                        }
                    });
                }
            }
        }
    }

    // ════════════════════════════════════════════
    // SKILL 1: WORM PROJECTILE — Giant dragging worm
    // ════════════════════════════════════════════
    castWormProjectile(directionOverride = null) {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        this.spawnWormEffect();

        const castDir = directionOverride !== null ? directionOverride : this.facing;

        // Fire a large worm projectile
        const proj = new Projectile(this.scene, this.sprite.x + 50 * castDir, this.sprite.y - 50, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 0,
            knockbackY: 0,
            stunDuration: 1000,
            speed: 500,
            direction: castDir,
            color: 0x3B2043,
            size: { w: 180, h: 80 },
            lifetime: 2500,
            type: 'worm',
            onHitCallback: (projectile, target) => {
                // Ignore if already swallowed someone
                if (projectile.swallowedTarget) return true; 

                // Swallow the target!
                projectile.swallowedTarget = target;
                target.takeDamage(projectile.damage, 0, 0, 500);
                target.sprite.setAlpha(0); // Invisible, inside the stomach
                target.stateMachine.lock(projectile.lifetime);
                target.isInvulnerable = true; 
                
                // Return true to prevent projectile from destroying itself
                return true; 
            }
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
            this.activeWorms.push(proj);
        }
    }

    // ════════════════════════════════════════════
    // SKILL 2 (DOWN): TANK CURSE — Slow, heavy damage
    // ════════════════════════════════════════════
    castTankCurse() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;
        this.spawnWormEffect(); 

        const proj = new Projectile(this.scene, this.sprite.x + 80 * this.facing, this.sprite.y - 20, {
            owner: this,
            damage: Math.floor(skill.damage * this.power * 1.5),
            knockbackX: 400 * this.facing,
            knockbackY: -300,
            stunDuration: 1200,
            speed: 250, // Very slow
            direction: this.facing,
            color: 0x4B5320, // Army green
            size: { w: 120, h: 120 },
            lifetime: 4000,
            type: 'heavy'
        });

        if (this.scene.projectiles) this.scene.projectiles.push(proj);
    }

    // ════════════════════════════════════════════
    // SKILL 3 (LEFT/RIGHT): SWARM CURSE — Fast multi-hits
    // ════════════════════════════════════════════
    castSwarmCurse() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;
        this.spawnWormEffect(); 

        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 40 - (i * 20), {
                    owner: this,
                    damage: Math.floor(skill.damage * this.power * 0.3),
                    knockbackX: 100 * this.facing,
                    knockbackY: -50,
                    stunDuration: 300,
                    speed: 800 + (Math.random() * 200), // Very fast
                    direction: this.facing,
                    color: 0x8822CC,
                    size: { w: 25, h: 25 },
                    lifetime: 1500,
                    type: 'circle'
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }
    }

    // ════════════════════════════════════════════
    // SKILL 4 (UP): BIRD CURSE — Airborne diagonal
    // ════════════════════════════════════════════
    castBirdCurse() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;
        this.spawnWormEffect(); 

        // Spawns high up
        const proj = new Projectile(this.scene, this.sprite.x, this.sprite.y - 250, {
            owner: this,
            damage: Math.floor(skill.damage * this.power * 0.8),
            knockbackX: 200 * this.facing,
            knockbackY: 0,
            stunDuration: 600,
            speed: 550, 
            direction: this.facing,
            color: 0x33AADD,
            size: { w: 60, h: 40 },
            lifetime: 2000,
            type: 'slash'
        });
        
        // Add downward velocity logic to projectile
        proj.sprite.body.setVelocityY(250);

        if (this.scene.projectiles) this.scene.projectiles.push(proj);
    }

    // ════════════════════════════════════════════
    // MAXIMUM UZUMAKI — Devastating spirit beam
    // ════════════════════════════════════════════
    castUzumaki() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.isCasting = true;
        this.stateMachine.lock(2500);
        this.sprite.body.setVelocityX(0);

        // Charge-up VFX
        this.spawnUzumakiChargeEffect();

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 500);
        }

        this.scene.time.delayedCall(700, () => {
            // Massive beam projectile spanning screen
            const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: 0, // Handled continuously
                knockbackX: 0,
                knockbackY: 0,
                stunDuration: 100,
                speed: 0, // Stationary relative to origin, but spans the map
                direction: this.facing,
                color: 0x8844CC,
                size: { w: 1500, h: 120 },
                lifetime: 1800, // active for 1.8s
                type: 'uzumaki',
                onHitCallback: (projectile, victim) => {
                    // Continuous tick damage
                    if (!projectile.tickTimer) projectile.tickTimer = 0;
                    
                    const now = projectile.timer; // 0 to 1800
                    if (now - projectile.tickTimer > 150) { // dmg every 150ms
                        victim.takeDamage(18 * this.power, 60 * this.facing, 0, 300);
                        projectile.tickTimer = now;
                    }
                    return true; // Don't destroy!
                }
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.06, 1800);
            }

            this.scene.time.delayedCall(1800, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            });
        });
    }

    // ════════════════════════════════════════════
    // DOMAIN — Womb Profusion
    // ════════════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clashPossible = this.scene.attemptDomainClash(this);
                if (!clashPossible) return;
            } else {
                return;
            }
        } else if (this.domainActive) {
            return;
        }

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();

        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        try {
            this.scene.sound.play('gojo_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 });
        } catch (e) {}

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'womb_profusion');
        }
    }

    /** Sure-Hit: Gravity Crush */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        
        // Heavy crush damage and knockback
        opponent.takeDamage(35, 0, 800, 300); // 800 positive Y = DOWN into the ground
        
        // Force them down into the floor
        opponent.sprite.body.setVelocityY(800); 
        opponent.isOnGround = true; // Pretend they are grounded immediately
        if (opponent.stateMachine.isAny('jump', 'fall')) {
            opponent.stateMachine.setState('hitstun'); // Cancel jumps
        }

        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y;
        
        // Gravity visual effect (dark red pillars from sky)
        const g = this.scene.add.graphics().setDepth(15);
        g.fillStyle(0x330011, 0.6);
        g.fillRect(ox - 30, oy - 600, 60, 620);
        g.lineStyle(4, 0x881122, 0.8);
        g.strokeRect(ox - 30, oy - 600, 60, 620);
        
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
        if (this.scene.screenEffects) {
            this.scene.screenEffects.shake(0.015, 200);
        }
    }

    // ════════════════════════════════════════════
    // UPDATE LOGIC
    // ════════════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);

        // ── Worm Abduction Logic ──
        if (this.activeWorms.length > 0) {
            for (let i = this.activeWorms.length - 1; i >= 0; i--) {
                const w = this.activeWorms[i];
                if (w.alive && w.swallowedTarget) {
                    
                    // Asegurar que el gusano y su víctima no salgan físicamente de la pantalla
                    // (Los límites del juego físico son de 0 a 1280 aproximadamente)
                    let clampedX = w.sprite.x;
                    if (clampedX < 40) clampedX = 40;
                    if (clampedX > 1240) clampedX = 1240;
                    
                    if (w.sprite.x < 30 || w.sprite.x > 1250) {
                        w.destroy(); // Forzar estallido contra la pared si exceden los límites
                    } else {
                        // Pull target along with the worm
                        w.swallowedTarget.sprite.setPosition(clampedX, w.sprite.y);
                        w.swallowedTarget.sprite.body.setVelocity(w.sprite.body.velocity.x, 0); // nullify gravity
                        w.swallowedTarget.sprite.setAlpha(0); // keep hidden
                        if (w.swallowedTarget.graphics) w.swallowedTarget.graphics.setAlpha(0); // ocultar hitbox visual
                        w.swallowedTarget.isInvulnerable = true;
                    }
                } else if (!w.alive && w.swallowedTarget) {
                    // Worm died or expired, pop them out!
                    const t = w.swallowedTarget;
                    t.sprite.setAlpha(1);
                    if (t.graphics) t.graphics.setAlpha(1); // devolver la hitbox visual
                    t.isInvulnerable = false;
                    t.stateMachine.unlock();
                    t.stateMachine.setState('knockdown');
                    t.takeDamage(10, 200 * w.direction, -300, 600); // Toss them to the floor
                    w.swallowedTarget = null;
                    this.activeWorms.splice(i, 1);
                } else if (!w.alive) {
                    this.activeWorms.splice(i, 1);
                }
            }
        }

        // ── Summoned Beast AI ──
        if (this.summonedSpirit && this.spiritTarget) {
            this.spiritTimer -= dt;

            if (this.spiritTimer <= 0 || this.spiritTarget.isDead) {
                this.destroySpirit();
                return;
            }

            const spirit = this.summonedSpirit;
            const target = this.spiritTarget;
            spirit.animTimer += dt;

            const dx = target.sprite.x - spirit.x;
            const dy = (target.sprite.y - 10) - spirit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (spirit.state !== 'attack') {
                spirit.facing = dx > 0 ? 1 : -1;
            }

            // Movement rules
            const speed = 260 * (dt / 1000); // Fast beast
            if (spirit.state !== 'attack') {
                if (dist > 70) {
                    spirit.state = 'walk';
                    spirit.x += (dx / dist) * speed;
                    spirit.y += (dy / dist) * speed * 0.8;
                } else {
                    spirit.state = 'idle';
                }
            }

            // Attack logic
            spirit.attackCooldown -= dt;
            if (dist < 80 && spirit.attackCooldown <= 0 && spirit.state !== 'attack') {
                spirit.attackCooldown = 1500; // Attack every 1.5s
                spirit.state = 'attack';
                spirit.animTimer = 0;
                
                // Deal damage immediately
                if (!target.isDead) {
                    target.takeDamage(45, 120 * spirit.facing, -80, 400); // Built like a heavy attack
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.02, 150);
                    }
                }
                
                // Return to idle after attack anim ends
                this.scene.time.delayedCall(400, () => {
                    if (this.summonedSpirit) this.summonedSpirit.state = 'idle';
                });
            }

            this.drawSummonedBeast(spirit, time);
        }
    }

    drawSummonedBeast(spirit, time) {
        if (!this.spiritGraphics) return;
        this.spiritGraphics.clear();

        const x = spirit.x;
        const y = spirit.y;
        const f = spirit.facing;
        const g = this.spiritGraphics;

        const bob = spirit.state === 'walk' ? Math.sin(spirit.animTimer * 0.02) * 8 : Math.sin(time * 0.005) * 4;
        const torsoY = y + bob;

        // ── Drawing a 4-Armed Beast ──
        // Back Arms
        g.lineStyle(10, 0x1A0D22, 1);
        g.beginPath();
        // Top Back arm
        let bAng1 = f > 0 ? -Math.PI/4 : Math.PI + Math.PI/4;
        if(spirit.state === 'attack') bAng1 += (1 - spirit.animTimer/400) * 1.5 * f;
        g.moveTo(x, torsoY - 20);
        g.lineTo(x + Math.cos(bAng1)*50, torsoY - 20 + Math.sin(bAng1)*50);
        g.strokePath();

        // Bottom Back Arm
        let bAng2 = f > 0 ? Math.PI/6 : Math.PI - Math.PI/6;
        g.beginPath();
        g.moveTo(x, torsoY);
        g.lineTo(x + Math.cos(bAng2)*40, torsoY + Math.sin(bAng2)*40);
        g.strokePath();

        // Beast Body
        g.fillStyle(0x221133, 1);
        g.fillEllipse(x, torsoY, 45, 65); // Torso

        // Beast Head
        const hx = x + 10 * f;
        const hy = torsoY - 45;
        g.fillStyle(0x331144, 1);
        g.fillEllipse(hx, hy, 25, 20);

        // Spikes on back
        g.fillStyle(0x110011, 1);
        for(let i=0; i<3; i++){
            const sx = x - 15 * f;
            const sy = torsoY - 20 + (i*15);
            g.fillTriangle(sx, sy, sx - 20*f, sy - 10, sx, sy - 10);
        }

        // Eyes (6 eyes!)
        g.fillStyle(0xFF0055, 1);
        for(let i=0; i<3; i++) {
            g.fillCircle(hx + (5 + i*4) * f, hy - 5 + i*2, 2);
        }
        // Mouth full of fangs
        g.fillStyle(0xDDDDDD, 1);
        g.fillTriangle(hx + 8*f, hy + 5, hx + 18*f, hy + 5, hx + 13*f, hy + 12);

        // Front Arms
        g.lineStyle(12, 0x331144, 1);
        g.beginPath();
        // Top Front arm
        let fAng1 = f > 0 ? -Math.PI/6 : Math.PI + Math.PI/6;
        if(spirit.state === 'attack') fAng1 += Math.sin(spirit.animTimer*0.02) * -1.2 * f; // Smash down
        else if (spirit.state === 'walk') fAng1 += Math.cos(spirit.animTimer*0.015) * 0.5;
        
        g.moveTo(x + 10*f, torsoY - 20);
        g.lineTo(x + 10*f + Math.cos(fAng1)*60, torsoY - 20 + Math.sin(fAng1)*60);
        g.strokePath();

        // Bottom Front Arm
        let fAng2 = f > 0 ? Math.PI/4 : Math.PI - Math.PI/4;
        if (spirit.state === 'walk') fAng2 += Math.sin(spirit.animTimer*0.015) * -0.5;
        g.beginPath();
        g.moveTo(x + 5*f, torsoY + 10);
        g.lineTo(x + 5*f + Math.cos(fAng2)*50, torsoY + 10 + Math.sin(fAng2)*50);
        g.strokePath();
    }

    destroySpirit() {
        if (this.spiritGraphics) {
            const x = this.summonedSpirit ? this.summonedSpirit.x : this.sprite.x;
            const y = this.summonedSpirit ? this.summonedSpirit.y : this.sprite.y;
            
            // Death blood splash
            const puff = this.scene.add.circle(x, y, 40, 0x440022, 0.8).setDepth(15);
            this.scene.tweens.add({
                targets: puff, alpha: 0, scaleX: 2, scaleY: 2, duration: 400, onComplete: () => puff.destroy()
            });

            this.spiritGraphics.clear();
            this.spiritGraphics.destroy();
            this.spiritGraphics = null;
        }
        this.summonedSpirit = null;
        this.spiritTarget = null;
        this.spiritTimer = 0;
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnWormEffect() {
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x000000, 150, 0.8);
        }
    }

    spawnUzumakiChargeEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 50;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Massive swirling pool
        for (let i = 0; i < 30; i++) {
            const angle = (i * Math.PI * 2) / 30;
            const r1 = 150;
            const sx = x + Math.cos(angle) * r1;
            const sy = y + Math.sin(angle) * r1;
            
            g.lineStyle(3, 0x550088, 0.8);
            g.beginPath(); g.moveTo(sx, sy); g.lineTo(x + 50*this.facing, y); g.strokePath();
        }

        const orb = this.scene.add.circle(x + 50 * this.facing, y, 10, 0x000000, 1.0).setDepth(16);
        orb.setStrokeStyle(4, 0xAA00FF);

        this.scene.tweens.add({
            targets: orb, scaleX: 6, scaleY: 6, duration: 700, onComplete: () => orb.destroy()
        });
        
        this.scene.tweens.add({
            targets: g, alpha: 0, duration: 700, onComplete: () => g.destroy()
        });
    }
}
