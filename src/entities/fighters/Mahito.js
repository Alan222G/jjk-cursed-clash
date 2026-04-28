// ========================================================
// Mahito — Special Grade Cursed Spirit
// Idle Transfiguration: Soul Manipulation
// Body morphing, Transfigured Humans, Self-Embodiment
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Mahito extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.MAHITO);
        this.isCasting = false;
        // Transfiguration state
        this.morphedForm = null; // null, 'blade', 'wing', 'armor'
        this.morphTimer = 0;
        this.transfiguredHumans = []; // Active minion visuals
        this.bodyRepelCooldown = 0;
        this.soulTouchActive = false; // Domain guaranteed hit state
        this.instantSpiritForm = false; // 120% true form
        this.instantSpiritTimer = 0;
        // Soul defense: immune to normal physical unless attacker can see souls
        this.soulDefenseActive = true;
    }

    // ═══════════════════════════════════════
    // SPECIAL ATTACKS
    // ═══════════════════════════════════════
    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castInstantSpiritBody();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castBodyRepel();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castPolymorphicSoulIsomer();
        } else if (tier >= 1) {
            this.castIdleTransfiguration();
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
    // IDLE TRANSFIGURATION — Shape-shift arm into blade
    // Extends reach + bonus damage for 5 seconds
    // ═══════════════════════════════════════
    castIdleTransfiguration() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;

        this.morphedForm = 'blade';
        this.morphTimer = 5000;

        try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}

        // Visual morph flash
        const flash = this.scene.add.circle(this.sprite.x, this.sprite.y - 30, 30, 0x00CCAA, 0.5).setDepth(15);
        this.scene.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => flash.destroy() });

        // Temporarily boost attack range and damage
        this.power *= 1.4;
        this.scene.time.delayedCall(5000, () => {
            this.morphedForm = null;
            this.power = this.charData.stats.power || 1.0;
        });

        this.stateMachine.setState('idle');
    }

    // ═══════════════════════════════════════
    // POLYMORPHIC SOUL ISOMER (U+Direction)
    // Summon a Transfigured Human that charges at opponent
    // Stable creation with moderate HP
    // ═══════════════════════════════════════
    castPolymorphicSoulIsomer() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;

        this.castWithAudio('sfx_slash', () => {
            // Spawn transfigured human projectile
            const spawnX = this.sprite.x + 50 * this.facing;
            const spawnY = this.sprite.y - 10;

            const proj = new Projectile(this.scene, spawnX, spawnY, {
                owner: this,
                damage: Math.floor(this.charData.skills.skill2.damage * this.power),
                knockbackX: 200, knockbackY: -80,
                stunDuration: 400, speed: 350,
                direction: this.facing, color: 0x88CCAA,
                size: { w: 30, h: 45 }, lifetime: 3000, type: 'rect',
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);

            // Draw transfigured human visual (grotesque figure)
            const tg = this.scene.add.graphics().setDepth(14);
            let tx = spawnX; const tfLife = { val: 3000 };

            const drawTF = () => {
                tg.clear();
                if (tfLife.val <= 0) { tg.destroy(); return; }
                // Grotesque body
                tg.fillStyle(0x88AA88, 0.8);
                tg.fillEllipse(tx, spawnY, 25, 40);
                // Distorted face
                tg.fillStyle(0x000000, 0.7);
                tg.fillCircle(tx - 4, spawnY - 12, 3); // eye
                tg.fillCircle(tx + 6, spawnY - 8, 4); // misaligned eye
                // Open mouth
                tg.fillStyle(0x440000, 0.8);
                tg.fillEllipse(tx + 2, spawnY, 8, 5);
                // Arms reaching out
                tg.lineStyle(3, 0x88AA88, 0.7);
                tg.beginPath(); tg.moveTo(tx - 10, spawnY - 5);
                tg.lineTo(tx - 20, spawnY + 10); tg.strokePath();
                tg.beginPath(); tg.moveTo(tx + 10, spawnY - 5);
                tg.lineTo(tx + 20, spawnY - 15); tg.strokePath();
                tx += this.facing * 5;
            };

            const tfInterval = this.scene.time.addEvent({
                delay: 50, callback: () => { tfLife.val -= 50; drawTF(); },
                repeat: 60
            });
            this.scene.time.delayedCall(3100, () => { tg.destroy(); tfInterval.destroy(); });

            this.stateMachine.setState('idle');
        }, 1500);
    }

    // ═══════════════════════════════════════
    // BODY REPEL (U+Up) — Soul Multiplicity explosion
    // Merges soul energy, releases powerful AOE blast
    // ═══════════════════════════════════════
    castBodyRepel() {
        if (!this.ceSystem.spend(35)) return;
        if (this.bodyRepelCooldown > 0) return;
        this.bodyRepelCooldown = 4000;

        this.castWithAudio('sfx_slash', () => {
            const cx = this.sprite.x; const cy = this.sprite.y - 30;

            // Soul merger visual — swirling soul fragments
            const g = this.scene.add.graphics().setDepth(16);
            for (let ring = 0; ring < 3; ring++) {
                const r = 40 + ring * 35;
                g.lineStyle(5 - ring, 0x00CCAA, 0.8 - ring * 0.2);
                g.strokeCircle(cx, cy, r);
                // Fragments on the ring
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + ring * 0.5;
                    const fx = cx + Math.cos(angle) * r;
                    const fy = cy + Math.sin(angle) * r;
                    g.fillStyle(0x00FFAA, 0.6);
                    g.fillCircle(fx, fy, 4);
                }
            }

            // Snake-mouth projectiles flying outward (Body Repel characteristic)
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                this.scene.time.delayedCall(i * 80, () => {
                    const proj = new Projectile(this.scene, cx, cy, {
                        owner: this, damage: Math.floor(40 * this.power),
                        knockbackX: 200 * Math.cos(angle), knockbackY: 200 * Math.sin(angle) - 50,
                        stunDuration: 300, speed: 500,
                        direction: Math.cos(angle) >= 0 ? 1 : -1, color: 0x00CCAA,
                        size: { w: 20, h: 20 }, lifetime: 1000, type: 'circle',
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                });
            }

            this.scene.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 300);
            this.stateMachine.setState('idle');
        }, 2000);
    }

    // ═══════════════════════════════════════
    // INSTANT SPIRIT BODY OF DISTORTED KILLING (U+Down)
    // Mahito's 120% true form — massive power boost
    // Armored carapace, enhanced attacks for 15 seconds
    // ═══════════════════════════════════════
    castInstantSpiritBody() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.15, 1200);
            this.scene.screenEffects.flash(0x00FFAA, 600, 0.5);
        }

        // Transform
        this.instantSpiritForm = true;
        this.instantSpiritTimer = 15000;
        this.power *= 2.0;
        this.defense *= 1.8;
        this.speed *= 1.3;

        try { this.scene.sound.play('sfx_fire', { volume: 0.6 }); } catch(e) {}

        // Transformation VFX — soul cocoon shattering
        const cx = this.sprite.x; const cy = this.sprite.y - 30;
        const cocoon = this.scene.add.graphics().setDepth(16);
        cocoon.fillStyle(0x00CCAA, 0.5); cocoon.fillEllipse(cx, cy, 60, 90);
        cocoon.lineStyle(4, 0x00FFAA, 0.8); cocoon.strokeEllipse(cx, cy, 60, 90);

        this.scene.tweens.add({
            targets: cocoon, alpha: 0, scaleX: 2, scaleY: 2, duration: 600,
            onComplete: () => cocoon.destroy()
        });

        // Revert after 15 seconds
        this.scene.time.delayedCall(15000, () => {
            this.instantSpiritForm = false;
            this.power = this.charData.stats.power || 1.0;
            this.defense = this.charData.stats.defense || 1.0;
            this.speed = this.charData.stats.speed || 320;
        });

        this.stateMachine.setState('idle');
    }

    // ═══════════════════════════════════════
    // DOMAIN — Self-Embodiment of Perfection
    // Guaranteed Idle Transfiguration hit (soul touch)
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
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'self_embodiment');
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        // Soul touch — transforms parts of opponent, dealing soul damage
        // Ignores defense, directly reduces HP
        const soulDmg = 60;
        opponent.hp = Math.max(0, opponent.hp - soulDmg);

        // Soul distortion visual
        const ox = opponent.sprite.x; const oy = opponent.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(15);
        // Warped soul rings
        g.lineStyle(3, 0x00CCAA, 0.8);
        const wobble = Math.sin(this.scene.time.now * 0.01) * 10;
        g.strokeEllipse(ox, oy, 40 + wobble, 50 - wobble);
        g.fillStyle(0x00FFAA, 0.3);
        g.fillEllipse(ox + wobble, oy, 30, 35);
        // Soul fragment particles
        for (let i = 0; i < 3; i++) {
            const px = ox + (Math.random() - 0.5) * 60;
            const py = oy + (Math.random() - 0.5) * 60;
            g.fillStyle(0x00DDAA, 0.6);
            g.fillTriangle(px, py - 5, px - 4, py + 3, px + 4, py + 3);
        }
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });

        // Spawn "SOUL" text
        if (Math.random() < 0.3) {
            const txt = this.scene.add.text(ox + (Math.random()-0.5)*40, oy - 40, 'SOUL', {
                fontSize: '11px', color: '#00FFAA', stroke: '#000000', strokeThickness: 2
            }).setDepth(15);
            this.scene.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
        }
    }

    // ═══════════════════════════════════════
    // SOUL DEFENSE — reduces physical damage
    // ═══════════════════════════════════════
    takeDamage(damage, kbX, kbY, stunDuration) {
        // Mahito's soul-based defense: reduces physical damage by 25%
        // (Unless attacker has soul perception — not implemented for other chars)
        if (this.soulDefenseActive && !this.instantSpiritForm) {
            damage = Math.floor(damage * 0.75);
        }
        super.takeDamage(damage, kbX, kbY, stunDuration);
    }

    // ═══════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════
    update(time, dt) {
        super.update(time, dt);
        if (this.morphTimer > 0) this.morphTimer -= dt;
        if (this.bodyRepelCooldown > 0) this.bodyRepelCooldown -= dt;
        if (this.instantSpiritTimer > 0) this.instantSpiritTimer -= dt;
    }

    // ═══════════════════════════════════════
    // DRAW — Patchwork body, teal energy
    // Stitched skin, mismatched eyes, casual clothes
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isSpirit = this.instantSpiritForm;
        const skinColor = isFlashing ? 0xFFFFFF : (isSpirit ? 0x556655 : 0xBBCCBB);
        const clothColor = isFlashing ? 0xFFFFFF : (isSpirit ? 0x223322 : 0x334455);
        const stitchColor = isFlashing ? 0xFFAAAA : 0x446644;
        const armExtend = this.attackSwing * 40;

        // LEGS
        const legY = masterY + 8;
        let leftLeg = 38, rightLeg = 38;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle * 1.5; rightLeg -= this.walkCycle * 1.5; }
        else if (this.stateMachine.isAny('jump', 'fall')) { leftLeg = 22; rightLeg = 22; }
        g.lineStyle(7, clothColor, 1);
        g.beginPath(); g.moveTo(x - 10, legY); g.lineTo(x - 14 - (f * 8), legY + leftLeg); g.strokePath();
        g.beginPath(); g.moveTo(x + 10, legY); g.lineTo(x + 14 + (f * 8), legY + rightLeg); g.strokePath();

        // TORSO — Patchwork skin with stitches
        if (isSpirit) {
            // Armored carapace in true form
            g.fillStyle(0x334433, 1);
            g.fillRect(x - 18, masterY - 42, 36, 55);
            // Carapace plates
            g.lineStyle(2, 0x00FFAA, 0.5);
            g.lineBetween(x - 18, masterY - 30, x + 18, masterY - 30);
            g.lineBetween(x - 18, masterY - 15, x + 18, masterY - 15);
            g.lineBetween(x - 18, masterY, x + 18, masterY);
            // Soul glow
            g.fillStyle(0x00CCAA, 0.2);
            g.fillRect(x - 16, masterY - 40, 32, 50);
        } else {
            g.fillStyle(clothColor, 1);
            g.fillRect(x - 15, masterY - 38, 30, 50);
            // Visible stitched skin patches
            g.fillStyle(skinColor, 0.8);
            g.fillRect(x - 8, masterY - 35, 16, 20);
            // Stitch lines across the body
            g.lineStyle(1, stitchColor, 0.7);
            g.beginPath(); g.moveTo(x - 8, masterY - 30); g.lineTo(x + 8, masterY - 30); g.strokePath();
            g.beginPath(); g.moveTo(x - 6, masterY - 22); g.lineTo(x + 6, masterY - 22); g.strokePath();
            // Diagonal stitch
            g.beginPath(); g.moveTo(x - 10, masterY - 35); g.lineTo(x + 5, masterY - 18); g.strokePath();
        }

        // HEAD
        const hx = x; const hy = masterY - 52;
        g.fillStyle(skinColor, 1); g.fillCircle(hx, hy, isSpirit ? 15 : 13);

        if (isSpirit) {
            // True form head — more angular, armored
            g.lineStyle(2, 0x00FFAA, 0.6);
            g.strokeCircle(hx, hy, 16);
            // Sharp horn-like protrusions
            g.fillStyle(0x334433, 1);
            g.fillTriangle(hx - 8, hy - 12, hx - 4, hy - 25, hx, hy - 12);
            g.fillTriangle(hx + 8, hy - 12, hx + 4, hy - 25, hx, hy - 12);
        } else {
            // Hair — blue-gray, messy shoulder-length
            g.fillStyle(isFlashing ? 0xFFFFFF : 0x5577AA, 1);
            g.beginPath();
            g.moveTo(hx - 15, hy - 4); g.lineTo(hx - 16, hy - 18); g.lineTo(hx - 8, hy - 14);
            g.lineTo(hx - 2, hy - 20); g.lineTo(hx + 4, hy - 14);
            g.lineTo(hx + 10, hy - 20); g.lineTo(hx + 15, hy - 10);
            g.lineTo(hx + 15, hy - 4); g.fillPath();
            // Hair falls to sides
            g.fillRect(hx - 16, hy - 4, 4, 14);
            g.fillRect(hx + 12, hy - 4, 4, 14);
        }

        // Eyes — mismatched (one normal, one with patchwork)
        g.fillStyle(isSpirit ? 0x00FFAA : 0x446644, 1);
        g.fillCircle(hx - 5 * f, hy - 2, isSpirit ? 3 : 2.5);
        g.fillCircle(hx + 5 * f, hy - 2, isSpirit ? 3 : 2);
        // Mouth — wide grin (characteristic)
        g.lineStyle(2, isSpirit ? 0x00AA88 : 0x446644, 0.8);
        g.beginPath();
        g.moveTo(hx - 7, hy + 4);
        g.lineTo(hx - 3, hy + 6);
        g.lineTo(hx + 3, hy + 6);
        g.lineTo(hx + 7, hy + 4);
        g.strokePath();
        // Stitch across face
        g.lineStyle(1, stitchColor, 0.6);
        g.beginPath(); g.moveTo(hx - 12, hy); g.lineTo(hx - 6, hy + 2); g.strokePath();

        // ARMS
        const armY = masterY - 32;
        // Back arm
        g.lineStyle(7, skinColor, 0.85);
        g.beginPath(); g.moveTo(x - 14, armY + 3); g.lineTo(x - 22 * f, armY + 20); g.strokePath();

        // Front arm — morphed blade form
        if (this.morphedForm === 'blade') {
            // Blade arm — elongated with sharp edge
            g.lineStyle(6, skinColor, 1);
            g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + (20 + armExtend) * f, armY - 5); g.strokePath();
            // Blade extension
            g.fillStyle(0x556655, 1);
            g.beginPath();
            g.moveTo(x + (20 + armExtend) * f, armY - 10);
            g.lineTo(x + (45 + armExtend) * f, armY - 5);
            g.lineTo(x + (20 + armExtend) * f, armY);
            g.fillPath();
            // Blade edge glow
            g.lineStyle(2, 0x00CCAA, 0.6);
            g.beginPath(); g.moveTo(x + (20 + armExtend) * f, armY - 10);
            g.lineTo(x + (45 + armExtend) * f, armY - 5); g.strokePath();
        } else {
            g.lineStyle(8, skinColor, 1);
            if (this.stateMachine.is('block')) {
                g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 8 * f, armY - 12); g.strokePath();
            } else if (this.attackSwing > 0) {
                g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + (24 + armExtend) * f, armY - 3); g.strokePath();
                g.fillStyle(skinColor, 1); g.fillCircle(x + (27 + armExtend) * f, armY - 3, 6);
            } else {
                g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 18 * f, armY + 20); g.strokePath();
                g.fillStyle(skinColor, 1); g.fillCircle(x + 18 * f, armY + 20, 5);
            }
        }

        // Spirit form glow
        if (isSpirit) {
            g.lineStyle(2, 0x00FFAA, 0.3 + Math.sin(this.scene.time.now * 0.008) * 0.2);
            g.strokeEllipse(x, masterY - 15, 50, 80);
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
            const pulse = 0.1 + Math.sin(t * 0.005) * 0.08;
            // Teal soul aura
            ag.fillStyle(0x00CCAA, pulse);
            ag.fillEllipse(x, y - 30, 50, 85);
            // Soul fragments floating
            if (this.instantSpiritForm) {
                for (let i = 0; i < 4; i++) {
                    const fx = x + Math.sin(t * 0.003 + i * 1.5) * 30;
                    const fy = y - 50 - Math.sin(t * 0.004 + i) * 15;
                    ag.fillStyle(0x00FFAA, 0.4);
                    ag.fillCircle(fx, fy, 4);
                }
            }
        }
    }
}
