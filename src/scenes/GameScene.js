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
        this.add.rectangle(0, floorY, GAME_WIDTH, 60, 0x2A2A35).setOrigin(0).setDepth(0);
        
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
    // DOMAIN EXPANSION — 2-Phase Cinematic System
    // ════════════════════════════════════════════════════════

    onDomainActivated(owner, domainType) {
        if (this.domainActive || this.domainPhase1) return;
        
        // ── Phase 1: Cinematic Immobilization ──
        this.domainPhase1 = true;
        this.domainOwner = owner;
        const opp = (owner === this.p1) ? this.p2 : this.p1;
        
        // CRITICAL: Force-unlock state machines to guarantee transitions
        owner.stateMachine.unlock();
        opp.stateMachine.unlock();
        
        // Freeze both players
        owner.stateMachine.setState('casting_domain');
        opp.stateMachine.setState('domain_stunned');
        owner.sprite.body.setVelocity(0, 0);
        opp.sprite.body.setVelocity(0, 0);

        // Pause CE drain during Phase 1 (only drain during Phase 2 combat)
        owner.ceSystem.isDomainActive = false;

        // Stop BGM to let Domain Voice shine
        try {
            const bgm = this.sound.get('bgm_combat');
            if (bgm && bgm.isPlaying) bgm.pause();
        } catch(e) { console.warn('Audio pause error', e); }

        // Phase 1 duration from character config
        const p1Dur = owner.charData.stats.domainPhase1 || 10000;
        
        // Elevate owner sprite above the flash overlay
        owner.sprite.setDepth(51);
        if (owner.graphics) owner.graphics.setDepth(51);
        if (owner.auraGraphics) owner.auraGraphics.setDepth(51);
        
        // Use the charKey stored on the fighter (uppercase: 'GOJO' or 'SUKUNA')
        const charKey = (owner === this.p1) ? this.p1Key : this.p2Key;
        
        if (charKey === 'GOJO') {
            // ── WHITE FLASHBANG (progressive) ──
            this.domainFlash = this.add.rectangle(
                GAME_WIDTH / 2, GAME_HEIGHT / 2, 
                GAME_WIDTH * 2, GAME_HEIGHT * 2, 
                0xffffff, 0
            );
            this.domainFlash.setDepth(50);
            this.tweens.add({ 
                targets: this.domainFlash, 
                alpha: 1, 
                duration: p1Dur, 
                ease: 'Quad.easeIn' 
            });
            // Gojo blue energy glow
            owner.sprite.setTint(0x88ccff);
        } else {
            // ── BLACK EXPANDING DARKNESS ──
            this.domainFlash = this.add.circle(
                owner.sprite.x, owner.sprite.y, 
                10, 0x000000, 1
            );
            this.domainFlash.setDepth(50);
            this.tweens.add({ 
                targets: this.domainFlash, 
                scale: 200, 
                duration: p1Dur, 
                ease: 'Quad.easeIn' 
            });
            // Sukuna red energy glow
            owner.sprite.setTint(0xff4444);
        }

        // Schedule Phase 2 transition
        this.time.delayedCall(p1Dur, () => {
            this.enterDomainPhase2(owner, domainType);
        });
    }

    enterDomainPhase2(owner, domainType) {
        this.domainPhase1 = false;
        this.domainActive = true;
        const opp = (owner === this.p1) ? this.p2 : this.p1;

        // Re-enable CE drain now for the combat phase
        owner.ceSystem.isDomainActive = true;

        // Restore visual layers
        owner.sprite.clearTint();
        owner.sprite.setDepth(10);
        if (owner.graphics) owner.graphics.setDepth(10);
        if (owner.auraGraphics) owner.auraGraphics.setDepth(9);

        // Force-unlock and restore mobility for both
        owner.stateMachine.unlock();
        opp.stateMachine.unlock();
        if (owner.stateMachine.is('casting_domain')) {
            owner.stateMachine.setState('idle');
        }
        if (opp.stateMachine.is('domain_stunned')) {
            opp.stateMachine.setState('idle');
        }

        // Destroy the flash overlay
        if (this.domainFlash) {
            this.domainFlash.destroy();
            this.domainFlash = null;
        }

        // Reveal Domain Background image
        const bgKey = owner.charData.domainBg;
        if (this.domainBg) this.domainBg.destroy();
        this.domainBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-5);
            
        if (this.screenEffects) {
            this.screenEffects.shake(0.04, 800);
        }

        // Reset sure-hit timer for Phase 2
        this.sureHitTimer = 0;
    }

    onDomainEnd(owner) {
        this.domainActive = false;
        this.domainPhase1 = false;
        
        if (this.domainFlash) {
            this.domainFlash.destroy();
            this.domainFlash = null;
        }
        if (this.domainBg) {
            this.domainBg.destroy();
            this.domainBg = null;
        }
        
        // Stop domain voice audio
        try {
            const gojoVoice = this.sound.get('gojo_domain_voice');
            if (gojoVoice && gojoVoice.isPlaying) gojoVoice.stop();
            const sukunaVoice = this.sound.get('sukuna_domain_voice');
            if (sukunaVoice && sukunaVoice.isPlaying) sukunaVoice.stop();
        } catch(e) {}
        
        // Resume combat BGM
        try {
            const bgm = this.sound.get('bgm_combat');
            if (bgm && !bgm.isPlaying) {
                bgm.resume();
            }
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
