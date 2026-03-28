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
        const backBtn = this.add.text(cx, cy, 'VOLVER AL MENÚ', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#AAAAAA'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerover', () => backBtn.setColor('#FFFFFF'));
        backBtn.on('pointerout', () => backBtn.setColor('#AAAAAA'));
        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    createSlider(x, y, type) {
        const bg = this.add.rectangle(x, y, 100, 10, 0x444444).setOrigin(0, 0.5);
        const fill = this.add.rectangle(x, y, window.gameSettings[type], 10, 0xD4A843).setOrigin(0, 0.5);
        const knob = this.add.circle(x + window.gameSettings[type], y, 10, 0xFFFFFF).setInteractive({ useHandCursor: true });
        this.input.setDraggable(knob);

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject !== knob) return;
            const newX = Phaser.Math.Clamp(dragX, x, x + 100);
            knob.x = newX;
            const val = Math.round(newX - x);
            fill.width = val;
            window.gameSettings[type] = val;
            if (type === 'music') this.musicText.setText(`${val}%`);
            else this.sfxText.setText(`${val}%`);
            this.saveSettings();
        });
    }

    saveSettings() {
        localStorage.setItem('jjk_settings', JSON.stringify(window.gameSettings));
    }
}
