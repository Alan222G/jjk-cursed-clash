// ========================================================
// GameScene — Escena principal de combate
// ========================================================

import Phaser from 'phaser';
import Gojo from '../entities/fighters/Gojo.js';
import Sukuna from '../entities/fighters/Sukuna.js';
import Toji from '../entities/fighters/Toji.js';
import Kenjaku from '../entities/fighters/Kenjaku.js';
import HUD from '../ui/HUD.js';
import DamageNumbers from '../ui/DamageNumbers.js';
import ScreenEffects from '../ui/ScreenEffects.js';
import AIManager from '../systems/AIManager.js';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS, DOMAIN } from '../config.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.p1Key = data.p1 || 'GOJO';
        this.p2Key = data.p2 || 'SUKUNA';
    }

    create() {
        // ── Background & Environment ──
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_shibuya')
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-10);
            
        // BGM Deathmatch Mapeado a Loop
        this.sound.stopAll();
        try {
            this.sound.play('bgm_combat', { volume: 0.4, loop: true });
        } catch(e) { console.warn('BGM combat play failed', e); }
        
        // Floor
        const floorY = GAME_HEIGHT - 60;
        this.add.rectangle(0, floorY, GAME_WIDTH, 60, 0x1A1A22).setOrigin(0).setDepth(-1); // Shadow backdrop
        const floorSprite = this.add.tileSprite(0, floorY, GAME_WIDTH, 60, 'ground_texture').setOrigin(0).setDepth(0);
        
        // Auto-scale tile texture to perfectly fit the 60px height without cropping
        const groundImage = this.textures.get('ground_texture').getSourceImage();
        if (groundImage && groundImage.height) {
            const scaleFactor = 60 / groundImage.height;
            floorSprite.tileScaleX = scaleFactor;
            floorSprite.tileScaleY = scaleFactor;
        }
        
        // ── Groups ──
        this.projectiles = [];
        
        // ── Entities ──
        this.p1 = this.createFighter(this.p1Key, 300, PHYSICS.GROUND_Y - 50, 0);
        this.p2 = this.createFighter(this.p2Key, 980, PHYSICS.GROUND_Y - 50, 1);
        
        this.p1.opponent = this.p2;
        this.p2.opponent = this.p1;

        // ── Single Player AI ──
        if (window.gameSettings && window.gameSettings.p2Control === 'humano') {
            this.aiManager = null; // PvP Local
        } else {
            this.aiManager = new AIManager(this.p2, this.p1); // PvCPU
        }

        // ── Systems ──
        this.hud = new HUD(this);
        this.hud.setNames(this.p1.fighterName, this.p2.fighterName);
        this.hud.setPortraits(this.p1Key, this.p2Key);
        this.hud.startTimer();
        
        this.damageNumbers = new DamageNumbers(this);
        this.screenEffects = new ScreenEffects(this);

        // ── Collisions ──
        this.physics.add.overlap(this.p1.hitbox, this.p2.sprite, () => {
            this.p1.onHitOpponent(this.p2);
        });
        this.physics.add.overlap(this.p2.hitbox, this.p1.sprite, () => {
            this.p2.onHitOpponent(this.p1);
        });

        // ── Domain System ──
        this.domainActive = false;
        this.domainPhase1 = false;  // IMPORTANT: initialize
        this.domainOwner = null;
        this.domainBg = null;
        this.domainFlash = null;
        this.sureHitTimer = 0;
        this.matchEnded = false;

        // ── Pause Menu ──
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.matchEnded) return;
            this.physics.pause();
            this.scene.pause();
            this.scene.launch('PauseScene');
        });
    }

    createFighter(key, x, y, index) {
        if (key === 'GOJO') return new Gojo(this, x, y, index);
        if (key === 'SUKUNA') return new Sukuna(this, x, y, index);
        if (key === 'TOJI') return new Toji(this, x, y, index);
        if (key === 'KENJAKU') return new Kenjaku(this, x, y, index);
        return new Gojo(this, x, y, index);
    }

    // ════════════════════════════════════════════════════════
    // DOMAIN EXPANSION — Audio-Driven Portrait Cinematic
    // ════════════════════════════════════════════════════════

    onDomainActivated(owner, domainType) {
        if (this.domainActive || this.domainPhase1) return;
        
        // ── SINGLE PHASE DOMAIN: Cinematic + Effect in one action ──
        this.domainActive = true;
        this.domainPhase1 = false; // No separate phases
        this.domainOwner = owner;
        this.domainCastTime = this.time.now;
        const opp = (owner === this.p1) ? this.p2 : this.p1;
        
        // Freeze ONLY enemy during domain
        opp.stateMachine.unlock();
        opp.stateMachine.lock(99999);
        opp.sprite.body.setVelocity(0, 0);

        // Enable CE drain
        owner.ceSystem.isDomainActive = true;
        this.sureHitTimer = 0;

        // Stop BGM for Domain Voice
        try { this.sound.stopAll(); } catch(e) {}

        const charKey = (owner === this.p1) ? this.p1Key : this.p2Key;
        const voiceKey = (charKey === 'GOJO') ? 'gojo_domain_voice' : 'sukuna_domain_voice';
        const signKey = (charKey === 'GOJO') ? 'gojo_sign' : 'sukuna_sign';
        const tintColor = (charKey === 'GOJO') ? 0x44CCFF : 0xFF2200;
        const bgColor = (charKey === 'GOJO') ? 0x44CCFF : 0x000000;

        // Domain Background
        const bgKey = owner.charData.domainBg;
        this.domainBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-5);
        
        if (this.screenEffects) {
            this.screenEffects.shake(0.04, 800);
        }

        // ── DIAGONAL PARALLEL LINES CINEMATIC ──
        const isP1 = (owner === this.p1);
        const angle = isP1 ? -35 : 35; 
        const angleRad = angle * (Math.PI / 180);
        const stripWidth = 280; 

        // Dark Overlay
        this.domainOverlay = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, 
            GAME_WIDTH, GAME_HEIGHT, 
            bgColor, 0
        ).setDepth(50).setOrigin(0.5);

        this.tweens.add({
            targets: this.domainOverlay,
            alpha: 0.95,
            duration: 800,
            ease: 'Power2',
        });

        // Mask shape
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff, 1);
        
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const diagLen = GAME_WIDTH * 2; 
        const halfW = stripWidth / 2;
        
        const perpX = Math.cos(angleRad + Math.PI / 2);
        const perpY = Math.sin(angleRad + Math.PI / 2);
        const paraX = Math.cos(angleRad);
        const paraY = Math.sin(angleRad);

        const p1x = cx - paraX * diagLen + perpX * halfW;
        const p1y = cy - paraY * diagLen + perpY * halfW;
        const p2x = cx + paraX * diagLen + perpX * halfW;
        const p2y = cy + paraY * diagLen + perpY * halfW;
        const p3x = cx + paraX * diagLen - perpX * halfW;
        const p3y = cy + paraY * diagLen - perpY * halfW;
        const p4x = cx - paraX * diagLen - perpX * halfW;
        const p4y = cy - paraY * diagLen - perpY * halfW;

        maskGraphics.beginPath();
        maskGraphics.moveTo(p1x, p1y);
        maskGraphics.lineTo(p2x, p2y);
        maskGraphics.lineTo(p3x, p3y);
        maskGraphics.lineTo(p4x, p4y);
        maskGraphics.closePath();
        maskGraphics.fillPath();

        const mask = maskGraphics.createGeometryMask();

        // Sign image (replaces portrait)
        const startX = isP1 ? -400 : GAME_WIDTH + 400;
        this.domainPortrait = this.add.image(
            startX, GAME_HEIGHT / 2, signKey
        ).setDepth(51).setOrigin(0.5);

        // FIT scaling so the entire hand sign is visible inside the screen
        const imgScale = Math.min(GAME_WIDTH / this.domainPortrait.width, GAME_HEIGHT / this.domainPortrait.height) * 0.95;
        this.domainPortrait.setScale(imgScale);
        this.domainPortrait.setMask(mask);

        this.tweens.add({
            targets: this.domainPortrait,
            x: GAME_WIDTH / 2,
            duration: 1500,
            ease: 'Power2',
        });

        this.tweens.add({
            targets: this.domainPortrait,
            scaleX: imgScale * 1.03,
            scaleY: imgScale * 1.03,
            yoyo: true,
            repeat: -1,
            duration: 2500,
            ease: 'Sine.easeInOut',
        });

        // Parallel diagonal lines
        this.domainLines = this.add.graphics();
        this.domainLines.setDepth(52);
        
        const lineColor = (charKey === 'GOJO') ? 0x44CCFF : 0xFF2200;
        
        this.domainLines.lineStyle(6, lineColor, 0.9);
        this.domainLines.beginPath();
        this.domainLines.moveTo(p1x, p1y);
        this.domainLines.lineTo(p2x, p2y);
        this.domainLines.strokePath();
        this.domainLines.beginPath();
        this.domainLines.moveTo(p4x, p4y);
        this.domainLines.lineTo(p3x, p3y);
        this.domainLines.strokePath();

        this.domainLines.lineStyle(12, lineColor, 0.2);
        this.domainLines.beginPath();
        this.domainLines.moveTo(p1x, p1y);
        this.domainLines.lineTo(p2x, p2y);
        this.domainLines.strokePath();
        this.domainLines.beginPath();
        this.domainLines.moveTo(p4x, p4y);
        this.domainLines.lineTo(p3x, p3y);
        this.domainLines.strokePath();

        this.domainLines.setAlpha(0);
        this.tweens.add({
            targets: this.domainLines,
            alpha: 1,
            duration: 600,
        });

        // Domain Name Text
        const domainName = (charKey === 'GOJO') ? 'RYŌIKI TENKAI — MURYŌKŪSHŌ' : 'RYŌIKI TENKAI — FUKUMA MIZUSHI';
        const textX = GAME_WIDTH / 2 - perpX * (halfW + 50);
        const textY = GAME_HEIGHT / 2 - perpY * (halfW + 50);
        
        this.domainText = this.add.text(textX, textY, domainName, {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: (charKey === 'GOJO') ? '#44CCFF' : '#FF4444',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center',
        }).setDepth(53).setOrigin(0.5).setAlpha(0);
        
        this.domainText.setRotation(angleRad);

        this.tweens.add({
            targets: this.domainText,
            alpha: 1,
            duration: 1200,
            delay: 800,
        });

        this._domainMask = mask;
        this._domainMaskGraphics = maskGraphics;

        // ── FADE OUT CINEMATIC after 3 seconds (domain stays active!) ──
        this.time.delayedCall(3000, () => {
            const fadeTargets = [this.domainOverlay, this.domainPortrait, this.domainText, this.domainLines].filter(Boolean);
            if (fadeTargets.length > 0) {
                this.tweens.add({
                    targets: fadeTargets,
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.domainOverlay) { this.domainOverlay.destroy(); this.domainOverlay = null; }
                        if (this.domainPortrait) { this.domainPortrait.destroy(); this.domainPortrait = null; }
                        if (this.domainText) { this.domainText.destroy(); this.domainText = null; }
                        if (this.domainLines) { this.domainLines.destroy(); this.domainLines = null; }
                        if (this._domainMaskGraphics) { this._domainMaskGraphics.destroy(); this._domainMaskGraphics = null; }
                    }
                });
            }
        });

        // ── AUDIO-DRIVEN: Domain lasts as long as the voice ──
        const endDomain = () => {
            if (!this.domainActive) return;
            owner.ceSystem.ce = 0;
            owner.ceSystem.endDomain();
            this.onDomainEnd(owner);
        };

        try {
            let specialVol = ((window.gameSettings?.sfx ?? 50) / 100) * 2.0;
            const domainVoice = this.sound.add(voiceKey, { volume: specialVol });
            domainVoice.once('complete', endDomain);
            domainVoice.play();

            // Safety fallback — only if audio totally fails to fire 'complete'
            const maxWait = owner.charData.stats.domainDuration + 5000;
            this.domainTimeout = this.time.delayedCall(maxWait, endDomain);
        } catch (e) {
            const fallback = owner.charData.stats.domainDuration || 15000;
            this.domainTimeout = this.time.delayedCall(fallback, endDomain);
        }
    }

    attemptDomainClash(triggeringPlayer) {
        if (!this.domainActive || !this.domainOwner) return false;
        
        // Check window
        const timeSince = this.time.now - this.domainCastTime;
        if (timeSince > DOMAIN.CLASH_WINDOW) {
            return false; // Too late!
        }

        // It's a valid clash!
        console.log("DOMAIN CLASH TRIGGERED!");
        
        // 1. Stop current domain progression
        try { this.sound.stopAll(); } catch(e) {}
        if (this.domainTimeout) { this.domainTimeout.remove(); }
        
        // We leave the visual overlays as is, but pause physics
        this.physics.pause();
        this.scene.pause();
        
        // 2. Launch Clash Scene
        this.scene.launch('DomainClashScene', {
            p1: this.p1,
            p2: this.p2,
            callback: (winnerId) => this.resolveDomainClash(winnerId)
        });
        
        return true;
    }

    resolveDomainClash(winnerId) {
        this.scene.resume();
        this.physics.resume();
        
        const winner = (winnerId === 'P1') ? this.p1 : this.p2;
        const loser = (winnerId === 'P1') ? this.p2 : this.p1;

        // Clean up current domain visuals
        this.onDomainEnd(this.domainOwner);

        // Loser gets punished
        loser.ceSystem.ce = 0;
        loser.ceSystem.endDomain(); // forces fatigue
        loser.stateMachine.setState('hitstun');
        loser.stunTimer = 2000; // Big stun

        // Winner gets to cast freely!
        winner.ceSystem.ce = 100; // Refill so they can cast
        winner.domainActive = false; // Reset their own lock
        winner.tryActivateDomain();
    }

    onDomainEnd(owner) {
        this.domainActive = false;
        this.domainPhase1 = false;
        this.domainOwner = null;
        
        // Clean up all cinematic elements
        if (this.domainOverlay) { this.domainOverlay.destroy(); this.domainOverlay = null; }
        if (this.domainPortrait) { this.domainPortrait.destroy(); this.domainPortrait = null; }
        if (this.domainText) { this.domainText.destroy(); this.domainText = null; }
        if (this.domainLines) { this.domainLines.destroy(); this.domainLines = null; }
        if (this._domainMaskGraphics) { this._domainMaskGraphics.destroy(); this._domainMaskGraphics = null; }
        if (this.domainBg) {
            this.domainBg.destroy();
            this.domainBg = null;
        }

        // FORCE-UNLOCK opponent unconditionally
        const opp = (owner === this.p1) ? this.p2 : this.p1;
        if (opp && !opp.isDead) {
            opp.isCasting = false;
            opp.stateMachine.unlock();
            opp.stateMachine.setState('idle');
        }
        
        // Stop all audio and resume combat BGM
        try {
            this.sound.stopAll();
            const musicVol = (window.gameSettings?.music ?? 50) / 100 * 0.4;
            this.sound.play('bgm_combat', { volume: musicVol, loop: true });
        } catch(e) {}
    }

    // ════════════════════════════════════════════════════════
    // KNOCKOUT & GAME OVER
    // ════════════════════════════════════════════════════════

    onKnockout(winner, loser) {
        if (this.matchEnded) return;
        this.matchEnded = true;

        // Stop domain if active
        if (this.domainActive || this.domainPhase1) {
            this.onDomainEnd(this.domainOwner);
        }

        // Stop all sounds first, then play game over after a tiny delay
        this.sound.stopAll();
        this.time.delayedCall(100, () => {
            try {
                this.sound.play('bgm_gameover', { volume: 0.8, loop: false });
            } catch(e) {}
        });

        if (this.screenEffects) {
            this.screenEffects.slowMotion(0.2, 2000);
        }

        this.time.delayedCall(2000, () => {
            this.physics.pause();
            this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0).setDepth(200);

            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'K.O.', {
                fontFamily: 'Arial Black',
                fontSize: '100px',
                color: '#FF0000',
                stroke: '#000000',
                strokeThickness: 8
            }).setOrigin(0.5).setDepth(201);

            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, `${winner.charData.name.toUpperCase()} WINS!`, {
                fontFamily: 'Arial Black',
                fontSize: '50px',
                color: '#D4A843',
                stroke: '#000000',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(201);

            const retryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'PRESS [ENTER] PARA REVANCHA', {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#FFFFFF'
            }).setOrigin(0.5).setDepth(201);

            this.tweens.add({
                targets: retryText,
                alpha: 0,
                yoyo: true,
                repeat: -1,
                duration: 800
            });

            this.input.keyboard.once('keydown-ENTER', () => {
                this.sound.stopAll();
                this.scene.restart();
            });
            this.input.keyboard.once('keydown-ESC', () => {
                this.sound.stopAll();
                this.scene.start('MenuScene');
            });
        });
    }

    onTimeUp() {
        this.physics.pause();
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'TIME OVER', {
            fontFamily: 'Arial Black',
            fontSize: '80px',
            color: '#FF0000',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(200);
        
        this.time.delayedCall(3000, () => {
            this.scene.restart();
        });
    }

    spawnDamageNumber(x, y, amount) {
        this.damageNumbers.spawn(x, y, amount);
    }

    // ════════════════════════════════════════════════════════
    // MAIN UPDATE LOOP
    // ════════════════════════════════════════════════════════

    update(time, delta) {
        if (!this.p1 || !this.p2) return;
        if (this.matchEnded) return;
        
        // Game Over Condition Check — use currentState (not .state)
        if (this.p1.hp <= 0 && !this.p1.isDead) {
            this.p1.hp = 0;
            this.p1.isDead = true;
            this.p1.stateMachine.unlock();
            this.p1.stateMachine.setState('dead');
            this.onKnockout(this.p2, this.p1);
            return;
        }
        if (this.p2.hp <= 0 && !this.p2.isDead) {
            this.p2.hp = 0;
            this.p2.isDead = true;
            this.p2.stateMachine.unlock();
            this.p2.stateMachine.setState('dead');
            this.onKnockout(this.p1, this.p2);
            return;
        }

        if (this.aiManager) this.aiManager.update(time, delta);
        
        this.p1.update(time, delta);
        this.p2.update(time, delta);

        this.hud.update(this.p1, this.p2);

        // Projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.update(delta);
            
            if (!p.isAlive()) return false;
            
            // Collision check
            const target = p.owner === this.p1 ? this.p2 : this.p1;
            if (this.physics.overlap(p.getBody(), target.sprite)) {
                p.onHit(target);
                return false;
            }
            
            return true;
        });

        // Sure-Hit Ticks (only during Phase 2 — active domain combat)
        if (this.domainActive && this.domainOwner && !this.domainPhase1) {
            this.sureHitTimer += delta;
            
            // Tick every 1000ms (1 second) — 50 damage per second
            while (this.sureHitTimer >= 1000 && this.domainActive) {
                this.sureHitTimer -= 1000;
                const target = (this.domainOwner === this.p1) ? this.p2 : this.p1;
                this.domainOwner.applySureHitTick(target);
            }
        }
    }
}
