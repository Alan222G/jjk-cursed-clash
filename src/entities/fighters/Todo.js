import Fighter from '../Fighter.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Todo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.TODO);
        this.tagTeamActive = false;
        this.tagTeamTimer = 0;
        this.isCasting = false;
    }

    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.005);

        const skinColor = isFlashing ? 0xFFFFFF : 0xffd3ba;
        const pantsColor = isFlashing ? 0xFFFFFF : 0x16171d;
        const shadowColor = isFlashing ? 0xFFFFFF : 0xca8a04;
        const hairColor = isFlashing ? 0xFFFFFF : 0x111827;

        const ox = x;
        const oy = masterY;

        // 1. LEGS (black combat trousers)
        const legSwing = isMoving ? Math.sin(time * 1.5) * 8 : 0;
        this.drawRect(g, ox - 8, oy + 38, 14, 32, pantsColor, legSwing);
        this.drawCircle(g, ox - 8, oy + 53, 6.5, 0x0a0a0d); // Joint knee
        this.drawRect(g, ox - 8, oy + 65, 12, 20, pantsColor, legSwing * 0.5);
        this.drawRect(g, ox - 8, oy + 76, 14, 5, skinColor); // Bare feet / wrap

        this.drawRect(g, ox + 8, oy + 38, 14, 32, pantsColor, -legSwing);
        this.drawCircle(g, ox + 8, oy + 53, 6.5, 0x0a0a0d);
        this.drawRect(g, ox + 8, oy + 65, 12, 20, pantsColor, -legSwing * 0.5);
        this.drawRect(g, ox + 8, oy + 76, 14, 5, skinColor);

        // 2. TORSO (Ultra muscular)
        // Shoulders/Trapezius behind head
        this.drawCircle(g, ox - 13, oy - 20, 6, skinColor);
        this.drawCircle(g, ox + 13, oy - 20, 6, skinColor);

        // Broad chest and abs
        this.drawRect(g, ox, oy - 12, 34, 24, skinColor);
        this.drawRect(g, ox, oy + 8, 28, 20, skinColor);

        // Abs muscle lines
        if (!isFlashing) {
            this.drawLine(g, ox - 1, oy - 12, ox - 1, oy + 15, 1.2, shadowColor);
            this.drawLine(g, ox - 10, oy - 2, ox + 10, oy - 2, 1.2, shadowColor); // Pec line
            this.drawLine(g, ox - 8, oy + 4, ox + 8, oy + 4, 1.2, shadowColor);
            this.drawLine(g, ox - 6, oy + 10, ox + 6, oy + 10, 1.2, shadowColor);
        }

        // 3. ARMS
        const clapCycle = isMoving ? Math.sin(time * 3) : -0.5;
        const isClapping = (this.stateMachine.is('attack') || (isMoving && Math.abs(clapCycle) > 0.85));

        // Left arm
        g.save();
        g.translate(ox - 18, oy - 14);
        const armRotL = isClapping ? 52 : (-20 + Math.sin(time * 1.5) * 10);
        g.rotate(armRotL * Math.PI / 180);
        this.drawRect(g, 0, 12, 11, 24, skinColor);
        this.drawCircle(g, 0, 23, 6, shadowColor); // Elbow joint
        this.drawRect(g, 0, 32, 9, 20, skinColor);
        this.drawCircle(g, 0, 41, 6, skinColor); // Hand
        g.restore();

        // Right arm
        g.save();
        g.translate(ox + 18, oy - 14);
        const armRotR = isClapping ? -52 : (20 - Math.sin(time * 1.5) * 10);
        g.rotate(armRotR * Math.PI / 180);
        this.drawRect(g, 0, 12, 11, 24, skinColor);
        this.drawCircle(g, 0, 23, 6, shadowColor);
        this.drawRect(g, 0, 32, 9, 20, skinColor);
        this.drawCircle(g, 0, 41, 6, skinColor);
        g.restore();

        // Boogie Woogie clap energy effect
        if (isClapping) {
            g.save();
            const pulse = Math.sin(time * 15) * 5;
            g.fillStyle(0x38bdf8, 0.8);
            g.fillCircle(ox, oy + 14, 13 + pulse);
            g.fillStyle(0x06b6d4, 0.35);
            g.fillCircle(ox, oy + 14, 26);
            g.restore();
        }

        // 4. HEAD
        const hx = ox;
        const hy = oy - 34;

        this.drawCircle(g, hx, hy, 14, hairColor);
        this.drawCircle(g, hx, hy + 1, 12.5, skinColor);

        // Samurai bun (Top-knot)
        this.drawCircle(g, hx, hy - 14, 4.5, hairColor);
        this.drawTriangle(g, hx, hy - 17, 8, 10, hairColor, 180);

        if (!isFlashing) {
            // Giant scar on left eye
            this.drawLine(g, hx + 5, hy - 9, hx + 3.8, hy + 7, 1.8, 0x7f1d1d);
            this.drawLine(g, hx + 4.6, hy - 4, hx + 4.2, hy + 2, 0.8, 0xf87171);

            // Determined eyes
            this.drawLine(g, hx - 7, hy - 4, hx - 2, hy - 3, 2, 0x000000);
            this.drawLine(g, hx + 2, hy - 3.2, hx + 7, hy - 3.8, 2, 0x000000);
            this.drawCircle(g, hx - 4.5, hy - 1, 1.8, 0xffffff);
            this.drawCircle(g, hx + 4.5, hy - 1, 1.8, 0xffffff);
            this.drawCircle(g, hx - 4.5, hy - 1, 1, 0x000000);
            this.drawCircle(g, hx + 4.5, hy - 1, 1, 0x000000);

            // Challenger smirk
            this.drawLine(g, hx - 4, hy + 5, hx + 4, hy + 4, 2, 0x000000);
        }
    }

    // +50% knockback on ALL normal attacks
    getBasicAttackData(type) {
        const base = { ...super.getBasicAttackData(type) };
        if (!base) return base;
        base.knockbackX = Math.floor((base.knockbackX || 200) * 1.5);
        base.knockbackY = Math.floor((base.knockbackY || -100) * 1.5);
        return base;
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.tagTeamActive) {
            this.tagTeamTimer -= dt;
            if (this.tagTeamTimer <= 0) {
                this.tagTeamActive = false;
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
        const cost = this.tagTeamActive ? 0 : Math.floor(this.charData.skills.skill1.cost / 2);
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
                const cx = (this.sprite.x + this.opponent.sprite.x) / 2;
                const cy = this.opponent.sprite.y;
                
                if (this.scene.screenEffects) {
                    this.scene.screenEffects.hitFreeze(150);
                    this.scene.screenEffects.flash(0x000000, 150, 0.4);
                    this.scene.screenEffects.shake(0.04, 500);
                }
                try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
                this.spawnBlackFlashEffect(this.opponent.sprite.x, this.opponent.sprite.y);
                
                this.opponent.takeDamage(Math.floor(100 * this.power), 900 * this.facing, -450, 800);
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
                this.opponent.takeDamage(Math.floor(55 * this.power), 1500 * this.facing, -600, 800);
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

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x88CCFF, 200, 0.4);
            this.scene.screenEffects.shake(0.02, 300);
        }

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'SIMPLE DOMAIN!', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#88CCFF', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }
}
