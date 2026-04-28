// ========================================================
// Sukuna 20 Fingers — True Form (Raid Boss)
// 4 Arms, Shirtless, Muscular, 15000 HP
// Abilities: World Dismantle, World Cleave, Spiderweb, RCT, Divine Flame
// ========================================================

import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Sukuna20 extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.SUKUNA_20);
        this.slashEffects = [];
        this.isCasting = false;
        this.rctCooldown = 0;
        this.spiderwebCooldown = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castDivineFlame();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castWorldCleave();
        } else if (tier >= 1 && this.input.isDown('UP')) {
            this.castSpiderweb();
        } else if (tier >= 1) {
            this.castWorldDismantle();
        }
    }

    castWithAudio(sfxKey, callback, fallbackMs) {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);
        let _fired = false;
        const fireAction = () => {
            if (_fired) return;
            _fired = true;
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
    // WORLD-SPLITTING DISMANTLE — Multi-slash projectile
    // ═══════════════════════════════════════
    castWorldDismantle() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        const skill = this.charData.skills.skill1;
        this.spawnSlashEffect(this.sprite.x + 30 * this.facing, this.sprite.y, 0xFF2200, 50);

        this.castWithAudio('sfx_slash', () => {
            // Fire 3 slashes in quick succession
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 120, () => {
                    const proj = new Projectile(this.scene, this.sprite.x + (40 + i * 20) * this.facing, this.sprite.y - 50 + (i - 1) * 25, {
                        owner: this,
                        damage: Math.floor(skill.damage * this.power * 0.5),
                        knockbackX: 200, knockbackY: -80, stunDuration: 300,
                        speed: 1000 + i * 200, direction: this.facing,
                        color: 0xFF0000, size: { w: 50, h: 15 },
                        lifetime: 1200, type: 'slash',
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                });
            }
            if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');
        }, 3000);
    }

    // ═══════════════════════════════════════
    // WORLD CLEAVE — Massive AOE that adjusts to target
    // ═══════════════════════════════════════
    castWorldCleave() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        const skill = this.charData.skills.skill2;

        this.castWithAudio('sfx_cleave', () => {
            this.spawnCleaveEffect();
            if (this.opponent) {
                const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                if (dist < 450) {
                    const dmg = Math.floor(skill.damage * this.power);
                    this.opponent.takeDamage(dmg, 600 * this.facing, -350, 700);
                    this.comboSystem.registerHit('SPECIAL');
                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.02, 500);
                        this.scene.screenEffects.hitFreeze(200);
                        this.scene.screenEffects.flash(0xFF0000, 150, 0.3);
                    }
                }
            }
            if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');
        }, 4000);
    }

    // ═══════════════════════════════════════
    // SPIDERWEB — Ground-based web of slashes
    // ═══════════════════════════════════════
    castSpiderweb() {
        if (this.spiderwebCooldown > 0) return;
        if (!this.ceSystem.spend(20)) return;
        this.spiderwebCooldown = 5000;

        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e) {}

        // Draw web pattern on the ground
        const gfx = this.scene.add.graphics().setDepth(15);
        const cx = this.sprite.x;
        const groundY = this.sprite.y + 40;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const len = 120 + Math.random() * 60;
            gfx.lineStyle(3, 0xFF1100, 0.8);
            gfx.beginPath();
            gfx.moveTo(cx, groundY);
            gfx.lineTo(cx + Math.cos(angle) * len, groundY + Math.sin(angle) * len * 0.3);
            gfx.strokePath();
        }
        // Concentric web rings
        for (let r = 40; r <= 140; r += 50) {
            gfx.lineStyle(2, 0xFF4400, 0.5);
            gfx.strokeEllipse(cx, groundY, r * 2, r * 0.6);
        }

        // Damage in area
        if (this.opponent) {
            const dist = Math.abs(this.opponent.sprite.x - cx);
            if (dist < 160 && Math.abs(this.opponent.sprite.y - groundY) < 80) {
                this.opponent.takeDamage(Math.floor(40 * this.power), 100 * this.facing, -200, 400);
            }
        }

        this.scene.tweens.add({
            targets: gfx, alpha: 0, duration: 600, delay: 300,
            onComplete: () => gfx.destroy()
        });
        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // DIVINE FLAME (FUGA) — Enhanced ultimate fire
    // ═══════════════════════════════════════
    castDivineFlame() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        const skill = this.charData.skills.maximum;
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.15, 800);
            this.scene.screenEffects.flash(0xFF2200, 600, 0.6);
        }

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            target.stateMachine.unlock();
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }

        this.castWithAudio('sfx_fire', () => {
            const proj = new Projectile(this.scene, this.sprite.x + 60 * this.facing, this.sprite.y - 50, {
                owner: this, damage: Math.floor(skill.damage * this.power),
                knockbackX: 1200, knockbackY: -400, stunDuration: 1000,
                speed: 1100, direction: this.facing,
                color: 0xFF3300, size: { w: 200, h: 70 },
                lifetime: 3000, type: 'fire_arrow',
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 800);
            if (target && !target.isDead) {
                target.stateMachine.unlock();
                if (!target.stateMachine.isAny('idle','walk','jump','fall','attack'))
                    target.stateMachine.setState('idle');
            }
            this.stateMachine.setState('idle');
        }, 6000);
    }

    // ═══════════════════════════════════════
    // REVERSE CURSED TECHNIQUE — Passive heal
    // ═══════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);
        // RCT: Heal 15 HP per second passively
        if (!this.isDead && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 15 * (dt / 1000));
        }
        if (this.spiderwebCooldown > 0) this.spiderwebCooldown -= dt;
        if (this.rctCooldown > 0) this.rctCooldown -= dt;
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
        try {
            this.scene.sound.play('sukuna_domain_voice', { volume: (window.gameSettings?.sfx ?? 50) / 100 });
        } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'malevolent_shrine');
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        // Enhanced: 80 damage per tick (vs 50 for normal Sukuna)
        opponent.takeDamage(80, 30 * this.facing, 0, 150);
        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(15);
        // Multiple X cuts
        for (let j = 0; j < 2; j++) {
            const slX = ox + (Math.random() - 0.5) * 80;
            const slY = oy + (Math.random() - 0.5) * 80;
            g.lineStyle(8, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(slX-30,slY-30); g.lineTo(slX+30,slY+30); g.strokePath();
            g.lineStyle(4, 0x000000, 1);
            g.beginPath(); g.moveTo(slX-30,slY-30); g.lineTo(slX+30,slY+30); g.strokePath();
            g.lineStyle(8, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(slX-30,slY+30); g.lineTo(slX+30,slY-30); g.strokePath();
            g.lineStyle(4, 0xFF0000, 1);
            g.beginPath(); g.moveTo(slX-30,slY+30); g.lineTo(slX+30,slY-30); g.strokePath();
        }
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
        try {
            const slashIdx = Phaser.Math.Between(1, 11);
            this.scene.sound.play(`slash_${slashIdx}`, { volume: 0.7 });
        } catch(e) {}
    }

    // ═══════════════════════════════════════
    // VFX Helpers
    // ═══════════════════════════════════════
    spawnSlashEffect(x, y, color, size) {
        const g = this.scene.add.graphics().setDepth(15);
        g.lineStyle(4, color, 0.9);
        g.beginPath(); g.moveTo(x-size/2,y-size/2); g.lineTo(x+size/2,y+size/2); g.strokePath();
        g.lineStyle(3, 0xFFAAAA, 0.7);
        g.beginPath(); g.moveTo(x+size/2,y-size/2); g.lineTo(x-size/2,y+size/2); g.strokePath();
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() });
    }

    spawnCleaveEffect() {
        const x = this.sprite.x; const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI/2.5 + (i * Math.PI/10) + (this.facing < 0 ? Math.PI : 0);
            const len = 200 + i * 25;
            g.lineStyle(10, 0xFFFFFF, 0.9);
            g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(angle)*len, y+Math.sin(angle)*len); g.strokePath();
            g.lineStyle(5, 0x000000, 1);
            g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(angle)*len, y+Math.sin(angle)*len); g.strokePath();
            g.lineStyle(3, 0xFF0000, 0.8);
            g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(angle)*len, y+Math.sin(angle)*len); g.strokePath();
        }
        const flash = this.scene.add.circle(x, y, 160, 0xFF2222, 0.4).setDepth(14);
        this.scene.tweens.add({ targets: [g,flash], alpha: 0, duration: 400, onComplete: () => { g.destroy(); flash.destroy(); }});
    }

    // ═══════════════════════════════════════
    // DRAW — 4-Armed Muscular Shirtless True Form
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

        // ── LEGS (Wider stance, larger) ──
        const legY = masterY + 10;
        let leftLeg = 42, rightLeg = 42;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle*1.5; rightLeg -= this.walkCycle*1.5; }
        else if (this.stateMachine.isAny('jump','fall')) { leftLeg = 25; rightLeg = 25; }
        g.lineStyle(8, pantColor, 1);
        g.beginPath(); g.moveTo(x-12, legY); g.lineTo(x-18-(f*12), legY+leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x+12, legY); g.lineTo(x+18+(f*12), legY+rightLeg); g.strokePath();
        // Feet
        g.fillStyle(pantColor, 1);
        g.fillCircle(x-18-(f*12), legY+leftLeg, 5);
        g.fillCircle(x+18+(f*12), legY+rightLeg, 5);

        // ── TORSO (Larger, muscular, shirtless) ──
        g.fillStyle(skinColor, 1);
        g.fillRect(x-20, masterY-42, 40, 55);
        // Muscle definition
        g.lineStyle(1, markColor, 0.4);
        g.lineBetween(x, masterY-38, x, masterY+8); // Center line
        g.beginPath(); g.arc(x-8, masterY-28, 8, -0.5, 0.8, false); g.strokePath(); // Left pec
        g.beginPath(); g.arc(x+8, masterY-28, 8, Math.PI-0.8, Math.PI+0.5, false); g.strokePath(); // Right pec
        // Abs
        for (let i = 0; i < 3; i++) {
            const ay = masterY - 12 + i * 12;
            g.lineStyle(1, markColor, 0.3);
            g.lineBetween(x-8, ay, x+8, ay);
        }
        // Cursed marks on torso
        g.lineStyle(2, 0x660000, 0.7);
        // Mark patterns (lines across body)
        g.beginPath(); g.moveTo(x-18, masterY-35); g.lineTo(x-8, masterY-25); g.strokePath();
        g.beginPath(); g.moveTo(x+18, masterY-35); g.lineTo(x+8, masterY-25); g.strokePath();
        g.beginPath(); g.moveTo(x-15, masterY-10); g.lineTo(x-5, masterY); g.strokePath();
        g.beginPath(); g.moveTo(x+15, masterY-10); g.lineTo(x+5, masterY); g.strokePath();
        // Additional marks
        g.lineStyle(1, 0x880000, 0.6);
        g.beginPath(); g.moveTo(x-12, masterY+2); g.lineTo(x-18, masterY+10); g.strokePath();
        g.beginPath(); g.moveTo(x+12, masterY+2); g.lineTo(x+18, masterY+10); g.strokePath();

        // ── HEAD ──
        const hx = x; const hy = masterY - 55;
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 14);
        // Hair
        g.fillStyle(isFlashing ? 0xFFFFFF : colors.hair, 1);
        g.beginPath();
        g.moveTo(hx-16, hy-8); g.lineTo(hx-18, hy-24); g.lineTo(hx-6, hy-16);
        g.lineTo(hx, hy-28); g.lineTo(hx+6, hy-16);
        g.lineTo(hx+18, hy-24); g.lineTo(hx+16, hy-8);
        g.fillPath();
        // 4 Eyes (2 normal + 2 extra)
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(hx - 5*f, hy - 3, 2.5);
        g.fillCircle(hx + 5*f, hy - 3, 2.5);
        g.fillCircle(hx - 5*f, hy + 3, 1.5); // Extra eyes
        g.fillCircle(hx + 5*f, hy + 3, 1.5);
        // Mouth mark
        g.lineStyle(2, 0x660000, 0.8);
        g.beginPath(); g.moveTo(hx-6, hy+7); g.lineTo(hx+6, hy+7); g.strokePath();
        // Face marks
        g.lineStyle(1.5, 0x660000, 0.7);
        g.beginPath(); g.moveTo(hx-12, hy-5); g.lineTo(hx-7, hy); g.strokePath();
        g.beginPath(); g.moveTo(hx+12, hy-5); g.lineTo(hx+7, hy); g.strokePath();

        // ── 4 ARMS ──
        const armY = masterY - 36;
        // Back arms (upper pair — slightly behind)
        g.lineStyle(7, skinColor, 0.85);
        // Back left arm
        g.beginPath(); g.moveTo(x-18, armY+2); g.lineTo(x-32*f, armY+22); g.strokePath();
        g.fillStyle(skinColor, 0.85); g.fillCircle(x-32*f, armY+22, 5);
        // Back right arm
        g.beginPath(); g.moveTo(x+18, armY+2); g.lineTo(x+32*f, armY-10); g.strokePath();
        g.fillStyle(skinColor, 0.85); g.fillCircle(x+32*f, armY-10, 5);

        // Front arms (main pair)
        g.lineStyle(9, skinColor, 1);
        // Front left
        if (this.stateMachine.is('block')) {
            g.beginPath(); g.moveTo(x-16, armY+5); g.lineTo(x-10*f, armY-15); g.strokePath();
        } else {
            g.beginPath(); g.moveTo(x-16, armY+5); g.lineTo(x-(22+armExtend)*f, armY+18); g.strokePath();
            g.fillStyle(skinColor, 1); g.fillCircle(x-(22+armExtend)*f, armY+18, 6);
        }
        // Front right
        if (this.attackSwing > 0) {
            g.beginPath(); g.moveTo(x+16, armY+5); g.lineTo(x+(28+armExtend)*f, armY-5); g.strokePath();
            g.fillStyle(skinColor, 1); g.fillCircle(x+(28+armExtend)*f, armY-5, 7);
        } else {
            g.beginPath(); g.moveTo(x+16, armY+5); g.lineTo(x+20*f, armY+22); g.strokePath();
            g.fillStyle(skinColor, 1); g.fillCircle(x+20*f, armY+22, 6);
        }

        // Marks on arms
        g.lineStyle(1.5, 0x660000, 0.6);
        g.beginPath(); g.moveTo(x-16, armY+8); g.lineTo(x-24*f, armY+15); g.strokePath();
        g.beginPath(); g.moveTo(x+16, armY+8); g.lineTo(x+24*f, armY+15); g.strokePath();

        // ── HITSTUN STARS ──
        if (this.stateMachine.is('hitstun')) {
            const starT = (this.animTimer || 0) * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(
                    x + Math.cos(angle)*22, y-70 + Math.sin(angle)*10,
                    x + Math.cos(angle+0.2)*25, y-70 + Math.sin(angle+0.2)*12,
                    x + Math.cos(angle-0.2)*25, y-70 + Math.sin(angle-0.2)*12
                );
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (!this.isDead) {
            const ag = this.auraGraphics;
            const x = this.sprite.x; const y = this.sprite.y;
            const t = this.scene.time.now;
            // Constant menacing red/black aura
            const pulse = 0.15 + Math.sin(t * 0.005) * 0.1;
            ag.fillStyle(0xFF0000, pulse);
            ag.fillEllipse(x, y - 40, 80, 130);
            // Black wisps
            for (let i = 0; i < 3; i++) {
                const wx = x + Math.sin(t * 0.003 + i * 2) * 25;
                const wy = y - 60 - Math.sin(t * 0.004 + i) * 20;
                ag.fillStyle(0x220000, 0.3 + Math.sin(t * 0.006 + i) * 0.15);
                ag.fillCircle(wx, wy, 8 + Math.sin(t * 0.005 + i) * 4);
            }
        }
    }
}
