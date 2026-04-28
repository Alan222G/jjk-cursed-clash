// ========================================================
// Sukuna 20 Fingers — True Form (Raid Boss)
// Dynamic HP, Simple Domain shield, Bleeding Fuga net
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

// HP scales based on number of opponents
const HP_TABLE = {
    1: 5000, 2: 6000, 3: 7000, 4: 8000,
    5: 9000, 6: 10000, 7: 11000, 8: 12000,
};

export default class Sukuna20 extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.SUKUNA_20);
        this.isCasting = false;
        this.rctCooldown = 0;
        this.spiderwebCooldown = 0;
        // Simple Domain state
        this.simpleDomainActive = false;
        this.simpleDomainTimer = 0;
        this.simpleDomainMaxTime = 10000; // 10 seconds max
        this.simpleDomainCeDrain = 8; // CE per second base
        this.simpleDomainHitDrain = 15; // Extra CE drain when hit
        // Bleeding state tracking for opponents
        this.bleedTargets = new Map();
        // Apply dynamic HP
        const opponents = window._raidState?.challengers?.length || 1;
        const dynHp = HP_TABLE[opponents] || 5000;
        this.maxHp = dynHp;
        this.hp = dynHp;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castDivineFlame();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castSimpleDomain();
        } else if (tier >= 1) {
            this.castWorldDismantle();
        }
    }

    // Helper for casting with audio
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
            const snd = this.scene.sound.add(sfxKey, { volume: rawVol * 4.0 });
            snd.once('complete', fireAction);
            snd.play();
            this.scene.time.delayedCall(fallbackMs || 5000, fireAction);
        } catch (e) { fireAction(); }
    }

    // ═══════════════════════════════════════
    // WORLD DISMANTLE — Triple slash burst (3-in-1)
    // ═══════════════════════════════════════
    castWorldDismantle() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        const skill = this.charData.skills.skill1;
        this.castWithAudio('sfx_slash', () => {
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    const yOff = (i - 1) * 30;
                    const proj = new Projectile(this.scene,
                        this.sprite.x + (40 + i * 15) * this.facing,
                        this.sprite.y - 50 + yOff, {
                        owner: this,
                        damage: Math.floor(skill.damage * this.power * 0.45),
                        knockbackX: 180 + i * 40, knockbackY: -60 - i * 20,
                        stunDuration: 250, speed: 900 + i * 150,
                        direction: this.facing, color: 0xFF0000,
                        size: { w: 55, h: 12 }, lifetime: 1100, type: 'slash',
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                    // Slash VFX
                    const g = this.scene.add.graphics().setDepth(15);
                    const sx = this.sprite.x + 30 * this.facing;
                    const sy = this.sprite.y - 40 + yOff;
                    g.lineStyle(4, 0xFF2200, 0.9);
                    g.beginPath(); g.moveTo(sx-25,sy-25); g.lineTo(sx+25,sy+25); g.strokePath();
                    g.lineStyle(3, 0xFFAAAA, 0.7);
                    g.beginPath(); g.moveTo(sx+25,sy-25); g.lineTo(sx-25,sy+25); g.strokePath();
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
                });
            }
            this.stateMachine.setState('idle');
        }, 2500);
    }

    // ═══════════════════════════════════════
    // SIMPLE DOMAIN (U+Dir) — Intocable shield, drains CE
    // Like Infinity: nullifies all damage while active
    // Costs more CE when enemies attack the shield
    // ═══════════════════════════════════════
    castSimpleDomain() {
        if (this.simpleDomainActive) return;
        if (!this.ceSystem.canAfford(15)) return;
        this.ceSystem.spend(15);

        this.simpleDomainActive = true;
        this.simpleDomainTimer = 0;
        this.isInvulnerable = true;

        try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}

        // Visual indicator
        this.domainShieldGfx = this.scene.add.graphics().setDepth(14);
    }

    updateSimpleDomain(dt) {
        if (!this.simpleDomainActive) return;

        this.simpleDomainTimer += dt;
        const ceDrain = this.simpleDomainCeDrain * (dt / 1000);

        // Drain CE passively
        if (!this.ceSystem.spend(ceDrain) || this.simpleDomainTimer >= this.simpleDomainMaxTime) {
            this.endSimpleDomain();
            return;
        }

        // Draw shield visual
        if (this.domainShieldGfx) {
            this.domainShieldGfx.clear();
            const x = this.sprite.x; const y = this.sprite.y - 30;
            const pulse = 0.3 + Math.sin(this.scene.time.now * 0.008) * 0.15;
            // Outer barrier
            this.domainShieldGfx.lineStyle(4, 0xFF2200, pulse + 0.3);
            this.domainShieldGfx.strokeEllipse(x, y, 110, 160);
            // Inner glow
            this.domainShieldGfx.fillStyle(0xFF0000, pulse * 0.15);
            this.domainShieldGfx.fillEllipse(x, y, 100, 150);
            // Kanji-like marks
            this.domainShieldGfx.lineStyle(2, 0xFF4400, pulse + 0.2);
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + this.scene.time.now * 0.002;
                const rx = x + Math.cos(angle) * 45;
                const ry = y + Math.sin(angle) * 70;
                this.domainShieldGfx.fillStyle(0xFF2200, 0.6);
                this.domainShieldGfx.fillCircle(rx, ry, 4);
            }
        }
    }

    // Called when enemy attacks the shield — extra CE drain
    onShieldHit() {
        if (!this.simpleDomainActive) return;
        this.ceSystem.spend(this.simpleDomainHitDrain);
        // Flash the shield
        if (this.domainShieldGfx) {
            const x = this.sprite.x; const y = this.sprite.y - 30;
            const flash = this.scene.add.circle(x, y, 60, 0xFFFFFF, 0.5).setDepth(15);
            this.scene.tweens.add({ targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200, onComplete: () => flash.destroy() });
        }
        if (this.ceSystem.getCurrent() <= 0) this.endSimpleDomain();
    }

    endSimpleDomain() {
        this.simpleDomainActive = false;
        this.isInvulnerable = false;
        if (this.domainShieldGfx) {
            this.domainShieldGfx.destroy();
            this.domainShieldGfx = null;
        }
    }

    // Override takeDamage to handle shield
    takeDamage(dmg, kbX, kbY, stunMs) {
        if (this.simpleDomainActive) {
            this.onShieldHit();
            return; // No damage taken
        }
        super.takeDamage(dmg, kbX, kbY, stunMs);
    }

    // ═══════════════════════════════════════
    // DIVINE FLAME FUGA — Giant cutting net + bleeding
    // ═══════════════════════════════════════
    castDivineFlame() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.15, 800);
            this.scene.screenEffects.flash(0xFF2200, 600, 0.6);
        }

        this.castWithAudio('sfx_fire', () => {
            // Giant cutting net visual
            const cx = this.sprite.x + 80 * this.facing;
            const cy = this.sprite.y - 40;
            const g = this.scene.add.graphics().setDepth(16);

            // Draw cutting net (grid pattern)
            const netW = 350; const netH = 250;
            const nx = cx - (this.facing < 0 ? netW : 0);
            for (let i = 0; i <= 8; i++) {
                const lx = nx + (netW / 8) * i;
                g.lineStyle(3, 0xFF0000, 0.8);
                g.lineBetween(lx, cy - netH/2, lx, cy + netH/2);
            }
            for (let j = 0; j <= 6; j++) {
                const ly = cy - netH/2 + (netH / 6) * j;
                g.lineStyle(3, 0xFF0000, 0.8);
                g.lineBetween(nx, ly, nx + netW, ly);
            }
            // Diagonal slashes across the net
            g.lineStyle(5, 0xFFFFFF, 0.7);
            g.lineBetween(nx, cy - netH/2, nx + netW, cy + netH/2);
            g.lineBetween(nx + netW, cy - netH/2, nx, cy + netH/2);
            g.lineStyle(3, 0xFF2200, 0.9);
            g.lineBetween(nx, cy - netH/2, nx + netW, cy + netH/2);
            g.lineBetween(nx + netW, cy - netH/2, nx, cy + netH/2);

            // Flash
            const flash = this.scene.add.circle(cx, cy, 180, 0xFF2222, 0.35).setDepth(15);

            this.scene.tweens.add({ targets: [g, flash], alpha: 0, duration: 600, delay: 300,
                onComplete: () => { g.destroy(); flash.destroy(); }
            });

            // Damage + apply bleeding
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 400) {
                    const dmg = Math.floor(this.charData.skills.maximum.damage * this.power * 0.6);
                    target.takeDamage(dmg, 500 * this.facing, -300, 800);
                    // Apply bleeding: 30 dmg/sec for 8 seconds
                    this.applyBleed(target, 30, 8000);
                    this.comboSystem.registerHit('SPECIAL');
                }
            }

            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 800);
            this.stateMachine.setState('idle');
        }, 5000);
    }

    // Bleeding system
    applyBleed(target, dps, duration) {
        this.bleedTargets.set(target, { dps, remaining: duration, tickTimer: 0 });
        // Visual indicator on target
        try { this.scene.sound.play('sfx_slash', { volume: 0.3 }); } catch(e) {}
    }

    updateBleeding(dt) {
        this.bleedTargets.forEach((bleed, target) => {
            if (target.isDead) { this.bleedTargets.delete(target); return; }
            bleed.remaining -= dt;
            bleed.tickTimer += dt;
            if (bleed.remaining <= 0) { this.bleedTargets.delete(target); return; }
            // Tick every 500ms
            if (bleed.tickTimer >= 500) {
                bleed.tickTimer = 0;
                const tickDmg = Math.floor(bleed.dps * 0.5);
                target.hp = Math.max(0, target.hp - tickDmg);
                // Blood drip visual
                const g = this.scene.add.graphics().setDepth(12);
                const bx = target.sprite.x + (Math.random()-0.5)*30;
                const by = target.sprite.y - 20 + Math.random()*40;
                g.fillStyle(0xFF0000, 0.8);
                g.fillCircle(bx, by, 3);
                g.fillCircle(bx + 5, by + 8, 2);
                this.scene.tweens.add({ targets: g, alpha: 0, y: '+=20', duration: 400, onComplete: () => g.destroy() });
            }
        });
    }

    // ═══════════════════════════════════════
    // RCT Passive + Simple Domain update
    // ═══════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);
        if (!this.isDead && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 15 * (dt / 1000));
        }
        this.updateSimpleDomain(dt);
        this.updateBleeding(dt);
        if (this.spiderwebCooldown > 0) this.spiderwebCooldown -= dt;
    }

    // ═══════════════════════════════════════
    // DOMAIN EXPANSION — Barrierless Malevolent Shrine
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
        try { this.scene.sound.play('sukuna_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'malevolent_shrine');
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        opponent.takeDamage(80, 30 * this.facing, 0, 150);
        const ox = opponent.sprite.x; const oy = opponent.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(15);
        for (let j = 0; j < 2; j++) {
            const slX = ox + (Math.random()-0.5)*80;
            const slY = oy + (Math.random()-0.5)*80;
            g.lineStyle(8, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(slX-30,slY-30); g.lineTo(slX+30,slY+30); g.strokePath();
            g.lineStyle(4, 0xFF0000, 1);
            g.beginPath(); g.moveTo(slX-30,slY+30); g.lineTo(slX+30,slY-30); g.strokePath();
        }
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
    }

    // ═══════════════════════════════════════
    // DRAW — 4-Armed Muscular True Form
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing; const colors = this.colors;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(colors.primary, 0.5); g.fillEllipse(x, y+20, 100, 30); return; }

        const bobY = this.stateMachine.isAny('idle','block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const skinColor = isFlashing ? 0xFFFFFF : colors.skin;
        const pantColor = isFlashing ? 0xFFFFFF : 0x1A0A0A;
        const markColor = isFlashing ? 0xFFAAAA : 0x440000;
        const armExtend = this.attackSwing * 45;

        // LEGS
        const legY = masterY + 10;
        let leftLeg = 42, rightLeg = 42;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle*1.5; rightLeg -= this.walkCycle*1.5; }
        else if (this.stateMachine.isAny('jump','fall')) { leftLeg = 25; rightLeg = 25; }
        g.lineStyle(8, pantColor, 1);
        g.beginPath(); g.moveTo(x-12, legY); g.lineTo(x-18-(f*12), legY+leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x+12, legY); g.lineTo(x+18+(f*12), legY+rightLeg); g.strokePath();
        g.fillStyle(pantColor, 1);
        g.fillCircle(x-18-(f*12), legY+leftLeg, 5);
        g.fillCircle(x+18+(f*12), legY+rightLeg, 5);

        // TORSO (shirtless muscular)
        g.fillStyle(skinColor, 1);
        g.fillRect(x-20, masterY-42, 40, 55);
        g.lineStyle(1, markColor, 0.4);
        g.lineBetween(x, masterY-38, x, masterY+8);
        g.beginPath(); g.arc(x-8, masterY-28, 8, -0.5, 0.8, false); g.strokePath();
        g.beginPath(); g.arc(x+8, masterY-28, 8, Math.PI-0.8, Math.PI+0.5, false); g.strokePath();
        for (let i = 0; i < 3; i++) { g.lineStyle(1,markColor,0.3); g.lineBetween(x-8,masterY-12+i*12,x+8,masterY-12+i*12); }
        // Cursed marks
        g.lineStyle(2, 0x660000, 0.7);
        g.beginPath(); g.moveTo(x-18,masterY-35); g.lineTo(x-8,masterY-25); g.strokePath();
        g.beginPath(); g.moveTo(x+18,masterY-35); g.lineTo(x+8,masterY-25); g.strokePath();
        g.beginPath(); g.moveTo(x-15,masterY-10); g.lineTo(x-5,masterY); g.strokePath();
        g.beginPath(); g.moveTo(x+15,masterY-10); g.lineTo(x+5,masterY); g.strokePath();

        // HEAD
        const hx = x; const hy = masterY - 55;
        g.fillStyle(skinColor, 1); g.fillCircle(hx, hy, 14);
        g.fillStyle(isFlashing ? 0xFFFFFF : colors.hair, 1);
        g.beginPath();
        g.moveTo(hx-16,hy-8); g.lineTo(hx-18,hy-24); g.lineTo(hx-6,hy-16);
        g.lineTo(hx,hy-28); g.lineTo(hx+6,hy-16);
        g.lineTo(hx+18,hy-24); g.lineTo(hx+16,hy-8); g.fillPath();
        // 4 Eyes
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(hx-5*f, hy-3, 2.5); g.fillCircle(hx+5*f, hy-3, 2.5);
        g.fillCircle(hx-5*f, hy+3, 1.5); g.fillCircle(hx+5*f, hy+3, 1.5);
        g.lineStyle(2,0x660000,0.8); g.beginPath(); g.moveTo(hx-6,hy+7); g.lineTo(hx+6,hy+7); g.strokePath();

        // 4 ARMS
        const armY = masterY - 36;
        g.lineStyle(7, skinColor, 0.85);
        g.beginPath(); g.moveTo(x-18,armY+2); g.lineTo(x-32*f,armY+22); g.strokePath();
        g.fillStyle(skinColor,0.85); g.fillCircle(x-32*f,armY+22, 5);
        g.beginPath(); g.moveTo(x+18,armY+2); g.lineTo(x+32*f,armY-10); g.strokePath();
        g.fillStyle(skinColor,0.85); g.fillCircle(x+32*f,armY-10, 5);
        g.lineStyle(9, skinColor, 1);
        if (this.stateMachine.is('block')) {
            g.beginPath(); g.moveTo(x-16,armY+5); g.lineTo(x-10*f,armY-15); g.strokePath();
        } else {
            g.beginPath(); g.moveTo(x-16,armY+5); g.lineTo(x-(22+armExtend)*f,armY+18); g.strokePath();
            g.fillStyle(skinColor,1); g.fillCircle(x-(22+armExtend)*f,armY+18, 6);
        }
        if (this.attackSwing > 0) {
            g.beginPath(); g.moveTo(x+16,armY+5); g.lineTo(x+(28+armExtend)*f,armY-5); g.strokePath();
            g.fillStyle(skinColor,1); g.fillCircle(x+(28+armExtend)*f,armY-5, 7);
        } else {
            g.beginPath(); g.moveTo(x+16,armY+5); g.lineTo(x+20*f,armY+22); g.strokePath();
            g.fillStyle(skinColor,1); g.fillCircle(x+20*f,armY+22, 6);
        }

        // Simple Domain visual on body
        if (this.simpleDomainActive) {
            g.lineStyle(2, 0xFF4400, 0.6 + Math.sin(this.scene.time.now*0.01)*0.3);
            g.strokeCircle(x, masterY - 20, 35);
        }

        // Hitstun stars
        if (this.stateMachine.is('hitstun')) {
            const starT = (this.animTimer||0)*0.01;
            for (let i=0;i<3;i++) {
                const angle=starT+(i*Math.PI*2/3);
                g.fillStyle(0xFFFF00,0.8);
                g.fillTriangle(x+Math.cos(angle)*22,y-70+Math.sin(angle)*10,
                    x+Math.cos(angle+0.2)*25,y-70+Math.sin(angle+0.2)*12,
                    x+Math.cos(angle-0.2)*25,y-70+Math.sin(angle-0.2)*12);
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (!this.isDead) {
            const ag = this.auraGraphics;
            const x = this.sprite.x; const y = this.sprite.y;
            const t = this.scene.time.now;
            const pulse = 0.15 + Math.sin(t*0.005)*0.1;
            ag.fillStyle(0xFF0000, pulse);
            ag.fillEllipse(x, y-40, 80, 130);
            for (let i=0;i<3;i++) {
                const wx = x+Math.sin(t*0.003+i*2)*25;
                const wy = y-60-Math.sin(t*0.004+i)*20;
                ag.fillStyle(0x220000, 0.3+Math.sin(t*0.006+i)*0.15);
                ag.fillCircle(wx, wy, 8+Math.sin(t*0.005+i)*4);
            }
        }
    }
}
