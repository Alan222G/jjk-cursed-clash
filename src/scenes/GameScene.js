// ========================================================
// GameScene — Escena principal de combate
// ========================================================

import Phaser from 'phaser';
import Gojo from '../entities/fighters/Gojo.js';
import Sukuna from '../entities/fighters/Sukuna.js';
import Toji from '../entities/fighters/Toji.js';
import Kenjaku from '../entities/fighters/Kenjaku.js';
import Ishigori from '../entities/fighters/Ishigori.js';
import Kuroroshi from '../entities/fighters/Kuroroshi.js';
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
        this.mapKey = data.mapKey || null;
    }

    create() {
        // ── Background & Environment ──
        const bgImg = document.getElementById('game-bg-img');
        if (bgImg) {
            if (this.mapKey) {
                bgImg.src = `assets/maps/${this.mapKey}`;
            } else {
                bgImg.src = 'assets/backgrounds/shibuya.png';
            }
            bgImg.style.display = 'block';
        }

        this.events.on('shutdown', () => {
            if (bgImg) bgImg.style.display = 'none';
        });
            
        // BGM Deathmatch Mapeado a Loop
        this.sound.stopAll();
        try {
            this.sound.play('bgm_combat', { volume: 0.4, loop: true });
        } catch(e) { console.warn('BGM combat play failed', e); }
        
        // ── Groups ──
        this.groundY = GAME_HEIGHT - 60;
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
            this.scene.launch('PauseScene', { p1Key: this.p1Key, p2Key: this.p2Key });
        });
    }

    createFighter(key, x, y, index) {
        const FIGHTER_CLASSES = {
            'GOJO': Gojo,
            'SUKUNA': Sukuna,
            'TOJI': Toji,
            'KENJAKU': Kenjaku,
            'ISHIGORI': Ishigori,
            'KUROROSHI': Kuroroshi,
        };

        const normalizedKey = (key || '').toUpperCase().trim();
        const FighterClass = FIGHTER_CLASSES[normalizedKey];

        if (!FighterClass) {
            console.warn(`[createFighter] Unknown key "${key}" (normalized: "${normalizedKey}"). Defaulting to Gojo.`);
            return new Gojo(this, x, y, index);
        }

        return new FighterClass(this, x, y, index);
    }

    // ════════════════════════════════════════════════════════
    // DOMAIN EXPANSION — Audio-Driven Portrait Cinematic
    // ════════════════════════════════════════════════════════

    onDomainActivated(owner, domainType) {
        if (this.domainActive || this.domainPhase1) return;
        
        // ── PHASE 1: Cinematic Lines (3s) — Domain NOT active yet ──
        this.domainPhase1 = true;
        this.domainActive = false;
        this.domainOwner = owner;
        this.domainCastTime = this.time.now;
        
        // Owner enters casting state (frozen)
        owner.stateMachine.unlock();
        owner.stateMachine.lock(99999);
        owner.sprite.body.setVelocity(0, 0);
        
        // Stop BGM for Domain Voice
        try { this.sound.stopAll(); } catch(e) {}

        const charKey = (owner === this.p1) ? this.p1Key : this.p2Key;

        // ── Generalized domain visual/audio lookup ──
        const DOMAIN_THEMES = {
            GOJO:     { voice: 'gojo_domain_voice',   sign: 'gojo_sign',   color: 0x44CCFF, bg: 0x44CCFF, lineColor: 0x44CCFF, textColor: '#44CCFF', name: 'RYŌIKI TENKAI — MURYŌKŪSHŌ' },
            SUKUNA:   { voice: 'sukuna_domain_voice',  sign: 'sukuna_sign', color: 0xFF2200, bg: 0x000000, lineColor: 0xFF2200, textColor: '#FF4444', name: 'RYŌIKI TENKAI — FUKUMA MIZUSHI' },
            KENJAKU:  { voice: 'gojo_domain_voice',    sign: 'sukuna_sign', color: 0x8844CC, bg: 0x110022, lineColor: 0xAA66FF, textColor: '#AA66FF', name: 'RYŌIKI TENKAI — TAIHŌGAN' },
            ISHIGORI: { voice: 'sukuna_domain_voice',  sign: 'sukuna_sign', color: 0xFFAA33, bg: 0x1A0A00, lineColor: 0xFFCC00, textColor: '#FFCC00', name: 'RYŌIKI TENKAI — JIKANKŌ GEPPAKU' },
            KUROROSHI:{ voice: 'sukuna_domain_voice',  sign: 'sukuna_sign', color: 0x664422, bg: 0x0A0500, lineColor: 0xAA7744, textColor: '#AA7744', name: 'RYŌIKI TENKAI — SHŌKEI GAICHU' },
        };
        const theme = DOMAIN_THEMES[charKey] || DOMAIN_THEMES.SUKUNA;

        const voiceKey = theme.voice;
        const signKey = theme.sign;
        const bgColor = theme.bg;

        // Reproduce el audio INMEDIATAMENTE en la Fase 1
        try {
            let specialVol = ((window.gameSettings?.sfx ?? 50) / 100) * 2.0;
            if (this.currentDomainVoice) this.currentDomainVoice.stop();
            this.currentDomainVoice = this.sound.add(voiceKey, { volume: specialVol });
            this.currentDomainVoice.play();
        } catch(e) { console.warn("Error playing domain voice", e); }

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

        // Mask shape for portrait
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

        // Sign image (Portrait)
        const startX = isP1 ? -400 : GAME_WIDTH + 400;
        this.domainPortrait = this.add.image(
            startX, GAME_HEIGHT / 2, signKey
        ).setDepth(51).setOrigin(0.5);

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
        
        const lineColor = theme.lineColor;
        
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
        const domainName = theme.name;
        const textX = GAME_WIDTH / 2 - perpX * (halfW + 50);
        const textY = GAME_HEIGHT / 2 - perpY * (halfW + 50);
        
        this.domainText = this.add.text(textX, textY, domainName, {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: theme.textColor,
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
        
        this._domainMaskGraphics = maskGraphics;

        // ── AFTER 3 SECONDS: Phase1 → Phase2 (Real Domain activates) ──
        this.domainPhase1Timer = this.time.delayedCall(3000, () => {
            if (!this.domainPhase1) return; // Was cancelled by a domain clash
            
            this.domainPhase1 = false;
            this.domainActive = true;
            
            // NOW Unlock the caster!
            owner.stateMachine.unlock();
            
            // Freeze the opponent ONLY if it's Gojo's Domain (Sukuna's allows movement)
            const opp = (owner === this.p1) ? this.p2 : this.p1;
            if (charKey === 'GOJO') {
                opp.stateMachine.unlock();
                opp.stateMachine.lock(99999);
                opp.sprite.body.setVelocity(0, 0);
            }
            
            // Enable CE drain
            owner.ceSystem.isDomainActive = true;
            this.sureHitTimer = 0;

            // Fade out the lines
            if (this.domainLines) {
                this.tweens.add({
                    targets: this.domainLines, alpha: 0, duration: 400,
                    onComplete: () => { this.domainLines.destroy(); this.domainLines = null; }
                });
            }

            // Domain Background
            const bgKey = owner.charData.domainBg;
            if (bgKey && this.textures.exists(bgKey)) {
                this.domainBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
                    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                    .setDepth(-5);
                this.domainBg.setAlpha(0);
                this.tweens.add({ targets: this.domainBg, alpha: 1, duration: 800 });
            }

            // Clean up portrait and overlay after 3 seconds of showing off
            this.time.delayedCall(3000, () => {
                const fadeTargets = [this.domainOverlay, this.domainPortrait, this.domainText].filter(Boolean);
                if (fadeTargets.length > 0) {
                    this.tweens.add({
                        targets: fadeTargets, alpha: 0, duration: 800, ease: 'Power2',
                        onComplete: () => {
                            if (this.domainOverlay) { this.domainOverlay.destroy(); this.domainOverlay = null; }
                            if (this.domainPortrait) { this.domainPortrait.destroy(); this.domainPortrait = null; }
                            if (this.domainText) { this.domainText.destroy(); this.domainText = null; }
                        }
                    });
                }
            });

            // ── Domain ends when the voice finishes ──
            const endDomain = () => {
                if (!this.domainActive) return;
                owner.ceSystem.ce = 0;
                owner.ceSystem.endDomain();
                this.onDomainEnd(owner);
            };

            if (this.currentDomainVoice && this.currentDomainVoice.isPlaying) {
                this.currentDomainVoice.once('complete', endDomain);
                // Fallback max wait
                const maxWait = owner.charData.stats.domainDuration + 5000;
                this.domainTimeout = this.time.delayedCall(maxWait, endDomain);
            } else {
                const fallback = owner.charData.stats.domainDuration || 15000;
                this.domainTimeout = this.time.delayedCall(fallback, endDomain);
            }
        });
    }

    attemptDomainClash(triggeringPlayer) {
        // Domain Clash ONLY during Phase 1 (the 3-second cinematic window)
        if (!this.domainPhase1 || !this.domainOwner) return false;
        
        console.log("DOMAIN CLASH TRIGGERED!");
        
        // 1. Stop current domain progression
        try { this.sound.stopAll(); } catch(e) {}
        if (this.domainPhase1Timer) { this.domainPhase1Timer.remove(); }
        if (this.currentDomainVoice) {
            try { this.currentDomainVoice.stop(); } catch(e) {}
        }
        
        // 2. Clean up existing Phase 1 visuals before launching clash
        if (this.domainOverlay) { this.domainOverlay.destroy(); this.domainOverlay = null; }
        if (this.domainPortrait) { this.domainPortrait.destroy(); this.domainPortrait = null; }
        if (this.domainText) { this.domainText.destroy(); this.domainText = null; }
        if (this.domainLines) { this.domainLines.destroy(); this.domainLines = null; }
        if (this._domainMaskGraphics) { this._domainMaskGraphics.destroy(); this._domainMaskGraphics = null; }
        
        // 3. Unlock the original caster so they're not frozen
        if (this.domainOwner) {
            this.domainOwner.stateMachine.unlock();
        }
        
        // 4. Store who triggered the clash (to know domain types)
        this.clashTriggerPlayer = triggeringPlayer;
        
        // 5. Pause physics and launch clash scene
        this.physics.pause();
        this.scene.pause();
        
        this.scene.launch('DomainClashScene', {
            p1: this.p1,
            p2: this.p2,
            p1Key: this.p1Key,
            p2Key: this.p2Key,
            callback: (winnerId) => this.resolveDomainClash(winnerId)
        });
        
        return true;
    }

    resolveDomainClash(winnerId) {
        this.scene.resume();
        this.physics.resume();
        
        const winner = (winnerId === 'P1') ? this.p1 : this.p2;
        const loser = (winnerId === 'P1') ? this.p2 : this.p1;
        const winnerKey = (winnerId === 'P1') ? this.p1Key : this.p2Key;

        // ── Clean up any leftover domain state ──
        this.domainActive = false;
        this.domainPhase1 = false;
        this.domainOwner = null;
        if (this.domainBg) { this.domainBg.destroy(); this.domainBg = null; }

        // ── LOSER: Loses all CE, enters fatigue, NO extra stun/damage ──
        loser.domainActive = false;
        loser.ceSystem.ce = 0;
        loser.ceSystem.isDomainActive = false;
        loser.ceSystem.isFatigued = true;
        loser.ceSystem.fatigueTimer = DOMAIN.FATIGUE_DURATION;
        loser.stateMachine.unlock();
        loser.stateMachine.setState('idle');

        // ── WINNER: Activates their domain directly (without re-spending CE) ──
        winner.domainActive = true;
        winner.ceSystem.isDomainActive = true;

        // Activate the winner's domain cinematic through the normal flow
        this.onDomainActivated(winner, winnerKey);
    }

    cancelDomain(owner) {
        if (!this.domainPhase1 || this.domainOwner !== owner) return;
        console.log("DOMAIN CANCELED!");
        
        // Remove timer
        if (this.domainPhase1Timer) {
            this.domainPhase1Timer.remove();
        }

        // Cleanup audio
        if (this.currentDomainVoice) {
            this.currentDomainVoice.stop();
        }
        
        // Clean up UI precisely
        this.onDomainEnd(owner);
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

        // FORCE-UNLOCK the domain owner (caster) — was locked during Phase 1
        if (owner && !owner.isDead) {
            owner.isCasting = false;
            owner.stateMachine.unlock();
            owner.stateMachine.setState('idle');
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

        // Clean up any remaining active projectiles immediately
        if (this.projectiles && this.projectiles.length > 0) {
            this.projectiles.forEach(p => {
                if (p.isAlive()) p.destroy();
            });
            this.projectiles = [];
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
                // Small projectiles bounce off Infinity
                const bigTypes = ['fire_arrow', 'beam', 'uzumaki', 'worm'];
                if (target.infinityActive && !bigTypes.includes(p.type)) {
                    // Reflect the projectile back
                    p.direction *= -1;
                    p.sprite.body.setVelocityX(p.speed * p.direction);
                    p.owner = target; // Now it belongs to the reflector
                    if (this.screenEffects) this.screenEffects.shake(0.003, 80);
                    return true;
                }
                p.onHit(target);
                return p.isAlive();
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
