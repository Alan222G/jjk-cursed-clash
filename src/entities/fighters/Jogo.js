import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Jogo extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.JOGO);
        this.isCasting = false;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.executeMaximumMeteor();
        } else if (tier >= 2 && this.input.isDown('DOWN')) {
            this.executeHeatDash();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.executeEmberInsects();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeFireBeam();
        } else if (tier >= 1) {
            this.executeVolcanicEruption();
        }
    }

    // H1: Ember Insects
    executeEmberInsects() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);

        this.scene.time.delayedCall(200, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e) {}
            
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    const insect = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 20 - i * 15, {
                        owner: this,
                        damage: Math.floor(15 * this.power),
                        knockbackX: 50, knockbackY: -50,
                        stunDuration: 300, speed: 400,
                        direction: this.facing, color: 0xFF4400,
                        size: { w: 15, h: 15 }, lifetime: 2000, type: 'orb'
                    });
                    
                    // Simple seeking behavior
                    const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                    const originalUpdate = insect.update.bind(insect);
                    insect.update = (dt) => {
                        originalUpdate(dt);
                        if (!target || target.isDead || !insect.isAlive()) return;
                        const dx = target.sprite.x - insect.sprite.x;
                        const dy = target.sprite.y - insect.sprite.y;
                        const angle = Math.atan2(dy, dx);
                        insect.sprite.body.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
                    };

                    if (this.scene.projectiles) this.scene.projectiles.push(insect);
                });
            }
        });

        this.scene.time.delayedCall(600, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H2: Volcanic Eruption
    executeVolcanicEruption() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        // Visual for slamming hands on ground
        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.01, 200);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        
        this.scene.time.delayedCall(400, () => {
            if (!this.isCasting || this.isDead || !target) return;
            
            const ex = target.sprite.x;
            const ey = GAME_HEIGHT - 60; // ground level

            // Eruption visual
            const g = this.scene.add.graphics().setDepth(16);
            g.fillStyle(0xFF2200, 0.8);
            g.fillRect(ex - 40, ey - 150, 80, 150);
            g.fillStyle(0xFFCC00, 0.9);
            g.fillRect(ex - 20, ey - 130, 40, 130);
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.03, 400);
                this.scene.screenEffects.flash(0xFF4400, 100, 0.3);
            }
            try { this.scene.sound.play('sfx_fire', { volume: 0.8 }); } catch(e) {}

            // Check if opponent is in range
            if (Math.abs(target.sprite.x - ex) < 60 && Math.abs(target.sprite.y - ey) < 200) {
                target.takeDamage(Math.floor(this.charData.skills.skill2.damage * this.power), 0, -900, 1000);
                this.applyBurn(target);
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H3: Fire Beam
    executeFireBeam() {
        if (!this.ceSystem.spend(25)) return; // custom cost
        this.isCasting = true;
        this.stateMachine.lock(700);

        this.scene.time.delayedCall(300, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_fire', { volume: 0.8 }); } catch(e) {}
            
            const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 30, {
                owner: this,
                damage: Math.floor(60 * this.power),
                knockbackX: 400, knockbackY: -50,
                stunDuration: 500, speed: 1200,
                direction: this.facing, color: 0xFF2200,
                size: { w: 120, h: 20 }, lifetime: 1000, type: 'beam'
            });
            proj.isGuardBreak = true; // Block Breaker
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
            
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
        });

        this.scene.time.delayedCall(700, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // H4: Heat Dash
    executeHeatDash() {
        if (!this.ceSystem.spend(30)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);

        try { this.scene.sound.play('sfx_dash', { volume: 0.7 }); } catch(e) {}

        const originalSpeed = this.speed;
        this.sprite.body.setVelocityX(this.facing * 900);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        let hasHit = false;

        // Create fire trail and check hit
        const dashEvent = this.scene.time.addEvent({
            delay: 50,
            repeat: 8,
            callback: () => {
                if (!this.isCasting || this.isDead) return;
                
                // Trail visual
                const g = this.scene.add.graphics().setDepth(14);
                g.fillStyle(0xFF4400, 0.6);
                g.fillCircle(this.sprite.x, this.sprite.y - 30, 25);
                this.scene.tweens.add({ targets: g, scale: 0.1, alpha: 0, duration: 300, onComplete: () => g.destroy() });

                if (!hasHit && target && Math.abs(target.sprite.x - this.sprite.x) < 50 && Math.abs(target.sprite.y - this.sprite.y) < 60) {
                    hasHit = true;
                    target.takeDamage(Math.floor(30 * this.power), 200 * this.facing, -100, 400);
                    this.applyBurn(target);
                }
            }
        });

        this.scene.time.delayedCall(500, () => {
            this.sprite.body.setVelocityX(0);
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // Maximum: Meteorite
    executeMaximumMeteor() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(2000);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 1000);
            this.scene.screenEffects.flash(0xFF0000, 500, 0.5);
        }

        const txt = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'MAXIMUM: METEOR', {
            fontFamily: 'Arial Black', fontSize: '40px', color: '#FF2200', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const mx = target ? target.sprite.x : GAME_WIDTH / 2;

        this.scene.time.delayedCall(1200, () => {
            if (!this.isCasting || this.isDead) return;
            try { this.scene.sound.play('sfx_fire', { volume: 1.0 }); } catch(e) {}
            
            // Giant meteor visual
            const g = this.scene.add.graphics().setDepth(18);
            g.fillStyle(0xFF2200, 1);
            g.fillCircle(mx, GAME_HEIGHT - 60, 200);
            g.fillStyle(0xFFCC00, 1);
            g.fillCircle(mx, GAME_HEIGHT - 60, 150);
            this.scene.tweens.add({ targets: g, alpha: 0, scale: 1.5, duration: 600, onComplete: () => g.destroy() });

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.08, 1000);
                this.scene.screenEffects.flash(0xFFFFFF, 300, 0.8);
            }

            // Damage everyone in huge radius
            [this.scene.p1, this.scene.p2].forEach(p => {
                if (p && !p.isDead && p !== this) {
                    if (Math.abs(p.sprite.x - mx) < 250) {
                        p.takeDamage(Math.floor(this.charData.skills.maximum.damage * this.power), 800 * (p.sprite.x > mx ? 1 : -1), -600, 1500);
                        this.applyBurn(p);
                    }
                }
            });
        });

        this.scene.time.delayedCall(2000, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    applyBurn(target) {
        if (!target || target.isDead) return;
        target.burnTimer = 3000;
        target.burnTick = 0;
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
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'COFFIN OF IRON MOUNTAIN');
    }

    update(time, dt) {
        super.update(time, dt);
        
        // Handle burning logic
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && target.burnTimer > 0) {
            target.burnTimer -= dt;
            target.burnTick -= dt;
            if (target.burnTick <= 0) {
                target.burnTick = 500; // tick every 0.5s
                target.hp -= 2; // Fixed 2 HP drain
                if (target.hp < 1) target.hp = 1; // Don't kill via burn
                
                // Visual
                const g = this.scene.add.graphics().setDepth(15);
                g.fillStyle(0xFF6600, 0.7);
                g.fillCircle(target.sprite.x + (Math.random()-0.5)*30, target.sprite.y - 30 + (Math.random()-0.5)*40, 8);
                this.scene.tweens.add({ targets: g, y: g.y - 30, alpha: 0, duration: 400, onComplete: () => g.destroy() });
            }
        }

        // Domain Logic
        if (this.scene.domainActive && this.scene.domainOwner === this && !this.scene.domainPhase1) {
            // Apply constant burn inside domain
            if (target && (!target.burnTimer || target.burnTimer <= 0)) {
                this.applyBurn(target);
            }
            // Domain sure-hit: attacks cannot be blocked/dodged
            this.attacksUnblockable = true;
        } else {
            this.attacksUnblockable = false;
        }
    }

    // Unblockable attack override
    onHitOpponent(opponent) {
        if (this.attacksUnblockable && opponent.stateMachine.is('block')) {
            opponent.stateMachine.setState('hitstun'); // Break block
        }
        super.onHitOpponent(opponent);
    }

    drawFace(g, x, y, facing) {
        // Jogo's volcano head
        g.fillStyle(0x000000, 1);
        g.fillCircle(x + 2 * facing, y - 5, 4); // one big cyclops eye
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(x + 2 * facing, y - 5, 1.5);
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

        const headColor = isFlashing ? 0xFFFFFF : 0xdce8f5;
        const haoriColor = isFlashing ? 0xFFFFFF : 0xcbd924;
        const pantsColor = isFlashing ? 0xFFFFFF : 0x151922;
        const sleeveColor = isFlashing ? 0xFFFFFF : 0x1e222b;
        const collarColor = isFlashing ? 0xFFFFFF : 0xf0f5fa;
        const craterBrown = isFlashing ? 0xFFFFFF : 0xd9b47e;
        const craterDark = isFlashing ? 0xFFFFFF : 0x3a2010;
        const earColor = isFlashing ? 0xFFFFFF : 0xab794b;
        const ashColor = isFlashing ? 0xFFFFFF : 0x1e2417;

        const ox = x;
        const oy = masterY;

        const rotArmSup = isMoving ? Math.sin(time) * 10 : 5;
        const rotLegSup = isMoving ? Math.cos(time) * 5 : 0;

        // ── Legs (dark pants) ──
        this.drawRect(g, ox - 9, oy + 39, 8, 35, pantsColor, rotLegSup);
        this.drawRect(g, ox + 9, oy + 39, 8, 35, pantsColor, -rotLegSup);
        // Feet
        this.drawRect(g, ox - 9, oy + 62, 11, 6, isFlashing ? 0xFFFFFF : 0x08080a);
        this.drawRect(g, ox + 9, oy + 62, 11, 6, isFlashing ? 0xFFFFFF : 0x08080a);

        // ── Haori body (green-lime cloak) ──
        this.drawRect(g, ox, oy - 5, 24, 52, haoriColor);

        // ── Ash spots on haori ──
        if (!isFlashing) {
            this.drawCircle(g, ox - 6, oy - 18, 3.5, ashColor);
            this.drawCircle(g, ox + 7, oy - 5, 2.5, ashColor);
            this.drawCircle(g, ox - 5, oy + 10, 4, ashColor);
            this.drawCircle(g, ox + 5, oy - 24, 3, ashColor);
        }

        // ── Fluffy collar (overlapping white circles) ──
        this.drawCircle(g, ox - 11, oy - 25, 11, collarColor);
        this.drawCircle(g, ox + 11, oy - 25, 11, collarColor);
        this.drawCircle(g, ox, oy - 24, 12, collarColor);
        // Collar stitching
        if (!isFlashing) {
            this.drawLine(g, ox, oy - 26, ox, oy - 14, 3.5, 0x000000);
            this.drawLine(g, ox - 3, oy - 22, ox + 3, oy - 22, 1.8, 0x000000);
            this.drawLine(g, ox - 3, oy - 18, ox + 3, oy - 18, 1.8, 0x000000);
            this.drawLine(g, ox - 3, oy - 14, ox + 3, oy - 14, 1.8, 0x000000);
        }

        // ── Arms (dark sleeves under cloak) ──
        this.drawRect(g, ox - 13, oy - 18, 8, 28, sleeveColor, rotArmSup - 15);
        this.drawRect(g, ox + 13, oy - 18, 8, 28, sleeveColor, -rotArmSup + 15);
        // Pale hands
        this.drawCircle(g, ox - 18, oy + 4, 4, headColor);
        this.drawCircle(g, ox + 18, oy + 4, 4, headColor);

        // ── Head (pale cyclops) ──
        this.drawCircle(g, ox, oy - 42, 13, headColor);

        // ── Cork wooden ears ──
        this.drawRect(g, ox - 14, oy - 42, 5, 8, earColor, -10);
        this.drawRect(g, ox + 14, oy - 42, 5, 8, earColor, 10);

        // ── Volcano crater on top ──
        this.drawRect(g, ox, oy - 52, 14, 10, craterDark);
        this.drawRect(g, ox, oy - 56, 11, 6, craterBrown);
        // Lava ellipse at top
        g.fillStyle(isFlashing ? 0xFFFFFF : 0xe74c3c, 1);
        g.fillEllipse(ox, oy - 59, 10, 4);

        // ── Cyclops eye ──
        this.drawCircle(g, ox, oy - 43, 6.2, isFlashing ? 0xFFFFFF : 0xffffff);
        this.drawCircle(g, ox, oy - 43, 2.5, isFlashing ? 0xFFFFFF : 0xe74c3c);
        this.drawCircle(g, ox, oy - 43, 0.9, isFlashing ? 0xFFFFFF : 0x000000);
        // Angry brow
        if (!isFlashing) this.drawLine(g, ox - 6, oy - 47, ox + 6, oy - 46, 2.2, 0x000000);

        // ── Teeth grid ──
        if (!isFlashing) {
            this.drawLine(g, ox - 5, oy - 35, ox + 5, oy - 35, 1.8, 0x000000);
            this.drawLine(g, ox - 3, oy - 37, ox - 3, oy - 33, 1, 0x000000);
            this.drawLine(g, ox, oy - 37, ox, oy - 33, 1, 0x000000);
            this.drawLine(g, ox + 3, oy - 37, ox + 3, oy - 33, 1, 0x000000);
        }

        // ── Hitstun stars ──
        if (this.stateMachine.is('hitstun')) {
            const starT = (this.animTimer || 0) * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(x + Math.cos(angle) * 20, y - 60 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.2) * 23, y - 60 + Math.sin(angle + 0.2) * 12,
                    x + Math.cos(angle - 0.2) * 23, y - 60 + Math.sin(angle - 0.2) * 12);
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (this.isDead) return;
        const ag = this.auraGraphics;
        const x = this.sprite.x; const y = this.sprite.y;
        const t = this.scene.time.now;

        // Fiery aura
        const pulse = 0.2 + Math.sin(t * 0.01) * 0.1;
        ag.fillStyle(0xFF4400, pulse);
        ag.fillEllipse(x, y - 20, 60, 80);

        if (this.scene.domainActive && this.scene.domainOwner === this) {
            // Intense magma aura
            ag.lineStyle(4, 0xFF2200, 0.8);
            ag.strokeCircle(x, y - 20, 50 + Math.sin(t * 0.02) * 10);
        }
    }
}
