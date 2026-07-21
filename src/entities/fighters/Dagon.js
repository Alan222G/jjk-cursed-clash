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
            this.executeLeviathanCrash();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeDeathSwarm();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.executeShikigamiSwarm();
        } else if (tier >= 1) {
            this.executeWaterPrison();
        }
    }

    // H2 (UP): Shikigami Swarm (Seeking Piranhas)
    executeShikigamiSwarm() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        // Fire 4 seeking piranhas
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                if (!this.isCasting || this.isDead) return;
                try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}
                
                const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 20 + (Math.random()-0.5)*20, {
                    owner: this,
                    damage: Math.floor(10 * this.power),
                    knockbackX: 60, knockbackY: -20,
                    stunDuration: 200, speed: 500,
                    direction: this.facing, color: 0x0088FF,
                    size: { w: 20, h: 10 }, lifetime: 2000, type: 'slash'
                });
                
                // Seeking logic
                proj.update = (time, dt) => {
                    if (!target || target.isDead) return;
                    const dx = target.sprite.x - proj.sprite.x;
                    const dy = target.sprite.y - proj.sprite.y;
                    const angle = Math.atan2(dy, dx);
                    // Piranhas have sharp tracking
                    proj.sprite.body.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);
                };

                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H1 (Neutral): Water Prison
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

    // H3 (L/R): Death Swarm (Eels)
    executeDeathSwarm() {
        if (!this.ceSystem.spend(40)) return;
        this.isCasting = true;
        this.stateMachine.lock(1800);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 800);
            this.scene.screenEffects.flash(0x0088FF, 500, 0.4);
        }

        const txt = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'DEATH SWARM', {
            fontFamily: 'Arial Black', fontSize: '30px', color: '#0088FF', stroke: '#000000', strokeThickness: 4
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
                    target.takeDamage(Math.floor(40 * this.power), 0, -400, 500);
                }
            });
        }

        this.scene.time.delayedCall(1800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // Maximum (DOWN): Leviathan Crash
    executeLeviathanCrash() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(2500);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 1200);
            this.scene.screenEffects.flash(0x0044AA, 600, 0.6);
        }

        const txt = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LEVIATHAN CRASH', {
            fontFamily: 'Arial Black', fontSize: '42px', color: '#00CCFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 60, scale: 1.2, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const tx = target ? target.sprite.x : GAME_WIDTH / 2;

        this.scene.time.delayedCall(1200, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_blue', { volume: 1.0 }); } catch(e) {}
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}
            
            // Giant Leviathan falling from sky
            const g = this.scene.add.graphics().setDepth(20);
            g.fillStyle(0x0044AA, 1);
            // Jaw shape
            g.beginPath();
            g.moveTo(tx - 150, 0);
            g.lineTo(tx + 150, 0);
            g.lineTo(tx, GAME_HEIGHT); // Snout hits ground
            g.fillPath();

            // Water splash
            g.fillStyle(0x00CCFF, 0.8);
            g.fillCircle(tx, GAME_HEIGHT - 60, 250);
            
            this.scene.tweens.add({ targets: g, alpha: 0, scaleY: 0.2, y: GAME_HEIGHT, duration: 500, onComplete: () => g.destroy() });

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.1, 1200);
                this.scene.screenEffects.flash(0xFFFFFF, 400, 0.9);
            }

            // Massive AoE damage
            [this.scene.p1, this.scene.p2].forEach(p => {
                if (p && !p.isDead && p !== this) {
                    if (Math.abs(p.sprite.x - tx) < 300) {
                        p.takeDamage(Math.floor(this.charData.skills.maximum.damage * this.power), 1000 * (p.sprite.x > tx ? 1 : -1), -900, 2000);
                    }
                }
            });
        });

        this.scene.time.delayedCall(2500, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(this.charData.skills.domain.cost)) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(this.charData.skills.domain.cost);
        this.domainActive = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');

        try { this.scene.sound.play('sfx_fire', { volume: (window.gameSettings?.sfx ?? 50) / 100 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'HORIZON OF THE CAPTIVATING SKANDHA');
    }

    update(time, dt) {
        super.update(time, dt);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

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

                // Randomize shikigami to represent different fish/creatures
                const wRand = 15 + Math.random() * 30;
                const hRand = 10 + Math.random() * 20;
                const spdRand = 500 + Math.random() * 400;

                // Scale damage by size: large = x1.6, small = x0.8, medium = x1.0
                let sizeMult = 1.0;
                if (wRand > 30) sizeMult = 1.6;       // Big shikigami
                else if (wRand < 25) sizeMult = 0.8;   // Small shikigami
                const dmg = Math.floor(6 * this.power * sizeMult);

                const proj = new Projectile(this.scene, sx, sy, {
                    owner: this,
                    damage: dmg,
                    knockbackX: 40 * dir, knockbackY: -10,
                    stunDuration: 100, speed: spdRand,
                    direction: dir, color: 0x00CCFF,
                    size: { w: wRand, h: hRand }, lifetime: 1500, type: 'slash'
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
        g.fillRect(x + 5 * facing, y - 5, 8, 4); // intense eyes
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(x + 9 * facing, y - 3, 1.5);
    }

    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.004);

        const colorRojo = isFlashing ? 0xFFFFFF : 0x8a1a1a;
        const colorCrema = isFlashing ? 0xFFFFFF : 0xe3d0ae;
        const colorCoraza = isFlashing ? 0xFFFFFF : 0x111111;

        const ox = x;
        const oy = masterY - 15;

        // Helper drawing methods in local graphics space
        const drawRelRect = (dx, dy, w, h, color, rotDeg = 0) => {
            g.save();
            g.translate(dx, dy);
            g.rotate(rotDeg * Math.PI / 180);
            g.fillStyle(color, 1);
            g.fillRect(-w/2, -h/2, w, h);
            g.lineStyle(1.5, 0x000000, 1);
            g.strokeRect(-w/2, -h/2, w, h);
            g.restore();
        };

        const drawRelCircle = (dx, dy, r, color) => {
            g.fillStyle(color, 1);
            g.fillCircle(dx, dy, r);
            g.lineStyle(1.5, 0x000000, 1);
            g.strokeCircle(dx, dy, r);
        };

        const drawRelLine = (dx1, dy1, dx2, dy2, width, color) => {
            g.lineStyle(width, color, 1);
            g.lineBetween(dx1, dy1, dx2, dy2);
        };

        const drawRelTriangle = (dx, dy, base, height, color, rotDeg = 0) => {
            g.save();
            g.translate(dx, dy);
            g.rotate(rotDeg * Math.PI / 180);
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(0, -height/2);
            g.lineTo(-base/2, height/2);
            g.lineTo(base/2, height/2);
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0x000000, 1);
            g.strokePath();
            g.restore();
        };

        const drawRelTrapezoid = (dx, dy, topW, bottomW, h, color, rotDeg = 0) => {
            g.save();
            g.translate(dx, dy);
            g.rotate(rotDeg * Math.PI / 180);
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(-topW / 2, -h / 2);
            g.lineTo(topW / 2, -h / 2);
            g.lineTo(bottomW / 2, h / 2);
            g.lineTo(-bottomW / 2, h / 2);
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0x000000, 1);
            g.strokePath();
            g.restore();
        };

        // 1. LEGS (Muscular red legs with cream armor plates)
        const legAngle = isMoving ? Math.sin(time) * 12 : 0;
        drawRelRect(-11, 45, 9, 32, colorRojo, 10 + legAngle);
        drawRelRect(-11, 40, 5, 20, colorCrema, 10 + legAngle);
        drawRelRect(-13, 62, 11, 6, colorRojo, legAngle); // Left foot

        drawRelRect(11, 45, 9, 32, colorRojo, -10 - legAngle);
        drawRelRect(11, 40, 5, 20, colorCrema, -10 - legAngle);
        drawRelRect(13, 62, 11, 6, colorRojo, -legAngle); // Right foot

        // 2. TORSO
        drawRelTrapezoid(0, 10, 21, 25, 42, colorCrema); // Cream chest background
        if (!isFlashing) {
            drawRelLine(-8, 2, 8, 2, 1.5, 0x73614c);
            drawRelLine(-10, 12, 10, 12, 1.5, 0x73614c);
            drawRelLine(-9, 22, 9, 22, 1.5, 0x73614c);
        }

        // Central black armor plate
        drawRelTrapezoid(0, 6, 21, 10, 30, colorCoraza);
        drawRelTriangle(0, 18, 14, 10, colorCoraza, 180);

        // Muscle hood (shoulders/back)
        drawRelTrapezoid(0, -10, 26, 20, 14, colorRojo);

        // 3. ARMS
        const drawDagonArm = (sideSign, angle, extend = 0) => {
            g.save();
            g.translate(sideSign * 13, -10);
            g.rotate(angle * Math.PI / 180);
            
            const armLen = 26 + extend;
            g.fillStyle(colorRojo, 1);
            g.fillRect(-9/2, 14 + extend/2 - armLen/2, 9, armLen);
            g.lineStyle(1.5, 0x000000, 1);
            g.strokeRect(-9/2, 14 + extend/2 - armLen/2, 9, armLen);
            
            g.fillStyle(colorRojo, 1);
            g.fillCircle(0, 26 + extend, 5);
            g.strokeCircle(0, 26 + extend, 5);
            
            g.restore();
        };

        let rightArmAngle = 20;
        let rightArmExtend = 0;
        if (this.attackSwing > 0) {
            rightArmAngle = 90;
            rightArmExtend = this.attackSwing * 30;
        }

        drawDagonArm(-1, -20, 0); // Left Arm
        drawDagonArm(1, rightArmAngle, rightArmExtend); // Right Arm (Front)

        // 4. HEAD (Big red Cthulhu head with tentacles)
        drawRelCircle(0, -25, 14, colorRojo);

        if (!isFlashing) {
            // Spots on top of head
            drawRelCircle(-4, -34, 1.5, 0x111111);
            drawRelCircle(0, -36, 2, 0x111111);
            drawRelCircle(5, -33, 1.5, 0x111111);

            // Bright white lateral eye
            drawRelCircle(-7, -25, 3.2, 0xffffffff);
            drawRelCircle(-7, -25, 1, 0x111111);

            // Facial tentacles
            drawRelRect(-4, -13, 3, 11, colorRojo, 8);
            drawRelRect(0, -11, 3.2, 13, colorRojo);
            drawRelRect(4, -13, 3, 11, colorRojo, -8);
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
