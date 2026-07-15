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
        this.copyCdLight = 0;
        this.copyCdHeavy = 0;
        this.copyCdUlt = 0;

        // Revival & U-variant tracking
        this.domainCount = 0;
        this.usedU_normal = false;
        this.usedU_up = false;
        this.usedU_down = false;
        this.usedU_side = false;
        this.isGojoForm = false;

        // Gojo state variables
        this.infinityActive = false;
        this.infinityTimer = 0;
        this.blueAuraActive = false;
        this.blueAuraTimer = 0;
        this.blueTickTimer = 0;
        this.blueGraphics = null;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        // ── GOJO FORM: Gojo Satoru's possessed abilities ──
        if (this.isGojoForm) {
            if (tier >= 4 && this.input.isDown('DOWN')) {
                this.firePurple();
            } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
                this.fireRed();
            } else if (tier >= 2 && this.input.isDown('UP')) {
                this.castTeleportStrike();
            } else if (tier >= 1) {
                this.fireBlue();
            }
            return;
        }

        // ── COPY MODE: Literal attacks from other characters ──
        if (this.copyActive && this._copiedOpponent) {
            if (this.input.isDown('DOWN')) {
                if (this.copyCdUlt > 0) return;
                this.copyCdUlt = 5000;
                this.executeCopiedAbility('ultimate');
            } else if (this.input.isDown('LEFT') || this.input.isDown('RIGHT')) {
                if (this.copyCdHeavy > 0) return;
                this.copyCdHeavy = 3000;
                this.executeCopiedAbility('heavy');
            } else {
                if (this.copyCdLight > 0) return;
                this.copyCdLight = 2000;
                this.executeCopiedAbility('light');
            }
            return;
        }

        // ── NORMAL MODE: Yuta's original kit ──
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

    // ═══════════════════════════════════════
    // COPY ABILITY — LITERAL replicas
    // ═══════════════════════════════════════
    executeCopiedAbility(category) {
        this.isCasting = true;
        this.stateMachine.lock(900);
        this.sprite.body.setVelocityX(0);

        const pools = {
            'light': ['nanami_ratio', 'hanami_buds', 'choso_blood', 'kenjaku_worm', 'yuji_black_flash', 'mahito_soul', 'toji_katana', 'kurourushi_swarm'],
            'heavy': ['gojo_red', 'todo_boogie', 'megumi_toad', 'jogo_flames', 'yuta_thin_ice', 'naoya_freeze', 'hakari_doors', 'higuruma_hammer'],
            'ultimate': ['gojo_purple', 'sukuna_fuga', 'ishigori_granite', 'jogo_meteor', 'yuta_love_beam', 'higuruma_death']
        };

        const pool = pools[category];
        const abilityKey = pool[Math.floor(Math.random() * pool.length)];

        // Special case: If Yuta rolls his own moves, just call them directly
        if (abilityKey === 'yuta_thin_ice') { this.isCasting = false; this.castThinIceBreaker(); return; }
        if (abilityKey === 'yuta_love_beam') { this.isCasting = false; this.fireLoveBeam(); return; }

        const f = this.facing;
        const px = this.sprite.x;
        const py = this.sprite.y;

        const names = {
            nanami_ratio: 'Ratio Technique', hanami_buds: 'Disaster Plants',
            choso_blood: 'Piercing Blood', kenjaku_worm: 'Cursed Spirit',
            yuji_black_flash: 'Black Flash', mahito_soul: 'Soul Transfiguration',
            toji_katana: 'Soul Split Katana', kurourushi_swarm: 'Festering Life',
            gojo_red: 'Cursed Technique Reversal: Red', todo_boogie: 'Boogie Woogie', 
            megumi_toad: 'Toad & Serpent', jogo_flames: 'Disaster Flames',
            naoya_freeze: 'Projection Sorcery', hakari_doors: 'Train Doors',
            higuruma_hammer: 'Hammer of Justice',
            gojo_purple: 'Hollow Purple', sukuna_fuga: 'Divine Flame (Fuga)', 
            ishigori_granite: 'Granite Blast', jogo_meteor: 'Maximum: Meteor',
            higuruma_death: 'Death Penalty'
        };

        const txt = this.scene.add.text(px, py - 85, `COPY: ${names[abilityKey]}`, {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#FF88CC',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 900, onComplete: () => txt.destroy() });

        // Rika arm flash
        const gR = this.scene.add.graphics().setDepth(17);
        gR.fillStyle(0xFF88CC, 0.5);
        gR.fillEllipse(px + 30 * f, py - 40, 35, 45);
        this.scene.tweens.add({ targets: gR, alpha: 0, duration: 400, onComplete: () => gR.destroy() });

        // ── TIER 1 (LIGHT) ──
        if (abilityKey === 'nanami_ratio') {
            try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
            const proj = new Projectile(this.scene, px + 40 * f, py, {
                owner: this, damage: Math.floor(40 * 1.5 * this.power), // 1.5x critical
                knockbackX: 400 * f, knockbackY: -100, stunDuration: 400,
                speed: 800, direction: f, color: 0x00AADD, size: { w: 40, h: 40 },
                lifetime: 1000, type: 'slash'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        }
        else if (abilityKey === 'hanami_buds') {
            try { this.scene.sound.play('sfx_slash', { volume: 0.7 }); } catch(e) {}
            const castBud = (offsetY, delay) => {
                this.scene.time.delayedCall(delay, () => {
                    const proj = new Projectile(this.scene, px + 30 * f, py + offsetY, {
                        owner: this, damage: Math.floor(30 * this.power),
                        knockbackX: 100 * f, knockbackY: -20, stunDuration: 200,
                        speed: 800, direction: f, color: 0x8B4513, size: { w: 20, h: 10 },
                        lifetime: 1500, type: 'normal'
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                });
            };
            castBud(-20, 0); castBud(20, 200);
        }
        else if (abilityKey === 'choso_blood') {
            try { this.scene.sound.play('sfx_beam', { volume: 0.8 }); } catch(e) {}
            const proj = new Projectile(this.scene, px + 40 * f, py, {
                owner: this, damage: Math.floor(45 * this.power),
                knockbackX: 200 * f, knockbackY: -50, stunDuration: 300,
                speed: 2000, direction: f, color: 0xDC143C, size: { w: 80, h: 8 },
                lifetime: 1000, type: 'normal'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        }
        else if (abilityKey === 'kenjaku_worm') {
            const proj = new Projectile(this.scene, px + 40 * f, py - 20, {
                owner: this, damage: Math.floor(40 * this.power),
                knockbackX: 300 * f, knockbackY: -50, stunDuration: 500,
                speed: 500, direction: f, color: 0x886644, size: { w: 50, h: 20 },
                lifetime: 1500, type: 'worm' // Worm visual
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        }
        else if (abilityKey === 'yuji_black_flash') {
            this.stateMachine.setState('attack');
            this.sprite.body.setVelocityX(600 * f);
            this.scene.time.delayedCall(300, () => {
                this.sprite.body.setVelocityX(0);
                if (this.scene.screenEffects) this.scene.screenEffects.flash(0xFF0000, 200, 0.5);
                const target = this.opponent;
                if (Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) < 120) {
                    try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.2 }); } catch(e) {}
                    target.takeDamage(60 * this.power, 600 * f, -200, 800);
                }
            });
        }
        else if (abilityKey === 'mahito_soul') {
            try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
            const proj = new Projectile(this.scene, px + 40 * f, py, {
                owner: this, damage: Math.floor(45 * this.power),
                knockbackX: 100 * f, knockbackY: -50, stunDuration: 400,
                speed: 600, direction: f, color: 0x8800CC, size: { w: 40, h: 40 },
                lifetime: 1200, type: 'soul_human'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        }
        else if (abilityKey === 'toji_katana') {
            this.stateMachine.setState('attack');
            const target = this.opponent;
            if (target) {
                const teleportX = target.sprite.x - (50 * f);
                this.sprite.setPosition(teleportX, target.sprite.y);
                this.facing = target.sprite.x > this.sprite.x ? 1 : -1;
                target.takeDamage(Math.floor(target.hp * 0.05 * this.power), 400 * this.facing, -100, 400); // 5% chunk
                const slashLine = this.scene.add.graphics().setDepth(15);
                slashLine.lineStyle(6, 0xFF44AA, 0.8);
                slashLine.beginPath(); slashLine.moveTo(teleportX, target.sprite.y); slashLine.lineTo(teleportX + 100 * this.facing, target.sprite.y - 20); slashLine.strokePath();
                this.scene.tweens.add({ targets: slashLine, alpha: 0, duration: 300, onComplete: () => slashLine.destroy() });
                try { this.scene.sound.play('sfx_slash', { volume: 1.0 }); } catch(e) {}
            }
        }
        else if (abilityKey === 'kurourushi_swarm') {
            try { this.scene.sound.play('sfx_beam', { volume: 0.4 }); } catch(e) {}
            for (let i = 0; i < 3; i++) {
                this.scene.time.delayedCall(i * 150, () => {
                    const proj = new Projectile(this.scene, px + 40 * f, py + (Math.random() * 40 - 20), {
                        owner: this, damage: Math.floor(15 * this.power),
                        knockbackX: 50 * f, knockbackY: 0, stunDuration: 100,
                        speed: 500, direction: f, color: 0x221100, size: { w: 15, h: 10 },
                        lifetime: 1500, type: 'swarm'
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                });
            }
        }

        // ── TIER 2 (HEAVY) ──
        else if (abilityKey === 'gojo_red') {
            this.stateMachine.lock(1200);
            try { this.scene.sound.play('sfx_red', { volume: 0.8 }); } catch(e) {}
            const flash = this.scene.add.circle(px + 40 * f, py - 20, 20, 0xFF2222, 0.8).setDepth(20);
            this.scene.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
            this.scene.time.delayedCall(400, () => {
                const proj = new Projectile(this.scene, px + 40 * f, py - 20, {
                    owner: this, damage: Math.floor(50 * this.power),
                    knockbackX: 1800 * f, knockbackY: -500, stunDuration: 700,
                    speed: 450, direction: f, color: 0xFF2222, size: { w: 35, h: 35 },
                    lifetime: 1800, type: 'circle'
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
                if (this.scene.screenEffects) this.scene.screenEffects.shake(0.01, 400);
            });
        }
        else if (abilityKey === 'todo_boogie') {
            try { this.scene.sound.play('sfx_slash', { volume: 1.0 }); } catch(e) {} // Clap
            const clap = this.scene.add.circle(px, py, 40, 0xFFFFFF, 0.8).setDepth(20);
            this.scene.tweens.add({ targets: clap, scale: 2, alpha: 0, duration: 200, onComplete: () => clap.destroy() });
            
            const target = this.opponent;
            const tempX = this.sprite.x; const tempY = this.sprite.y;
            this.sprite.x = target.sprite.x; this.sprite.y = target.sprite.y;
            target.sprite.x = tempX; target.sprite.y = tempY;
            this.isCasting = false;
        }
        else if (abilityKey === 'megumi_toad') {
            this.stateMachine.lock(1000);
            const tongue = this.scene.add.rectangle(px + 30 * f, py, 10, 10, 0xAA6633).setDepth(15);
            this.scene.tweens.add({
                targets: tongue, scaleX: 30, duration: 200,
                onComplete: () => {
                    const target = this.opponent;
                    if (Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y) < 350) {
                        this.scene.tweens.add({
                            targets: target.sprite, x: this.sprite.x + 80 * f, duration: 150,
                            onComplete: () => {
                                const serpent = this.scene.add.rectangle(target.sprite.x, target.sprite.y + 100, 60, 200, 0x004411).setDepth(14).setOrigin(0.5, 1);
                                try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e) {}
                                this.scene.tweens.add({
                                    targets: serpent, y: target.sprite.y, duration: 200,
                                    onComplete: () => {
                                        target.takeDamage(50 * this.power, 0, -800, 600);
                                        this.scene.time.delayedCall(300, () => {
                                            this.scene.tweens.add({ targets: serpent, alpha: 0, duration: 200, onComplete: () => serpent.destroy() });
                                        });
                                    }
                                });
                            }
                        });
                    }
                    this.scene.time.delayedCall(100, () => tongue.destroy());
                }
            });
        }
        else if (abilityKey === 'jogo_flames') {
            this.stateMachine.lock(800);
            try { this.scene.sound.play('sfx_beam', { volume: 0.6 }); } catch(e) {}
            const proj = new Projectile(this.scene, px + 50 * f, py, {
                owner: this, damage: Math.floor(40 * this.power),
                knockbackX: 400 * f, knockbackY: -100, stunDuration: 300,
                speed: 600, direction: f, color: 0xFF4400, size: { w: 60, h: 60 },
                lifetime: 1200, type: 'burn',
                onHitCallback: (p, victim) => { if (victim.applyBurn) victim.applyBurn(3000); return false; }
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        }
        else if (abilityKey === 'naoya_freeze') {
            this.stateMachine.lock(500);
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.6 }); } catch(e) {}
            const target = this.opponent;
            const freezeRect = this.scene.add.rectangle(px + 60 * f, py, 100, 100, 0x88CCFF, 0.5).setDepth(15);
            this.scene.tweens.add({ targets: freezeRect, alpha: 0, scale: 1.5, duration: 400, onComplete: () => freezeRect.destroy() });
            if (target && Math.abs(target.sprite.x - px) < 150) {
                target.takeDamage(30 * this.power, 0, 0, 1500); // 1.5 second stun!
                target.sprite.body.setVelocity(0, 0);
            }
        }
        else if (abilityKey === 'hakari_doors') {
            this.stateMachine.lock(800);
            const target = this.opponent;
            const tx = target ? target.sprite.x : px + 150 * f;
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e) {}
            const door1 = this.scene.add.rectangle(tx - 100, py, 30, 120, 0x555555).setDepth(15);
            const door2 = this.scene.add.rectangle(tx + 100, py, 30, 120, 0x555555).setDepth(15);
            this.scene.tweens.add({
                targets: door1, x: tx - 15, duration: 200, ease: 'Cubic.easeIn'
            });
            this.scene.tweens.add({
                targets: door2, x: tx + 15, duration: 200, ease: 'Cubic.easeIn',
                onComplete: () => {
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 300);
                    if (target && Math.abs(target.sprite.x - tx) < 50) {
                        target.takeDamage(60 * this.power, 0, -300, 600);
                    }
                    this.scene.time.delayedCall(300, () => {
                        door1.destroy(); door2.destroy();
                    });
                }
            });
        }
        else if (abilityKey === 'higuruma_hammer') {
            this.stateMachine.lock(900);
            this.sprite.body.setVelocityY(-400);
            try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
            this.scene.time.delayedCall(300, () => {
                this.sprite.body.setVelocityY(800);
                const target = this.opponent;
                this.scene.time.delayedCall(200, () => {
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.03, 400);
                    const g = this.scene.add.graphics().setDepth(16);
                    g.fillStyle(0x666666, 0.4); g.fillEllipse(this.sprite.x, this.sprite.y + 15, 120, 30);
                    g.lineStyle(3, 0xFFCC00, 0.6); g.strokeEllipse(this.sprite.x, this.sprite.y + 15, 120, 30);
                    this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 400, onComplete: () => g.destroy() });
                    if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 150) {
                        target.takeDamage(60 * this.power, 300 * this.facing, -500, 600);
                    }
                });
            });
        }

        // ── TIER 4 (ULTIMATES) ──
        else if (abilityKey === 'gojo_purple') {
            this.stateMachine.lock(3000);
            if (this.scene.screenEffects) { this.scene.screenEffects.domainFlash(0xAA00FF); this.scene.screenEffects.slowMotion(0.3, 2000); }
            
            const redC = this.scene.add.circle(px + 30 * f, py - 75, 25, 0xFF2222, 0.9).setDepth(15);
            const blueC = this.scene.add.circle(px + 30 * f, py + 45, 25, 0x2244FF, 0.9).setDepth(15);
            try { this.scene.sound.play('sfx_purple', { volume: 1.0 }); } catch(e) {}

            this.scene.tweens.add({ targets: redC, y: py - 15, duration: 1500, ease: 'Power2' });
            this.scene.tweens.add({ targets: blueC, y: py - 15, duration: 1500, ease: 'Power2' });

            this.scene.time.delayedCall(1500, () => {
                redC.destroy(); blueC.destroy();
                const purpleC = this.scene.add.circle(px + 30 * f, py - 15, 40, 0x9922FF, 1).setDepth(15);
                this.scene.tweens.add({ targets: purpleC, scale: 3, duration: 500, yoyo: true, onComplete: () => purpleC.destroy() });
                
                this.scene.time.delayedCall(300, () => {
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 800);
                    const proj = new Projectile(this.scene, px + 60 * f, py - 15, {
                        owner: this, damage: Math.floor(90 * this.power),
                        knockbackX: 1200 * f, knockbackY: -400, stunDuration: 800,
                        speed: 1200, direction: f, color: 0x9922FF, size: { w: 600, h: 600 },
                        lifetime: 3000, type: 'circle'
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                });
            });
        }
        else if (abilityKey === 'sukuna_fuga') {
            this.stateMachine.lock(3000);
            if (this.scene.screenEffects) this.scene.screenEffects.domainFlash(0xFF2200);
            try { this.scene.sound.play('sfx_charge', { volume: 1.0 }); } catch(e) {}

            const bow = this.scene.add.sprite(px + 40 * f, py - 20, 'sprite_sukuna_arrow_bow').setDepth(20).setScale(1.5);
            bow.setFlipX(f < 0);
            
            this.scene.time.delayedCall(1500, () => {
                try { this.scene.sound.play('sfx_beam', { volume: 1.2 }); } catch(e) {}
                bow.destroy();
                const proj = new Projectile(this.scene, px + 60 * f, py - 20, {
                    owner: this, damage: Math.floor(100 * this.power),
                    knockbackX: 1500 * f, knockbackY: -500, stunDuration: 1000,
                    speed: 1800, direction: f, color: 0xFF2200, size: { w: 80, h: 40 },
                    lifetime: 2000, type: 'fire_arrow',
                    onHitCallback: (p, victim) => {
                        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.08, 1000);
                        const boom = this.scene.add.circle(p.sprite.x, p.sprite.y, 300, 0xFF4400, 0.8).setDepth(50);
                        this.scene.tweens.add({ targets: boom, scale: 2, alpha: 0, duration: 800, onComplete: () => boom.destroy() });
                        return false;
                    }
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            });
        }
        else if (abilityKey === 'ishigori_granite') {
            this.stateMachine.lock(1500);
            try { this.scene.sound.play('sfx_beam', { volume: 1.0 }); } catch(e) {}
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 300);
            const proj = new Projectile(this.scene, px + 30 * f, py - 30, {
                owner: this, damage: Math.floor(60 * this.power),
                knockbackX: 700 * f, knockbackY: -200, stunDuration: 500,
                speed: 4500, direction: f, color: 0x44CCFF, size: { w: 100, h: 40 },
                lifetime: 2000, type: 'beam'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(proj);
        }
        else if (abilityKey === 'jogo_meteor') {
            this.stateMachine.lock(2500);
            try { this.scene.sound.play('sfx_charge', { volume: 1.0 }); } catch(e) {}
            if (this.scene.screenEffects) this.scene.screenEffects.domainFlash(0xFF4400);

            this.scene.time.delayedCall(1000, () => {
                const target = this.opponent;
                const tx = target.sprite.x;
                const meteor = this.scene.add.circle(tx, -200, 150, 0xFF3300, 1).setDepth(15);
                
                this.scene.tweens.add({
                    targets: meteor, y: target.sprite.y, duration: 1000, ease: 'Quad.easeIn',
                    onComplete: () => {
                        try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.5 }); } catch(e) {}
                        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.08, 800);
                        const wave = this.scene.add.circle(tx, target.sprite.y, 300, 0xFF5500, 0.8).setDepth(14);
                        this.scene.tweens.add({ targets: wave, scale: 2, alpha: 0, duration: 500, onComplete: () => wave.destroy() });
                        
                        const dist = Math.abs(target.sprite.x - tx);
                        if (dist < 200) {
                            target.takeDamage(80 * this.power, 500 * f, -600, 800);
                            if (target.applyBurn) target.applyBurn(5000);
                        }
                        meteor.destroy();
                    }
                });
            });
        }

        else if (abilityKey === 'higuruma_death') {
            this.stateMachine.lock(1200);
            try { this.scene.sound.play('sfx_slash', { volume: 0.6 }); } catch(e) {}
            const target = this.opponent;
            const tx = target ? target.sprite.x : px + 150 * f;
            const ty = py;
            const g = this.scene.add.graphics().setDepth(16);
            g.fillStyle(0x8B7355, 1); g.fillRect(tx - 10, ty - 300, 20, 80);
            g.fillStyle(0x444444, 1); g.fillRect(tx - 40, ty - 220, 80, 50);

            this.scene.tweens.add({
                targets: g, y: 220, duration: 300, ease: 'Power2',
                onComplete: () => {
                    g.clear();
                    g.fillStyle(0x444444, 1); g.fillRect(tx - 40, ty, 80, 50);
                    g.fillStyle(0x8B7355, 1); g.fillRect(tx - 10, ty - 80, 20, 80);
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.06, 500);
                    if (target && !target.isDead && Math.abs(target.sprite.x - tx) < 80) {
                        target.takeDamage(80 * this.power, 200 * f, -100, 700);
                        target.ceSystem.ce = Math.max(0, target.ceSystem.ce - 50); // Confiscates CE
                    }
                    this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, delay: 200, onComplete: () => g.destroy() });
                }
            });
        }

        this.scene.time.delayedCall(700, () => {
            if (abilityKey !== 'gojo_purple' && abilityKey !== 'sukuna_fuga' && abilityKey !== 'ishigori_granite' && abilityKey !== 'jogo_meteor' && abilityKey !== 'higuruma_death') {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('idle');
            } else {
                this.scene.time.delayedCall(2000, () => {
                    this.isCasting = false;
                    this.stateMachine.unlock();
                    this.stateMachine.setState('idle');
                });
            }
        });
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
        this.usedU_normal = true;
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
        this.usedU_up = true;
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
        this.usedU_side = true;
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
        this.usedU_down = true;
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

        this.domainCount++;
        // NO upfront spend — domain drains CE from the moment it activates
        this.domainActive = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');

        // ── Store opponent ref for copy system ──
        const opponent = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (opponent) {
            this.copyActive = true;
            this.copyTimer = this.charData.stats.domainDuration;
            this._copiedOpponent = opponent;
            this._origPower = this.power;
            this.power = Math.max(this.power, opponent.power || 1.0);
        }

        try { this.scene.sound.play('sfx_purple', { volume: (window.gameSettings?.sfx ?? 50) / 100 }); } catch(e){}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'authentic_mutual_love');
    }

    applySureHitTick(opponent) {
        // Yuta's domain does NOT deal damage — it only lets him copy abilities
        if (!this.domainActive) return;
        // Visual reminder only
        if (Math.random() < 0.2) {
            const ox = opponent.sprite.x; const oy = opponent.sprite.y - 50;
            const txt = this.scene.add.text(ox + (Math.random()-0.5)*30, oy, 'COPY ACTIVE', {
                fontSize: '10px', color: '#FF88CC', stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(15);
            this.scene.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
        }
    }

    update(time, dt) {
        super.update(time, dt);
        if (this.isGojoForm) {
            if (this.blueAuraActive) {
                this.blueAuraTimer -= dt;
                const bx = this.blueFixedX;
                const by = this.blueFixedY;

                if (!this.blueGraphics) {
                    this.blueGraphics = this.scene.add.graphics();
                    this.blueGraphics.setDepth(15);
                }
                this.blueGraphics.clear();

                if (this.blueAuraTimer <= 0) {
                    this.blueAuraActive = false;
                    this.blueGraphics.clear();
                    return;
                }

                const pulse = 0.8 + Math.sin(time * 0.01) * 0.2;
                this.blueGraphics.fillStyle(0x2244FF, pulse);
                this.blueGraphics.fillCircle(bx, by, 150);

                this.blueGraphics.fillStyle(0xFFFFFF, pulse * 0.6);
                this.blueGraphics.fillCircle(bx, by, 70);

                this.blueGraphics.lineStyle(4, 0x00D4FF, pulse * 0.5);
                this.blueGraphics.strokeCircle(bx, by, 150 + (time % 500) / 10);
                this.blueGraphics.lineStyle(2, 0x88EEFF, pulse * 0.3);
                this.blueGraphics.strokeCircle(bx, by, 210 + (time % 800) / 15);

                const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                if (target && !target.isDead) {
                    const dx = bx - target.sprite.x;
                    const dy = by - target.sprite.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 400 && dist > 5) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const forceMagnitude = 600 * (1 - dist / 400);

                        target.sprite.body.velocity.x += nx * forceMagnitude * (dt / 1000) * 8;
                        target.sprite.body.velocity.y += ny * forceMagnitude * (dt / 1000) * 5;

                        if (dist < 90) {
                            this.blueTickTimer -= dt;
                            if (this.blueTickTimer <= 0) {
                                this.blueTickTimer = 400;
                                target.takeDamage(20, (target.sprite.x > bx ? -100 : 100), -80, 250);
                                if (this.scene.screenEffects) {
                                    this.scene.screenEffects.shake(0.008, 150);
                                }
                            }
                        }
                    }
                }
            } else if (this.blueGraphics) {
                this.blueGraphics.clear();
            }
            return;
        }

        if (this.cursedSpeechCooldown > 0) this.cursedSpeechCooldown -= dt;
        if (this.thinIceCooldown > 0) {
            this.thinIceCooldown -= dt;
        }

        if (this.copyCdLight > 0) this.copyCdLight -= dt;
        if (this.copyCdHeavy > 0) this.copyCdHeavy -= dt;
        if (this.copyCdUlt > 0) this.copyCdUlt -= dt;

        if (this.copyActive) {
            this.copyTimer -= dt;
            if (this.copyTimer <= 0 || !this.ceSystem.isDomainActive) {
                this.copyActive = false;
                this._copiedOpponent = null;
                this.power = this._origPower || this.charData.stats.power || 1.0;
            }
        }

        if (this.domainActive && this.ceSystem.isDomainActive) {
            // Yuta's domain drains much slower. Refund 70% of the natural drain.
            const refund = (DOMAIN.CE_DRAIN_RATE * 0.7) * (dt / 1000);
            this.ceSystem.ce = Math.min(this.ceSystem.maxCe, this.ceSystem.ce + refund);
        }
    }

    // ═══════════════════════════════════════
    // DRAW — Yuta with katana + Rika behind
    // ═══════════════════════════════════════
    drawBody(dt) {
        const g = this.graphics;
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const masterY = y + (this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0);
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;

        if (this.isGojoForm) {
            g.clear();
            if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

            const skinColor = isFlashing ? 0xFFFFFF : 0xFFE0CC;
            const uColor = isFlashing ? 0xFFFFFF : 0x111118; // Compression shirt
            const pColor = isFlashing ? 0xFFFFFF : 0x151520; // Hakama pants
            const hairColor = 0xF5F5FF; // White hair
            const armExtend = this.attackSwing * 40;
            const hx = x; const hy = masterY - 52;

            // 1. Legs
            const legY = masterY + 5;
            let leftKnee = 35, rightKnee = 35;
            let pLx = -10, pRx = 10;
            if (this.stateMachine.is('walk')) {
                leftKnee += this.walkCycle * 1.5;
                rightKnee -= this.walkCycle * 1.5;
            } else if (this.stateMachine.isAny('jump', 'fall')) {
                leftKnee = 20; rightKnee = 20;
                pLx = -14; pRx = 14;
            }
            g.fillStyle(pColor, 0.85);
            g.fillTriangle(x + pLx, legY, x + pLx - 10, legY + leftKnee, x + pLx + 10, legY + leftKnee - 5);
            g.fillStyle(pColor, 1);
            g.fillTriangle(x + pRx, legY, x + pRx - 12 * f, legY + rightKnee, x + pRx + 12 * f, legY + rightKnee - 2);

            // 2. Torso
            g.fillStyle(uColor, 1);
            g.beginPath();
            g.moveTo(x - 16, masterY - 38);
            g.lineTo(x + 16, masterY - 38);
            g.lineTo(x + 12, masterY + 12);
            g.lineTo(x - 12, masterY + 12);
            g.fillPath();

            // 3. Arms
            g.lineStyle(8, uColor, 1);
            // Back arm
            g.beginPath();
            g.moveTo(x - 12 * f, masterY - 34);
            g.lineTo(x - 22 * f, masterY - 16);
            g.strokePath();

            // Front arm / attack swing
            g.beginPath();
            g.moveTo(x + 12 * f, masterY - 34);
            if (this.attackSwing > 0) {
                g.lineTo(hx + (25 + armExtend) * f, masterY - 34);
                g.fillStyle(0x4488FF, 0.8);
                g.fillCircle(hx + (28 + armExtend) * f, masterY - 34, 8);
            } else {
                g.lineTo(x + 22 * f, masterY - 16);
            }
            g.strokePath();

            // 4. Head & Neck
            g.fillStyle(skinColor, 1);
            g.fillRect(x - 4, masterY - 45, 8, 8);
            g.fillCircle(x, hy, 12);

            // 5. Six Eyes Glow
            g.fillStyle(0x00D8FF, 0.9);
            g.fillCircle(hx - 3 * f, hy - 2, 2.5);
            g.fillCircle(hx + 3 * f, hy - 2, 2.5);

            // 6. White Hair Spikes
            g.fillStyle(hairColor, 1);
            for (let i = -14; i <= 14; i += 4) {
                const spikeH = 14 + Math.cos((i / 14) * (Math.PI / 2)) * 10;
                const slant = (i * 0.5) * f;
                g.fillTriangle(hx + i, hy - 8, hx + i + 2, hy - 8, hx + i + slant, hy - 8 - spikeH);
            }

            // 7. Infinity Shield visual if infinity state active
            if (this.stateMachine.is('infinity') || this.infinityActive) {
                const shieldPulse = 0.4 + Math.sin(this.animTimer * 0.008) * 0.2;
                g.lineStyle(1.5, 0x00CCFF, shieldPulse * 0.4);
                g.strokeCircle(x, masterY - 15, 50);
            }
            return;
        }

        super.drawBody(dt); // Calls base to draw everything
        // UI Cooldown "Mini Clock" Indicators
        if (this.copyActive && !this.isDead) {
            const renderClock = (xOffset, cd, maxCd, color) => {
                if (cd <= 0) return;
                const progress = cd / maxCd; // 0 to 1
                const cx = x + xOffset;
                const cy = masterY - 85;
                const radius = 6;
                g.fillStyle(0x000000, 0.7);
                g.fillCircle(cx, cy, radius);
                
                g.fillStyle(color, 0.9);
                g.beginPath();
                g.moveTo(cx, cy);
                g.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress), false);
                g.closePath();
                g.fillPath();

                g.lineStyle(1, 0xFFFFFF, 0.8);
                g.strokeCircle(cx, cy, radius);
            };

            renderClock(-15, this.copyCdLight, 2000, 0x00FF00); // Light (Green)
            renderClock(0, this.copyCdHeavy, 3000, 0xFFCC00); // Heavy (Yellow)
            renderClock(15, this.copyCdUlt, 5000, 0xFF0000); // Ult (Red)
        }

        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const skinColor = isFlashing ? 0xFFFFFF : 0xF0D0B0;
        const uniformColor = isFlashing ? 0xFFFFFF : 0x111133;
        const hairColor = isFlashing ? 0xFFFFFF : 0x222244;
        const armExtend = this.attackSwing * 40;

        // ── RIKA (monstrous form behind Yuta) ──
        const rikaAlpha = this.copyActive
            ? (0.35 + Math.sin((this.animTimer || 0) * 0.003) * 0.1)
            : (0.12 + Math.sin((this.animTimer || 0) * 0.003) * 0.06);
        const rkx = x - 25 * f;
        const rky = masterY - 55;
        const rt = (this.animTimer || 0) * 0.003;

        // Large dark body mass
        g.fillStyle(0x1A0A22, rikaAlpha);
        g.fillEllipse(rkx, rky + 10, 55, 70);
        // Armored torso ridges
        g.fillStyle(0x2A1533, rikaAlpha * 0.8);
        g.fillEllipse(rkx, rky + 5, 45, 55);
        g.lineStyle(1, 0x441155, rikaAlpha * 0.5);
        g.strokeEllipse(rkx, rky + 5, 45, 55);

        // Head — large, slightly pointed
        g.fillStyle(0x1A0A22, rikaAlpha * 1.2);
        g.beginPath();
        g.moveTo(rkx - 18, rky - 5);
        g.lineTo(rkx - 14, rky - 28);
        g.lineTo(rkx - 5, rky - 35);
        g.lineTo(rkx + 5, rky - 35);
        g.lineTo(rkx + 14, rky - 28);
        g.lineTo(rkx + 18, rky - 5);
        g.fillPath();
        // Pointed ears
        g.fillStyle(0x1A0A22, rikaAlpha);
        g.beginPath(); g.moveTo(rkx - 16, rky - 22); g.lineTo(rkx - 25, rky - 38); g.lineTo(rkx - 10, rky - 25); g.fillPath();
        g.beginPath(); g.moveTo(rkx + 16, rky - 22); g.lineTo(rkx + 25, rky - 38); g.lineTo(rkx + 10, rky - 25); g.fillPath();

        // SINGLE CYCLOPS EYE (large, glowing)
        g.fillStyle(0x000000, rikaAlpha * 1.5);
        g.fillEllipse(rkx, rky - 16, 10, 12);
        const eyeGlow = 0.5 + Math.sin(rt * 3) * 0.3;
        g.fillStyle(0xFF2288, rikaAlpha * eyeGlow * 2);
        g.fillCircle(rkx, rky - 16, 4);
        g.fillStyle(0xFFFFFF, rikaAlpha * eyeGlow);
        g.fillCircle(rkx - 1, rky - 17, 1.5);

        // Wide mouth with fangs
        g.fillStyle(0x000000, rikaAlpha * 0.8);
        g.beginPath();
        g.moveTo(rkx - 10, rky - 5); g.lineTo(rkx + 10, rky - 5);
        g.lineTo(rkx + 7, rky - 1); g.lineTo(rkx - 7, rky - 1);
        g.fillPath();
        // Fangs
        g.fillStyle(0xDDCCDD, rikaAlpha);
        g.fillTriangle(rkx - 7, rky - 5, rkx - 5, rky - 5, rkx - 6, rky - 1);
        g.fillTriangle(rkx + 5, rky - 5, rkx + 7, rky - 5, rkx + 6, rky - 1);
        g.fillTriangle(rkx - 2, rky - 5, rkx + 2, rky - 5, rkx, rky - 2);

        // CLAWS reaching forward (toward Yuta's front)
        const clawAlpha = rikaAlpha * (this.copyActive ? 1.2 : 0.6);
        g.lineStyle(3, 0x1A0A22, clawAlpha);
        // Left claw arm
        g.beginPath(); g.moveTo(rkx - 20, rky + 15);
        g.lineTo(x - 10, masterY - 20); g.strokePath();
        g.fillStyle(0x1A0A22, clawAlpha);
        for (let c = 0; c < 3; c++) {
            const cx = x - 15 + c * 5; const cy = masterY - 22 - c * 3;
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 3, cy - 8); g.lineTo(cx + 1, cy - 2); g.fillPath();
        }
        // Right claw arm
        g.lineStyle(3, 0x1A0A22, clawAlpha);
        g.beginPath(); g.moveTo(rkx + 20, rky + 15);
        g.lineTo(x + 10, masterY - 20); g.strokePath();
        g.fillStyle(0x1A0A22, clawAlpha);
        for (let c = 0; c < 3; c++) {
            const cx = x + 5 + c * 5; const cy = masterY - 22 - c * 3;
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 3, cy - 8); g.lineTo(cx - 1, cy - 2); g.fillPath();
        }

        // Dark tendrils / hair flowing
        g.lineStyle(2, 0x110818, rikaAlpha * 0.7);
        for (let i = 0; i < 4; i++) {
            const wave = Math.sin(rt + i * 1.5) * 8;
            g.beginPath();
            g.moveTo(rkx - 12 + i * 8, rky - 30);
            g.lineTo(rkx - 15 + i * 10 + wave, rky - 50 - i * 3);
            g.strokePath();
        }

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
            if (this.isGojoForm) {
                ag.fillStyle(0x00CCFF, pulse * 1.5);
                ag.fillEllipse(x, y - 30, 50, 85);
            } else {
                ag.fillStyle(0xFF88CC, pulse);
                ag.fillEllipse(x, y - 30, 50, 85);
            }
        }
    }

    takeDamage(damage, kbX, kbY, stunDuration, isProjectile = false) {
        if (this.infinityActive) {
            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.003, 100);
            }
            return;
        }
        super.takeDamage(damage, kbX, kbY, stunDuration, isProjectile);
        
        // Gojo Revival condition
        if (this.hp <= 0 && !this.isGojoForm && this.domainCount >= 2 && this.usedU_normal && this.usedU_up && this.usedU_down && this.usedU_side) {
            this.reviveAsGojo();
        }
    }

    reviveAsGojo() {
        this.hp = this.maxHp;
        this.isDead = false;
        this.isGojoForm = true;
        this.fighterId = 'gojo'; // Allows generic Gojo mechanics to work on Yuta (like Block = Infinity, Infinity CE drain)
        this.power *= 1.4; // Boost power by 40%
        this.speed = this._baseSpeed * 1.25; // 25% faster movement

        // Stop any current attack or casting
        this.isCasting = false;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');

        // Visual / Audio splash
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x00D8FF, 800, 0.7);
            this.scene.screenEffects.shake(0.06, 1000);
            this.scene.screenEffects.slowMotion(0.2, 2000);
        }

        try {
            this.scene.sound.play('sfx_purple', { volume: 1.0 });
        } catch (e) {}

        // Add dramatic text
        const rx = this.sprite.x;
        const ry = this.sprite.y - 100;
        const text = this.scene.add.text(rx, ry, 'GOJO SATORU BODY REVIVAL', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#00D8FF',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(30);

        this.scene.tweens.add({
            targets: text,
            y: ry - 40,
            alpha: 0,
            duration: 3000,
            onComplete: () => text.destroy()
        });
    }

    // ── GOJO COPIED SKILLS ──

    castTeleportStrike() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        this.isCasting = true;
        this.stateMachine.lock(600);
        this.sprite.body.setVelocity(0, 0);

        try { this.scene.sound.play('sfx_dash', { volume: 0.8 }); } catch(e){}

        const xOut = this.sprite.x;
        const yOut = this.sprite.y;
        const outPulse = this.scene.add.circle(xOut, yOut, 30, 0x44CCFF, 0.8).setDepth(20);
        this.scene.tweens.add({ targets: outPulse, scale: 2, alpha: 0, duration: 200, onComplete: () => outPulse.destroy() });

        this.sprite.setAlpha(0);

        this.scene.time.delayedCall(150, () => {
            if (this.opponent && !this.opponent.isDead) {
                this.facing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;
                this.sprite.x = this.opponent.sprite.x - (30 * this.facing);
                this.sprite.y = this.opponent.sprite.y - 60;
            }

            this.sprite.setAlpha(1);

            const inPulse = this.scene.add.circle(this.sprite.x, this.sprite.y, 30, 0x44CCFF, 0.8).setDepth(20);
            this.scene.tweens.add({ targets: inPulse, scale: 2, alpha: 0, duration: 200, onComplete: () => inPulse.destroy() });

            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.8 }); } catch(e){}
            
            if (this.opponent) {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.opponent.sprite.x, this.opponent.sprite.y);
                if (dist < 100) {
                    const dmg = Math.floor(40 * this.power);
                    this.opponent.takeDamage(dmg, 100 * this.facing, 400, 500);
                    this.comboSystem.registerHit('SPECIAL');
                    if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
                }
            }

            const g = this.scene.add.graphics().setDepth(20);
            g.lineStyle(6, 0x44CCFF, 0.9);
            g.beginPath();
            g.moveTo(this.sprite.x, this.sprite.y - 20);
            g.lineTo(this.sprite.x + 40 * this.facing, this.sprite.y + 40);
            g.strokePath();
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
            
            this.scene.time.delayedCall(300, () => {
                this.isCasting = false;
                this.stateMachine.unlock();
                this.stateMachine.setState('fall');
            });
        });
    }

    fireBlue() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_1)) return;
        this.spawnBlueEffect();

        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        try {
            const snd = this.scene.sound.add('sfx_blue', {
                volume: ((window.gameSettings?.sfx ?? 50) / 100) * 3.0
            });
            snd.play();
        } catch(e) {}

        this.scene.time.delayedCall(5000, () => {
            this.blueAuraActive = true;
            this.blueAuraTimer = 4000;
            this.blueTickTimer = 0;
            this.blueFixedX = this.sprite.x + 250 * this.facing;
            this.blueFixedY = this.sprite.y - 15;
            this.isCasting = false;
            this.stateMachine.unlock();
            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        });
    }

    fireRed() {
        if (!this.ceSystem.spend(CE_COSTS.SKILL_2)) return;
        this.spawnRedEffect();

        // AKA: BURST (Yuta-Gojo slight variation: faster startup and double rapid explosions on hit)
        this.castWithAudio('sfx_red', () => {
            const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: Math.floor(this.charData.skills.skill2.damage * this.power),
                knockbackX: 1800,
                knockbackY: -500,
                stunDuration: 700,
                speed: 600, // Faster red
                direction: this.facing,
                color: 0xFF1144,
                size: { w: 40, h: 40 },
                lifetime: 1800,
                type: 'circle',
                onHitCallback: (projectile, target) => {
                    const x = target.sprite.x;
                    const y = target.sprite.y - 45;

                    const c1 = this.scene.add.circle(x, y, 10, 0xFF1144, 0.8).setDepth(20);
                    this.scene.tweens.add({
                        targets: c1,
                        scaleX: 8, scaleY: 8, alpha: 0,
                        duration: 300,
                        onComplete: () => c1.destroy()
                    });

                    this.scene.time.delayedCall(150, () => {
                        if (target && !target.isDead) {
                            target.takeDamage(Math.floor(25 * this.power), 400 * this.facing, -150, 400);
                            const c2 = this.scene.add.circle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, 10, 0xFF4488, 0.7).setDepth(20);
                            this.scene.tweens.add({
                                targets: c2,
                                scaleX: 6, scaleY: 6, alpha: 0,
                                duration: 300,
                                onComplete: () => c2.destroy()
                            });
                        }
                    });

                    if (this.scene.screenEffects) {
                        this.scene.screenEffects.shake(0.02, 300);
                    }
                    return false;
                }
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.stateMachine.is('attack')) {
                this.stateMachine.setState('idle');
            }
        }, 3000);
    }

    firePurple() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.domainFlash(0xAA00FF);
            this.scene.screenEffects.slowMotion(0.3, 2000);
        }

        const cx = this.sprite.x + 30 * this.facing;
        const cy = this.sprite.y - 15;
        const redC = this.scene.add.circle(cx, cy - 60, 25, 0xFF2222, 0.9).setDepth(15);
        const blueC = this.scene.add.circle(cx, cy + 60, 25, 0x2244FF, 0.9).setDepth(15);

        this.scene.tweens.add({
            targets: redC,
            x: cx + 40, y: cy - 30,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 2,
        });
        this.scene.tweens.add({
            targets: blueC,
            x: cx - 40, y: cy + 30,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 2,
        });

        const purpleGlow = this.scene.add.circle(cx, cy, 5, 0x9922FF, 0.3).setDepth(14);
        this.scene.tweens.add({
            targets: purpleGlow,
            scaleX: 8, scaleY: 8, alpha: 0.7,
            duration: 8000,
            ease: 'Quad.easeIn',
        });

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && !target.isDead) {
            target.stateMachine.unlock();
            target.stateMachine.lock(99999);
            target.sprite.body.setVelocity(0, 0);
        }

        this.castWithAudio('sfx_purple', () => {
            redC.destroy();
            blueC.destroy();
            purpleGlow.destroy();

            const proj = new Projectile(this.scene, this.sprite.x + 60 * this.facing, this.sprite.y - 50, {
                owner: this,
                damage: Math.floor(this.charData.skills.maximum.damage * this.power),
                knockbackX: 1200, knockbackY: -400,
                stunDuration: 800, speed: 1200,
                direction: this.facing, color: 0x9922FF,
                size: { w: 600, h: 600 }, lifetime: 3000,
                type: 'circle',
                isHollowPurple: true,
            });

            if (this.scene.projectiles) {
                this.scene.projectiles.push(proj);
            }

            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.04, 800);
            }

            if (target && !target.isDead) {
                target.stateMachine.unlock();
                if (!target.stateMachine.isAny('idle', 'walk', 'jump', 'fall', 'attack')) {
                    target.stateMachine.setState('idle');
                }
            }

            this.stateMachine.setState('idle');
        }, 15000);
    }

    spawnBlueEffect() {
        const x = this.sprite.x + 20 * this.facing;
        const y = this.sprite.y - 15;
        const circle = this.scene.add.circle(x, y, 15, 0x2244FF, 0.7);
        circle.setDepth(12);
        this.scene.tweens.add({
            targets: circle,
            scaleX: 10, scaleY: 10, alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => circle.destroy(),
        });
    }

    spawnRedEffect() {
        const x = this.sprite.x + 20 * this.facing;
        const y = this.sprite.y - 15;
        const circle = this.scene.add.circle(x, y, 20, 0xFF2222, 0.8);
        circle.setDepth(12);
        this.scene.tweens.add({
            targets: circle,
            scaleX: 8, scaleY: 8, alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => circle.destroy(),
        });
    }
}
