// ========================================================
// Gojo Satoru — The Strongest Sorcerer
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Gojo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.GOJO);
        this.infinityActive = false;
        this.infinityTimer = 0;
    }

    /** Blindfold + Six Eyes glow */
    drawFace(g, x, y, facing) {
        // Blindfold
        g.fillStyle(0x111122, 1);
        g.fillRect(x - 14, y - 5, 28, 7);
        // Six Eyes glow (peeking through)
        const glowPulse = 0.5 + Math.sin(this.animTimer * 0.006) * 0.3;
        g.fillStyle(0x44CCFF, glowPulse);
        g.fillCircle(x - 5 * facing, y - 2, 3);
        g.fillCircle(x + 5 * facing, y - 2, 3);
    }

    trySpecialAttack() {
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.firePurple();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            // Aka — Red (Repulsion)
            this.fireRed();
        } else if (tier >= 1) {
            // Ao — Blue (Attraction)
            this.fireBlue();
        }
    }

    fireBlue() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        
        // Activate Gravitational Anomaly (Ao)
        this.blueAuraActive = true;
        this.blueAuraTimer = 3500; // Lasts 3.5 seconds on the field
        this.blueTickTimer = 0;
        
        try {
            this.scene.sound.play('sfx_blue', { volume: (window.gameSettings?.sfx || 50) / 100 });
        } catch(e) {}

        this.spawnBlueEffect();
    }

    fireRed() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 15, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 600,
            knockbackY: -200,
            stunDuration: 500,
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

        try {
            this.scene.sound.play('sfx_red', { volume: (window.gameSettings?.sfx || 50) / 100 });
        } catch(e) {}

        this.spawnRedEffect();

        if (this.scene.screenEffects) {
            this.scene.screenEffects.shake(0.004, 200);
        }
    }

    spawnBlueEffect() {
        const x = this.sprite.x + 20 * this.facing;
        const y = this.sprite.y - 15;
        const circle = this.scene.add.circle(x, y, 15, 0x2244FF, 0.7);
        circle.setDepth(12);
        this.scene.tweens.add({
            targets: circle,
            scaleX: 2.5,
            scaleY: 2.5,
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

    firePurple() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        const skill = this.charData.skills.maximum;

        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0xAA00FF);
            this.scene.screenEffects.slowMotion(0.2, 800);
        }

        const x = this.sprite.x + 30 * this.facing;
        const y = this.sprite.y - 15;

        // Combine Red and Blue visual
        const redC = this.scene.add.circle(x, y - 20, 20, 0xFF2222, 0.9).setDepth(15);
        const blueC = this.scene.add.circle(x, y + 20, 20, 0x2244FF, 0.9).setDepth(15);
        
        this.scene.tweens.add({
            targets: [redC, blueC],
            y: y,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                redC.destroy();
                blueC.destroy();

                // Fire the massive purple beam
                const proj = new Projectile(this.scene, this.sprite.x + 60 * this.facing, this.sprite.y - 15, {
                    owner: this,
                    damage: Math.floor(skill.damage * this.power),
                    knockbackX: 1200,
                    knockbackY: -400,
                    stunDuration: 800,
                    speed: 1200,
                    direction: this.facing,
                    color: 0x9922FF,
                    size: { w: 150, h: 150 }, // Scaled to 150px (1.5x Blue)
                    lifetime: 3000,
                    type: 'circle',
                });
                
                if (this.scene.projectiles) {
                    this.scene.projectiles.push(proj);
                }
                
                try {
                    this.scene.sound.play('sfx_purple', { volume: (window.gameSettings?.sfx || 50) / 100 });
                } catch(e) {}
                
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.shake(0.02, 500);
                }
            }
        });
    }

    tryActivateDomain() {
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.domainActive) return;

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();

        // Force-unlock so the state transition always succeeds
        this.stateMachine.unlock();
        this.stateMachine.setState('casting_domain');

        // Play domain voice
        try {
            this.scene.sound.play('gojo_domain_voice', { volume: (window.gameSettings?.sfx || 50) / 100 });
        } catch(e) { console.warn('Gojo domain voice error', e); }

        // Notify GameScene to handle cinematic phase
        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'unlimited_void');
        }
    }

    /** Sure-Hit: Unlimited Void paralyzes the opponent */
    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        // Paralysis — force opponent into stunned state
        opponent.stateMachine.unlock();
        if (!opponent.stateMachine.is('domain_stunned')) {
            opponent.stateMachine.setState('domain_stunned');
        }
        opponent.sprite.body.setVelocity(0, 0);

        // Visual: information overload particles around opponent
        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y;
        for (let i = 0; i < 2; i++) {
            const px = ox + (Math.random() - 0.5) * 60;
            const py = oy + (Math.random() - 0.5) * 80 - 20;
            const info = this.scene.add.text(px, py, '∞', {
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

    // ── Update Override ──
    update(time, dt) {
        super.update(time, dt);

        if (this.blueAuraActive) {
            this.blueAuraTimer -= dt;
            
            // Draw Giant Blue Sphere tethered to Gojo's front
            const bx = this.sprite.x + 100 * this.facing;
            const by = this.sprite.y - 15;
            
            this.scene.graphics = this.scene.graphics || this.scene.add.graphics();
            this.scene.graphics.setDepth(15);
            // We use tweens and visual objects per frame or just graphics?
            // Safer to use GameScene's persistent graphics or manage our own.
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
            
            // Blue Core
            this.blueGraphics.fillStyle(0x2244FF, pulse);
            this.blueGraphics.fillCircle(bx, by, 50); // 100px diameter
            
            // White center inner glow
            this.blueGraphics.fillStyle(0xFFFFFF, pulse * 0.6);
            this.blueGraphics.fillCircle(bx, by, 25);
            
            // Outer attraction rings
            this.blueGraphics.lineStyle(4, 0x00D4FF, pulse * 0.5);
            this.blueGraphics.strokeCircle(bx, by, 50 + (time % 500) / 10);
            
            // ── Gravitational Suction Logic ──
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(bx - target.sprite.x);
                if (dist < 300) { // Attraction range
                    // Pull target towards the sphere
                    const pullForce = (target.sprite.x > bx) ? -200 : 200;
                    // Apply smooth pull overcoming their movement
                    target.sprite.body.velocity.x += pullForce * (dt/1000);
                    
                    // Tick Damage if they are sucked in close enough!
                    if (dist < 80) {
                        this.blueTickTimer -= dt;
                        if (this.blueTickTimer <= 0) {
                            this.blueTickTimer = 500; // Damage every half second
                            target.takeDamage(15, (target.sprite.x > bx ? -50 : 50), -50, 200);
                            this.scene.screenEffects.shake(0.005, 100);
                            
                            try {
                                this.scene.sound.play('sfx_blue', { volume: ((window.gameSettings?.sfx || 50) / 100) * 0.5 });
                            } catch(e) {}
                        }
                    }
                }
            }
        } else if (this.blueGraphics) {
            this.blueGraphics.clear();
        }
    }
}
