// ========================================================
// Gojo Satoru — The Strongest Sorcerer
// Audio-Driven Casting System (Anime Pacing)
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Gojo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.GOJO);
        this.infinityActive = false;
        this.infinityTimer = 0;
        this.isCasting = false; // Prevents any action while casting
        this.blueAuraActive = false;
        this.blueAuraTimer = 0;
        this.blueTickTimer = 0;
        this.blueGraphics = null;
    }

    /** 
     * OVERRIDE: Hyper-Technical Tessellated Geometric Rendering 
     * Uses polygons, interlocking triangles, and Euclidean shapes to construct Gojo's anatomy.
     */
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

        const skinColor = isFlashing ? 0xFFFFFF : 0xf5ddcc;
        const suitColor = isFlashing ? 0xFFFFFF : 0x1e1b29;
        const hairColor = isFlashing ? 0xFFFFFF : 0xffffff;

        const ox = x;
        const oy = masterY;

        const rotArmSup = isMoving ? Math.sin(time) * 10 : 5;
        const rotArmInf = isMoving ? Math.sin(time + 0.5) * 8 : 10;
        const rotLegSup = isMoving ? Math.cos(time) * 4 : 0;
        const rotLegInf = isMoving ? Math.cos(time + 0.5) * 3 : 0;

        // Capa 1: Cuerpo Base (Vestimenta)
        // Legs
        this.drawRect(g, ox - 7, oy + 41, 8, 28, suitColor, rotLegSup);
        this.drawRect(g, ox - 7 + (rotLegSup*0.2), oy + 67, 7, 25, suitColor, rotLegInf);
        
        this.drawRect(g, ox + 7, oy + 41, 8, 28, suitColor, -rotLegSup);
        this.drawRect(g, ox + 7 - (rotLegSup*0.2), oy + 67, 7, 25, suitColor, -rotLegInf);

        // Torso & Neck
        this.drawRect(g, ox, oy + 18, 22, 18, suitColor);
        this.drawRect(g, ox, oy - 10, 22, 38, suitColor);
        this.drawRect(g, ox, oy - 32, 10, 12, suitColor);

        // Arms (using the rotation angles)
        this.drawRect(g, ox - 14, oy - 13, 6, 22, suitColor, rotArmSup - 10);
        this.drawRect(g, ox - 14 - (rotArmSup * 0.1), oy + 8, 5, 20, suitColor, rotArmInf - 5);

        this.drawRect(g, ox + 14, oy - 13, 6, 22, suitColor, -rotArmSup + 10);
        this.drawRect(g, ox + 14 + (rotArmSup * 0.1), oy + 8, 5, 20, suitColor, -rotArmInf + 5);

        // Head
        this.drawCircle(g, ox, oy - 45, 13, skinColor);
        
        // Blindfold (Estilo Clásico)
        this.drawRect(g, ox, oy - 45, 26, 10, 0x000000);

        // Hair (Spiky triangles)
        this.drawTriangle(g, ox, oy - 58, 10, 18, hairColor, 0);
        this.drawTriangle(g, ox + 6, oy - 56, 7, 15, hairColor, 15);
        this.drawTriangle(g, ox - 6, oy - 56, 7, 15, hairColor, -15);
        this.drawTriangle(g, ox + 11, oy - 53, 6, 12, hairColor, 30);
        this.drawTriangle(g, ox - 11, oy - 53, 6, 12, hairColor, -30);

        // Six Eyes Glow (Concentric Circles)
        if (this.hitFlash > 0 || this.infinityActive) {
            const pulse = 0.5 + Math.sin(this.animTimer * 0.006) * 0.5;
            g.fillStyle(0x44CCFF, pulse);
            g.fillCircle(ox - 5 * f, oy - 45, 3);
            g.fillCircle(ox + 5 * f, oy - 45, 3);
            g.lineStyle(1, 0xFFFFFF, pulse);
            g.strokeCircle(ox - 5 * f, oy - 45, 5);
            g.strokeCircle(ox + 5 * f, oy - 45, 5);
        }

        // ── 6. VIRTUAL SHIELDS AND AURAS ──
        if (this.stateMachine.is('infinity')) {
            const pulse = 0.4 + Math.sin(this.animTimer * 0.008) * 0.2;
            const shieldR = 60;
            const cx = x, cy = y - 15;

            // Concentric pure geometric circles
            g.lineStyle(4, 0x44CCFF, pulse + 0.4);
            g.strokeCircle(cx, cy, shieldR);
            g.lineStyle(1, 0x88EEFF, pulse * 0.4);
            g.strokeCircle(cx, cy, shieldR + 6);

            g.fillStyle(0x44CCFF, pulse * 0.15);
            g.fillCircle(cx, cy, shieldR);

            // Hexagonal Matrix nodes (Trigonometric functions)
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI / 3) + this.animTimer * 0.003;
                const hxx = cx + Math.cos(a) * 42;
                const hyy = cy + Math.sin(a) * 42;
                g.fillStyle(0x88EEFF, 0.5);
                g.fillRect(hxx - 3, hyy - 3, 6, 6); // Cuboids
                
                const nextA = ((i + 1) * Math.PI / 3) + this.animTimer * 0.003;
                g.lineStyle(1, 0x44CCFF, 0.3);
                g.beginPath(); 
                g.moveTo(hxx, hyy); 
                g.lineTo(cx + Math.cos(nextA) * 42, cy + Math.sin(nextA) * 42); 
                g.strokePath();
            }
        }

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

    trySpecialAttack() {
        if (this.isCasting) return; // Block all input during casting

        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.firePurple();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.fireRed();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castTeleportStrike();
        } else if (tier >= 1) {
            this.fireBlue();
        }
    }

    // ── Helper: Play audio then execute callback when done ──
    castWithAudio(sfxKey, callback, fallbackMs) {
        this.isCasting = true;
        this.stateMachine.lock(99999); // Lock until audio completes
        this.sprite.body.setVelocityX(0);

        let _fired = false;
        const fireAction = () => {
            if (_fired) return;
            _fired = true;
            this.isCasting = false;
            if (this.stateMachine.is('casting_domain') || this.stateMachine.locked) {
                this.stateMachine.unlock();
            }
            callback();
        };

        try {
            // Boost volume for specials (multiply by 2.0 but cap at 1)
            let rawVol = (window.gameSettings?.sfx ?? 50) / 100;
            let specialVol = Math.min(rawVol * 2.0, 1.0);
            
            const snd = this.scene.sound.add(sfxKey, { volume: specialVol });
            snd.once('complete', fireAction);
            snd.play();

            // Safety fallback in case 'complete' never fires
            this.scene.time.delayedCall(fallbackMs || 5000, fireAction);
        } catch (e) {
            // Audio failed — fire immediately
            fireAction();
        }
    }

    // ════════════════════════════════════════════
    // TELEPORT STRIKE (UP + U)
    // ════════════════════════════════════════════
    castTeleportStrike() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        
        this.isCasting = true;
        this.stateMachine.lock(600);
        this.sprite.body.setVelocity(0, 0);

        try { this.scene.sound.play('sfx_dash', { volume: 0.8 }); } catch(e){}

        // Teleport exit visual
        const xOut = this.sprite.x;
        const yOut = this.sprite.y;
        const outPulse = this.scene.add.circle(xOut, yOut, 30, 0x44CCFF, 0.8).setDepth(20);
        this.scene.tweens.add({ targets: outPulse, scale: 2, alpha: 0, duration: 200, onComplete: () => outPulse.destroy() });

        // Hide Gojo
        this.sprite.setAlpha(0);

        this.scene.time.delayedCall(150, () => {
            // Teleport destination (above and slightly in front of opponent)
            if (this.opponent && !this.opponent.isDead) {
                this.facing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;
                this.sprite.x = this.opponent.sprite.x - (30 * this.facing);
                this.sprite.y = this.opponent.sprite.y - 60;
            }

            this.sprite.setAlpha(1);

            // Teleport entry visual
            const inPulse = this.scene.add.circle(this.sprite.x, this.sprite.y, 30, 0x44CCFF, 0.8).setDepth(20);
            this.scene.tweens.add({ targets: inPulse, scale: 2, alpha: 0, duration: 200, onComplete: () => inPulse.destroy() });

            // Downward Strike
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e){}
            
            if (this.opponent) {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.opponent.sprite.x, this.opponent.sprite.y);
                if (dist < 100) {
                    const dmg = Math.floor(40 * this.power);
                    this.opponent.takeDamage(dmg, 100 * this.facing, 400, 500); // Smash down
                    this.comboSystem.registerHit('SPECIAL');
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
                }
            }

            // Visual arc
            const g = this.scene.add.graphics().setDepth(20);
            g.lineStyle(6, 0x44CCFF, 0.9);
            g.beginPath();
            g.moveTo(this.sprite.x, this.sprite.y - 20);
            g.lineTo(this.sprite.x + 40 * this.facing, this.sprite.y + 40);
            g.strokePath();
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
            
            this.scene.time.delayedCall(300, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('fall');
            });
        });
    }

    // ════════════════════════════════════════════
    // BLUE (Ao) — Gravitational Anomaly
    // ════════════════════════════════════════════
    fireBlue() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;

        this.spawnBlueEffect();

        // Lock the character briefly for 500ms, deploy fast
        this.isCasting = true;
        this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        try {
            const snd = this.scene.sound.add('sfx_blue', {
                volume: ((window.gameSettings?.sfx ?? 50) / 100) * 1.5
            });
            snd.play();
        } catch(e) {}

        this.scene.time.delayedCall(500, () => {
            // Record fixed world position — Blue stays HERE, does NOT follow Gojo
            this.blueAuraActive = true;
            this.blueAuraTimer = 4000; // Floats for 4 seconds
            this.blueTickTimer = 0;
            this.blueFixedX = this.sprite.x + 250 * this.facing; // Spawns 250px ahead
            this.blueFixedY = this.sprite.y - 15;
            this.isCasting = false;
            this.stateMachine.unlock();
            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        });
    }

    // ════════════════════════════════════════════
    // RED (Aka) — Repulsion
    // ════════════════════════════════════════════
    fireRed() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.spawnRedEffect();

        this.castWithAudio('sfx_red', () => {
            // Audio finished → fire the projectile with MASSIVE repulsion
            const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 1800,  // Triple original (600 → 1800)
                knockbackY: -500,  // Strong upward launch
                stunDuration: 700,
                speed: 450,
                direction: this.facing,
                color: 0xFF2222,
                size: { w: 35, h: 35 },
                lifetime: 1800,
                type: 'circle',
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.01, 400);
            }

            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        }, 4000);
    }

    // ════════════════════════════════════════════
    // PURPLE (Hollow Purple) — Ultimate Beam
    // ════════════════════════════════════════════
    firePurple() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        const skill = this.charData.skills.maximum;

        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0xAA00FF);
            this.scene.screenEffects.slowMotion(0.3, 1000);
        }

        // Fast convergence animation (orbiting spheres)
        const cx = this.sprite.x + 30 * this.facing;
        const cy = this.sprite.y - 15;
        const redC = this.scene.add.circle(cx, cy - 60, 25, 0xFF2222, 0.9).setDepth(15);
        const blueC = this.scene.add.circle(cx, cy + 60, 25, 0x2244FF, 0.9).setDepth(15);

        // Fast orbit
        this.scene.tweens.add({
            targets: redC,
            x: cx + 40,
            y: cy - 30,
            duration: 400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 1,
        });
        this.scene.tweens.add({
            targets: blueC,
            x: cx - 40,
            y: cy + 30,
            duration: 400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 1,
        });

        // Fast growing purple glow
        const purpleGlow = this.scene.add.circle(cx, cy, 5, 0x9922FF, 0.3).setDepth(14);
        this.scene.tweens.add({
            targets: purpleGlow,
            scaleX: 8,
            scaleY: 8,
            alpha: 0.7,
            duration: 1000,
            ease: 'Quad.easeIn',
        });

        // Stun enemy during cast (brief 1.5s lock)
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            target.stateMachine.unlock();
            target.stateMachine.lock(1500);
            target.sprite.body.setVelocity(0, 0);
        }

        this.castWithAudio('sfx_purple', () => {
            // Audio finished → clean up visuals and fire
            redC.destroy();
            blueC.destroy();
            purpleGlow.destroy();

            const proj = new Projectile(this.scene, this.sprite.x + 60 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 1200,
                knockbackY: -400,
                stunDuration: 800,
                speed: 1200,
                direction: this.facing,
                color: 0x9922FF,
                size: { w: 600, h: 600 },
                lifetime: 3000,
                type: 'circle',
                isHollowPurple: true,
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.04, 800);
            }

            // Unlock enemy unconditionally
            if (target && !target.isDead) {
                target.stateMachine.unlock();
                if (!target.stateMachine.isAny('idle', 'walk', 'jump', 'fall', 'attack')) {
                    target.stateMachine.setState('idle');
                }
            }

            this.stateMachine.setState('idle');
        }, 1500);
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnBlueEffect() {
        const x = this.sprite.x + 20 * this.facing;
        const y = this.sprite.y - 15;
        const circle = this.scene.add.circle(x, y, 15, 0x2244FF, 0.7);
        circle.setDepth(12);
        this.scene.tweens.add({
            targets: circle,
            scaleX: 10, // 15 * 10 = 150px radius (300px diameter)
            scaleY: 10,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => circle.destroy(),
        });
    }

    spawnRedEffect() {
        const x = this.sprite.x + 20 * this.facing;
        const y = this.sprite.y - 15;
        const circle = this.scene.add.circle(x, y, 20, 0xFF2222, 0.8);
        circle.setDepth(12);
        this.scene.tweens.add({
            targets: circle,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 500,
            ease: 'Power3',
            onComplete: () => circle.destroy(),
        });
    }

    // ════════════════════════════════════════════
    // DOMAIN EXPANSION — Unlimited Void
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
            return; // Own domain
        }

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();

        // ── NO FREEZE FOR CASTER ──
        // Caster can move while domain forms, only enemy is frozen by GameScene.
        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        // Play domain voice — GameScene will listen for its completion
        try {
            this.scene.sound.play('gojo_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 });
        } catch (e) { console.warn('Gojo domain voice error', e); }

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'unlimited_void');
        }
    }

    /** Sure-Hit: Unlimited Void paralyzes the opponent */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        opponent.stateMachine.unlock();
        if (!opponent.stateMachine.is('domain_stunned')) {
            opponent.stateMachine.setState('domain_stunned');
        }
        opponent.sprite.body.setVelocity(0, 0);

        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y;
        for (let i = 0; i < 2; i++) {
            const px = ox + (Math.random() - 0.5) * 60;
            const py = oy + (Math.random() - 0.5) * 80 - 20;
            const info = this.scene.add.text(px, py, 'VOID', {
                fontSize: '12px',
                color: '#44CCFF',
            }).setDepth(15).setAlpha(0.8);
            this.scene.tweens.add({
                targets: info,
                y: py - 30,
                alpha: 0,
                duration: 800,
                onComplete: () => info.destroy(),
            });
        }
    }

    // ════════════════════════════════════════════
    // UPDATE — Blue Aura Suction System
    // ════════════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);

        if (this.blueAuraActive) {
            this.blueAuraTimer -= dt;

            // Blue floats at its FIXED spawn position, NOT following Gojo
            const bx = this.blueFixedX;
            const by = this.blueFixedY;

            if (!this.blueGraphics) {
                this.blueGraphics = this.scene.add.graphics();
                this.blueGraphics.setDepth(15);
            }
            this.blueGraphics.clear();

            if (this.blueAuraTimer <= 0) {
                this.blueAuraActive = false;
                this.blueGraphics.clear();
                return;
            }

            const pulse = 0.8 + Math.sin(time * 0.01) * 0.2;

            // Blue Core (300px diameter = 150 radius)
            this.blueGraphics.fillStyle(0x2244FF, pulse);
            this.blueGraphics.fillCircle(bx, by, 150);

            // White center inner glow
            this.blueGraphics.fillStyle(0xFFFFFF, pulse * 0.6);
            this.blueGraphics.fillCircle(bx, by, 70);

            // Outer attraction rings (spinning)
            this.blueGraphics.lineStyle(4, 0x00D4FF, pulse * 0.5);
            this.blueGraphics.strokeCircle(bx, by, 150 + (time % 500) / 10);
            this.blueGraphics.lineStyle(2, 0x88EEFF, pulse * 0.3);
            this.blueGraphics.strokeCircle(bx, by, 210 + (time % 800) / 15);

            // ── MASSIVE Gravitational Suction Logic (all directions) ──
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dx = bx - target.sprite.x;
                const dy = by - target.sprite.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 400 && dist > 5) { // Pull range 400px
                    // Normalized direction vector toward blue center
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Force scales inversely: closer = stronger pull
                    const forceMagnitude = 600 * (1 - dist / 400);

                    // Pull in ALL directions (X and Y)
                    target.sprite.body.velocity.x += nx * forceMagnitude * (dt / 1000) * 8;
                    target.sprite.body.velocity.y += ny * forceMagnitude * (dt / 1000) * 5;

                    // Tick Damage if sucked in close
                    if (dist < 90) {
                        this.blueTickTimer -= dt;
                        if (this.blueTickTimer <= 0) {
                            this.blueTickTimer = 400;
                            target.takeDamage(20, (target.sprite.x > bx ? -100 : 100), -80, 250);
                            if (this.scene.screenEffects) {
                                this.scene.screenEffects.shake(0.008, 150);
                            }
                        }
                    }
                }
            }
        } else if (this.blueGraphics) {
            this.blueGraphics.clear();
        }
    }
}
