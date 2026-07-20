// ========================================================
// Nobara Kugisaki — Grade 3 Sorcerer
// Straw Doll Technique: Resonance & Hairpin
// Ranged zoner with delayed burst damage
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Nobara extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NOBARA);
        this.isCasting = false;
        this.nailCounterDisplay = null; // Visual UI for nails on opponent
    }

    // ═══════════════════════════════════════
    // SPECIAL ATTACKS
    // ═══════════════════════════════════════
    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castResonance();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castHairpin();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castBlackFlash();
        } else if (tier >= 1) {
            this.castNailThrow();
        }
    }

    castWithAudio(sfxKey, callback, fallbackMs) {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);
        let _fired = false;
        const fireAction = () => {
            if (_fired) return; _fired = true;
            this.isCasting = false;
            if (this.stateMachine.locked) this.stateMachine.unlock();
            callback();
        };
        try {
            let rawVol = (window.gameSettings?.sfx ?? 50) / 100;
            const snd = this.scene.sound.add(sfxKey, { volume: rawVol * 2.0 });
            snd.once('complete', fireAction);
            snd.play();
            this.scene.time.delayedCall(fallbackMs || 5000, fireAction);
        } catch (e) { fireAction(); }
    }

    // ═══════════════════════════════════════
    // NAIL THROW (U)
    // ═══════════════════════════════════════
    castNailThrow() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true; this.stateMachine.lock(600);
        
        try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e){}

        // Throw 2 nails
        for (let i = 0; i < 2; i++) {
            this.scene.time.delayedCall(100 + i * 150, () => {
                const px = this.sprite.x + 30 * this.facing;
                const py = this.sprite.y - 20 - (i * 10);
                
                // Visual Hammer swing effect
                const swing = this.scene.add.graphics().setDepth(15);
                swing.lineStyle(4, 0x44AAFF, 0.6);
                swing.beginPath(); swing.arc(this.sprite.x, this.sprite.y - 15, 40, -Math.PI/2, Math.PI/2 * this.facing, this.facing < 0); swing.strokePath();
                this.scene.tweens.add({ targets: swing, alpha: 0, duration: 150, onComplete: () => swing.destroy() });

                const proj = new Projectile(this.scene, px, py, {
                    owner: this, damage: Math.floor(this.charData.skills.skill1.damage * this.power),
                    knockbackX: 80 * this.facing, knockbackY: -30, stunDuration: 200, speed: 700,
                    direction: this.facing, color: 0x88CCFF, size: { w: 25, h: 6 }, lifetime: 1200, type: 'nail',
                    onHitCallback: (p, victim) => {
                        // Add nails to victim
                        victim.nailsEmbedded = (victim.nailsEmbedded || 0) + 1;
                        if (victim.nailsEmbedded > 6) victim.nailsEmbedded = 6; // Max 6 nails
                        this.updateNailUI(victim);
                        return false; // Return false so default hit logic destroys the projectile
                    }
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }

        this.scene.time.delayedCall(550, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // HAIRPIN (U + Side) — Detonates embedded nails
    // ═══════════════════════════════════════
    castHairpin() {
        const victim = this.opponent;
        if (!victim || !victim.nailsEmbedded || victim.nailsEmbedded <= 0) {
            // Fails if no nails
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, '¡SIN CLAVOS!', {
                fontSize: '12px', fontFamily: 'Arial Black', color: '#FF4444', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: txt, y: '-=30', alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            return;
        }

        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true; this.stateMachine.lock(800);
        
        // Nobara snap animation
        try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.6 }); } catch(e){}
        const snap = this.scene.add.circle(this.sprite.x + 20 * this.facing, this.sprite.y - 30, 15, 0x44AAFF, 0.8).setDepth(15);
        this.scene.tweens.add({ targets: snap, scale: 2, alpha: 0, duration: 300, onComplete: () => snap.destroy() });

        this.scene.time.delayedCall(200, () => {
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0x44AAFF, 300, 0.4);
            try { this.scene.sound.play('sfx_explosion', { volume: 1.0 }); } catch(e){}
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 500);

            const numNails = victim.nailsEmbedded;
            victim.nailsEmbedded = 0; // Consume nails
            this.updateNailUI(victim);

            const baseDmg = this.charData.skills.skill2.damage * this.power;
            const totalDmg = baseDmg + (numNails * 30 * this.power);

            // Explosions on victim
            for (let i = 0; i < numNails; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    const ex = victim.sprite.x + (Math.random() - 0.5) * 60;
                    const ey = victim.sprite.y - Math.random() * 80;
                    const blast = this.scene.add.circle(ex, ey, 40, 0x00AAFF, 0.9).setDepth(20);
                    this.scene.tweens.add({ targets: blast, scale: 2, alpha: 0, duration: 300, onComplete: () => blast.destroy() });
                });
            }

            // Hit victim globally
            victim.takeDamage(totalDmg, 300 * this.facing, -400, 600 + (numNails * 100));
        });

        this.scene.time.delayedCall(700, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // BLACK FLASH (UP + U)
    // ═══════════════════════════════════════
    castBlackFlash() {
        if (!this.ceSystem.spend(40)) return;
        this.isCasting = true; this.stateMachine.lock(600);
        this.sprite.body.setVelocityX(600 * this.facing); // Dash forward
        
        try { this.scene.sound.play('sfx_dash', { volume: 0.5 }); } catch(e){}

        this.scene.time.delayedCall(150, () => {
            this.sprite.body.setVelocityX(0);

            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 80) {
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.hitFreeze(150);
                        this.scene.screenEffects.flash(0x000000, 150, 0.4);
                        this.scene.screenEffects.shake(0.04, 300);
                    }
                    try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e){}
                    this.spawnBlackFlashEffect(this.opponent.sprite.x, this.opponent.sprite.y);
                    
                    const dmg = Math.floor(45 * this.power * 2.5); // Black Flash multiplier applied
                    this.opponent.takeDamage(dmg, 400 * this.facing, -300, 500);
                    this.comboSystem.registerHit('SPECIAL');
                    
                    this.ceSystem.gain(30);
                }
            }

            this.scene.time.delayedCall(300, () => {
                this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
            });
        });
    }

    // ═══════════════════════════════════════
    // RESONANCE (U + Down)
    // ═══════════════════════════════════════
    castResonance() {
        const victim = this.opponent;
        if (!victim || !victim.nailsEmbedded || victim.nailsEmbedded <= 0) {
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, '¡NECESITO UNA CONEXIÓN!', {
                fontSize: '12px', fontFamily: 'Arial Black', color: '#FF4444', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: txt, y: '-=30', alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            return;
        }

        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true; this.stateMachine.lock(1800);
        
        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 1000);
            this.scene.screenEffects.flash(0x000000, 500, 0.8);
        }

        // Nobara hits straw doll
        this.scene.time.delayedCall(400, () => {
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.5 }); } catch(e){}
            
            // Visual Heart/Doll
            const hx = this.sprite.x + 30 * this.facing;
            const hy = this.sprite.y - 20;
            const doll = this.scene.add.graphics().setDepth(20);
            doll.fillStyle(0xAA7755, 1); doll.fillEllipse(hx, hy, 20, 30); // Body
            doll.fillStyle(0x885533, 1); doll.fillCircle(hx, hy - 20, 10); // Head
            
            // Hammer striking it
            const hammer = this.scene.add.rectangle(hx - 20 * this.facing, hy - 40, 40, 15, 0x444444).setDepth(21);
            hammer.setAngle(-45 * this.facing);
            this.scene.tweens.add({
                targets: hammer, angle: 45 * this.facing, x: hx, y: hy, duration: 150, ease: 'Power2',
                onComplete: () => {
                    // Impact!
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.08, 600);
                    const shock = this.scene.add.circle(hx, hy, 100, 0x221133, 0.8).setDepth(15);
                    this.scene.tweens.add({ targets: shock, scale: 3, alpha: 0, duration: 400, onComplete: () => shock.destroy() });

                    // Resonance lines connecting to victim
                    const connect = this.scene.add.graphics().setDepth(16);
                    connect.lineStyle(6, 0x221133, 0.8);
                    connect.beginPath(); connect.moveTo(hx, hy); connect.lineTo(victim.sprite.x, victim.sprite.y - 30); connect.strokePath();
                    this.scene.tweens.add({ targets: connect, alpha: 0, duration: 300, onComplete: () => connect.destroy() });

                    // Damage calculation (Consumes all nails, huge base damage + multiplier)
                    const numNails = victim.nailsEmbedded;
                    victim.nailsEmbedded = 0;
                    this.updateNailUI(victim);

                    const dmg = (this.charData.skills.maximum.damage + (numNails * 50)) * this.power;
                    // Black Flash visual on victim
                    const bf = this.scene.add.circle(victim.sprite.x, victim.sprite.y - 30, 80, 0xFF0000, 0.7).setDepth(22);
                    const bfCore = this.scene.add.circle(victim.sprite.x, victim.sprite.y - 30, 40, 0x000000, 1).setDepth(23);
                    this.scene.tweens.add({ targets: [bf, bfCore], scale: 1.5, alpha: 0, duration: 500, onComplete: () => { bf.destroy(); bfCore.destroy(); }});

                    victim.takeDamage(dmg, 800 * this.facing, -300, 1500); // 1.5s stun!

                    this.scene.time.delayedCall(400, () => { doll.destroy(); hammer.destroy(); });
                }
            });
        });

        this.scene.time.delayedCall(1600, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // DOMAIN — Purgatory of Nails (Incomplete)
    // Rains nails continuously from the sky
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');

        try { this.scene.sound.play('sfx_fire', { volume: (window.gameSettings?.sfx ?? 50) / 100 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'purgatory_of_nails');
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        
        if (!opponent.nailsEmbedded) opponent.nailsEmbedded = 0;
        
        if (opponent.nailsEmbedded < 6) {
            opponent.nailsEmbedded++;
            this.updateNailUI(opponent);
            
            // Visual effect
            const hx = opponent.sprite.x + (Math.random() - 0.5) * 40;
            const hy = opponent.sprite.y - 20 + (Math.random() - 0.5) * 40;
            const nail = this.scene.add.circle(hx, hy, 4, 0x44AAFF, 0.8).setDepth(20);
            this.scene.tweens.add({
                targets: nail, alpha: 0, scale: 3, duration: 300, onComplete: () => nail.destroy()
            });
            try { this.scene.sound.play('sfx_slash', { volume: 0.3 }); } catch(e) {}
        }
    }

    // ═══════════════════════════════════════
    // UTILS & UI
    // ═══════════════════════════════════════
    updateNailUI(victim) {
        if (!this.nailCounterDisplay) {
            this.nailCounterDisplay = this.scene.add.text(victim.sprite.x, victim.sprite.y - 120, '', {
                fontSize: '14px', fontFamily: 'Arial Black', color: '#44AAFF', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(30);
        }
        
        if (victim.nailsEmbedded > 0) {
            this.nailCounterDisplay.setText('CLAVOS: ' + victim.nailsEmbedded);
            this.nailCounterDisplay.setPosition(victim.sprite.x, victim.sprite.y - 120);
            this.nailCounterDisplay.setAlpha(1);
        } else {
            this.nailCounterDisplay.setAlpha(0);
        }
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.opponent && this.nailCounterDisplay) {
            this.nailCounterDisplay.setPosition(this.opponent.sprite.x, this.opponent.sprite.y - 120);
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Nobara Kugisaki
    // Orange-brown hair, blue uniform, hammer
    // ═══════════════════════════════════════
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

        const skinColor = isFlashing ? 0xFFFFFF : 0xfcd0a1;
        const jacketColor = isFlashing ? 0xFFFFFF : 0x1b263b;
        const hairColor = isFlashing ? 0xFFFFFF : 0xd35400;
        const beltColor = isFlashing ? 0xFFFFFF : 0x5c3a21;
        const bootColor = isFlashing ? 0xFFFFFF : 0x5c3a21;
        const buttonColor = isFlashing ? 0xFFFFFF : 0xf1c40f;

        const ox = x;
        const oy = masterY;

        const rotArmSup = isMoving ? Math.sin(time) * 10 : 5;
        const rotLegSup = isMoving ? Math.cos(time) * 5 : 0;

        // ── Legs (dark tights) ──
        this.drawRect(g, ox - 8, oy + 39, 7, 35, 0x111111, rotLegSup);
        this.drawRect(g, ox + 8, oy + 39, 7, 35, 0x111111, -rotLegSup);

        // ── Boots ──
        this.drawRect(g, ox - 8, oy + 62, 10, 6, bootColor);
        this.drawRect(g, ox + 8, oy + 62, 10, 6, bootColor);

        // ── Pleated skirt ──
        this.drawRect(g, ox, oy + 14, 26, 22, jacketColor);
        if (!isFlashing) {
            this.drawLine(g, ox - 7, oy + 4, ox - 10, oy + 24, 1.8, 0x0d131f);
            this.drawLine(g, ox, oy + 4, ox, oy + 24, 1.8, 0x0d131f);
            this.drawLine(g, ox + 7, oy + 4, ox + 10, oy + 24, 1.8, 0x0d131f);
        }

        // ── Torso (school jacket) ──
        this.drawRect(g, ox, oy - 14, 18, 32, jacketColor);

        // ── White collar triangle ──
        this.drawTriangle(g, ox, oy - 26, 7, 7, isFlashing ? 0xFFFFFF : 0xffffff);

        // ── Gold buttons ──
        this.drawCircle(g, ox, oy - 18, 2, buttonColor);
        this.drawCircle(g, ox, oy - 10, 2, buttonColor);

        // ── Belt with pouch ──
        this.drawRect(g, ox, oy + 3, 21, 5, beltColor);
        this.drawRect(g, ox - 7, oy + 9, 5, 8, isFlashing ? 0xFFFFFF : 0x3e2723);

        // ── Arms (jacket sleeves) ──
        this.drawRect(g, ox - 13, oy - 13, 7, 28, jacketColor, rotArmSup - 10);
        this.drawRect(g, ox + 13, oy - 13, 7, 28, jacketColor, -rotArmSup + 10);

        // ── Hands ──
        this.drawCircle(g, ox - 17, oy + 8, 4, skinColor);
        this.drawCircle(g, ox + 17, oy + 8, 4, skinColor);

        // ── Head ──
        this.drawCircle(g, ox, oy - 42, 12, skinColor);

        // ── Eyes (angry anime style) ──
        if (!isFlashing) {
            this.drawLine(g, ox - 5, oy - 41, ox - 1, oy - 41, 2, 0x3e2723);
            this.drawLine(g, ox + 1, oy - 41, ox + 5, oy - 41, 2, 0x3e2723);
            this.drawLine(g, ox - 2, oy - 36, ox + 2, oy - 36, 1.5, 0x000000); // Mouth
        }

        // ── Orange bob hair ──
        this.drawCircle(g, ox, oy - 47, 12, hairColor);
        this.drawTriangle(g, ox - 7, oy - 43, 4.5, 11, hairColor, 15);
        this.drawTriangle(g, ox, oy - 43, 5.5, 13, hairColor, 0);
        this.drawTriangle(g, ox + 7, oy - 43, 4.5, 11, hairColor, -15);

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

    drawHammer(g, hx, hy, angleDeg) {
        const rad = Phaser.Math.DegToRad(angleDeg);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotatePoint = (px, py) => {
            return {
                x: hx + px * cos - py * sin,
                y: hy + px * sin + py * cos
            };
        };

        const drawRotatedRect = (px, py, w, h, color) => {
            const p1 = rotatePoint(px, py);
            const p2 = rotatePoint(px + w, py);
            const p3 = rotatePoint(px + w, py + h);
            const p4 = rotatePoint(px, py + h);
            
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(p1.x, p1.y);
            g.lineTo(p2.x, p2.y);
            g.lineTo(p3.x, p3.y);
            g.lineTo(p4.x, p4.y);
            g.fillPath();
        };

        // Hammer Handle
        drawRotatedRect(-3, -20, 6, 40, 0x664422);

        // Hammer Head (Steel)
        drawRotatedRect(-12, -25, 24, 12, 0x9999AA);
        
        // Face of the hammer
        drawRotatedRect(10, -23, 4, 8, 0xBBBBCC);
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (!this.isDead && this.ceSystem.ce > 20) {
            const ag = this.auraGraphics;
            const x = this.sprite.x; const y = this.sprite.y;
            const t = this.scene.time.now;
            // Light blue energy aura for Nobara
            const pulse = 0.1 + Math.sin(t * 0.006) * 0.05;
            ag.fillStyle(0x44AAFF, pulse);
            ag.fillEllipse(x, y - 20, 45, 80);
        }
    }
}
