// ========================================================
// Toji Fushiguro — The Sorcerer Killer
// Zero Cursed Energy Physical Fighter — Weapon Switching
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS } from '../../config.js';

const WEAPONS = [
    { name: 'Playful Cloud', key: 'cloud', color: 0x55FF55 },
    { name: 'Inverted Spear', key: 'spear', color: 0x88CCFF },
    { name: 'Soul Katana', key: 'katana', color: 0xFF44AA },
];

export default class Toji extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.TOJI);
        this.isCasting = false;
        // Toji has NO cursed energy
        this.ceSystem.ce = 0;
        this.ceSystem.maxCe = 0;
        // Weapon switching
        this.currentWeaponIndex = 0;
        this.switchCooldown = 0;
        this.weaponSwitchText = null;
    }

    get currentWeapon() {
        return WEAPONS[this.currentWeaponIndex];
    }

    /** Menacing scar face */
    drawFace(g, x, y, facing) {
        // Dark narrow eyes
        g.fillStyle(0x222222, 1);
        g.fillRect(x - 7 * facing, y - 3, 4, 2);
        g.fillRect(x + 3 * facing, y - 3, 4, 2);
        // Scar on lip
        g.lineStyle(1, 0x884444, 0.8);
        g.beginPath();
        g.moveTo(x - 3, y + 3);
        g.lineTo(x + 4, y + 5);
        g.strokePath();
        // Current weapon indicator on back
        g.fillStyle(this.currentWeapon.color, 0.6);
        g.fillRect(x - 2 - 12 * facing, y + 5, 3, 20);
    }

    trySpecialAttack() {
        if (this.isCasting) return;

        // "U" (SPECIAL) alone = switch weapon
        // "U" + direction = attack with current weapon
        if (this.input.isDown('UP') || this.input.isDown('DOWN') || 
            this.input.isDown('LEFT') || this.input.isDown('RIGHT')) {
            this.attackWithCurrentWeapon();
        } else {
            this.switchWeapon();
        }
    }

    switchWeapon() {
        if (this.switchCooldown > 0) return;
        this.switchCooldown = 500;

        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % WEAPONS.length;
        
        // Show weapon name on screen
        if (this.weaponSwitchText) this.weaponSwitchText.destroy();
        
        this.weaponSwitchText = this.scene.add.text(
            this.sprite.x, this.sprite.y - 70, 
            `⚔ ${this.currentWeapon.name}`, {
                fontSize: '14px',
                fontFamily: 'Arial Black',
                color: '#' + this.currentWeapon.color.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 3,
            }
        ).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: this.weaponSwitchText,
            y: this.sprite.y - 100,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => {
                if (this.weaponSwitchText) {
                    this.weaponSwitchText.destroy();
                    this.weaponSwitchText = null;
                }
            }
        });

        // Small screen shake on swap
        if (this.scene.screenEffects) {
            this.scene.screenEffects.shake(0.002, 100);
        }
    }

    attackWithCurrentWeapon() {
        switch (this.currentWeapon.key) {
            case 'cloud': this.castPlayfulCloud(); break;
            case 'spear': this.castInvertedSpear(); break;
            case 'katana': this.castSoulKatana(); break;
        }
    }

    // ════════════════════════════════════════════
    // PLAYFUL CLOUD — Devastating 3-section staff smash
    // ════════════════════════════════════════════
    castPlayfulCloud() {
        const damage = 120;
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 400);
        }

        this.scene.time.delayedCall(300, () => {
            this.spawnPlayfulCloudEffect();

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 180) {
                    this.opponent.takeDamage(Math.floor(damage * this.power), 600 * this.facing, -400, 800);
                    this.comboSystem.registerHit('SPECIAL');
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.04, 600);
                        this.scene.screenEffects.hitFreeze(200);
                    }
                }
            }

            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // INVERTED SPEAR OF HEAVEN — Anti-technique lunge
    // ════════════════════════════════════════════
    castInvertedSpear() {
        const damage = 70;

        this.spawnSpearEffect();
        this.sprite.body.setVelocityX(600 * this.facing);

        this.scene.time.delayedCall(200, () => {
            this.sprite.body.setVelocityX(0);

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 140) {
                    this.opponent.takeDamage(Math.floor(damage * this.power), 300 * this.facing, -150, 300);
                    this.comboSystem.registerHit('SPECIAL');
                    // Inverted Spear nullifies cursed techniques — drain enemy CE
                    if (this.opponent.ceSystem) {
                        this.opponent.ceSystem.ce = Math.max(0, this.opponent.ceSystem.ce - 30);
                    }
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.005, 200);
                    }
                }
            }
        });
    }

    // ════════════════════════════════════════════
    // SOUL SPLITTING KATANA — Wide-range soul slash
    // ════════════════════════════════════════════
    castSoulKatana() {
        const damage = 90;

        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        this.scene.time.delayedCall(150, () => {
            this.spawnSoulKatanaEffect();

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 250) {
                    this.opponent.takeDamage(Math.floor(damage * this.power), 400 * this.facing, -200, 500);
                    this.comboSystem.registerHit('SPECIAL');
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.01, 300);
                    }
                }
            }

            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ════════════════════════════════════════════
    // DOMAIN — Toji has none (Heavenly Restriction)
    // ════════════════════════════════════════════
    tryActivateDomain() {
        return; // Zero CE = No domain
    }

    applySureHitTick(opponent) {
        // No domain
    }

    // ════════════════════════════════════════════
    // UPDATE — Weapon switch cooldown
    // ════════════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);
        if (this.switchCooldown > 0) {
            this.switchCooldown -= dt;
        }
    }

    // ════════════════════════════════════════════
    // VFX Helpers
    // ════════════════════════════════════════════
    spawnSpearEffect() {
        const x = this.sprite.x + 30 * this.facing;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        
        // Spear shaft
        g.lineStyle(3, 0xCCCCCC, 1);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 90 * this.facing, y);
        g.strokePath();
        
        // Spear tip
        g.fillStyle(0x88CCFF, 1);
        g.beginPath();
        const tipX = x + 90 * this.facing;
        g.moveTo(tipX, y - 7);
        g.lineTo(tipX + 18 * this.facing, y);
        g.lineTo(tipX, y + 7);
        g.closePath();
        g.fillPath();

        // Anti-technique shimmer
        g.lineStyle(1, 0xAADDFF, 0.4);
        g.strokeCircle(tipX + 5 * this.facing, y, 12);
        
        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 250,
            onComplete: () => g.destroy()
        });
    }

    spawnPlayfulCloudEffect() {
        const x = this.sprite.x + 40 * this.facing;
        const y = this.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(16);
        
        // 3-section staff segments
        for (let s = 0; s < 3; s++) {
            const sx = x + (s * 25 - 25) * this.facing;
            g.fillStyle(0x886633, 1);
            g.fillRect(sx - 3, y - 15, 6, 30);
            // Joint rings
            if (s < 2) {
                g.lineStyle(2, 0x444444, 0.8);
                g.strokeCircle(sx + 12 * this.facing, y, 4);
            }
        }

        // Impact shockwave circles
        for (let i = 0; i < 3; i++) {
            const r = 40 + i * 30;
            g.lineStyle(6 - i * 2, 0x55FF55, 0.8 - i * 0.2);
            g.strokeCircle(x, y, r);
        }
        
        // Impact lines
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const endX = x + Math.cos(angle) * 80;
            const endY = y + Math.sin(angle) * 60;
            g.lineStyle(4, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(x, y); g.lineTo(endX, endY); g.strokePath();
            g.lineStyle(2, 0x55FF55, 1);
            g.beginPath(); g.moveTo(x, y); g.lineTo(endX, endY); g.strokePath();
        }
        
        const flash = this.scene.add.circle(x, y, 30, 0xFFFFFF, 0.6).setDepth(17);
        
        this.scene.tweens.add({
            targets: [g, flash],
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 400,
            ease: 'Power2',
            onComplete: () => { g.destroy(); flash.destroy(); }
        });
    }

    spawnSoulKatanaEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 15;
        const g = this.scene.add.graphics().setDepth(15);

        // Wide sweeping arc
        const startAngle = this.facing > 0 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
        const sweep = Math.PI * 0.8;
        
        for (let i = 0; i < 15; i++) {
            const angle = startAngle + (i / 14) * sweep * this.facing;
            const len = 120 + Math.sin(i * 0.5) * 20;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            
            // Pink soul energy trail
            g.lineStyle(6, 0xFF44AA, 0.8 - (i / 15) * 0.4);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
            g.lineStyle(3, 0xFFFFFF, 0.6);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
        }

        // Katana blade line
        const bladeEnd = x + 100 * this.facing;
        g.lineStyle(4, 0xCCCCDD, 1);
        g.beginPath(); g.moveTo(x + 10 * this.facing, y); g.lineTo(bladeEnd, y - 20); g.strokePath();
        g.lineStyle(2, 0xFF88CC, 0.8);
        g.beginPath(); g.moveTo(x + 10 * this.facing, y); g.lineTo(bladeEnd, y - 20); g.strokePath();

        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => g.destroy()
        });
    }
}
