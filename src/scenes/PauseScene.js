import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
        
        // Pause all ongoing BGM (like DEATHMATCH combat bgm)
        try { this.sound.pauseAll(); } catch(e) {}
        
        // Play Pause Music
        try {
            this.sound.play('musica_pausa', { volume: (window.gameSettings?.music ?? 50) / 100 * 0.6, loop: true });
        } catch(e) { console.warn('Pause music error', e); }

        const cx = GAME_WIDTH / 2;
        let cy = 100;

        this.add.text(cx, cy, 'PAUSA', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        cy += 120;

        // Music Volume
        this.add.text(cx - 100, cy, 'Música:', { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(1, 0.5);
        this.musicText = this.add.text(cx + 100, cy, `${window.gameSettings.music ?? 50}%`, { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(0, 0.5);
        this.createSlider(cx + 200, cy, 'music');

        cy += 80;

        // SFX Volume
        this.add.text(cx - 100, cy, 'Efectos (SFX):', { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(1, 0.5);
        this.sfxText = this.add.text(cx + 100, cy, `${window.gameSettings.sfx ?? 50}%`, { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(0, 0.5);
        this.createSlider(cx + 200, cy, 'sfx');

        cy += 120;

        this.createMenuButton(cx, cy, 'REANUDAR', () => {
            this.sound.stopByKey('musica_pausa');
            this.sound.resumeAll();
            
            const mainScene = this.scene.get('GameScene');
            if(mainScene) {
                // Apply visual settings back if changed?
                // Real-time sound changes were already applied inside createSlider
                mainScene.scene.resume();
                mainScene.physics.resume();
            }
            this.scene.stop();
        });

        this.createMenuButton(cx, cy + 80, 'ABANDONAR PARTIDA', () => {
            this.sound.stopAll();
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        });
        
        // Listen for ESC to resume
        this.input.keyboard.on('keydown-ESC', () => {
            this.sound.stopByKey('musica_pausa');
            this.sound.resumeAll();
            
            const mainScene = this.scene.get('GameScene');
            if(mainScene) {
                mainScene.scene.resume();
                mainScene.physics.resume();
            }
            this.scene.stop();
        });
    }

    createSlider(x, y, type) {
        let currentVal = window.gameSettings[type] ?? 50;
        const bg = this.add.rectangle(x, y, 100, 10, 0x444444).setOrigin(0, 0.5);
        const fill = this.add.rectangle(x, y, currentVal, 10, 0xD4A843).setOrigin(0, 0.5);
        const knob = this.add.circle(x + currentVal, y, 10, 0xFFFFFF).setInteractive({ useHandCursor: true });
        this.input.setDraggable(knob);

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject !== knob) return;
            const newX = Phaser.Math.Clamp(dragX, x, x + 100);
            knob.x = newX;
            const val = Math.round(newX - x);
            fill.width = val;
            window.gameSettings[type] = val;
            
            if (type === 'music') {
                this.musicText.setText(`${val}%`);
                // Update BGM specifically for Pause
                const pauseMusic = this.sound.get('musica_pausa');
                if (pauseMusic) pauseMusic.setVolume((val / 100) * 0.6);
            } else {
                this.sfxText.setText(`${val}%`);
            }
            this.saveSettings();
        });

        // Play test sound for SFX when drag ends
        this.input.on('dragend', (pointer, gameObject) => {
            if (gameObject === knob && type === 'sfx') {
                try {
                    let vol = (window.gameSettings.sfx ?? 50) / 100;
                    this.sound.play('sfx_slash', { volume: vol });
                } catch(e) {}
            }
        });
    }

    saveSettings() {
        localStorage.setItem('jjk_settings', JSON.stringify(window.gameSettings));
    }

    createMenuButton(x, y, label, callback) {
        const container = this.add.container(x, y).setDepth(5);

        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.8);
        bg.fillRoundedRect(-160, -25, 320, 50, 8);
        bg.lineStyle(2, 0xD4A843, 0.6);
        bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        container.add(bg);

        // Button text
        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '24px',
            color: '#CCCCDD',
            letterSpacing: 4,
        }).setOrigin(0.5);
        container.add(text);

        // Interactive zone
        const zone = this.add.zone(0, 0, 320, 50).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerover', () => {
            text.setColor('#FFFFFF');
            bg.clear();
            bg.fillStyle(0x7722CC, 0.4);
            bg.fillRoundedRect(-160, -25, 320, 50, 8);
            bg.lineStyle(2, 0xD4A843, 1);
            bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        });

        zone.on('pointerout', () => {
            text.setColor('#CCCCDD');
            bg.clear();
            bg.fillStyle(0x1A1A2E, 0.8);
            bg.fillRoundedRect(-160, -25, 320, 50, 8);
            bg.lineStyle(2, 0xD4A843, 0.6);
            bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        });

        zone.on('pointerdown', callback);

        return container;
    }
}
