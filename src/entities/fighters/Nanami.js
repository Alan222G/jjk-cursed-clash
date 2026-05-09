import Fighter from '../Fighter.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Nanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NANAMI);
        this.overtimeActive = false;
        this.overtimeTimer = 0;
        this.nanamiArmorActive = false;
        this.nanamiArmorTimer = 0;
        this.nextHitGuaranteedBlackFlash = false;
        this.isCasting = false;
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.overtimeActive) {
            this.overtimeTimer -= dt;
            if (this.overtimeTimer <= 0) {
                this.overtimeActive = false;
                this.power = this.charData.stats.power || 1.1;
                this.defense = this.charData.stats.defense || 0.9;
            }
        }

        if (this.nanamiArmorActive) {
            this.nanamiArmorTimer -= dt;
            if (this.nanamiArmorTimer <= 0) {
                this.nanamiArmorActive = false;
            }
        }
    }

    _check73Crit(target) {
        if (this.nextHitGuaranteedBlackFlash) {
            return true;
        }
        if (!target) return false;
        const dist = Math.abs(this.sprite.x - target.sprite.x);
        // "solo haz que si se da un golpe excato en el extremo del golpe sea un black flash asegurado"
        // Tip of the weapon range:
        const minDist = this.overtimeActive ? 60 : 65;
        const maxDist = this.overtimeActive ? 180 : 85;
        return dist >= minDist && dist <= maxDist;
    }



    onHitOpponent(opponent) {
        const isCrit = this._check73Crit(opponent);
        if (isCrit) {
            this.nextHitGuaranteedBlackFlash = false; // consume mark
            const originalPower = this.power;
            this.power *= 2.6;
            
            if (this.scene.screenEffects) {
                this.scene.screenEffects.hitFreeze(150);
                this.scene.screenEffects.flash(0x000000, 150, 0.4);
                this.scene.screenEffects.shake(0.04, 300);
            }
            try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
            this.spawnBlackFlashEffect(opponent.sprite.x, opponent.sprite.y);
            if (this.ceSystem) this.ceSystem.gain(30); // Unificado con Black Flash normal
            
            super.onHitOpponent(opponent);
            this.power = originalPower;
        } else {
            super.onHitOpponent(opponent);
        }
    }

    takeDamage(damage, kbX, kbY, stunDuration, isProjectile = false) {
        if (this.nanamiArmorActive && !isProjectile) {
            damage = Math.floor(damage * 0.5);
            kbX = 0;
            kbY = 0;
            stunDuration = 0;
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0xAAAAAA, 50, 0.3);
        }
        super.takeDamage(damage, kbX, kbY, stunDuration);
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();
        
        if (tier >= 2 && this.input.isDown('UP')) {
            this.executeRafaga();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeColapso();
        } else if (tier >= 1 && this.input.isDown('DOWN')) {
            this.executeArmor();
        } else if (tier >= 1) {
            this.executeMarca();
        }
    }

    executeMarca() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(400);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'MARCA 7:3', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FF0000', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });

        this.nextHitGuaranteedBlackFlash = true;

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeArmor() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(400);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'ARMOR', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#AAAAAA', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });

        this.nanamiArmorActive = true;
        this.nanamiArmorTimer = 8000; // 8 seconds of armor

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeColapso() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        this.scene.time.delayedCall(300, () => {
            if (!this.isCasting) return;
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.7 }); } catch(e) {}
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.015, 300);
            
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 180) {
                target.takeDamage(Math.floor(65 * this.power), 200 * this.facing, -300, 1000);
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeRafaga() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(1100);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 250, () => {
                if (!this.isCasting || this.isDead) return;
                this.sprite.body.setVelocityX(this.facing * 300);
                
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 140) {
                    const isCrit = (i === 3) || this._check73Crit(target);
                    const dmg = isCrit ? 20 * 2.6 : 20;
                    if (isCrit) {
                        if (this.scene.screenEffects) {
                            this.scene.screenEffects.hitFreeze(150);
                            this.scene.screenEffects.flash(0x000000, 150, 0.4);
                            this.scene.screenEffects.shake(0.04, 300);
                        }
                        try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
                        this.spawnBlackFlashEffect(target.sprite.x, target.sprite.y);
                    }
                    target.takeDamage(Math.floor(dmg * this.power), i === 3 ? 400 * this.facing : 50 * this.facing, i === 3 ? -200 : 0, 300);
                }
            });
        }

        this.scene.time.delayedCall(1100, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    tryActivateDomain() {
        if (this.overtimeActive) return; // Ya está activo

        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;

        this.overtimeActive = true;
        this.overtimeTimer = 15000;
        
        this.power = (this.charData.stats.power || 1.1) * 1.5;
        this.defense = (this.charData.stats.defense || 0.9) * 1.5;
        this.charData.stats.ceRegen = (this.charData.stats.ceRegen || 3.5) * 2.0; // Doble regeneración
        this.ceRegen = this.charData.stats.ceRegen; // Aplicar regeneración extra

        // Efecto visual instantáneo de desatarse la corbata
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x44AAFF, 200, 0.4);
            this.scene.screenEffects.shake(0.02, 300);
        }
        
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'OVERTIME!', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#0088FF', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (this.isDead) return;

        const ag = this.auraGraphics;
        const x = this.sprite.x; 
        const y = this.sprite.y;
        const t = this.scene.time.now;

        if (this.overtimeActive) {
            // Intense office-worker blue/gold aura indicating Overtime
            const pulse = 0.2 + Math.sin(t * 0.01) * 0.15;
            ag.fillStyle(0x0088FF, pulse);
            ag.fillEllipse(x, y - 25, 60, 100);

            // Clock hands spinning around him
            ag.lineStyle(2, 0xFFCC00, 0.6);
            const angle1 = t * 0.005;
            const angle2 = t * 0.001;
            ag.beginPath();
            ag.moveTo(x, y - 30);
            ag.lineTo(x + Math.cos(angle1) * 35, y - 30 + Math.sin(angle1) * 35);
            ag.moveTo(x, y - 30);
            ag.lineTo(x + Math.cos(angle2) * 25, y - 30 + Math.sin(angle2) * 25);
            ag.strokePath();
        }
    }
}
