// ========================================================
// CharSelectScene — Character selection grid (MK style)
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS, COLORS } from '../config.js';

// Map character key → menu avatar texture key
const MENU_KEY = {
    GOJO: 'menu_gojo',
    SUKUNA: 'menu_sukuna',
    TOJI: 'menu_toji',
    KENJAKU: 'menu_kenjaku',
};

// Iconic JJK titles for each character
const CHAR_TITLES = {
    GOJO: 'THE HONORED ONE',
    SUKUNA: 'KING OF CURSES',
    TOJI: 'THE SORCERER KILLER',
    KENJAKU: 'THE DISGRACED ONE',
};

export default class CharSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharSelectScene' });
    }

    create() {
        this.timer = 0;
        this.p1Selection = 'GOJO';
        this.p2Selection = 'SUKUNA';
        this.p1Confirmed = false;
        this.p2Confirmed = false;
        this.hoveredChar = null; // Track which slot the mouse is over

        const roster = Object.keys(CHARACTERS);

        // ── BGM Loop ──
        const targetVol = (window.gameSettings?.music ?? 50) / 100 * 0.5;
        const existingBgm = this.sound.get('bgm_select');

        if (existingBgm && existingBgm.isPlaying) {
            existingBgm.setVolume(targetVol);
        } else {
            this.sound.stopAll();
            try {
                this.sound.play('bgm_select', { volume: targetVol, loop: true });
            } catch(e) { console.warn('Select BGM error', e); }
        }

        // ── Background ──
        const bg = this.add.graphics();
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            const t = y / GAME_HEIGHT;
            const r = Math.floor(8 + t * 6);
            const g = Math.floor(8 + t * 4);
            const b = Math.floor(15 + t * 12);
            bg.fillStyle((r << 16) | (g << 8) | b, 1);
            bg.fillRect(0, y, GAME_WIDTH, 4);
        }

        // ── Title ──
        this.add.text(GAME_WIDTH / 2, 35, 'SELECT YOUR FIGHTER', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '36px',
            color: '#D4A843',
            stroke: '#000000',
            strokeThickness: 4,
            letterSpacing: 4,
        }).setOrigin(0.5).setDepth(5);

        // ── Gold separator ──
        const deco = this.add.graphics().setDepth(4);
        deco.lineStyle(2, COLORS.MENU_GOLD, 0.5);
        deco.lineBetween(100, 65, GAME_WIDTH - 100, 65);

        // ── BACK BUTTON (ESC / Click) ──
        this.createBackButton();

        // ── Character Grid (Center) ──
        this.gridGraphics = this.add.graphics().setDepth(5);
        this.slotSize = 120;
        this.gridX = GAME_WIDTH / 2 - (roster.length * this.slotSize) / 2;
        this.gridY = GAME_HEIGHT / 2 - 40;

        this.slots = [];
        this.slotImages = [];

        roster.forEach((key, i) => {
            const char = CHARACTERS[key];
            const sx = this.gridX + i * this.slotSize + this.slotSize / 2;
            const sy = this.gridY;

            this.slots.push({ key, char, x: sx, y: sy });

            // Clickable zone
            const zone = this.add.zone(sx, sy, this.slotSize - 10, this.slotSize - 10)
                .setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                if (!this.p1Confirmed) {
                    this.p1Selection = key;
                    this.p1Confirmed = true;
                } else if (!this.p2Confirmed) {
                    this.p2Selection = key;
                    this.p2Confirmed = true;
                }
            });

            // Hover for stats tooltip
            zone.on('pointerover', () => { this.hoveredChar = key; });
            zone.on('pointerout', () => { if (this.hoveredChar === key) this.hoveredChar = null; });

            // Portrait thumbnail inside the slot
            const texKey = MENU_KEY[key];
            if (texKey && this.textures.exists(texKey)) {
                const thumb = this.add.image(sx, sy, texKey)
                    .setDisplaySize(this.slotSize - 16, this.slotSize - 16)
                    .setDepth(5)
                    .setAlpha(0.9);
                this.slotImages.push({ key, img: thumb });
            }

            // Character name below slot
            this.add.text(sx, sy + this.slotSize / 2 - 20, char.name.split(' ')[0].toUpperCase(), {
                fontFamily: 'Arial Black, sans-serif',
                fontSize: '11px',
                color: '#AAAACC',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5).setDepth(6);
        });

        // ── P1 Selection Display (Left) ──
        this.add.text(160, 90, 'PLAYER 1', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '16px',
            color: '#AACCFF',
        }).setOrigin(0.5).setDepth(6);

        this.p1NameText = this.add.text(160, 115, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '22px',
            color: '#4488FF',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(7);

        this.p1TitleText = this.add.text(160, 140, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#6699CC',
            fontStyle: 'italic',
        }).setOrigin(0.5).setDepth(6);

        // ── P2 Selection Display (Right) ──
        this.add.text(GAME_WIDTH - 160, 90, 'PLAYER 2', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '16px',
            color: '#FFAACC',
        }).setOrigin(0.5).setDepth(6);

        this.p2NameText = this.add.text(GAME_WIDTH - 160, 115, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '22px',
            color: '#FF4444',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(7);

        this.p2TitleText = this.add.text(GAME_WIDTH - 160, 140, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#CC6699',
            fontStyle: 'italic',
        }).setOrigin(0.5).setDepth(6);

        // ── Stats Tooltip Panel (drawn dynamically) ──
        this.statsGraphics = this.add.graphics().setDepth(20);
        this.statsTexts = [];

        // ── Instructions ──
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 45,
            'P1: A/D + J  |  P2: ←/→ + Numpad 1  |  ESC: Volver', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#666688',
        }).setOrigin(0.5).setDepth(5);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 25, 'Pasa el cursor sobre un personaje para ver sus stats', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            color: '#555566',
        }).setOrigin(0.5).setDepth(5);

        // ── Ready Text ──
        this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '42px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        // ── Keyboard Controls ──
        this.p1KeyA = this.input.keyboard.addKey('A');
        this.p1KeyD = this.input.keyboard.addKey('D');
        this.p1Confirm = this.input.keyboard.addKey('J');

        this.p2KeyLeft = this.input.keyboard.addKey('LEFT');
        this.p2KeyRight = this.input.keyboard.addKey('RIGHT');
        this.p2Confirm = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE);

        // ESC to go back to menu
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.transitioning) {
                this.sound.stopAll();
                this.scene.start('MenuScene');
            }
        });

        this.transitioning = false;
        this._lastP1 = null;
        this._lastP2 = null;
    }

    createBackButton() {
        const container = this.add.container(70, 35).setDepth(10);

        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.8);
        bg.fillRoundedRect(-50, -16, 100, 32, 6);
        bg.lineStyle(2, 0xD4A843, 0.5);
        bg.strokeRoundedRect(-50, -16, 100, 32, 6);
        container.add(bg);

        const text = this.add.text(0, 0, '◀ VOLVER', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '13px',
            color: '#AAAACC',
        }).setOrigin(0.5);
        container.add(text);

        const zone = this.add.zone(0, 0, 100, 32).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerover', () => {
            text.setColor('#FFFFFF');
            bg.clear();
            bg.fillStyle(0x7722CC, 0.5);
            bg.fillRoundedRect(-50, -16, 100, 32, 6);
            bg.lineStyle(2, 0xD4A843, 1);
            bg.strokeRoundedRect(-50, -16, 100, 32, 6);
        });

        zone.on('pointerout', () => {
            text.setColor('#AAAACC');
            bg.clear();
            bg.fillStyle(0x1A1A2E, 0.8);
            bg.fillRoundedRect(-50, -16, 100, 32, 6);
            bg.lineStyle(2, 0xD4A843, 0.5);
            bg.strokeRoundedRect(-50, -16, 100, 32, 6);
        });

        zone.on('pointerdown', () => {
            if (!this.transitioning) {
                this.sound.stopAll();
                this.scene.start('MenuScene');
            }
        });
    }

    drawStatsTooltip(charKey) {
        // Clear previous
        this.statsGraphics.clear();
        this.statsTexts.forEach(t => t.destroy());
        this.statsTexts = [];

        if (!charKey) return;

        const char = CHARACTERS[charKey];
        const stats = char.stats;
        const skills = char.skills;
        const title = CHAR_TITLES[charKey] || char.title || '';

        // Panel position: below the grid
        const px = GAME_WIDTH / 2;
        const py = this.gridY + this.slotSize / 2 + 25;
        const pw = 580;
        const ph = 180;

        // Panel background
        this.statsGraphics.fillStyle(0x0A0A18, 0.92);
        this.statsGraphics.fillRoundedRect(px - pw/2, py, pw, ph, 10);
        this.statsGraphics.lineStyle(2, 0xD4A843, 0.7);
        this.statsGraphics.strokeRoundedRect(px - pw/2, py, pw, ph, 10);

        // Accent line
        const energyColor = char.colors?.energy || 0x7722CC;
        this.statsGraphics.lineStyle(3, energyColor, 0.8);
        this.statsGraphics.lineBetween(px - pw/2 + 15, py + 30, px + pw/2 - 15, py + 30);

        // Character name + title
        const nameT = this.add.text(px, py + 15, `${char.name}  —  "${title}"`, {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '16px',
            color: '#D4A843',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(21);
        this.statsTexts.push(nameT);

        // Stats left column
        const colL = px - pw/2 + 30;
        const colR = px + 20;
        let sy = py + 45;
        const lineH = 20;

        const statLines = [
            { label: 'HP', value: stats.maxHp, color: '#44CC66' },
            { label: 'Velocidad', value: stats.speed, color: '#44AAFF' },
            { label: 'Poder', value: `x${stats.power}`, color: '#FF6644' },
            { label: 'Defensa', value: `x${stats.defense}`, color: '#AAAAFF' },
            { label: 'CE Regen', value: `${stats.ceRegen}/s`, color: '#AA66FF' },
            { label: 'Salto', value: Math.abs(stats.jumpForce), color: '#66DDAA' },
        ];

        statLines.forEach((s, i) => {
            const row = i < 3 ? i : i - 3;
            const col = i < 3 ? colL : colR;
            const t = this.add.text(col, sy + row * lineH, `${s.label}: `, {
                fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#888899',
            }).setDepth(21);
            const v = this.add.text(col + 80, sy + row * lineH, `${s.value}`, {
                fontFamily: 'Arial Black, sans-serif', fontSize: '13px', color: s.color,
            }).setDepth(21);
            this.statsTexts.push(t, v);
        });

        // Skills section (right side)
        const skillY = sy + 70;
        const skillTitle = this.add.text(px - pw/2 + 30, skillY, '⚡ HABILIDADES', {
            fontFamily: 'Arial Black, sans-serif', fontSize: '12px', color: '#D4A843',
        }).setDepth(21);
        this.statsTexts.push(skillTitle);

        let skIdx = 0;
        if (skills.skill1) {
            const sk = this.add.text(px - pw/2 + 30, skillY + 18 + skIdx * 16,
                `U: ${skills.skill1.name} (${skills.skill1.cost} CE)`, {
                fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#AACCFF',
            }).setDepth(21);
            this.statsTexts.push(sk);
            skIdx++;
        }
        if (skills.skill2) {
            const sk = this.add.text(px - pw/2 + 30, skillY + 18 + skIdx * 16,
                `U+Dir: ${skills.skill2.name} (${skills.skill2.cost} CE)`, {
                fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#AACCFF',
            }).setDepth(21);
            this.statsTexts.push(sk);
            skIdx++;
        }
        if (skills.domain) {
            const sk = this.add.text(px - pw/2 + 300, skillY + 18,
                `I: ${skills.domain.name} (${skills.domain.cost} CE)`, {
                fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#FF8866',
            }).setDepth(21);
            this.statsTexts.push(sk);
        }
        if (skills.maximum) {
            const sk = this.add.text(px - pw/2 + 300, skillY + 34,
                `MAX: ${skills.maximum.name} (${skills.maximum.cost} CE)`, {
                fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#FFDD44',
            }).setDepth(21);
            this.statsTexts.push(sk);
        }
    }

    update(time, delta) {
        this.timer += delta;
        const roster = Object.keys(CHARACTERS);

        // ── P1 Selection ──
        if (!this.p1Confirmed) {
            if (Phaser.Input.Keyboard.JustDown(this.p1KeyA)) {
                const idx = roster.indexOf(this.p1Selection);
                this.p1Selection = roster[(idx - 1 + roster.length) % roster.length];
            }
            if (Phaser.Input.Keyboard.JustDown(this.p1KeyD)) {
                const idx = roster.indexOf(this.p1Selection);
                this.p1Selection = roster[(idx + 1) % roster.length];
            }
            if (Phaser.Input.Keyboard.JustDown(this.p1Confirm)) {
                this.p1Confirmed = true;
            }
        }

        // ── P2 Selection ──
        if (!this.p2Confirmed) {
            if (Phaser.Input.Keyboard.JustDown(this.p2KeyLeft)) {
                const idx = roster.indexOf(this.p2Selection);
                this.p2Selection = roster[(idx - 1 + roster.length) % roster.length];
            }
            if (Phaser.Input.Keyboard.JustDown(this.p2KeyRight)) {
                const idx = roster.indexOf(this.p2Selection);
                this.p2Selection = roster[(idx + 1) % roster.length];
            }
            if (Phaser.Input.Keyboard.JustDown(this.p2Confirm)) {
                this.p2Confirmed = true;
            }
        }

        // ── Update Display ──
        if (this.p1Selection !== this._lastP1) {
            this._lastP1 = this.p1Selection;
            this.p1NameText.setText(CHARACTERS[this.p1Selection].name);
            this.p1TitleText.setText(CHAR_TITLES[this.p1Selection] || '');
            
            const c = CHARACTERS[this.p1Selection].colors?.energy || 0x4488FF;
            this.p1NameText.setColor('#' + c.toString(16).padStart(6, '0'));
        }
        if (this.p2Selection !== this._lastP2) {
            this._lastP2 = this.p2Selection;
            this.p2NameText.setText(CHARACTERS[this.p2Selection].name);
            this.p2TitleText.setText(CHAR_TITLES[this.p2Selection] || '');
            
            const c = CHARACTERS[this.p2Selection].colors?.energy || 0xFF4444;
            this.p2NameText.setColor('#' + c.toString(16).padStart(6, '0'));
        }

        // ── Draw Stats Tooltip on Hover ──
        this.drawStatsTooltip(this.hoveredChar);

        // ── Draw Grid ──
        this.gridGraphics.clear();
        for (const slot of this.slots) {
            const isP1 = slot.key === this.p1Selection;
            const isP2 = slot.key === this.p2Selection;
            const x = slot.x;
            const y = slot.y;
            const half = this.slotSize / 2 - 4;

            let bgColor = 0x0A0A18;
            let borderColor = 0x444466;
            let borderAlpha = 0.5;

            if (isP1 && isP2) {
                borderColor = 0xFFDD00; borderAlpha = 1;
            } else if (isP1) {
                borderColor = 0x4488FF; borderAlpha = 1;
            } else if (isP2) {
                borderColor = 0xFF4444; borderAlpha = 1;
            }

            // Slot background
            this.gridGraphics.fillStyle(bgColor, 0.6);
            this.gridGraphics.fillRect(x - half, y - half, half * 2, half * 2);
            this.gridGraphics.lineStyle(3, borderColor, borderAlpha);
            this.gridGraphics.strokeRect(x - half, y - half, half * 2, half * 2);

            // P1 indicator arrow (bottom)
            if (isP1) {
                this.gridGraphics.fillStyle(0x4488FF, 0.95);
                this.gridGraphics.fillTriangle(x - 9, y + half + 12, x + 9, y + half + 12, x, y + half + 4);
            }
            // P2 indicator arrow (top)
            if (isP2) {
                this.gridGraphics.fillStyle(0xFF4444, 0.95);
                this.gridGraphics.fillTriangle(x - 9, y - half - 12, x + 9, y - half - 12, x, y - half - 4);
            }
        }

        // ── Both Confirmed → Start Fight ──
        if (this.p1Confirmed && this.p2Confirmed && !this.transitioning) {
            this.transitioning = true;
            this.readyText.setText('FIGHT!');
            this.readyText.setAlpha(1);

            this.tweens.add({
                targets: this.readyText,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 800,
            });

            this.time.delayedCall(1200, () => {
                this.cameras.main.fadeOut(400, 0, 0, 0);
                this.time.delayedCall(400, () => {
                    this.scene.start('GameScene', {
                        p1: this.p1Selection,
                        p2: this.p2Selection,
                    });
                });
            });
        }
    }
}
