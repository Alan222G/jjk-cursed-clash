import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Dagon extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.DAGON);
        this.isCasting = false;
        this.shikigamiTimer = 0;
        this.hydroShield = null;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.executeDeathSwarm();
        } else if (tier >= 2 && this.input.isDown('DOWN')) {
            this.executeHydroShield();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.executeWaterPrison();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeTideDisaster();
        } else if (tier >= 1) {
            this.executeShikigamiSwarm();
        }
    }

    // H1: Shikigami Swarm
    executeShikigamiSwarm() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);

        // Fire 4 piranhas
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                if (!this.isCasting || this.isDead) return;
                try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}
                
                const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 20 + (Math.random()-0.5)*20, {
                    owner: this,
                    damage: Math.floor(15 * this.power),
                    knockbackX: 100, knockbackY: -20,
                    stunDuration: 200, speed: 600,
                    direction: this.facing, color: 0x0088FF,
                    size: { w: 20, h: 10 }, lifetime: 1200, type: 'slash'
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H2: Tide Disaster
    executeTideDisaster() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_blue', { volume: 0.8 }); } catch(e) {}
            
            // Giant wave projectile
            const wave = new Projectile(this.scene, this.sprite.x + 60 * this.facing, GAME_HEIGHT - 60, {
                owner: this,
                damage: Math.floor(50 * this.power),
                knockbackX: 800, knockbackY: -50,
                stunDuration: 600, speed: 450,
                direction: this.facing, color: 0x0066AA,
                size: { w: 100, h: 150 }, lifetime: 2000, type: 'beam'
            });
            // Override update to apply continuous push
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            wave.update = (time, dt) => {
                if (target && !target.isDead && Math.abs(target.sprite.x - wave.sprite.x) < 60 && Math.abs(target.sprite.y - wave.sprite.y) < 80) {
                    // Push target smoothly
                    target.sprite.body.setVelocityX(600 * this.facing);
                }
            };
            if (this.scene.projectiles) this.scene.projectiles.push(wave);
            
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 300);
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H3: Water Prison
    executeWaterPrison() {
        if (!this.ceSystem.spend(40)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_blue', { volume: 0.7 }); } catch(e) {}
            
            const prison = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 20, {
                owner: this,
                damage: Math.floor(20 * this.power),
                knockbackX: 0, knockbackY: -150,
                stunDuration: 3000, speed: 200, // Very slow
                direction: this.facing, color: 0x00CCFF,
                size: { w: 40, h: 40 }, lifetime: 4000, type: 'orb'
            });
            
            // Override hit behavior to suspend gravity
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            const originalOnCollide = prison.onCollide;
            prison.onCollide = (p) => {
                if (p === target && !p.isDead) {
                    p.sprite.body.setAllowGravity(false);
                    p.sprite.body.setVelocity(0, 0);
                    
                    // Create visual prison bubble
                    const bubble = this.scene.add.graphics().setDepth(15);
                    bubble.fillStyle(0x00CCFF, 0.4);
                    bubble.lineStyle(2, 0x0088FF, 0.8);
                    bubble.fillCircle(p.sprite.x, p.sprite.y - 20, 45);
                    bubble.strokeCircle(p.sprite.x, p.sprite.y - 20, 45);

                    // Re-enable gravity after stun ends
                    this.scene.time.delayedCall(3000, () => {
                        if (p && p.sprite && p.sprite.body) {
                            p.sprite.body.setAllowGravity(true);
                        }
                        bubble.destroy();
                    });
                }
                if (originalOnCollide) originalOnCollide.call(prison, p);
            };

            if (this.scene.projectiles) this.scene.projectiles.push(prison);
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H4: Hydro Shield
    executeHydroShield() {
        if (!this.ceSystem.spend(35)) return;
        this.isCasting = true;
        this.stateMachine.lock(500);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_blue', { volume: 0.6 }); } catch(e) {}
            
            // Clean up old shield if exists
            if (this.hydroShield) this.hydroShield.destroy();

            // Create new shield barrier
            const sx = this.sprite.x + 60 * this.facing;
            const sy = GAME_HEIGHT - 60;
            this.hydroShield = {
                x: sx, y: sy,
                timer: 4000,
                graphics: this.scene.add.graphics().setDepth(14)
            };
        });

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // Maximum: Death Swarm
    executeDeathSwarm() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(1800);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 800);
            this.scene.screenEffects.flash(0x0088FF, 500, 0.4);
        }

        const txt = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'DEATH SWARM', {
            fontFamily: 'Arial Black', fontSize: '36px', color: '#0088FF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        
        // Summon 3 eels consecutively
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(600 + i * 400, () => {
                if (!this.isCasting || this.isDead || !target) return;
                try { this.scene.sound.play('sfx_slash', { volume: 0.9 }); } catch(e) {}
                
                const ex = target.sprite.x;
                const ey = GAME_HEIGHT - 20; // from underground

                // Eel visual
                const g = this.scene.add.graphics().setDepth(17);
                g.fillStyle(0x111133, 1);
                g.fillRect(ex - 25, ey - 200, 50, 200);
                g.lineStyle(3, 0x0088FF, 0.8);
                g.strokeRect(ex - 25, ey - 200, 50, 200);
                this.scene.tweens.add({ targets: g, alpha: 0, y: -50, duration: 300, onComplete: () => g.destroy() });

                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 200);

                if (Math.abs(target.sprite.x - ex) < 40) {
                    target.takeDamage(Math.floor((this.charData.skills.maximum.damage / 3) * this.power), 0, -400, 500);
                }
            });
        }

        this.scene.time.delayedCall(1800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    tryActivateDomain() {
        if (this.scene.domainActive) return;
        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;
        this.scene.onDomainActivated(this, 'HORIZON OF THE CAPTIVATING SKANDHA');
    }

    update(time, dt) {
        super.update(time, dt);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        // Hydro Shield Logic
        if (this.hydroShield) {
            this.hydroShield.timer -= dt;
            const hx = this.hydroShield.x;
            const hy = this.hydroShield.y;

            // Draw shield
            this.hydroShield.graphics.clear();
            const pulse = 0.6 + Math.sin(time * 0.01) * 0.2;
            this.hydroShield.graphics.fillStyle(0x0088FF, pulse);
            this.hydroShield.graphics.fillRect(hx - 15, hy - 120, 30, 120);

            // Check collision with opponent
            if (target && !target.isDead && Math.abs(target.sprite.x - hx) < 30 && target.sprite.y > hy - 120) {
                target.sprite.body.setVelocityX((target.sprite.x > hx ? 1 : -1) * 500);
            }

            if (this.hydroShield.timer <= 0) {
                this.hydroShield.graphics.destroy();
                this.hydroShield = null;
            }
        }

        // Domain Logic
        if (this.scene.domainActive && this.scene.domainOwner === this && !this.scene.domainPhase1) {
            // Apply massive defense buff while in domain
            this.defense = (this.charData.stats.defense || 1.4) * 2.0;

            // Automatically spawn shikigami from edges targeting opponent
            this.shikigamiTimer -= dt;
            if (this.shikigamiTimer <= 0 && target && !target.isDead) {
                this.shikigamiTimer = 800; // spawn every 0.8s
                
                // Spawn from random edge
                const spawnLeft = Math.random() > 0.5;
                const sx = spawnLeft ? target.sprite.x - 300 : target.sprite.x + 300;
                const sy = target.sprite.y - 50 + (Math.random()-0.5)*100;
                const dir = spawnLeft ? 1 : -1;

                const proj = new Projectile(this.scene, sx, sy, {
                    owner: this,
                    damage: Math.floor(10 * this.power),
                    knockbackX: 40 * dir, knockbackY: -10,
                    stunDuration: 100, speed: 700,
                    direction: dir, color: 0x00CCFF,
                    size: { w: 15, h: 10 }, lifetime: 1500, type: 'slash'
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            }
            this.attacksUnblockable = true;
        } else {
            this.defense = this.charData.stats.defense || 1.4;
            this.attacksUnblockable = false;
            this.shikigamiTimer = 0;
        }
    }

    onHitOpponent(opponent) {
        if (this.attacksUnblockable && opponent.stateMachine.is('block')) {
            opponent.stateMachine.setState('hitstun'); 
        }
        super.onHitOpponent(opponent);
    }

    drawFace(g, x, y, facing) {
        g.fillStyle(0x000000, 1);
        g.fillCircle(x - 4 * facing, y - 2, 2);
        g.fillCircle(x + 6 * facing, y - 2, 2);
    }

    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const skinColor = isFlashing ? 0xFFFFFF : 0x992222;
        const armExtend = this.attackSwing * 30;

        // LEGS (thick, squid-like)
        const legY = masterY + 20;
        let leftLeg = 20, rightLeg = 20;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        g.lineStyle(12, skinColor, 1);
        g.beginPath(); g.moveTo(x - 15, legY); g.lineTo(x - 20 - (f * 5), legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 15, legY); g.lineTo(x + 20 + (f * 5), legY + rightLeg); g.strokePath();

        // BODY (Fat, cursed womb shape)
        g.fillStyle(skinColor, 1);
        g.fillEllipse(x, masterY - 10, 50, 60);

        // HEAD
        const hx = x + 5 * f; const hy = masterY - 50;
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 20);
        // Tentacles on head
        g.lineStyle(4, skinColor, 1);
        g.beginPath(); g.moveTo(hx, hy - 15); g.lineTo(hx - 15, hy - 30); g.strokePath();
        g.beginPath(); g.moveTo(hx, hy - 15); g.lineTo(hx + 15, hy - 30); g.strokePath();
        
        this.drawFace(g, hx, hy, f);

        // ARMS
        const armY = masterY - 20;
        g.lineStyle(10, skinColor, 1);
        if (this.attackSwing > 0) {
            g.beginPath(); g.moveTo(x + 15, armY); g.lineTo(x + (35 + armExtend) * f, armY); g.strokePath();
        } else {
            g.beginPath(); g.moveTo(x + 15, armY); g.lineTo(x + 20 * f, armY + 20); g.strokePath();
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (this.isDead) return;
        const ag = this.auraGraphics;
        const x = this.sprite.x; const y = this.sprite.y;
        const t = this.scene.time.now;

        // Water aura
        const pulse = 0.2 + Math.sin(t * 0.01) * 0.1;
        ag.fillStyle(0x0088FF, pulse);
        ag.fillEllipse(x, y - 10, 70, 70);

        if (this.scene.domainActive && this.scene.domainOwner === this) {
            // Enhanced domain aura (Full physical form)
            ag.lineStyle(4, 0x00CCFF, 0.8);
            ag.strokeCircle(x, y - 10, 60 + Math.sin(t * 0.02) * 10);
            ag.fillStyle(0x0088FF, 0.2);
            ag.fillCircle(x, y - 10, 60 + Math.sin(t * 0.02) * 10);
        }
    }
}
