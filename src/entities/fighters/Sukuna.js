// ========================================================
// Ryomen Sukuna — King of Curses
// Audio-Driven Casting System (Anime Pacing)
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Sukuna extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.SUKUNA);
        this.slashEffects = [];
        this.isCasting = false;
    }

    /** Menacing eyes */
    drawFace(g, x, y, facing) {
        // Just small red eyes as requested
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(x - 5 * facing, y - 2, 2);
        g.fillCircle(x + 5 * facing, y - 2, 2);
    }

    trySpecialAttack() {
        if (this.isCasting) return;

        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castDivineFlame();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castCleave();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.castRush();
        } else if (tier >= 1) {
            this.castDismantle();
        }
    }

    // ── Helper: Play audio then execute callback when done ──
    castWithAudio(sfxKey, callback, fallbackMs) {
        this.isCasting = true;
        this.stateMachine.lock(99999);
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
            let specialVol = rawVol * 4.0;
            
            const snd = this.scene.sound.add(sfxKey, { volume: specialVol });
            snd.once('complete', fireAction);
            snd.play();

            this.scene.time.delayedCall(fallbackMs || 5000, fireAction);
        } catch (e) {
            fireAction();
        }
    }

    // ════════════════════════════════════════════
    // RUSH — DBZ-Style Dash (sfx_dash → then hit)
    // ════════════════════════════════════════════
    castRush() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;

        this.castWithAudio('sfx_dash', () => {
            // Audio finished → execute the rush dash
            this.stateMachine.unlock();
            this.stateMachine.setState('attack');
            this.attackPhase = 'active';
            this.hitConnected = false;

            this.sprite.body.setVelocityX(800 * this.facing);

            const skill = this.charData.skills.skill1;
            this.currentAttack = {
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 100,
                knockbackY: -50,
                stunDuration: 1000,
                type: 'SPECIAL'
            };

            this.enableHitbox({ range: 45, hitboxW: 70, hitboxH: 50 });

            this.scene.time.delayedCall(250, () => {
                this.disableHitbox();
                this.sprite.body.setVelocityX(0);
                this.attackPhase = 'none';
                this.currentAttack = null;
                if (this.stateMachine.is('attack')) {
                    this.stateMachine.setState('idle');
                }
            });
        }, 3000);
    }

    // ════════════════════════════════════════════
    // DISMANTLE — Ranged Slash
    // ════════════════════════════════════════════
    castDismantle() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        this.spawnSlashEffect(this.sprite.x + 30 * this.facing, this.sprite.y, 0xAAAAAA, 40);

        this.castWithAudio('sfx_slash', () => {
            // Audio finished → fire the slash projectile
            const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 150,
                knockbackY: -50,
                stunDuration: 250,
                speed: 800,
                direction: this.facing,
                color: 0x000000,
                size: { w: 40, h: 40 },
                lifetime: 1000,
                type: 'slash',
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        }, 4000);
    }

    // ════════════════════════════════════════════
    // CLEAVE — AOE Slash
    // ════════════════════════════════════════════
    castCleave() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.castWithAudio('sfx_cleave', () => {
            // Audio finished → execute the cleave
            this.spawnCleaveEffect();

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 350) {
                    const dmg = Math.floor(skill.damage * this.power);
                    this.opponent.takeDamage(dmg, 400 * this.facing, -250, 500);
                    this.comboSystem.registerHit('SPECIAL');

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.006, 300);
                        this.scene.screenEffects.hitFreeze(120);
                    }
                }
            }

            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        }, 4000);
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnSlashEffect(x, y, color, size) {
        const g = this.scene.add.graphics();
        g.setDepth(15);
        g.lineStyle(3, color, 0.9);
        g.beginPath();
        g.moveTo(x - size / 2, y - size / 2);
        g.lineTo(x + size / 2, y + size / 2);
        g.strokePath();
        g.lineStyle(2, 0xFFAAAA, 0.7);
        g.beginPath();
        g.moveTo(x + size / 2, y - size / 2);
        g.lineTo(x - size / 2, y + size / 2);
        g.strokePath();
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 350,
            onComplete: () => g.destroy(),
        });
    }

    spawnCleaveEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics();
        g.setDepth(15);
        for (let i = 0; i < 7; i++) {
            const angle = -Math.PI / 2.5 + (i * Math.PI / 7.5) + (this.facing < 0 ? Math.PI : 0);
            const len = 160 + i * 20;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            // White outline
            g.lineStyle(8 + (i === 3 ? 6 : 0), 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
            // Black core
            g.lineStyle(4 + (i === 3 ? 4 : 0), 0x000000, 1);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
            // Red accent
            g.lineStyle(2 + (i === 3 ? 2 : 0), 0xFF0000, 0.8);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
        }
        const flash = this.scene.add.circle(x, y, 120, 0xFF2222, 0.3);
        flash.setDepth(14);
        this.scene.tweens.add({
            targets: [g, flash],
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => { g.destroy(); flash.destroy(); },
        });
    }

    // ════════════════════════════════════════════
    // DIVINE FLAME (Fuga) — Ultimate Fire Arrow
    // ════════════════════════════════════════════
    castDivineFlame() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        const skill = this.charData.skills.maximum;

        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 500);
            this.scene.screenEffects.flash(0xFF5500, 500, 0.5);
        }

        // Show bow charging visual
        const bow = this.scene.add.graphics();
        bow.setDepth(16);
        bow.lineStyle(4, 0xFF8800, 1);
        bow.beginPath();
        bow.moveTo(this.sprite.x, this.sprite.y - 40);
        bow.lineTo(this.sprite.x + 40 * this.facing, this.sprite.y - 15);
        bow.lineTo(this.sprite.x, this.sprite.y + 10);
        bow.strokePath();

        this.scene.tweens.add({
            targets: bow,
            scaleX: 1.2,
            duration: 400,
            ease: 'Power1',
            onComplete: () => bow.destroy(),
        });

        // Stun enemy during cast
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            target.stateMachine.unlock();
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }

        this.castWithAudio('sfx_fire', () => {
            // Audio finished → fire the Fuga arrow
            const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: Math.floor(skill.damage * this.power),
                knockbackX: 1000,
                knockbackY: -300,
                stunDuration: 700,
                speed: 900,
                direction: this.facing,
                color: 0xFF3300,
                size: { w: 150, h: 50 },
                lifetime: 2500,
                type: 'fire_arrow',
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.02, 500);
            }

            // Unlock enemy unconditionally
            if (target && !target.isDead) {
                target.stateMachine.unlock();
                if (!target.stateMachine.isAny('idle', 'walk', 'jump', 'fall', 'attack')) {
                    target.stateMachine.setState('idle');
                }
            }

            this.stateMachine.setState('idle');
        }, 6000);
    }

    // ════════════════════════════════════════════
    // DOMAIN EXPANSION — Malevolent Shrine
    // ════════════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        
        if (this.scene.domainActive) {
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
        if (this.stateMachine.is('attack')) {
            this.stateMachine.setState('idle');
        }

        try {
            this.scene.sound.play('sukuna_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 });
        } catch (e) { console.warn('Sukuna domain voice error', e); }

        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'malevolent_shrine');
        }
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;

        opponent.takeDamage(50, 20 * this.facing, 0, 100);

        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y - 20;
        
        // Spawn sharp Black/White cuts ("X" or straight horizontal/vertical) 
        const g = this.scene.add.graphics().setDepth(15);
        const slX = ox + (Math.random() - 0.5) * 50;
        const slY = oy + (Math.random() - 0.5) * 60;
        
        // Decide if it's an 'X' or straight lines
        const isX = Math.random() > 0.5;

        const drawCut = (startX, startY, endX, endY) => {
            g.lineStyle(8, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(startX, startY); g.lineTo(endX, endY); g.strokePath();
            g.lineStyle(4, 0x000000, 1);
            g.beginPath(); g.moveTo(startX, startY); g.lineTo(endX, endY); g.strokePath();
        };

        if (isX) {
            // Draw an X
            drawCut(slX - 30, slY - 30, slX + 30, slY + 30);
            drawCut(slX - 30, slY + 30, slX + 30, slY - 30);
        } else {
            // Straight slanting or horizontal
            for (let i = 0; i < 3; i++) {
                const yOff = (i - 1) * 20;
                drawCut(slX - 40, slY + yOff, slX + 40, slY + yOff);
            }
        }

        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => g.destroy()
        });

        this.spawnSlashEffect(
            ox + (Math.random() - 0.5) * 40,
            oy + (Math.random() - 0.5) * 60,
            0xFF1100,
            40 + Math.random() * 30
        );

        try {
            const slashIdx = Phaser.Math.Between(1, 11);
            const slashKey = `slash_${slashIdx}`;
            this.scene.sound.play(slashKey, { volume: 0.6 });
        } catch (e) {}
    }
}
