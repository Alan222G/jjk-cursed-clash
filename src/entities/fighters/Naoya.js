import Phaser from 'phaser';
import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, DOMAIN } from '../../config.js';

export default class Naoya extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NAOYA);
        this.isCasting = false;
        this.speedLevel = 0;
        this.isCurseForm = false;
        this.curseFormUsed = false;
        this.projDashCD = 0;
        this.counterActive = false;
        this.counterTimer = 0;
        this.subsonicCD = 0;
        this.domainUsed = false;
        this._baseSpeed = this.charData.stats.speed;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();
        if (this.isCurseForm) {
            if (tier >= 2 && this.input.isDown('DOWN')) this.castTentacleSlam();
            else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) this.castTentacleGrab();
            else if (tier >= 1) this.castTentacleLash();
            return;
        }
        if (tier >= 4 && this.input.isDown('DOWN')) this.castSubsonicCharge();
        else if (tier >= 2 && this.input.isDown('UP')) this.castCounter();
        else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) this.castSpeedCombo();
        else if (tier >= 1) this.castProjectionDash();
    }

    addSpeedLevel() {
        if (this.speedLevel < 5) {
            this.speedLevel++;
            this.speed = this._baseSpeed * (1 + this.speedLevel * 0.1);
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, `SPEED LV${this.speedLevel}`, {
                fontFamily: 'Arial Black', fontSize: '12px', color: '#00FFCC', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
        }
    }

    castWithAudio(sfx, cb, ms) {
        this.isCasting = true; this.stateMachine.lock(99999); this.sprite.body.setVelocityX(0);
        let f = false;
        const go = () => { if (f) return; f = true; this.isCasting = false; if (this.stateMachine.locked) this.stateMachine.unlock(); cb(); };
        try { const s = this.scene.sound.add(sfx, { volume: 0.6 }); s.once('complete', go); s.play(); this.scene.time.delayedCall(ms || 3000, go); } catch(e) { go(); }
    }

    // HUMAN: Projection Dash — instant teleport strike
    castProjectionDash() {
        if (this.projDashCD > 0) return;
        if (!this.ceSystem.spend(15)) return;
        this.projDashCD = 1500;
        this.addSpeedLevel();
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (!target || target.isDead) return;
        // Afterimage at old pos
        const ox = this.sprite.x; const oy = this.sprite.y;
        const g = this.scene.add.graphics().setDepth(14);
        g.fillStyle(0x00CCAA, 0.4); g.fillEllipse(ox, oy - 30, 30, 60);
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
        // Teleport near target
        this.sprite.x = target.sprite.x - 60 * this.facing;
        const dist = Math.abs(target.sprite.x - this.sprite.x);
        if (dist < 100) {
            target.takeDamage(Math.floor(30 * this.power), 150 * this.facing, -50, 500);
            target.stateMachine.unlock(); target.stateMachine.lock(500); target.sprite.body.setVelocity(0, 0);
            try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}
        }
    }

    // HUMAN: Speed Combo — 4 hits from different angles
    castSpeedCombo() {
        if (!this.ceSystem.spend(30)) return;
        this.addSpeedLevel();
        this.isCasting = true; this.stateMachine.lock(1200);
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        try { this.scene.sound.play('sfx_slash', { volume: 0.5 }); } catch(e) {}
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(100 + i * 150, () => {
                if (!target || target.isDead) return;
                const side = (i % 2 === 0) ? 1 : -1;
                this.sprite.x = target.sprite.x - (50 * side);
                this.facing = side;
                const dist = Math.abs(target.sprite.x - this.sprite.x);
                if (dist < 100) {
                    target.takeDamage(Math.floor(18 * this.power), 60 * side, -20, 120);
                    const g = this.scene.add.graphics().setDepth(16);
                    g.lineStyle(2, 0x00FFCC, 0.7);
                    g.beginPath(); g.moveTo(target.sprite.x - 15, target.sprite.y - 40 + i*8);
                    g.lineTo(target.sprite.x + 15, target.sprite.y - 20 + i*8); g.strokePath();
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
                }
            });
        }
        this.scene.time.delayedCall(800, () => { this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle'); });
    }

    // HUMAN: Counter — auto-dodge + backstrike
    castCounter() {
        if (!this.ceSystem.spend(20)) return;
        this.counterActive = true; this.counterTimer = 1500;
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 70, 'COUNTER', {
            fontFamily: 'Arial Black', fontSize: '11px', color: '#FFDD00', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }

    takeDamage(damage, kbX, kbY, stunDuration) {
        if (this.counterActive && !this.isCurseForm) {
            this.counterActive = false;
            this.addSpeedLevel();
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead) {
                this.sprite.x = target.sprite.x + 60 * (target.facing);
                this.facing = -target.facing;
                target.takeDamage(Math.floor(50 * this.power), 300 * this.facing, -150, 600);
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
                try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}
            }
            return;
        }
        super.takeDamage(damage, kbX, kbY, stunDuration);
        // CURSE FORM REVIVAL
        if (this.hp <= 0 && !this.isCurseForm && !this.curseFormUsed) {
            this.hp = Math.floor(this.maxHp * 0.6);
            this.isDead = false;
            this.isCurseForm = true;
            this.curseFormUsed = true;
            this.speedLevel = 3;
            this.speed = this._baseSpeed * 1.3;
            this.power *= 1.5;
            if (this.scene.screenEffects) { this.scene.screenEffects.flash(0x00FFCC, 400, 0.5); this.scene.screenEffects.shake(0.03, 400); }
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 90, 'CURSE FORM', {
                fontFamily: 'Arial Black', fontSize: '18px', color: '#00FFCC', stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
            this.stateMachine.unlock(); this.stateMachine.setState('idle');
        }
    }

    // HUMAN: Subsonic Charge — line dash through enemy
    castSubsonicCharge() {
        if (!this.ceSystem.spend(80)) return;
        this.addSpeedLevel();
        this.isCasting = true; this.stateMachine.lock(2000); this.sprite.body.setVelocityX(0);
        if (this.scene.screenEffects) { this.scene.screenEffects.slowMotion(0.2, 800); this.scene.screenEffects.flash(0x00FFCC, 200, 0.4); }
        this.scene.time.delayedCall(400, () => {
            this.sprite.body.setVelocityX(1500 * this.facing);
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            this.scene.time.delayedCall(200, () => {
                if (target && !target.isDead) {
                    target.takeDamage(Math.floor(100 * this.power), 500 * this.facing, -250, 800);
                    this.scene.time.delayedCall(1000, () => {
                        if (!target.isDead) {
                            target.takeDamage(Math.floor(60 * this.power), 200 * this.facing, -100, 400);
                            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 300);
                        }
                    });
                }
                this.sprite.body.setVelocityX(0);
                this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
            });
        });
    }

    // CURSE: Tentacle Lash
    castTentacleLash() {
        if (!this.ceSystem.spend(12)) return;
        const proj = new Projectile(this.scene, this.sprite.x + 30 * this.facing, this.sprite.y - 30, {
            owner: this, damage: Math.floor(35 * this.power), knockbackX: 200, knockbackY: -80,
            stunDuration: 300, speed: 600, direction: this.facing, color: 0x00AA88,
            size: { w: 80, h: 12 }, lifetime: 600, type: 'slash',
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);
    }

    // CURSE: Tentacle Grab — immobilize
    castTentacleGrab() {
        if (!this.ceSystem.spend(25)) return;
        this.isCasting = true; this.stateMachine.lock(1000);
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 200) {
            target.stateMachine.unlock(); target.stateMachine.lock(2000); target.sprite.body.setVelocity(0, 0);
            const g = this.scene.add.graphics().setDepth(16);
            g.lineStyle(4, 0x00AA88, 0.7);
            g.beginPath(); g.moveTo(this.sprite.x, this.sprite.y - 20);
            g.lineTo(target.sprite.x, target.sprite.y - 20); g.strokePath();
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 2000, onComplete: () => g.destroy() });
            this.scene.time.delayedCall(2000, () => { if (!target.isDead) target.stateMachine.unlock(); });
            target.takeDamage(Math.floor(25 * this.power), 0, 0, 200);
        }
        this.scene.time.delayedCall(600, () => { this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle'); });
    }

    // CURSE: Tentacle Slam — AOE
    castTentacleSlam() {
        if (!this.ceSystem.spend(50)) return;
        this.isCasting = true; this.stateMachine.lock(1500);
        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.03, 400);
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 200, () => {
                const proj = new Projectile(this.scene, this.sprite.x + (40 + i * 30) * this.facing, this.sprite.y - 10, {
                    owner: this, damage: Math.floor(30 * this.power), knockbackX: 150, knockbackY: -120,
                    stunDuration: 250, speed: 400, direction: this.facing, color: 0x00AA88,
                    size: { w: 50, h: 50 }, lifetime: 800, type: 'circle',
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }
        this.scene.time.delayedCall(1000, () => { this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle'); });
    }

    // DOMAIN (Curse form only) — Time Cell Moon Palace
    // 10 cuts/sec if opponent MOVES. Returns Naoya to human form after.
    tryActivateDomain() {
        if (!this.isCurseForm || this.domainUsed) {
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, this.isCurseForm ? 'DOMAIN USED' : 'CURSE FORM ONLY', {
                fontFamily: 'Arial Black', fontSize: '12px', color: '#FF4444', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(20);
            this.scene.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            return;
        }
        if (this.isCasting) return;
        if (this.ceSystem.isFatigued) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) { const c = this.scene.attemptDomainClash(this); if (!c) return; }
            else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.domainUsed = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');
        try { this.scene.sound.play('sfx_charge', { volume: 0.6 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'time_cell');
    }

    applySureHitTick(opponent) {
        if (!this.domainActive) return;
        // ONLY damages if opponent is MOVING
        const vx = Math.abs(opponent.sprite.body.velocity.x);
        const vy = Math.abs(opponent.sprite.body.velocity.y);
        const isMoving = vx > 10 || vy > 10 || opponent.stateMachine.isAny('walk', 'jump', 'fall', 'attack');
        if (!isMoving) return;

        // 10x Sukuna's slashes — identical VFX, 10 times per tick
        const ox = opponent.sprite.x;
        const oy = opponent.sprite.y - 20;

        for (let s = 0; s < 10; s++) {
            const g = this.scene.add.graphics().setDepth(15);
            const slX = ox + (Math.random() - 0.5) * 60;
            const slY = oy + (Math.random() - 0.5) * 70;
            const isX = Math.random() > 0.5;

            const drawCut = (startX, startY, endX, endY) => {
                g.lineStyle(8, 0xFFFFFF, 0.9);
                g.beginPath(); g.moveTo(startX, startY); g.lineTo(endX, endY); g.strokePath();
                g.lineStyle(4, 0x000000, 1);
                g.beginPath(); g.moveTo(startX, startY); g.lineTo(endX, endY); g.strokePath();
            };

            if (isX) {
                drawCut(slX - 30, slY - 30, slX + 30, slY + 30);
                drawCut(slX - 30, slY + 30, slX + 30, slY - 30);
            } else {
                for (let i = 0; i < 3; i++) {
                    const yOff = (i - 1) * 20;
                    drawCut(slX - 40, slY + yOff, slX + 40, slY + yOff);
                }
            }

            this.scene.tweens.add({
                targets: g, alpha: 0, duration: 120,
                ease: 'Power2', onComplete: () => g.destroy()
            });
        }

        // 10x Sukuna's damage per tick (50 * 10 = 500)
        opponent.takeDamage(500, 30 * this.facing, 0, 150);

        // Play slash sound
        try {
            const slashIdx = Phaser.Math.Between(1, 11);
            this.scene.sound.play(`slash_${slashIdx}`, { volume: 0.8 });
        } catch (e) {}

        // Drain CE 3x faster (domain burns out quickly)
        this.ceSystem.ce = Math.max(0, this.ceSystem.ce - 15);
    }

    onDomainEnd() {
        // Revert to human form after domain
        this.isCurseForm = false;
        this.power = this.charData.stats.power || 1.0;
        this.speedLevel = 0;
        this.speed = this._baseSpeed;
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.projDashCD > 0) this.projDashCD -= dt;
        if (this.subsonicCD > 0) this.subsonicCD -= dt;
        if (this.counterActive) { this.counterTimer -= dt; if (this.counterTimer <= 0) this.counterActive = false; }
    }

    drawBody(dt) {
        const g = this.graphics; g.clear();
        const x = this.sprite.x; const y = this.sprite.y; const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }
        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const armExtend = this.attackSwing * 40;

        if (this.isCurseForm) {
            // ═══ CURSE FORM — Manga-accurate worm with skull ═══
            // Reference: elongated skull, red eyes, wing-fins, segmented body
            const bodyColor = isFlashing ? 0xFFFFFF : 0x2A3A2A;
            const bodyLight = isFlashing ? 0xFFFFFF : 0x3D4D3D;
            const skullColor = isFlashing ? 0xFFFFFF : 0xCCBB99;
            const skullDark = isFlashing ? 0xCCCCCC : 0x998866;
            const veinColor = isFlashing ? 0xFF8888 : 0x556644;
            const t = (this.animTimer || 0) * 0.004;

            // ── SEGMENTED WORM BODY (8 segments, undulating) ──
            for (let i = 7; i >= 0; i--) {
                const wave = Math.sin(t + i * 0.8) * 4;
                const sx = x - (i * 10 * f);
                const sy = masterY + 8 + wave;
                const segW = 18 - i * 0.8;
                const segH = 14 - i * 0.5;
                // Dark outer shell
                g.fillStyle(bodyColor, 0.95 - i * 0.06);
                g.fillEllipse(sx, sy, segW, segH);
                // Lighter ridge on top
                g.fillStyle(bodyLight, 0.5 - i * 0.04);
                g.fillEllipse(sx, sy - 3, segW * 0.6, segH * 0.3);
                // Segment lines
                if (i > 0) {
                    g.lineStyle(1, veinColor, 0.3);
                    g.strokeEllipse(sx, sy, segW, segH);
                }
                // Cursed veins running along body
                g.lineStyle(1, 0x446633, 0.25);
                g.beginPath();
                g.moveTo(sx - segW * 0.3, sy);
                g.lineTo(sx + segW * 0.3, sy - 2);
                g.strokePath();
            }

            // ── WING-FIN APPENDAGES (large, spreading from sides) ──
            const wingAlpha = 0.6 + Math.sin(t * 1.5) * 0.15;
            // Left wing
            g.fillStyle(bodyColor, wingAlpha * 0.7);
            g.beginPath();
            g.moveTo(x - 5, masterY - 15);
            g.lineTo(x - 35, masterY - 55);
            g.lineTo(x - 45, masterY - 40);
            g.lineTo(x - 38, masterY - 20);
            g.lineTo(x - 20, masterY + 5);
            g.fillPath();
            // Wing membrane veins
            g.lineStyle(1, veinColor, 0.4);
            g.beginPath(); g.moveTo(x - 8, masterY - 12); g.lineTo(x - 38, masterY - 48); g.strokePath();
            g.beginPath(); g.moveTo(x - 10, masterY - 5); g.lineTo(x - 42, masterY - 35); g.strokePath();
            g.beginPath(); g.moveTo(x - 12, masterY); g.lineTo(x - 35, masterY - 18); g.strokePath();
            // Right wing
            g.fillStyle(bodyColor, wingAlpha * 0.7);
            g.beginPath();
            g.moveTo(x + 5, masterY - 15);
            g.lineTo(x + 35, masterY - 55);
            g.lineTo(x + 45, masterY - 40);
            g.lineTo(x + 38, masterY - 20);
            g.lineTo(x + 20, masterY + 5);
            g.fillPath();
            g.lineStyle(1, veinColor, 0.4);
            g.beginPath(); g.moveTo(x + 8, masterY - 12); g.lineTo(x + 38, masterY - 48); g.strokePath();
            g.beginPath(); g.moveTo(x + 10, masterY - 5); g.lineTo(x + 42, masterY - 35); g.strokePath();
            g.beginPath(); g.moveTo(x + 12, masterY); g.lineTo(x + 35, masterY - 18); g.strokePath();

            // ── ELONGATED SKULL (prominent jaw, teeth rows) ──
            const hx = x + 3 * f;
            const hy = masterY - 30;
            // Cranium — tall elongated shape
            g.fillStyle(skullColor, 1);
            g.beginPath();
            g.moveTo(hx - 12, hy - 5);
            g.lineTo(hx - 10, hy - 22);
            g.lineTo(hx - 5, hy - 30);
            g.lineTo(hx + 5, hy - 30);
            g.lineTo(hx + 10, hy - 22);
            g.lineTo(hx + 12, hy - 5);
            g.fillPath();
            // Cheekbones and face
            g.fillStyle(skullColor, 1);
            g.beginPath();
            g.moveTo(hx - 12, hy - 5);
            g.lineTo(hx - 14, hy + 2);
            g.lineTo(hx - 10, hy + 10);
            g.lineTo(hx + 10, hy + 10);
            g.lineTo(hx + 14, hy + 2);
            g.lineTo(hx + 12, hy - 5);
            g.fillPath();
            // Skull shadow/depth lines
            g.lineStyle(1, skullDark, 0.5);
            g.beginPath(); g.moveTo(hx - 8, hy - 20); g.lineTo(hx - 10, hy - 5); g.strokePath();
            g.beginPath(); g.moveTo(hx + 8, hy - 20); g.lineTo(hx + 10, hy - 5); g.strokePath();
            // Brow ridge
            g.lineStyle(2, skullDark, 0.6);
            g.beginPath(); g.moveTo(hx - 11, hy - 8); g.lineTo(hx + 11, hy - 8); g.strokePath();

            // ── EYE SOCKETS (deep, dark, with RED glow) ──
            g.fillStyle(0x000000, 1);
            g.fillEllipse(hx - 6, hy - 4, 6, 8);
            g.fillEllipse(hx + 6, hy - 4, 6, 8);
            // RED glowing eyes (matching reference)
            const eyePulse = 0.7 + Math.sin(t * 3) * 0.3;
            g.fillStyle(0xFF2200, eyePulse);
            g.fillCircle(hx - 6, hy - 4, 2.5);
            g.fillCircle(hx + 6, hy - 4, 2.5);
            // Eye glow halo
            g.fillStyle(0xFF4400, eyePulse * 0.3);
            g.fillCircle(hx - 6, hy - 4, 5);
            g.fillCircle(hx + 6, hy - 4, 5);

            // ── NASAL CAVITY ──
            g.fillStyle(0x000000, 0.8);
            g.beginPath();
            g.moveTo(hx - 3, hy + 2);
            g.lineTo(hx + 3, hy + 2);
            g.lineTo(hx + 1, hy + 6);
            g.lineTo(hx - 1, hy + 6);
            g.fillPath();

            // ── JAW & TEETH (prominent, multiple rows) ──
            // Upper jaw
            g.fillStyle(skullColor, 1);
            g.beginPath();
            g.moveTo(hx - 10, hy + 10);
            g.lineTo(hx - 8, hy + 15);
            g.lineTo(hx + 8, hy + 15);
            g.lineTo(hx + 10, hy + 10);
            g.fillPath();
            // Lower jaw (separate, slightly open)
            g.fillStyle(skullDark, 1);
            g.beginPath();
            g.moveTo(hx - 7, hy + 17);
            g.lineTo(hx - 5, hy + 22);
            g.lineTo(hx + 5, hy + 22);
            g.lineTo(hx + 7, hy + 17);
            g.fillPath();
            // Upper teeth row
            g.fillStyle(0xEEDDCC, 1);
            for (let i = -7; i <= 7; i += 2) {
                g.fillRect(hx + i, hy + 13, 1.5, 4);
            }
            // Lower teeth row
            for (let i = -5; i <= 5; i += 2) {
                g.fillRect(hx + i, hy + 16, 1.5, 3);
            }

            // ── TENTACLES (extending from body for attacks) ──
            g.lineStyle(3, 0x2A3A2A, 0.8);
            for (let i = 0; i < 6; i++) {
                const ta = (i / 6) * Math.PI * 2 + t;
                const len = 25 + Math.sin(t + i * 2) * 8;
                const tx = x + Math.cos(ta) * len;
                const ty = masterY + 5 + Math.sin(ta) * (len * 0.4);
                // Curve via quadratic
                g.beginPath(); g.moveTo(x, masterY + 5);
                const mx = x + Math.cos(ta) * len * 0.6 + Math.sin(t + i) * 5;
                const my = masterY + 5 + Math.sin(ta) * len * 0.3;
                g.lineTo(mx, my); g.lineTo(tx, ty); g.strokePath();
                // Tip
                if (this.attackSwing > 0 && i < 3) {
                    g.lineStyle(4, 0x00AA88, 0.6);
                    g.beginPath(); g.moveTo(tx, ty);
                    g.lineTo(tx + (15 + armExtend) * f, ty - 8); g.strokePath();
                    g.lineStyle(3, 0x2A3A2A, 0.8);
                }
            }

            // Cursed energy aura
            g.fillStyle(0x00FFCC, 0.04 + Math.sin(t) * 0.02);
            g.fillEllipse(x, masterY - 10, 70, 55);
        } else {
            // HUMAN FORM
            const skinColor = isFlashing ? 0xFFFFFF : 0xF0D0B0;
            const clothColor = isFlashing ? 0xFFFFFF : 0x222255;
            const hairColor = isFlashing ? 0xFFFFFF : 0xCCBB77;
            // Speed afterimages
            if (this.speedLevel >= 3 && this.stateMachine.is('walk')) {
                for (let i = 1; i <= 2; i++) {
                    g.fillStyle(clothColor, 0.1); g.fillEllipse(x - i * 20 * f, masterY - 15, 20, 55);
                }
            }
            // Legs
            const legY = masterY + 8; let lL = 38, rL = 38;
            if (this.stateMachine.is('walk')) { lL += this.walkCycle * 1.5; rL -= this.walkCycle * 1.5; }
            else if (this.stateMachine.isAny('jump', 'fall')) { lL = 22; rL = 22; }
            g.lineStyle(7, clothColor, 1);
            g.beginPath(); g.moveTo(x - 10, legY); g.lineTo(x - 14 - (f * 8), legY + lL); g.strokePath();
            g.beginPath(); g.moveTo(x + 10, legY); g.lineTo(x + 14 + (f * 8), legY + rL); g.strokePath();
            // Torso
            g.fillStyle(clothColor, 1); g.fillRect(x - 15, masterY - 38, 30, 50);
            // Head
            const hx = x; const hy = masterY - 52;
            g.fillStyle(skinColor, 1); g.fillCircle(hx, hy, 13);
            g.fillStyle(hairColor, 1);
            g.beginPath(); g.moveTo(hx - 14, hy - 4); g.lineTo(hx - 10, hy - 18);
            g.lineTo(hx - 3, hy - 14); g.lineTo(hx + 3, hy - 18);
            g.lineTo(hx + 10, hy - 14); g.lineTo(hx + 14, hy - 4); g.fillPath();
            g.fillStyle(0x334488, 1);
            g.fillCircle(hx - 4 * f, hy - 2, 2); g.fillCircle(hx + 4 * f, hy - 2, 2);
            // Arms
            const armY = masterY - 32;
            g.lineStyle(7, clothColor, 0.85);
            g.beginPath(); g.moveTo(x - 14, armY + 3); g.lineTo(x - 22 * f, armY + 20); g.strokePath();
            g.lineStyle(8, clothColor, 1);
            if (this.attackSwing > 0) {
                g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + (25 + armExtend) * f, armY - 3); g.strokePath();
                g.fillStyle(skinColor, 1); g.fillCircle(x + (28 + armExtend) * f, armY - 3, 5);
            } else {
                g.beginPath(); g.moveTo(x + 14, armY + 3); g.lineTo(x + 18 * f, armY + 20); g.strokePath();
            }
            // Speed level indicator
            if (this.speedLevel > 0) {
                g.fillStyle(0x00FFCC, 0.5);
                for (let i = 0; i < this.speedLevel; i++) g.fillRect(x - 12 + i * 6, masterY + 48, 4, 4);
            }
        }
        // Counter stance glow
        if (this.counterActive) {
            g.lineStyle(2, 0xFFDD00, 0.4 + Math.sin((this.animTimer || 0) * 0.01) * 0.2);
            g.strokeEllipse(x, masterY - 15, 50, 80);
        }
        if (this.stateMachine.is('hitstun')) {
            const st = (this.animTimer || 0) * 0.01;
            for (let i = 0; i < 3; i++) {
                const a = st + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(x + Math.cos(a) * 22, y - 65 + Math.sin(a) * 10,
                    x + Math.cos(a + 0.2) * 25, y - 65 + Math.sin(a + 0.2) * 12,
                    x + Math.cos(a - 0.2) * 25, y - 65 + Math.sin(a - 0.2) * 12);
            }
        }
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (!this.isDead) {
            const ag = this.auraGraphics; const x = this.sprite.x; const y = this.sprite.y;
            const t = this.scene.time.now; const p = 0.06 + Math.sin(t * 0.005) * 0.04;
            ag.fillStyle(this.isCurseForm ? 0x00AA88 : 0x00CCAA, p);
            ag.fillEllipse(x, y - 30, 50, 85);
        }
    }
}
