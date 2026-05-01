import Fighter from '../Fighter.js';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from '../../config.js';

export default class Todo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, 'TODO');
        this.tagTeamActive = false;
        this.tagTeamTimer = 0;
        this.boogieCd = 0;
        this.patadaCd = 0;
        this.fakeCd = 0;
        this.bfCd = 0;
    }

    _playAnim(animKey, force = false) {
        // Use Yuji sprite as placeholder (hand-to-hand brawler)
        this.sprite.play(`yuji_${animKey}`, force);
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.boogieCd > 0) this.boogieCd -= dt;
        if (this.patadaCd > 0) this.patadaCd -= dt;
        if (this.fakeCd > 0) this.fakeCd -= dt;
        if (this.bfCd > 0) this.bfCd -= dt;

        if (this.tagTeamActive) {
            this.tagTeamTimer -= dt;
            if (this.tagTeamTimer <= 0) {
                this.tagTeamActive = false;
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

    // Boogie Woogie (Swap) or Black Flash (If DOWN is held)
    executeSkill1() {
        // Check for DOWN modifier to trigger Black Flash
        const isDownHeld = this.scene.input.keyboard.checkDown(this.keys.DOWN, 0); // Need to check if DOWN is pressed
        if (this.keys.DOWN.isDown) {
            this._executeBlackFlash();
            return;
        }

        // Standard Boogie Woogie
        const cost = this.tagTeamActive ? 0 : this.charData.skills.skill1.cost;
        if (this.boogieCd > 0 || !this.canCast(cost)) return;
        
        this.isCasting = true;
        this.ceSystem.spend(cost);
        if (!this.tagTeamActive) this.boogieCd = 2000; // 2s cooldown usually
        
        this.stateMachine.setState('attack_light'); // Clap animation
        this._playAnim('atk_light', true);
        
        // Clap sound
        try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
        
        this.scene.time.delayedCall(100, () => {
            if (this.isCasting && this.opponent) {
                // Boogie Woogie Swap!
                const myX = this.sprite.x;
                const myY = this.sprite.y;
                const myVelX = this.sprite.body.velocity.x;
                const myVelY = this.sprite.body.velocity.y;

                const oppX = this.opponent.sprite.x;
                const oppY = this.opponent.sprite.y;
                const oppVelX = this.opponent.sprite.body.velocity.x;
                const oppVelY = this.opponent.sprite.body.velocity.y;

                // Swap coordinates
                this.sprite.setPosition(oppX, oppY);
                this.opponent.sprite.setPosition(myX, myY);

                // Swap velocities (maintain inertia)
                this.sprite.body.setVelocity(oppVelX, oppVelY);
                this.opponent.sprite.body.setVelocity(myVelX, myVelY);

                // Face each other
                this.updateFacing();
                this.opponent.updateFacing();

                // Flash particles at both locations
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.flash(0xFFFFFF, 50, 0.3);
                }

                // Passive: Soul Vibration (Buff damage briefly after successful swap)
                this.power = (this.charData.stats.power || 1.15) * 1.3;
                this.scene.time.delayedCall(3000, () => {
                    this.power = this.charData.stats.power || 1.15;
                });
            }
        });

        this._endCast(300);
    }

    _executeBlackFlash() {
        if (this.bfCd > 0 || !this.canCast(30)) return;
        this.isCasting = true;
        this.bfCd = 8000;
        this.ceSystem.spend(30);

        this.stateMachine.setState('attack_heavy');
        this._playAnim('atk_heavy', true);
        
        // Dash forward
        this.sprite.body.setVelocityX(this.direction * 500);

        this.scene.time.delayedCall(200, () => {
            if (this.isCasting) {
                if (this.checkHit(this.opponent, 120, 80, 100, true, true)) { // Heavy hit, knocks back, unblockable
                    // Black Flash Visuals
                    const cx = (this.sprite.x + this.opponent.sprite.x) / 2;
                    const cy = this.opponent.sprite.y;
                    
                    const txt = this.scene.add.text(cx, cy - 80, '⚡ BLACK FLASH! ⚡', {
                        fontFamily: 'Arial Black', fontSize: '40px', color: '#111111', stroke: '#FF0000', strokeThickness: 8
                    }).setOrigin(0.5).setDepth(40);
                    this.scene.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.flash(0x000000, 300, 0.8);
                        this.scene.screenEffects.shake(0.04, 500);
                    }
                    try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}
                }
            }
        });

        this._endCast(600);
    }

    // Patada Gran Alcance (U + Left/Right)
    executeSkill2() {
        if (this.patadaCd > 0 || !this.canCast(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.patadaCd = 5000;
        this.ceSystem.spend(this.charData.skills.skill2.cost);

        this.stateMachine.setState('attack_heavy');
        this._playAnim('atk_heavy', true);

        this.scene.time.delayedCall(300, () => {
            if (this.isCasting) {
                if (this.checkHit(this.opponent, 150, 80, 55, true)) {
                    // Massive knockback
                    this.opponent.sprite.body.setVelocity(this.direction * 1000, -400);
                }
            }
        });

        this._endCast(700);
    }

    // Fake Clap (Maximum / U + Up)
    executeMaximum() {
        if (this.fakeCd > 0 || !this.canCast(15)) return;
        this.isCasting = true;
        this.fakeCd = 3000;
        this.ceSystem.spend(15);

        this.stateMachine.setState('attack_light'); // Clap animation
        this._playAnim('atk_light', true);
        
        // Clap sound but NO SWAP
        try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
        
        // "FAKE" text to show it worked
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'FAKE!', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#AAAAAA', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });

        this._endCast(300); // Recovers faster than real swap
    }

    // Domain / Ultimate
    tryActivateDomain() {
        if (this.tagTeamActive || !this.canCast(this.charData.skills.domain.cost)) return;
        this.ceSystem.spend(this.charData.skills.domain.cost);

        this.scene.onDomainActivated(this, 'TODO_TAG');
        this.tagTeamActive = true;
        this.tagTeamTimer = 10000; // 10 seconds of infinite Boogie Woogie
        
        // Simple Domain protection
        this.hasSimpleDomain = true;
        this.scene.time.delayedCall(10000, () => {
            this.hasSimpleDomain = false;
        });

        this.scene.time.delayedCall(1000, () => {
            // End cinematic phase instantly to resume combat
            this.scene.onDomainEnd(this);
            
            // Tag-Team dark background
            this.scene.domainBg = this.scene.add.rectangle(
                GAME_WIDTH / 2, GAME_HEIGHT / 2, 
                GAME_WIDTH, GAME_HEIGHT, 
                0x111111, 0.6
            ).setDepth(2);
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
