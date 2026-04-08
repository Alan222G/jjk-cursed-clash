import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
        
        // Pause all ongoing BGM
        try { this.sound.pauseAll(); } catch(e) {}
        
        // Play Pause Music
        try {
            this.sound.play('musica_pausa', { volume: (window.gameSettings?.music ?? 50) / 100 * 0.6, loop: true });
        } catch(e) { console.warn('Pause music error', e); }

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Big Main Panel
        const panelW = 900;
        const panelH = 500;
        const py = cy + 20;
        
        const g = this.add.graphics().setDepth(5);
        g.fillStyle(0x0A0A14, 0.95);
        g.fillRoundedRect(cx - panelW/2, py - panelH/2, panelW, panelH, 12);
        g.lineStyle(3, 0xD4A843, 0.8); // Golden border
        g.strokeRoundedRect(cx - panelW/2, py - panelH/2, panelW, panelH, 12);

        // Header
        this.add.text(cx, py - panelH/2 - 40, 'PAUSA', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '56px',
            color: '#FFFFFF',
            stroke: '#D4A843',
            strokeThickness: 6,
            letterSpacing: 4
        }).setOrigin(0.5).setDepth(6);

        // ════════════════════════════════════════════
        // SECTION: SETTINGS (Top Half)
        // ════════════════════════════════════════════
        const setY = py - panelH/2 + 50;

        this.add.text(cx, setY, '— AJUSTES DE AUDIO —', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#8888AA', letterSpacing: 2
        }).setOrigin(0.5).setDepth(6);

        let sliderY = setY + 50;
        // Music
        this.add.text(cx - 50, sliderY, 'MÚSICA:', { fontFamily: 'Arial Black', fontSize: '20px', color: '#FFF' }).setOrigin(1, 0.5).setDepth(6);
        this.musicText = this.add.text(cx + 170, sliderY, `${window.gameSettings.music ?? 50}%`, { fontFamily: 'Arial Black', fontSize: '20px', color: '#D4A843' }).setOrigin(0, 0.5).setDepth(6);
        this.createSlider(cx - 30, sliderY, 'music');

        sliderY += 50;
        // SFX
        this.add.text(cx - 50, sliderY, 'EFECTOS:', { fontFamily: 'Arial Black', fontSize: '20px', color: '#FFF' }).setOrigin(1, 0.5).setDepth(6);
        this.sfxText = this.add.text(cx + 170, sliderY, `${window.gameSettings.sfx ?? 50}%`, { fontFamily: 'Arial Black', fontSize: '20px', color: '#D4A843' }).setOrigin(0, 0.5).setDepth(6);
        this.createSlider(cx - 30, sliderY, 'sfx');

        // Divider
        g.lineStyle(1, 0x444466, 0.5);
        g.lineBetween(cx - panelW/2 + 40, sliderY + 40, cx + panelW/2 - 40, sliderY + 40);

        // ════════════════════════════════════════════
        // SECTION: CONTROLS (Bottom Half)
        // ════════════════════════════════════════════
        const ctrlY = sliderY + 70;

        this.add.text(cx, ctrlY, '— CONTROLES DE COMBATE —', {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#8888AA', letterSpacing: 2
        }).setOrigin(0.5).setDepth(6);

        const listY = ctrlY + 40;
        const lh = 18; // Line height
        
        const p1X = cx - 220;
        const p2X = cx + 220;

        this.add.text(p1X, listY, 'JUGADOR 1', { fontFamily: 'Arial Black', fontSize: '16px', color: '#4488FF' }).setOrigin(0.5).setDepth(6);
        this.add.text(p2X, listY, 'JUGADOR 2', { fontFamily: 'Arial Black', fontSize: '16px', color: '#FF4444' }).setOrigin(0.5).setDepth(6);

        const controlSections = [
            {
                title: 'MOVIMIENTO',
                p1: ['A / D — Caminar', 'W — Saltar', 'S — Agacharse'],
                p2: ['← / → — Caminar', '↑ — Saltar', '↓ — Agacharse']
            },
            {
                title: 'GOLPES BÁSICOS',
                p1: ['J — Golpe Ligero', 'K — Golpe Medio', 'L — Golpe Fuerte'],
                p2: ['Num1 — Ligero', 'Num2 — Medio', 'Num3 — Fuerte']
            },
            {
                title: 'HABILIDADES DEFINITIVAS',
                p1: ['U — Especial  |  U+Dir — Variante', 'Shift — Bloquear  |  Shift+S — INFINTIY'],
                p2: ['Num4 — Especial  |  Num4+Dir', 'Num0 — Bloquear']
            },
            {
                title: 'DOMINIO EXPANDIDO',
                p1: ['I — ACTIVAR DOMINIO'],
                p2: ['Num5 — ACTIVAR DOMINIO']
            }
        ];

        let currentY = listY + 20;

        controlSections.forEach(section => {
            // Category Title
            this.add.text(cx, currentY, section.title, {
                fontFamily: 'Arial Black', fontSize: '13px', color: '#D4A843'
            }).setOrigin(0.5).setDepth(6);
            
            currentY += 20;
            
            // P1 Lines
            section.p1.forEach((line, idx) => {
                this.add.text(p1X, currentY + idx * lh, line, {
                    fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#AACCFF',
                }).setOrigin(0.5).setDepth(6);
            });
            
            // P2 Lines
            section.p2.forEach((line, idx) => {
                this.add.text(p2X, currentY + idx * lh, line, {
                    fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#FFAACC',
                }).setOrigin(0.5).setDepth(6);
            });
            
            // Increment Y based on max lines in section
            const maxLines = Math.max(section.p1.length, section.p2.length);
            currentY += (maxLines * lh) + 15; // spacing below section
        });

        // ════════════════════════════════════════════
        // SECTION: BUTTONS (Below Panel)
        // ════════════════════════════════════════════
        const btnY = py + panelH/2 + 50;

        this.createMenuButton(cx - 200, btnY, 'REANUDAR', () => {
            this.sound.stopByKey('musica_pausa');
            this.sound.resumeAll();
            
            const mainScene = this.scene.get('GameScene');
            if(mainScene) {
                mainScene.scene.resume();
                mainScene.physics.resume();
            }
            this.scene.stop();
        });

        this.createMenuButton(cx + 200, btnY, 'ABANDONAR PARTIDA', () => {
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
        const sliderW = 180;
        // Background track
        const bg = this.add.rectangle(x, y, sliderW, 14, 0x222233).setOrigin(0, 0.5).setDepth(6);
        bg.setStrokeStyle(2, 0x444455);
        // Fill track
        const fillW = (currentVal / 100) * sliderW;
        const fill = this.add.rectangle(x, y, fillW, 14, 0xD4A843).setOrigin(0, 0.5).setDepth(7);
        // Knob
        const knob = this.add.circle(x + fillW, y, 12, 0xFFFFFF).setInteractive({ useHandCursor: true }).setDepth(8);
        knob.setStrokeStyle(3, 0x886611);

        this.input.setDraggable(knob);

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject !== knob) return;
            const newX = Phaser.Math.Clamp(dragX, x, x + sliderW);
            knob.x = newX;
            const percentage = (newX - x) / sliderW;
            fill.width = percentage * sliderW;
            const val = Math.round(percentage * 100);
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
        const container = this.add.container(x, y).setDepth(10);
        const btnW = 340;
        const btnH = 60;

        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.9);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 10);
        bg.lineStyle(3, 0xD4A843, 0.8);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 10);
        container.add(bg);

        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
            letterSpacing: 2,
        }).setOrigin(0.5);
        container.add(text);

        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerover', () => {
            text.setColor('#FFD700');
            bg.clear();
            bg.fillStyle(0x4A2288, 0.9); // Highlight color
            bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 10);
            bg.lineStyle(4, 0xFFE066, 1);
            bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 10);
        });

        zone.on('pointerout', () => {
            text.setColor('#FFFFFF');
            bg.clear();
            bg.fillStyle(0x1A1A2E, 0.9);
            bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 10);
            bg.lineStyle(3, 0xD4A843, 0.8);
            bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 10);
        });

        zone.on('pointerdown', callback);
        return container;
    }
}
