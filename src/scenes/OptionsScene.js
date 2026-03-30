import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
    }

    create() {
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0A0A12).setOrigin(0);

        const cx = GAME_WIDTH / 2;
        let cy = 100;

        this.add.text(cx, cy, 'OPCIONES', {
            fontFamily: 'Arial Black',
            fontSize: '48px',
            color: '#D4A843'
        }).setOrigin(0.5);

        cy += 100;

        // Graphics Toggle
        this.add.text(cx - 100, cy, 'Calidad Gráfica:', { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(1, 0.5);
        this.gfxText = this.add.text(cx + 100, cy, window.gameSettings.graphics.toUpperCase(), { 
            fontFamily: 'Arial Black', fontSize: '24px', color: window.gameSettings.graphics === 'high' ? '#44FF44' : '#FF4444' 
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        
        this.gfxText.on('pointerdown', () => {
            window.gameSettings.graphics = window.gameSettings.graphics === 'high' ? 'low' : 'high';
            this.gfxText.setText(window.gameSettings.graphics.toUpperCase());
            this.gfxText.setColor(window.gameSettings.graphics === 'high' ? '#44FF44' : '#FF4444');
            this.saveSettings();
        });

        cy += 80;

        // Music Volume
        this.add.text(cx - 100, cy, 'Música:', { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(1, 0.5);
        this.musicText = this.add.text(cx + 100, cy, `${window.gameSettings.music}%`, { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(0, 0.5);
        this.createSlider(cx + 200, cy, 'music');

        cy += 80;

        // SFX Volume
        this.add.text(cx - 100, cy, 'Efectos (SFX):', { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(1, 0.5);
        this.sfxText = this.add.text(cx + 100, cy, `${window.gameSettings.sfx}%`, { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(0, 0.5);
        this.createSlider(cx + 200, cy, 'sfx');

        cy += 80;

        // P2 Control Toggle (AI vs Human)
        if (!window.gameSettings.p2Control) window.gameSettings.p2Control = 'cpu';
        this.add.text(cx - 100, cy, 'Control Jugador 2:', { fontFamily: 'Arial', fontSize: '24px', color: '#FFF' }).setOrigin(1, 0.5);
        this.p2CtrlText = this.add.text(cx + 100, cy, window.gameSettings.p2Control.toUpperCase(), { 
            fontFamily: 'Arial Black', fontSize: '24px', color: window.gameSettings.p2Control === 'cpu' ? '#D4A843' : '#44CCFF' 
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        
        this.p2CtrlText.on('pointerdown', () => {
            window.gameSettings.p2Control = window.gameSettings.p2Control === 'cpu' ? 'humano' : 'cpu';
            this.p2CtrlText.setText(window.gameSettings.p2Control.toUpperCase());
            this.p2CtrlText.setColor(window.gameSettings.p2Control === 'cpu' ? '#D4A843' : '#44CCFF');
            this.saveSettings();
        });

        cy += 120;

        // Back Button
        this.createMenuButton(cx, cy, 'VOLVER AL MENÚ', () => {
            this.scene.start('MenuScene');
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
                // Update currently playing BGM in real-time
                this.sound.sounds.forEach(snd => {
                    if (snd.key && snd.key.startsWith('bgm')) {
                        snd.setVolume((val / 100) * 0.5); // 0.5 is the base multiplier for menu BGM
                    }
                });
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
