// ========================================================
// GameScene — Escena principal de combate
// ========================================================

import Phaser from 'phaser';
import Gojo from '../entities/fighters/Gojo.js';
import Sukuna from '../entities/fighters/Sukuna.js';
import HUD from '../ui/HUD.js';
import DamageNumbers from '../ui/DamageNumbers.js';
import ScreenEffects from '../ui/ScreenEffects.js';
import AIManager from '../systems/AIManager.js';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from '../config.js';

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
        this.add.tileSprite(0, floorY, GAME_WIDTH, 60, 'ground_texture').setOrigin(0).setDepth(0);
        
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
        return new Gojo(this, x, y, index);
    }

    // ════════════════════════════════════════════════════════
    // DOMAIN EXPANSION — Audio-Driven Portrait Cinematic
    // ════════════════════════════════════════════════════════

    onDomainActivated(owner, domainType) {
        if (this.domainActive || this.domainPhase1) return;
        
        // ── Phase 1: Cinematic Immobilization ──
        this.domainPhase1 = true;
        this.domainOwner = owner;
        const opp = (owner === this.p1) ? this.p2 : this.p1;
        
        // Force-unlock state machines
        owner.stateMachine.unlock();
        opp.stateMachine.unlock();
        
        // Freeze both players
        owner.stateMachine.setState('casting_domain');
        opp.stateMachine.setState('domain_stunned');
        owner.sprite.body.setVelocity(0, 0);
        opp.sprite.body.setVelocity(0, 0);

        // Pause CE drain during Phase 1
        owner.ceSystem.isDomainActive = false;

        // Stop BGM to let Domain Voice shine
        try {
            this.sound.stopAll();
        } catch(e) {}

        const charKey = (owner === this.p1) ? this.p1Key : this.p2Key;
        const voiceKey = (charKey === 'GOJO') ? 'gojo_domain_voice' : 'sukuna_domain_voice';
        const portraitKey = (charKey === 'GOJO') ? 'portrait_gojo' : 'portrait_sukuna';
        const tintColor = (charKey === 'GOJO') ? 0x44CCFF : 0xFF2200;

        // ── DIAGONAL PARALLEL LINES CINEMATIC ──
        // Direction: P1 = bottom-left to top-right, P2 = bottom-right to top-left
        const isP1 = (owner === this.p1);
        const angle = isP1 ? -35 : 35; // Degrees of diagonal tilt
        const angleRad = angle * (Math.PI / 180);
        const stripWidth = 280; // Width of visible strip between the two lines

        // 1. Black overlay
        this.domainOverlay = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, 
            GAME_WIDTH, GAME_HEIGHT, 
            0x000000, 0
        ).setDepth(50).setOrigin(0.5);

        this.tweens.add({
            targets: this.domainOverlay,
            alpha: 0.95,
            duration: 800,
            ease: 'Power2',
        });

        // 2. Create a mask shape — a diagonal strip between two parallel lines
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff, 1);
        
        // Calculate the four corners of the diagonal strip
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const diagLen = GAME_WIDTH * 2; // Long enough to cover the whole screen
        const halfW = stripWidth / 2;
        
        // Direction perpendicular to the strip
        const perpX = Math.cos(angleRad + Math.PI / 2);
        const perpY = Math.sin(angleRad + Math.PI / 2);
        // Direction along the strip
        const paraX = Math.cos(angleRad);
        const paraY = Math.sin(angleRad);

        // Four corners of the strip
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

        // 3. Portrait image — masked to only show inside the diagonal strip
        const startX = isP1 ? -400 : GAME_WIDTH + 400;
        this.domainPortrait = this.add.image(
            startX, GAME_HEIGHT / 2, portraitKey
        ).setDepth(51).setOrigin(0.5);

        // Scale to fill the strip area
        const imgScale = Math.max(GAME_WIDTH / this.domainPortrait.width, GAME_HEIGHT / this.domainPortrait.height) * 0.8;
        this.domainPortrait.setScale(imgScale);
        this.domainPortrait.setTint(tintColor);
        this.domainPortrait.setMask(mask);

        // Sweep portrait into view
        this.tweens.add({
            targets: this.domainPortrait,
            x: GAME_WIDTH / 2,
            duration: 1500,
            ease: 'Power2',
        });

        // Subtle pulse
        this.tweens.add({
            targets: this.domainPortrait,
            scaleX: imgScale * 1.03,
            scaleY: imgScale * 1.03,
            yoyo: true,
            repeat: -1,
            duration: 2500,
            ease: 'Sine.easeInOut',
        });

        // 4. Draw the two parallel diagonal lines (thick, glowing)
        this.domainLines = this.add.graphics();
        this.domainLines.setDepth(52);
        
        const lineColor = (charKey === 'GOJO') ? 0x44CCFF : 0xFF2200;
        
        // Top parallel line
        this.domainLines.lineStyle(6, lineColor, 0.9);
        this.domainLines.beginPath();
        this.domainLines.moveTo(p1x, p1y);
        this.domainLines.lineTo(p2x, p2y);
        this.domainLines.strokePath();
        
        // Bottom parallel line
        this.domainLines.beginPath();
        this.domainLines.moveTo(p4x, p4y);
        this.domainLines.lineTo(p3x, p3y);
        this.domainLines.strokePath();

        // Glow effect on lines
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

        // 5. Domain name text — TILTED at the same angle, below the strip
        const domainName = (charKey === 'GOJO') ? 'RYŌIKI TENKAI — MURYŌKŪSHŌ' : 'RYŌIKI TENKAI — FUKUMA MIZUSHI';
        
        // Position text below the bottom parallel line
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
        
        // Rotate text to match the diagonal angle
        this.domainText.setRotation(angleRad);

        this.tweens.add({
            targets: this.domainText,
            alpha: 1,
            duration: 1200,
            delay: 800,
        });

        // Store mask reference for cleanup
        this._domainMask = mask;
        this._domainMaskGraphics = maskGraphics;

        // 6. AUDIO-DRIVEN: Listen for voice line completion
        try {
            const domainVoice = this.sound.add(voiceKey, {
                volume: (window.gameSettings?.sfx || 50) / 100
            });

            domainVoice.once('complete', () => {
                this.transitionToPhase2(owner, domainType);
            });

            domainVoice.play();

            // Safety fallback
            const maxWait = (owner.charData.stats.domainPhase1 || 20000) + 3000;
            this.time.delayedCall(maxWait, () => {
                if (this.domainPhase1) {
                    this.transitionToPhase2(owner, domainType);
                }
            });

        } catch (e) {
            const fallback = owner.charData.stats.domainPhase1 || 10000;
            this.time.delayedCall(fallback, () => {
                this.transitionToPhase2(owner, domainType);
            });
        }
    }

    transitionToPhase2(owner, domainType) {
        if (!this.domainPhase1) return; // Already transitioned
        this.domainPhase1 = false;
        this.domainActive = true;
        const opp = (owner === this.p1) ? this.p2 : this.p1;

        // Re-enable CE drain for combat phase
        owner.ceSystem.isDomainActive = true;

        // Clean up ALL cinematic elements
        if (this.domainOverlay) { this.domainOverlay.destroy(); this.domainOverlay = null; }
        if (this.domainPortrait) { this.domainPortrait.destroy(); this.domainPortrait = null; }
        if (this.domainText) { this.domainText.destroy(); this.domainText = null; }
        if (this.domainLines) { this.domainLines.destroy(); this.domainLines = null; }
        if (this._domainMaskGraphics) { this._domainMaskGraphics.destroy(); this._domainMaskGraphics = null; }

        // Restore visual layers
        owner.sprite.clearTint();
        owner.sprite.setDepth(10);
        if (owner.graphics) owner.graphics.setDepth(10);
        if (owner.auraGraphics) owner.auraGraphics.setDepth(9);

        // Force-unlock and restore mobility
        owner.stateMachine.unlock();
        opp.stateMachine.unlock();
        if (owner.stateMachine.is('casting_domain')) {
            owner.stateMachine.setState('idle');
        }
        if (opp.stateMachine.is('domain_stunned')) {
            opp.stateMachine.setState('idle');
        }

        // Defer background creation and BGM to allow canvas GC to clear phase 1 visuals without freezing
        this.time.delayedCall(50, () => {
            if (this.domainBg) this.domainBg.destroy();
            
            // Reveal Domain Background image
            const bgKey = owner.charData.domainBg;
            this.domainBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(-5);
                
            if (this.screenEffects) {
                this.screenEffects.shake(0.04, 800);
            }

            // Reset sure-hit timer for Phase 2
            this.sureHitTimer = 0;

            // Resume combat BGM
            try {
                this.sound.play('bgm_combat', { volume: 0.3, loop: true });
            } catch(e) {}
        });
    }

    onDomainEnd(owner) {
        this.domainActive = false;
        this.domainPhase1 = false;
        
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
        
        // Stop all audio and resume combat BGM
        try {
            this.sound.stopAll();
            this.sound.play('bgm_combat', { volume: 0.4, loop: true });
        } catch(e) { console.warn('Audio resume error', e); }
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

        // Stop all sounds, play game over
        this.sound.stopAll();
        try {
            this.sound.play('bgm_gameover', { volume: 0.5, loop: false });
        } catch(e) {}

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
