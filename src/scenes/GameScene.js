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
        if (this.sound.get('bgm_combat')) {
            if (!this.sound.get('bgm_combat').isPlaying) {
                this.sound.stopAll();
                this.sound.play('bgm_combat', { volume: 0.4, loop: true });
            }
        }
        
        
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
        this.domainOwner = null;
        this.domainBg = null;

        // ── Pause Menu ──
        this.input.keyboard.on('keydown-ESC', () => {
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

    onDomainActivated(owner, domainType) {
        if (this.domainActive || this.domainPhase1) return;
        
        // ── Phase 1: Cinematic Immobilization ──
        this.domainPhase1 = true;
        this.domainOwner = owner;
        const opp = owner === this.p1 ? this.p2 : this.p1;
        
        // Pause combat mechanics but keep update loop running
        owner.stateMachine.setState('casting_domain');
        opp.stateMachine.setState('domain_stunned');
        opp.sprite.body.setVelocity(0, 0);

        // Stop BGM to let Domain Voice shine
        if(this.sound.get('bgm_combat')) this.sound.get('bgm_combat').pause();

        const p1Dur = owner.charData.stats.domainPhase1 || 10000;
        
        // Elevate owner above flash
        owner.sprite.setDepth(51);
        
        if (owner.fighterId === 'GOJO') {
            // White Flashbang
            this.domainFlash = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH*2, GAME_HEIGHT*2, 0xffffff, 0);
            this.domainFlash.setDepth(50);
            this.tweens.add({ targets: this.domainFlash, alpha: 1, duration: p1Dur, ease: 'Quad.easeIn' });
            
            // Gojo blue glow
            owner.sprite.setTint(0x88ccff);
        } else {
            // Black Expanding Circle
            this.domainFlash = this.add.circle(owner.sprite.x, owner.sprite.y, 10, 0x000000, 1);
            this.domainFlash.setDepth(50);
            this.tweens.add({ targets: this.domainFlash, scale: 200, duration: p1Dur, ease: 'Quad.easeIn' });
            
            // Sukuna red glow
            owner.sprite.setTint(0xff4444);
        }

        // Wait for Phase 1 to end -> Enter Phase 2
        this.time.delayedCall(p1Dur, () => {
            this.enterDomainPhase2(owner, domainType);
        });
    }

    enterDomainPhase2(owner, domainType) {
        this.domainPhase1 = false;
        this.domainActive = true;
        const opp = owner === this.p1 ? this.p2 : this.p1;

        // Restore mobility
        owner.sprite.clearTint();
        owner.sprite.setDepth(10); // Normal depth
        if(owner.stateMachine.is('casting_domain')) owner.stateMachine.setState('idle');
        if(opp.stateMachine.is('domain_stunned')) opp.stateMachine.setState('idle');

        // Reveal Domain Background
        if (this.domainFlash) {
            this.domainFlash.destroy();
            this.domainFlash = null;
        }

        const bgKey = owner.charData.domainBg;
        if (this.domainBg) this.domainBg.destroy();
        this.domainBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-5);
            
        this.screenEffects.shake(0.04, 800);
    }

    onDomainEnd(owner) {
        this.domainActive = false;
        if (this.domainBg) this.domainBg.destroy();
        this.domainBg = null;
        
        // Resume combat BGM if domain ended
        if(this.sound.get('bgm_combat') && !this.sound.get('bgm_combat').isPlaying) {
            this.sound.get('bgm_combat').resume();
        }
    }

    onKnockout(winner, loser) {
        if (this.matchEnded) return;
        this.matchEnded = true;

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

            const retryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'PRESA [ENTER] PARA REVANCHA', {
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
                this.scene.restart();
            });
            this.input.keyboard.once('keydown-ESC', () => {
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
        
        // Reload scene after delay
        this.time.delayedCall(3000, () => {
            this.scene.restart();
        });
    }

    spawnDamageNumber(x, y, amount) {
        this.damageNumbers.spawn(x, y, amount);
    }

    update(time, delta) {
        if (!this.p1 || !this.p2) return;
        
        // Game Over Condition Check
        if (this.p1.hp <= 0 || this.p2.hp <= 0) {
            if (this.p1.hp <= 0 && this.p1.stateMachine.state !== 'dead') {
                this.p1.hp = 0;
                this.p1.stateMachine.setState('dead');
                this.onKnockout(this.p2, this.p1);
            }
            if (this.p2.hp <= 0 && this.p2.stateMachine.state !== 'dead') {
                this.p2.hp = 0;
                this.p2.stateMachine.setState('dead');
                this.onKnockout(this.p1, this.p2);
            }
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

        // Sure-Hit Ticks
        if (this.domainActive && this.domainOwner) {
            if (this.sureHitTimer === undefined) this.sureHitTimer = 0;
            this.sureHitTimer += delta;
            
            // Check if accumulated lag caused multiple ticks to pass
            while (this.sureHitTimer >= 500 && this.domainActive) {
                this.sureHitTimer -= 500;
                this.domainOwner.applySureHitTick(this.domainOwner === this.p1 ? this.p2 : this.p1);
            }
        }
    }
}
