import Fighter from '../Fighter.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT, PHYSICS } from '../../config.js';

export default class Nanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NANAMI);
        this.overtimeActive = false;
        this.overtimeTimer = 0;
        this.colapsoCd = 0;
        this.rafagaCd = 0;
    }

    _playAnim(animKey, force = false) {
        // Use Toji sprite as a placeholder for the office worker (since he uses weapons/blades)
        this.sprite.play(`toji_${animKey}`, force);
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.colapsoCd > 0) this.colapsoCd -= dt;
        if (this.rafagaCd > 0) this.rafagaCd -= dt;

        // Overtime logic
        if (this.overtimeActive) {
            this.overtimeTimer -= dt;
            // Drain CE to keep him in domain state if we were using it, but Overtime is just a buff
            // The user said "No es un dominio", so we just buff him for 15s.
            if (this.overtimeTimer <= 0) {
                this.overtimeActive = false;
                this.power = this.charData.stats.power || 1.1;
                this.defense = this.charData.stats.defense || 0.9;
                if (this.scene.domainBg) {
                    this.scene.tweens.add({
                        targets: this.scene.domainBg,
                        alpha: 0,
                        duration: 1000,
                        onComplete: () => {
                            if (this.scene.domainBg) {
                                this.scene.domainBg.destroy();
                                this.scene.domainBg = null;
                            }
                        }
                    });
                }
            }
        }
    }

    _check73Crit(opponent) {
        if (!opponent) return false;
        const dist = Math.abs(this.sprite.x - opponent.sprite.x);
        
        // Sweet spot for 7:3 is exactly at weapon's tip (around 120-150px distance)
        // If in overtime, the sweet spot window is larger
        const minDist = this.overtimeActive ? 100 : 120;
        const maxDist = this.overtimeActive ? 170 : 150;
        
        if (dist >= minDist && dist <= maxDist) {
            return true;
        }
        return false;
    }

    _applyBlackFlash(opponent, damageMult = 2.5) {
        const cx = (this.sprite.x + opponent.sprite.x) / 2;
        const cy = opponent.sprite.y;

        // Black Flash text
        const txt = this.scene.add.text(cx, cy - 80, '⚡ BLACK FLASH! ⚡', {
            fontFamily: 'Arial Black', fontSize: '30px', color: '#FF0000', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({
            targets: txt, y: txt.y - 50, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 1000, onComplete: () => txt.destroy()
        });

        // Flash & shake
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xAA0000, 200, 0.7);
            this.scene.screenEffects.shake(0.02, 300);
        }
        
        // Sound
        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e) {}
    }

    // Override light attack to add 7:3 logic
    executeLightAttack() {
        if (this.stateMachine.currentState !== 'idle' && this.stateMachine.currentState !== 'run') return;
        if (!this.ceSystem.spend(5)) return;
        this.stateMachine.setState('attack_light');
        this._playAnim('atk_light', true);
        
        this.scene.time.delayedCall(150, () => {
            if (this.stateMachine.currentState === 'attack_light') {
                const isCrit = this._check73Crit(this.opponent);
                const dmg = isCrit ? 15 * 2.5 : 15;
                if (this.checkHit(this.opponent, 90, 60, dmg)) {
                    if (isCrit) this._applyBlackFlash(this.opponent);
                }
            }
        });
        
        this._endCast(400);
    }

    // Override heavy attack
    executeHeavyAttack() {
        if (this.stateMachine.currentState !== 'idle' && this.stateMachine.currentState !== 'run') return;
        if (!this.ceSystem.spend(15)) return;
        this.stateMachine.setState('attack_heavy');
        this._playAnim('atk_heavy', true);
        
        this.scene.time.delayedCall(300, () => {
            if (this.stateMachine.currentState === 'attack_heavy') {
                const isCrit = this._check73Crit(this.opponent);
                const dmg = isCrit ? 35 * 2.5 : 35;
                if (this.checkHit(this.opponent, 120, 80, dmg, true)) { // heavy hits apply knockback
                    if (isCrit) this._applyBlackFlash(this.opponent);
                }
            }
        });
        
        this._endCast(700);
    }

    // U (Skill 1): Tajo de Relojería
    executeSkill1() {
        if (!this.canCast(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.ceSystem.spend(this.charData.skills.skill1.cost);
        this.stateMachine.setState('attack_heavy'); // Use heavy anim
        this._playAnim('atk_heavy', true);
        
        this.scene.time.delayedCall(200, () => {
            if (this.isCasting) {
                const isCrit = this._check73Crit(this.opponent);
                const dmg = isCrit ? 45 * 2.5 : 45;
                // If crit, breaks block (true)
                if (this.checkHit(this.opponent, 140, 80, dmg, true, isCrit)) {
                    if (isCrit) this._applyBlackFlash(this.opponent);
                }
            }
        });
        this._endCast(500);
    }

    // U + Left/Right (Skill 2): Colapso
    executeSkill2() {
        if (this.colapsoCd > 0 || !this.canCast(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.colapsoCd = 6000;
        this.ceSystem.spend(this.charData.skills.skill2.cost);
        this.stateMachine.setState('attack_heavy');
        this._playAnim('atk_heavy', true);
        
        // Ground slam effect
        this.scene.time.delayedCall(300, () => {
            if (this.isCasting) {
                try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.7 }); } catch(e) {}
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.015, 300);
                
                const sx = this.sprite.x + (this.direction * 100);
                const sy = this.sprite.y + 30; // Ground level
                
                // Visual debris
                for (let i = 0; i < 5; i++) {
                    const rubble = this.scene.add.rectangle(sx + (Math.random() * 80 - 40), sy - (Math.random() * 40), 15, 15, 0x888888).setDepth(20);
                    this.scene.physics.add.existing(rubble);
                    rubble.body.setVelocity(this.direction * (100 + Math.random() * 200), -200 - Math.random() * 300);
                    this.scene.time.delayedCall(1000, () => rubble.destroy());
                }

                if (this.checkHit(this.opponent, 180, 100, 65, true)) {
                    this.opponent.applyStun(1000);
                }
            }
        });
        this._endCast(800);
    }

    // U + Up (Maximum): Ráfaga Embotada
    executeMaximum() {
        if (this.rafagaCd > 0 || !this.canCast(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.rafagaCd = 8000;
        this.ceSystem.spend(this.charData.skills.maximum.cost);
        
        // 4 hits combo
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 250, () => {
                if (this.isDead || this.stateMachine.currentState === 'knocked' || this.stateMachine.currentState === 'hit') return;
                
                this.stateMachine.setState('attack_light');
                this._playAnim(i % 2 === 0 ? 'atk_light' : 'atk_heavy', true);
                
                // Dash forward slightly on each hit
                this.sprite.body.setVelocityX(this.direction * 300);
                
                const isCrit = (i === 3) || this._check73Crit(this.opponent); // 4th hit is ALWAYS critical
                const dmg = isCrit ? 20 * 2.5 : 20;
                
                if (this.checkHit(this.opponent, 130, 80, dmg, i === 3)) { // Only 4th hit knocks back
                    if (isCrit) this._applyBlackFlash(this.opponent);
                }
            });
        }
        
        this._endCast(1100);
    }

    // G (Domain): Overtime (Awakening) OR Ratio Máximo if Overtime is already active
    tryActivateDomain() {
        if (this.overtimeActive) {
            // RATIO MÁXIMO
            if (!this.canCast(50)) return;
            this.ceSystem.spend(50);
            this.isCasting = true;
            this.stateMachine.setState('attack_heavy');
            this._playAnim('atk_heavy', true);
            
            // Dramatic pause
            if (this.scene.screenEffects) this.scene.screenEffects.slowMotion(0.1, 500);
            
            this.scene.time.delayedCall(500, () => {
                if (!this.isCasting) return;
                const isCrit = this._check73Crit(this.opponent);
                // Ratio Máximo removes 40% of max HP directly if it crits
                let dmg = 50; 
                if (isCrit && this.opponent) {
                    dmg = this.opponent.charData.stats.maxHp * 0.40;
                }

                if (this.checkHit(this.opponent, 150, 100, dmg, true, true)) {
                    if (isCrit) {
                        this._applyBlackFlash(this.opponent);
                        const txt = this.scene.add.text(this.opponent.sprite.x, this.opponent.sprite.y - 120, 'RATIO MAXIMO!', {
                            fontFamily: 'Arial Black', fontSize: '35px', color: '#FF0000', stroke: '#000000', strokeThickness: 6
                        }).setOrigin(0.5).setDepth(50);
                        this.scene.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
                    }
                }
            });
            this._endCast(1000);
            return;
        }

        // OVERTIME ACTIVATION
        if (!this.canCast(this.charData.skills.domain.cost)) return;
        this.ceSystem.spend(this.charData.skills.domain.cost);
        
        // This is a cinematic buff, not a real domain expansion
        this.scene.onDomainActivated(this, 'OVERTIME');
        this.overtimeActive = true;
        this.overtimeTimer = 15000;
        
        // Stat Buffs
        this.power = (this.charData.stats.power || 1.1) * 1.5;
        this.defense = (this.charData.stats.defense || 0.9) * 1.5;
        
        // Visual environment shift
        this.scene.time.delayedCall(1000, () => {
            this.scene.domainBg = this.scene.add.rectangle(
                GAME_WIDTH / 2, GAME_HEIGHT / 2, 
                GAME_WIDTH, GAME_HEIGHT, 
                0x000000, 0.5
            ).setDepth(2); // Darken the map slightly
            
            this.scene.onDomainEnd(this); // End the "cinematic" phase immediately so fight resumes
        });
    }

    _endCast(delay) {
        this.scene.time.delayedCall(delay, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            if (this.stateMachine.currentState !== 'hit' && this.stateMachine.currentState !== 'knocked' && !this.isDead) {
                this.stateMachine.setState('idle');
            }
        });
    }
}
