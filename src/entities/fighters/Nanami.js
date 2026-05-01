import Fighter from '../Fighter.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Nanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NANAMI);
        this.overtimeActive = false;
        this.overtimeTimer = 0;
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
    }

    _check73Crit(target) {
        if (!target) return false;
        const dist = Math.abs(this.sprite.x - target.sprite.x);
        const minDist = this.overtimeActive ? 80 : 110;
        const maxDist = this.overtimeActive ? 180 : 150;
        return dist >= minDist && dist <= maxDist;
    }

    _applyBlackFlash(target) {
        const cx = (this.sprite.x + target.sprite.x) / 2;
        const cy = target.sprite.y;

        const txt = this.scene.add.text(cx, cy - 80, '⚡ BLACK FLASH! ⚡', {
            fontFamily: 'Arial Black', fontSize: '30px', color: '#FF0000', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({
            targets: txt, y: txt.y - 50, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 1000, onComplete: () => txt.destroy()
        });

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xAA0000, 200, 0.7);
            this.scene.screenEffects.shake(0.02, 300);
        }
        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e) {}
    }

    onHitOpponent(opponent) {
        const isCrit = this._check73Crit(opponent);
        if (isCrit) {
            const originalPower = this.power;
            this.power *= 2.5;
            this._applyBlackFlash(opponent);
            super.onHitOpponent(opponent);
            this.power = originalPower;
        } else {
            super.onHitOpponent(opponent);
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();
        
        if (tier >= 2 && this.input.isDown('UP')) {
            this.executeRafaga();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeColapso();
        } else if (tier >= 1) {
            this.executeTajo();
        }
    }

    executeTajo() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting) return;
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            const isCrit = this._check73Crit(target);
            const dmg = isCrit ? 45 * 2.5 : 45;
            
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 160) {
                if (isCrit) this._applyBlackFlash(target);
                target.takeDamage(Math.floor(dmg * this.power), 300 * this.facing, -100, 400);
            }
        });

        this.scene.time.delayedCall(500, () => {
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
                    const dmg = isCrit ? 20 * 2.5 : 20;
                    if (isCrit) this._applyBlackFlash(target);
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
        if (this.overtimeActive) {
            if (!this.ceSystem.spend(50)) return;
            this.isCasting = true;
            this.stateMachine.lock(1000);
            
            if (this.scene.screenEffects) this.scene.screenEffects.slowMotion(0.1, 500);
            
            this.scene.time.delayedCall(500, () => {
                if (!this.isCasting) return;
                const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 160) {
                    const isCrit = this._check73Crit(target);
                    let dmg = 50; 
                    if (isCrit) {
                        dmg = target.maxHp * 0.40;
                        this._applyBlackFlash(target);
                        const txt = this.scene.add.text(target.sprite.x, target.sprite.y - 120, 'RATIO MAXIMO!', {
                            fontFamily: 'Arial Black', fontSize: '35px', color: '#FF0000', stroke: '#000000', strokeThickness: 6
                        }).setOrigin(0.5).setDepth(50);
                        this.scene.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
                    }
                    target.takeDamage(Math.floor(dmg), 400 * this.facing, -200, 800);
                }
            });

            this.scene.time.delayedCall(1000, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            });
            return;
        }

        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;
        
        this.scene.onDomainActivated(this, 'OVERTIME');
        this.overtimeActive = true;
        this.overtimeTimer = 15000;
        
        this.power = (this.charData.stats.power || 1.1) * 1.5;
        this.defense = (this.charData.stats.defense || 0.9) * 1.5;
        
        this.scene.time.delayedCall(1000, () => {
            if (this.scene.cancelDomain) {
                this.scene.cancelDomain(this);
            } else if (this.scene.onDomainEnd) {
                this.scene.onDomainEnd(this);
            }
        });
    }
}
