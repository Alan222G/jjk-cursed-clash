// ========================================================
// Ryomen Sukuna — King of Curses
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Sukuna extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.SUKUNA);
        this.slashEffects = [];
    }

    /** Facial markings + menacing eyes */
    drawFace(g, x, y, facing) {
        // Menacing eyes
        g.fillStyle(0xFF2200, 1);
        g.fillCircle(x - 5 * facing, y - 2, 3);
        g.fillCircle(x + 5 * facing, y - 2, 3);

        // Cursed facial markings
        g.lineStyle(2, 0x330000, 0.9);
        g.beginPath();
        g.moveTo(x - 5, y + 2);
        g.lineTo(x - 5, y + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(x + 5, y + 2);
        g.lineTo(x + 5, y + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(x - 8, y - 5);
        g.lineTo(x + 8, y - 5);
        g.strokePath();

        // Smirk
        g.lineStyle(1, 0x330000, 0.8);
        g.beginPath();
        g.moveTo(x - 6, y + 5);
        g.lineTo(x, y + 7);
        g.lineTo(x + 6, y + 5);
        g.strokePath();
    }

    trySpecialAttack() {
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

    castRush() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        
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
    }

    castDismantle() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        const skill = this.charData.skills.skill1;

        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 15, {
            owner: this,
            damage: Math.floor(skill.damage * this.power),
            knockbackX: 150,
            knockbackY: -50,
            stunDuration: 250,
            speed: 800,
            direction: this.facing,
            color: 0xAAAAAA,
            size: { w: 40, h: 10 },
            lifetime: 1000,
        });

        if (this.scene.projectiles) {
            this.scene.projectiles.push(proj);
        }
        
        try {
            if (this.scene.sound.get('sfx_slash')) {
                this.scene.sound.play('sfx_slash', { volume: (window.gameSettings?.sfx || 50) / 100 });
            }
        } catch(e) {}
        
        this.spawnSlashEffect(this.sprite.x + 30 * this.facing, this.sprite.y, 0xAAAAAA, 40);
    }

    castCleave() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        const skill = this.charData.skills.skill2;

        this.spawnCleaveEffect();
        
        try {
            if (this.scene.sound.get('sfx_cleave')) {
                this.scene.sound.play('sfx_cleave', { volume: (window.gameSettings?.sfx || 50) / 100 });
            }
        } catch(e) {}

        if (this.opponent) {
            const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
            if (dist < 180) {
                const dmg = Math.floor(skill.damage * this.power);
                this.opponent.takeDamage(dmg, 400 * this.facing, -250, 500);
                this.ceSystem.gain(12);
                this.comboSystem.registerHit('SPECIAL');

                if (this.scene.screenEffects) {
                    this.scene.screenEffects.shake(0.006, 300);
                    this.scene.screenEffects.hitFreeze(120);
                }
            }
        }
    }

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
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 3 + (i * Math.PI / 6) + (this.facing < 0 ? Math.PI : 0);
            const len = 80 + i * 10;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            g.lineStyle(2 + (i === 2 ? 2 : 0), 0xFF2222, 0.8);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(ex, ey);
            g.strokePath();
        }
        const flash = this.scene.add.circle(x, y, 50, 0xFF2222, 0.4);
        flash.setDepth(14);
        this.scene.tweens.add({
            targets: [g, flash],
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => { g.destroy(); flash.destroy(); },
        });
    }

    castDivineFlame() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        const skill = this.charData.skills.maximum;

        this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 500);
            this.scene.screenEffects.flash(0xFF5500, 500, 0.5);
        }

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
            onComplete: () => {
                bow.destroy();
                
                const proj = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 15, {
                    owner: this,
                    damage: Math.floor(skill.damage * this.power),
                    knockbackX: 1000,
                    knockbackY: -300,
                    stunDuration: 700,
                    speed: 900,
                    direction: this.facing,
                    color: 0xFF3300,
                    size: { w: 120, h: 40 },
                    lifetime: 2500,
                    type: 'burn',
                });
                
                if (this.scene.projectiles) {
                    this.scene.projectiles.push(proj);
                }
                
                try {
                    if (this.scene.sound.get('sfx_fire')) {
                        this.scene.sound.play('sfx_fire', { volume: (window.gameSettings?.sfx || 50) / 100 });
                    }
                } catch(e) {}
                
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.shake(0.015, 400);
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
            if (this.scene.sound.get('sukuna_domain_voice')) {
                this.scene.sound.play('sukuna_domain_voice', { volume: (window.gameSettings?.sfx || 50) / 100 });
            }
        } catch(e) { console.warn('Sukuna domain voice error', e); }

        // Notify GameScene to handle cinematic phase
        if (this.scene.onDomainActivated) {
            this.scene.onDomainActivated(this, 'malevolent_shrine');
        }
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;

        // Auto-slash damage: 50 per tick
        opponent.takeDamage(50, 50 * this.facing, 0, 100);

        // Visual: random slashes appear on opponent
        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y;
        this.spawnSlashEffect(
            ox + (Math.random() - 0.5) * 40,
            oy + (Math.random() - 0.5) * 60 - 20,
            0xFF4444,
            40 + Math.random() * 30
        );
        
        // Random slash audio from 11 variants
        try {
            const slashIdx = Phaser.Math.Between(1, 11);
            const slashKey = `slash_${slashIdx}`;
            if (this.scene.sound.get(slashKey)) {
                this.scene.sound.play(slashKey, { volume: 0.6 });
            }
        } catch(e) {}
    }
}
