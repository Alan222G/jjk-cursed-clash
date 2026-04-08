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
        let cy = 80;

        this.add.text(cx, cy, 'PAUSA', {
            fontFamily: 'Arial Black',
            fontSize: '52px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        cy += 90;

        // Music Volume
        this.add.text(cx - 100, cy, 'Música:', { fontFamily: 'Arial', fontSize: '22px', color: '#FFF' }).setOrigin(1, 0.5);
        this.musicText = this.add.text(cx + 100, cy, `${window.gameSettings.music ?? 50}%`, { fontFamily: 'Arial', fontSize: '22px', color: '#FFF' }).setOrigin(0, 0.5);
        this.createSlider(cx + 200, cy, 'music');

        cy += 60;

        // SFX Volume
        this.add.text(cx - 100, cy, 'Efectos (SFX):', { fontFamily: 'Arial', fontSize: '22px', color: '#FFF' }).setOrigin(1, 0.5);
        this.sfxText = this.add.text(cx + 100, cy, `${window.gameSettings.sfx ?? 50}%`, { fontFamily: 'Arial', fontSize: '22px', color: '#FFF' }).setOrigin(0, 0.5);
        this.createSlider(cx + 200, cy, 'sfx');

        cy += 70;

        // ════════════════════════════════════════════
        // CONTROLS SECTION
        // ════════════════════════════════════════════
        this.drawControlsPanel(cx, cy);

        cy += 200;

        this.createMenuButton(cx, cy, 'REANUDAR', () => {
            this.sound.stopByKey('musica_pausa');
            this.sound.resumeAll();
            
            const mainScene = this.scene.get('GameScene');
            if(mainScene) {
                mainScene.scene.resume();
                mainScene.physics.resume();
            }
            this.scene.stop();
        });

        this.createMenuButton(cx, cy + 65, 'ABANDONAR PARTIDA', () => {
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

    drawControlsPanel(cx, startY) {
        const panelW = 700;
        const panelH = 170;
        const px = cx - panelW / 2;
        const py = startY;

        // Panel background
        const g = this.add.graphics().setDepth(5);
        g.fillStyle(0x0E0E1A, 0.9);
        g.fillRoundedRect(px, py, panelW, panelH, 8);
        g.lineStyle(2, 0xD4A843, 0.4);
        g.strokeRoundedRect(px, py, panelW, panelH, 8);

        // Title
        this.add.text(cx, py + 18, '⌨ CONTROLES', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '16px',
            color: '#D4A843',
        }).setOrigin(0.5).setDepth(6);

        // Separator
        g.lineStyle(1, 0xD4A843, 0.3);
        g.lineBetween(px + 20, py + 34, px + panelW - 20, py + 34);

        // P1 Controls (left column)
        const p1X = px + 30;
        const p2X = px + panelW / 2 + 20;
        let ly = py + 45;
        const lh = 17;

        this.add.text(p1X, ly, 'JUGADOR 1', {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#4488FF',
        }).setDepth(6);
        this.add.text(p2X, ly, 'JUGADOR 2', {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#FF4444',
        }).setDepth(6);

        ly += lh + 4;

        const p1Controls = [
            'A / D — Mover',
            'W — Saltar  |  S — Agachar',
            'J — Golpe Ligero  |  K — Medio  |  L — Fuerte',
            'U — Especial  |  U+Dir — Variante',
            'I — Dominio  |  Shift — Bloquear',
            'ESC — Pausar',
        ];

        const p2Controls = [
            '← / → — Mover',
            '↑ — Saltar  |  ↓ — Agachar',
            'Num1 — Ligero  |  Num2 — Medio  |  Num3 — Fuerte',
            'Num4 — Especial  |  Num4+Dir — Variante',
            'Num5 — Dominio  |  Num0 — Bloquear',
            'ESC — Pausar',
        ];

        p1Controls.forEach((line, i) => {
            this.add.text(p1X, ly + i * lh, line, {
                fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#8899BB',
            }).setDepth(6);
        });

        p2Controls.forEach((line, i) => {
            this.add.text(p2X, ly + i * lh, line, {
                fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#BB8899',
            }).setDepth(6);
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
                const pauseMusic = this.sound.get('musica_pausa');
                if (pauseMusic) pauseMusic.setVolume((val / 100) * 0.6);
            } else {
                this.sfxText.setText(`${val}%`);
            }
            this.saveSettings();
        });

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

        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.8);
        bg.fillRoundedRect(-160, -25, 320, 50, 8);
        bg.lineStyle(2, 0xD4A843, 0.6);
        bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        container.add(bg);

        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '24px',
            color: '#CCCCDD',
            letterSpacing: 4,
        }).setOrigin(0.5);
        container.add(text);

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
