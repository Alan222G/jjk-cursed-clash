// ========================================================
// Yuta Okkotsu — The Special Grade with Rika
// Katana wielder, Copy technique via Domain
// Pink Love Beam (U+Down) — clashable with Ishigori beam
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Yuta extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.YUTA);
        this.isCasting = false;
        this.rikaManifested = false;
        this.rikaTimer = 0;
        this.cursedSpeechCooldown = 0;
        this.thinIceCooldown = 0;
        this.copyActive = false;
        this.copiedSkills = null;
        this.copyTimer = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.fireLoveBeam();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castCursedSpeech();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castThinIceBreaker();
        } else if (tier >= 1) {
            this.castKatanaRush();
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
    // KATANA RUSH — Dash + multi-slash + Rika finisher
    // ═══════════════════════════════════════
    castKatanaRush() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(1200);
        this.sprite.body.setVelocityX(500 * this.facing);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e){}

        // 3 katana slashes
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(150 + i * 150, () => {
                if (!target || target.isDead) return;
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 130) {
                    const dmg = Math.floor(20 * this.power);
                    target.takeDamage(dmg, 80 * this.facing, -20, 150);
                    // Slash VFX
                    const g = this.scene.add.graphics().setDepth(16);
                    const sx = target.sprite.x; const sy = target.sprite.y - 30;
                    g.lineStyle(3, 0xCCCCFF, 0.8);
                    g.beginPath(); g.moveTo(sx - 20, sy - 15 + i*10); g.lineTo(sx + 20, sy + 15 - i*10); g.strokePath();
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
                }
            });
        }

        // Rika finisher slam (4th hit)
        this.scene.time.delayedCall(700, () => {
            if (!target || target.isDead) return;
            const dist = Math.abs(target.sprite.x - this.sprite.x);
            if (dist < 160) {
                const dmg = Math.floor(40 * this.power);
                target.takeDamage(dmg, 300 * this.facing, -200, 500);
                // Rika arm VFX
                const g = this.scene.add.graphics().setDepth(17);
                const rx = target.sprite.x; const ry = target.sprite.y - 50;
                g.fillStyle(0xFF88CC, 0.5); g.fillEllipse(rx, ry, 50, 70);
                g.lineStyle(4, 0xFF44AA, 0.7); g.strokeEllipse(rx, ry, 50, 70);
                this.scene.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
            }
            this.sprite.body.setVelocityX(0);
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // CURSED SPEECH — Stun in cone (U+Up)
    // "Don't move!" — 2s stun, self-damage
    // ═══════════════════════════════════════
    castCursedSpeech() {
        if (this.cursedSpeechCooldown > 0) return;
        if (!this.ceSystem.spend(25)) return;
        this.cursedSpeechCooldown = 5000;

        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);
        try { this.scene.sound.play('sfx_charge', { volume: 0.5 }); } catch(e){}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            const dx = target.sprite.x - this.sprite.x;
            const dist = Math.abs(dx);
            const inFront = (this.facing > 0 && dx > 0) || (this.facing < 0 && dx < 0);
            if (dist < 300 && inFront) {
                target.stateMachine.unlock();
                target.stateMachine.lock(2000);
                target.sprite.body.setVelocity(0, 0);
                // Stun VFX
                const txt = this.scene.add.text(target.sprite.x, target.sprite.y - 70, '¡NO TE MUEVAS!', {
                    fontFamily: 'Arial Black', fontSize: '16px', color: '#FF88CC',
                    stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(20);
                this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
                this.scene.time.delayedCall(2000, () => { if (!target.isDead) target.stateMachine.unlock(); });
            }
        }
        // Self-damage (backlash)
        this.hp = Math.max(1, this.hp - Math.floor(this.maxHp * 0.03));

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // THIN ICE BREAKER — Block-breaking shockwave (U+Dir)
    // ═══════════════════════════════════════
    castThinIceBreaker() {
        if (this.thinIceCooldown > 0) return;
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.thinIceCooldown = 3000;

        this.castWithAudio('sfx_slash', () => {
            const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 30, {
                owner: this,
                damage: Math.floor(this.charData.skills.skill2.damage * this.power),
                knockbackX: 400, knockbackY: -150,
                stunDuration: 500, speed: 700,
                direction: this.facing, color: 0xAADDFF,
                size: { w: 60, h: 40 }, lifetime: 800, type: 'normal',
            });
            // Mark as block-breaker
            proj.ignoresBlock = true;
            if (this.scene.projectiles) this.scene.projectiles.push(proj);

            // Ice crack VFX
            const g = this.scene.add.graphics().setDepth(15);
            const cx = this.sprite.x + 50 * this.facing; const cy = this.sprite.y - 30;
            g.lineStyle(2, 0xAADDFF, 0.8);
            for (let i = 0; i < 5; i++) {
                const a = (Math.random() - 0.5) * Math.PI;
                g.beginPath(); g.moveTo(cx, cy);
                g.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); g.strokePath();
            }
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.01, 150);
            this.stateMachine.setState('idle');
        }, 1500);
    }

    // ═══════════════════════════════════════
    // LOVE BEAM — Rika's pink beam (U+Down)
    // Identical to Ishigori's beam but PINK
    // Tagged as 'love_beam' for clash detection
    // ═══════════════════════════════════════
    fireLoveBeam() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(1500);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0xFF66AA);
            this.scene.screenEffects.slowMotion(0.2, 1000);
        }

        // Rika manifests behind Yuta
        const rikaG = this.scene.add.graphics().setDepth(18);
        const rx = this.sprite.x - 40 * this.facing; const ry = this.sprite.y - 60;
        rikaG.fillStyle(0xFF88CC, 0.4); rikaG.fillEllipse(rx, ry, 60, 80);
        rikaG.fillStyle(0xFFFFFF, 0.3); rikaG.fillCircle(rx, ry - 20, 15);
        rikaG.fillStyle(0xFF44AA, 0.6);
        rikaG.fillCircle(rx - 6, ry - 22, 3); rikaG.fillCircle(rx + 6, ry - 22, 3);

        // Charge orb
        const orbX = this.sprite.x + 30 * this.facing;
        const orbY = this.sprite.y - 50;
        const orb = this.scene.add.circle(orbX, orbY, 10, 0xFF88CC, 0.9).setDepth(20);

        this.scene.tweens.add({
            targets: orb, scaleX: 8, scaleY: 8, alpha: 0.8, duration: 1000,
            onComplete: () => {
                orb.destroy(); rikaG.destroy();
                try { this.scene.sound.play('sfx_purple', { volume: 1.0 }); } catch(e){}
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.05, 800);

                const proj = new Projectile(this.scene, this.sprite.x + 100 * this.facing, this.sprite.y - 50, {
                    owner: this,
                    damage: Math.floor(this.charData.skills.maximum.damage * this.power),
                    knockbackX: 1500, knockbackY: -500,
                    stunDuration: 1000, speed: 6000,
                    direction: this.facing, color: 0xFF66AA,
                    size: { w: 400, h: 100 }, lifetime: 2000, type: 'beam',
                });
                proj.isLoveBeam = true; // Tag for clash detection
                if (this.scene.projectiles) this.scene.projectiles.push(proj);

                this.scene.time.delayedCall(500, () => {
                    this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
                });
            }
        });
    }

    // ═══════════════════════════════════════
    // DOMAIN — Authentic Mutual Love
    // NO upfront CE cost — drains from activation
    // Copies ALL opponent special abilities
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isCasting) return;
        if (this.ceSystem.isFatigued) return;
        if (this.ceSystem.ce < 10) return; // Need some CE to start drain
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        // NO upfront spend — domain drains CE from the moment it activates
        this.domainActive = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');

        // ── COPY opponent's ENTIRE special attack method ──
        const opponent = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (opponent) {
            this.copyActive = true;
            this.copyTimer = this.charData.stats.domainDuration;
            // Store originals
            this._origTrySpecialAttack = this.trySpecialAttack.bind(this);
            this._origPower = this.power;
            this.power = Math.max(this.power, opponent.power || 1.0);
            // Deep-copy the opponent's trySpecialAttack by binding it to Yuta
            this._copiedOpponent = opponent;
            this.trySpecialAttack = function() {
                if (this.isCasting) return;
                // Use opponent's special attack logic but with Yuta as 'this'
                opponent.trySpecialAttack.call(this);
            };
        }

        try { this.scene.sound.play('sfx_purple', { volume: (window.gameSettings?.sfx ?? 50) / 100 }); } catch(e){}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'authentic_mutual_love');
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        const soulDmg = 35 + Math.floor(Math.random() * 20);
        opponent.hp = Math.max(0, opponent.hp - soulDmg);

        const ox = opponent.sprite.x; const oy = opponent.sprite.y - 20;
        if (Math.random() < 0.4) {
            const txt = this.scene.add.text(ox + (Math.random()-0.5)*40, oy - 40, 'COPY', {
                fontSize: '11px', color: '#FF88CC', stroke: '#000000', strokeThickness: 2
            }).setDepth(15);
            this.scene.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
        }
        const g = this.scene.add.graphics().setDepth(15);
        g.fillStyle(0xFF66AA, 0.3); g.fillCircle(ox, oy, 25);
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.cursedSpeechCooldown > 0) this.cursedSpeechCooldown -= dt;
        if (this.thinIceCooldown > 0) this.thinIceCooldown -= dt;
        if (this.copyActive) {
            this.copyTimer -= dt;
            if (this.copyTimer <= 0 || !this.ceSystem.isDomainActive) {
                this.copyActive = false;
                this.copiedSkills = null;
                this._copiedOpponent = null;
                this.power = this._origPower || this.charData.stats.power || 1.0;
                // Restore original trySpecialAttack
                if (this._origTrySpecialAttack) {
                    this.trySpecialAttack = Yuta.prototype.trySpecialAttack.bind(this);
                    this._origTrySpecialAttack = null;
                }
            }
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Yuta with katana + Rika behind
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const skinColor = isFlashing ? 0xFFFFFF : 0xF0D0B0;
        const uniformColor = isFlashing ? 0xFFFFFF : 0x111133;
        const hairColor = isFlashing ? 0xFFFFFF : 0x222244;
        const armExtend = this.attackSwing * 40;

        // ── RIKA (ghostly behind Yuta) ──
        const rikaAlpha = 0.15 + Math.sin((this.animTimer || 0) * 0.003) * 0.08;
        const rkx = x - 30 * f; const rky = masterY - 50;
        g.fillStyle(0xFF88CC, rikaAlpha);
        g.fillEllipse(rkx, rky, 45, 65);
        g.fillStyle(0xFFFFFF, rikaAlpha * 0.6);
        g.fillCircle(rkx, rky - 18, 12);
        g.fillStyle(0xFF44AA, rikaAlpha * 1.5);
        g.fillCircle(rkx - 4, rky - 20, 2);
        g.fillCircle(rkx + 4, rky - 20, 2);

        // LEGS
        const legY = masterY + 8;
        let leftLeg = 38, rightLeg = 38;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 22; rightLeg = 22; }
        g.lineStyle(7, uniformColor, 1);
        g.beginPath(); g.moveTo(x - 10, legY); g.lineTo(x - 14 - (f * 8), legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 10, legY); g.lineTo(x + 14 + (f * 8), legY + rightLeg); g.strokePath();

        // TORSO — Jujutsu High uniform
        g.fillStyle(uniformColor, 1);
        g.fillRect(x - 15, masterY - 38, 30, 50);
        // Collar
        g.lineStyle(1, 0x333366, 0.6);
        g.lineBetween(x - 6, masterY - 38, x, masterY - 30);
        g.lineBetween(x + 6, masterY - 38, x, masterY - 30);

        // HEAD
        const hx = x; const hy = masterY - 52;
        g.fillStyle(skinColor, 1); g.fillCircle(hx, hy, 13);
        // Hair — dark, messy medium length
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(hx - 14, hy - 4); g.lineTo(hx - 12, hy - 18);
        g.lineTo(hx - 5, hy - 14); g.lineTo(hx, hy - 20);
        g.lineTo(hx + 5, hy - 14); g.lineTo(hx + 12, hy - 18);
        g.lineTo(hx + 14, hy - 4); g.fillPath();
        g.fillRect(hx - 15, hy - 4, 4, 10);
        g.fillRect(hx + 11, hy - 4, 4, 10);
        // Eyes
        g.fillStyle(0x334488, 1);
        g.fillCircle(hx - 4 * f, hy - 2, 2);
        g.fillCircle(hx + 4 * f, hy - 2, 2);

        // ARMS + KATANA
        const armY = masterY - 32;
        g.lineStyle(7, uniformColor, 0.85);
        g.beginPath(); g.moveTo(x - 14, armY + 3); g.lineTo(x - 22 * f, armY + 20); g.strokePath();
        // Front arm with katana
        g.lineStyle(8, uniformColor, 1);
        if (this.stateMachine.is('block')) {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 8 * f, armY - 12); g.strokePath();
            // Katana guard position
            g.lineStyle(3, 0xCCCCDD, 1);
            g.beginPath(); g.moveTo(x + 5 * f, armY - 15); g.lineTo(x + 5 * f, armY + 15); g.strokePath();
        } else if (this.attackSwing > 0) {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + (25 + armExtend) * f, armY - 3); g.strokePath();
            // Katana extended
            g.lineStyle(2, 0xCCCCDD, 1);
            g.beginPath(); g.moveTo(x + (25 + armExtend) * f, armY - 5);
            g.lineTo(x + (55 + armExtend) * f, armY - 20); g.strokePath();
            // Blade glint
            g.lineStyle(1, 0xFFFFFF, 0.6);
            g.beginPath(); g.moveTo(x + (30 + armExtend) * f, armY - 7);
            g.lineTo(x + (50 + armExtend) * f, armY - 18); g.strokePath();
        } else {
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 18 * f, armY + 20); g.strokePath();
            // Katana at side
            g.lineStyle(2, 0xCCCCDD, 1);
            g.beginPath(); g.moveTo(x + 16 * f, armY + 18);
            g.lineTo(x + 10 * f, armY + 50); g.strokePath();
            // Handle
            g.lineStyle(3, 0x443322, 1);
            g.beginPath(); g.moveTo(x + 17 * f, armY + 15);
            g.lineTo(x + 16 * f, armY + 22); g.strokePath();
        }

        // Ring on finger (Rika's ring)
        g.fillStyle(0xFFDD00, 0.8);
        g.fillCircle(x + 18 * f, armY + 20, 2);

        // Copy mode aura
        if (this.copyActive) {
            const p = 0.3 + Math.sin((this.animTimer || 0) * 0.005) * 0.15;
            g.lineStyle(2, 0xFF66AA, p);
            g.strokeEllipse(x, masterY - 15, 55, 85);
        }

        // Hitstun stars
        if (this.stateMachine.is('hitstun')) {
            const starT = (this.animTimer || 0) * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(x + Math.cos(angle) * 22, y - 65 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.2) * 25, y - 65 + Math.sin(angle + 0.2) * 12,
                    x + Math.cos(angle - 0.2) * 25, y - 65 + Math.sin(angle - 0.2) * 12);
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (!this.isDead) {
            const ag = this.auraGraphics;
            const x = this.sprite.x; const y = this.sprite.y;
            const t = this.scene.time.now;
            const pulse = 0.08 + Math.sin(t * 0.005) * 0.05;
            ag.fillStyle(0xFF88CC, pulse);
            ag.fillEllipse(x, y - 30, 50, 85);
        }
    }
}
