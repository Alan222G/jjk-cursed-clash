import Fighter from '../Fighter.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Todo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.TODO);
        this.tagTeamActive = false;
        this.tagTeamTimer = 0;
        this.isCasting = false;
    }

    update(time, dt) {
        super.update(time, dt);

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

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 2 && this.input.isDown('DOWN')) {
            this.executeBlackFlash();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.executeFakeClap();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executePatada();
        } else if (this.tagTeamActive || tier >= 1) { // Boogie Woogie costs 0 in domain
            this.executeBoogieWoogie();
        }
    }

    executeBoogieWoogie() {
        const cost = this.tagTeamActive ? 0 : this.charData.skills.skill1.cost;
        if (cost > 0 && !this.ceSystem.spend(cost)) return;
        
        this.isCasting = true;
        this.stateMachine.lock(300);
        
        try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
        
        this.scene.time.delayedCall(100, () => {
            if (!this.isCasting || !this.opponent) return;
            
            const myX = this.sprite.x;
            const myY = this.sprite.y;
            const myVelX = this.sprite.body.velocity.x;
            const myVelY = this.sprite.body.velocity.y;

            const oppX = this.opponent.sprite.x;
            const oppY = this.opponent.sprite.y;
            const oppVelX = this.opponent.sprite.body.velocity.x;
            const oppVelY = this.opponent.sprite.body.velocity.y;

            // Swap positions
            this.sprite.setPosition(oppX, oppY);
            this.opponent.sprite.setPosition(myX, myY);

            // Swap velocities (maintain inertia)
            this.sprite.body.setVelocity(oppVelX, oppVelY);
            this.opponent.sprite.body.setVelocity(myVelX, myVelY);

            // Flash
            if (this.scene.screenEffects) {
                this.scene.screenEffects.flash(0xFFFFFF, 50, 0.3);
            }

            // Buff damage 30% for 3 seconds
            const originalPower = this.charData.stats.power || 1.15;
            this.power = originalPower * 1.3;
            this.scene.time.delayedCall(3000, () => {
                this.power = originalPower;
            });
        });

        this.scene.time.delayedCall(300, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeBlackFlash() {
        if (!this.ceSystem.spend(30)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);
        
        this.sprite.body.setVelocityX(this.facing * 500);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting || !this.opponent) return;
            
            if (!this.opponent.isDead && Math.abs(this.opponent.sprite.x - this.sprite.x) < 140) {
                // Canonical Black Flash Visuals
                const ex = this.opponent.sprite.x;
                const ey = this.opponent.sprite.y - 30;
                const g = this.scene.add.graphics().setDepth(17);

                // Black impact core
                g.fillStyle(0x000000, 0.9); g.fillCircle(ex, ey, 25);
                g.fillStyle(0xFF0000, 0.6); g.fillCircle(ex, ey, 15);

                // Lightning bolts
                g.lineStyle(3, 0x000000, 0.9);
                for (let j = 0; j < 4; j++) {
                    const angle = (j / 4) * Math.PI * 2 + Math.random();
                    const len = 30 + Math.random() * 25;
                    const mx = ex + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 15;
                    const my = ey + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 15;
                    g.beginPath(); g.moveTo(ex, ey); g.lineTo(mx, my);
                    g.lineTo(ex + Math.cos(angle) * len, ey + Math.sin(angle) * len); g.strokePath();
                }
                // Red sparks
                g.lineStyle(1, 0xFF2200, 0.7);
                for (let j = 0; j < 3; j++) {
                    const a = Math.random() * Math.PI * 2;
                    g.lineBetween(ex, ey, ex + Math.cos(a) * 35, ey + Math.sin(a) * 35);
                }
                this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });

                if (this.scene.screenEffects) {
                    this.scene.screenEffects.flash(0x000000, 300, 0.8);
                    this.scene.screenEffects.shake(0.04, 500);
                }
                try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
                
                this.opponent.takeDamage(Math.floor(100 * this.power), 600 * this.facing, -300, 800);
            }
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executePatada() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(700);

        this.scene.time.delayedCall(300, () => {
            if (!this.isCasting || !this.opponent) return;
            if (!this.opponent.isDead && Math.abs(this.opponent.sprite.x - this.sprite.x) < 160) {
                this.opponent.takeDamage(Math.floor(55 * this.power), 1000 * this.facing, -400, 800);
            }
        });

        this.scene.time.delayedCall(700, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeFakeClap() {
        if (!this.ceSystem.spend(15)) return;
        this.isCasting = true;
        this.stateMachine.lock(300);

        try { this.scene.sound.play('sfx_teleport', { volume: 0.8 }); } catch(e) {}
        
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'FAKE!', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#AAAAAA', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });

        this.scene.time.delayedCall(300, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    tryActivateDomain() {
        if (this.tagTeamActive || !this.ceSystem.spend(this.charData.skills.domain.cost)) return;

        this.tagTeamActive = true;
        this.tagTeamTimer = 10000;
        
        this.hasSimpleDomain = true;
        this.scene.time.delayedCall(10000, () => {
            this.hasSimpleDomain = false;
        });

        // Cinematic flash instead of a full domain
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xAA22AA, 300, 0.7);
        }
        
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'BEST FRIEND TAG-TEAM', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FF44FF', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }
}
