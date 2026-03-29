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
        const skill = this.charData.skills.skill1;

        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 15, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: -300, // Attract
            knockbackY: -80,
            stunDuration: 300,
            speed: 550,
            direction: this.facing,
            color: 0x2244FF,
            size: { w: 50, h: 50 },
            lifetime: 1500,
            type: 'circle',
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }

        try {
            if (this.scene.sound.get('sfx_blue')) {
                this.scene.sound.play('sfx_blue', { volume: (window.gameSettings?.sfx || 50) / 100 });
            }
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
            if (this.scene.sound.get('sfx_red')) {
                this.scene.sound.play('sfx_red', { volume: (window.gameSettings?.sfx || 50) / 100 });
            }
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
                    size: { w: 100, h: 100 },
                    lifetime: 3000,
                    type: 'circle',
                });
                
                if (this.scene.projectiles) {
                    this.scene.projectiles.push(proj);
                }
                
                try {
                    if (this.scene.sound.get('sfx_purple')) {
                        this.scene.sound.play('sfx_purple', { volume: (window.gameSettings?.sfx || 50) / 100 });
                    }
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
            if (this.scene.sound.get('gojo_domain_voice')) {
                this.scene.sound.play('gojo_domain_voice', { volume: (window.gameSettings?.sfx || 50) / 100 });
            }
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
}
