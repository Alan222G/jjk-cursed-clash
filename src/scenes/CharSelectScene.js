// ========================================================
// CharSelectScene — Character selection grid (2-row layout)
// Redesigned from scratch for bulletproof character mapping
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS, COLORS } from '../config.js';

// ── Grid Layout: 2 rows ──
// Row 0: GOJO, SUKUNA, TOJI, KENJAKU
// Row 1: ISHIGORI, KUROROSHI  (centered)
const GRID = [
    ['GOJO', 'SUKUNA', 'TOJI', 'KENJAKU'],
    ['ISHIGORI', 'KUROROSHI'],
];

// Map character key → menu avatar texture key
const MENU_KEY = {
    GOJO: 'menu_gojo',
    SUKUNA: 'menu_sukuna',
    TOJI: 'menu_toji',
    KENJAKU: 'menu_kenjaku',
    ISHIGORI: 'menu_ishigori',
    KUROROSHI: 'menu_kuroroshi',
};

// Iconic JJK titles for each character
const CHAR_TITLES = {
    GOJO: 'THE HONORED ONE',
    SUKUNA: 'KING OF CURSES',
    TOJI: 'THE SORCERER KILLER',
    KENJAKU: 'THE DISGRACED ONE',
    ISHIGORI: 'THE REINCARNATED SORCERER',
    KUROROSHI: 'THE CURSED COCKROACH',
};

export default class CharSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharSelectScene' });
    }

    create() {
        this.timer = 0;

        // ── Player cursor positions on the GRID (row, col) ──
        this.p1Row = 0; this.p1Col = 0; // GOJO
        this.p2Row = 0; this.p2Col = 1; // SUKUNA
        this.p1Confirmed = false;
        this.p2Confirmed = false;
        this.hoveredChar = null;

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

        // ── Character Grid (2 rows, centered) ──
        this.gridGraphics = this.add.graphics().setDepth(5);
        this.slotSize = 120;
        this.gridStartY = GAME_HEIGHT / 2 - 70;
        this.rowGap = 20; // Vertical gap between rows

        this.slots = []; // { key, char, x, y, row, col }
        this.slotImages = [];

        for (let row = 0; row < GRID.length; row++) {
            const rowChars = GRID[row];
            const rowWidth = rowChars.length * this.slotSize;
            const rowStartX = GAME_WIDTH / 2 - rowWidth / 2;
            const rowY = this.gridStartY + row * (this.slotSize + this.rowGap);

            for (let col = 0; col < rowChars.length; col++) {
                const key = rowChars[col];
                const char = CHARACTERS[key];
                if (!char) continue;

                const sx = rowStartX + col * this.slotSize + this.slotSize / 2;
                const sy = rowY;

                this.slots.push({ key, char, x: sx, y: sy, row, col });

                // Clickable zone
                const zone = this.add.zone(sx, sy, this.slotSize - 10, this.slotSize - 10)
                    .setInteractive({ useHandCursor: true });
                
                // Capture row/col for click handler
                const slotRow = row;
                const slotCol = col;
                
                zone.on('pointerdown', () => {
                    if (!this.p1Confirmed) {
                        this.p1Row = slotRow;
                        this.p1Col = slotCol;
                        this.p1Confirmed = true;
                    } else if (!this.p2Confirmed) {
                        this.p2Row = slotRow;
                        this.p2Col = slotCol;
                        this.p2Confirmed = true;
                    }
                });

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
            }
        }

        // ── Stats Panels ──
        this.statsGraphics = this.add.graphics({ x: 0, y: 0 }).setDepth(20);
        this.statsTexts = [];

        // ── Instructions ──
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 45,
            'P1: A/D/W/S + J  |  P2: ←/→/↑/↓ + Numpad 1  |  ESC: Volver', {
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
        this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '42px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        // ── Keyboard Controls ──
        this.p1KeyA = this.input.keyboard.addKey('A');
        this.p1KeyD = this.input.keyboard.addKey('D');
        this.p1KeyW = this.input.keyboard.addKey('W');
        this.p1KeyS = this.input.keyboard.addKey('S');
        this.p1Confirm = this.input.keyboard.addKey('J');

        this.p2KeyLeft = this.input.keyboard.addKey('LEFT');
        this.p2KeyRight = this.input.keyboard.addKey('RIGHT');
        this.p2KeyUp = this.input.keyboard.addKey('UP');
        this.p2KeyDown = this.input.keyboard.addKey('DOWN');
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

    // ── Helper: Get character key from grid position ──
    getKeyAt(row, col) {
        if (row < 0 || row >= GRID.length) return null;
        if (col < 0 || col >= GRID[row].length) return null;
        return GRID[row][col];
    }

    // ── Helper: Clamp column when changing rows (rows have different lengths) ──
    clampCol(row, col) {
        const maxCol = GRID[row].length - 1;
        return Math.min(col, maxCol);
    }

    // ── Helper: Get P1 selected key ──
    get p1Selection() {
        return this.getKeyAt(this.p1Row, this.p1Col) || 'GOJO';
    }

    // ── Helper: Get P2 selected key ──
    get p2Selection() {
        return this.getKeyAt(this.p2Row, this.p2Col) || 'SUKUNA';
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

    drawSideStatsPanel(charKey, isP1) {
        if (!charKey) return;

        const char = CHARACTERS[charKey];
        if (!char) return;
        const stats = char.stats;
        const skills = char.skills;
        const title = CHAR_TITLES[charKey] || char.title || '';

        // Layout variables
        const panelW = 280;
        const panelH = 550;
        const px = isP1 ? 20 + panelW/2 : GAME_WIDTH - 20 - panelW/2;
        const py = GAME_HEIGHT / 2;
        
        // Colores base según P1/P2
        const playerColor = isP1 ? 0x4488FF : 0xFF4444;

        // Panel background
        this.statsGraphics.fillStyle(0x0A0A18, 0.92);
        this.statsGraphics.fillRoundedRect(px - panelW/2, py - panelH/2, panelW, panelH, 10);
        this.statsGraphics.lineStyle(2, playerColor, 0.8);
        this.statsGraphics.strokeRoundedRect(px - panelW/2, py - panelH/2, panelW, panelH, 10);

        // Header P1/P2
        const headerText = this.add.text(px, py - panelH/2 + 20, isP1 ? 'PLAYER 1' : 'PLAYER 2', {
            fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: isP1 ? '#AACCFF' : '#FFAACC',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(21);
        this.statsTexts.push(headerText);

        // Portrait in-game
        const portraitKey = `portrait_${charKey.toLowerCase()}`;
        if (this.textures.exists(portraitKey)) {
            // Marco del portrait
            this.statsGraphics.lineStyle(3, char.colors?.energy || playerColor, 1);
            this.statsGraphics.strokeRect(px - 100, py - panelH/2 + 45, 200, 200);
            
            const portrait = this.add.image(px, py - panelH/2 + 145, portraitKey)
                .setDisplaySize(196, 196).setDepth(20);
            this.statsTexts.push(portrait);
        }

        // Nombre
        const nameT = this.add.text(px, py - panelH/2 + 265, char.name.toUpperCase(), {
            fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#FFFFFF',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(21);
        this.statsTexts.push(nameT);

        // Título
        const titleT = this.add.text(px, py - panelH/2 + 285, `"${title}"`, {
            fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#D4A843', fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(21);
        this.statsTexts.push(titleT);

        // Stats Box
        let sy = py - panelH/2 + 320;
        const lineH = 20;
        const colL = px - panelW/2 + 20;

        const statLines = [
            { label: 'HP', value: stats.maxHp, color: '#44CC66' },
            { label: 'Velocidad', value: stats.speed, color: '#44AAFF' },
            { label: 'Poder', value: `x${stats.power}`, color: '#FF6644' },
            { label: 'Defensa', value: `x${stats.defense}`, color: '#AAAAFF' },
            { label: 'CE Regen', value: `${stats.ceRegen}/s`, color: '#AA66FF' }
        ];

        statLines.forEach((s, i) => {
            const t = this.add.text(colL, sy + i * lineH, `${s.label}: `, {
                fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#888899',
            }).setDepth(21);
            const v = this.add.text(colL + 80, sy + i * lineH, `${s.value}`, {
                fontFamily: 'Arial Black, sans-serif', fontSize: '12px', color: s.color,
            }).setDepth(21);
            this.statsTexts.push(t, v);
        });

        // Skills Box
        const skillY = sy + statLines.length * lineH + 15;
        const skillHeader = this.add.text(colL, skillY, '⚡ HABILIDADES', {
            fontFamily: 'Arial Black, sans-serif', fontSize: '12px', color: '#D4A843'
        }).setDepth(21);
        this.statsTexts.push(skillHeader);
        
        let skIdx = 0;
        if (skills.skill1) {
            const sk = this.add.text(colL, skillY + 20 + skIdx * 18, `U: ${skills.skill1.name}`, { fontFamily: 'Arial', fontSize: '11px', color: '#AACCFF' }).setDepth(21);
            this.statsTexts.push(sk); skIdx++;
        }
        if (skills.skill2) {
            const sk = this.add.text(colL, skillY + 20 + skIdx * 18, `U+Dir: ${skills.skill2.name}`, { fontFamily: 'Arial', fontSize: '11px', color: '#AACCFF' }).setDepth(21);
            this.statsTexts.push(sk); skIdx++;
        }
        if (skills.domain) {
            const sk = this.add.text(colL, skillY + 20 + skIdx * 18, `I: ${skills.domain.name}`, { fontFamily: 'Arial', fontSize: '11px', color: '#FF8866' }).setDepth(21);
            this.statsTexts.push(sk); skIdx++;
        }
        if (skills.maximum) {
            const sk = this.add.text(colL, skillY + 20 + skIdx * 18, `MAX: ${skills.maximum.name}`, { fontFamily: 'Arial', fontSize: '11px', color: '#FFDD44' }).setDepth(21);
            this.statsTexts.push(sk); skIdx++;
        }
    }

    drawAllPanels() {
        // Clear previous
        this.statsGraphics.clear();
        this.statsTexts.forEach(t => t.destroy());
        this.statsTexts = [];

        // Draw Player 1 (Left)
        this.drawSideStatsPanel(this.p1Selection, true);
        // Draw Player 2 (Right)
        this.drawSideStatsPanel(this.p2Selection, false);
    }

    update(time, delta) {
        this.timer += delta;

        // ── P1 Selection (W/A/S/D + J) ──
        if (!this.p1Confirmed) {
            if (Phaser.Input.Keyboard.JustDown(this.p1KeyA)) {
                this.p1Col = Math.max(0, this.p1Col - 1);
            }
            if (Phaser.Input.Keyboard.JustDown(this.p1KeyD)) {
                this.p1Col = Math.min(GRID[this.p1Row].length - 1, this.p1Col + 1);
            }
            if (Phaser.Input.Keyboard.JustDown(this.p1KeyW)) {
                if (this.p1Row > 0) {
                    this.p1Row--;
                    this.p1Col = this.clampCol(this.p1Row, this.p1Col);
                }
            }
            if (Phaser.Input.Keyboard.JustDown(this.p1KeyS)) {
                if (this.p1Row < GRID.length - 1) {
                    this.p1Row++;
                    this.p1Col = this.clampCol(this.p1Row, this.p1Col);
                }
            }
            if (Phaser.Input.Keyboard.JustDown(this.p1Confirm)) {
                this.p1Confirmed = true;
            }
        }

        // ── P2 Selection (Arrows + Numpad1) ──
        if (!this.p2Confirmed) {
            if (Phaser.Input.Keyboard.JustDown(this.p2KeyLeft)) {
                this.p2Col = Math.max(0, this.p2Col - 1);
            }
            if (Phaser.Input.Keyboard.JustDown(this.p2KeyRight)) {
                this.p2Col = Math.min(GRID[this.p2Row].length - 1, this.p2Col + 1);
            }
            if (Phaser.Input.Keyboard.JustDown(this.p2KeyUp)) {
                if (this.p2Row > 0) {
                    this.p2Row--;
                    this.p2Col = this.clampCol(this.p2Row, this.p2Col);
                }
            }
            if (Phaser.Input.Keyboard.JustDown(this.p2KeyDown)) {
                if (this.p2Row < GRID.length - 1) {
                    this.p2Row++;
                    this.p2Col = this.clampCol(this.p2Row, this.p2Col);
                }
            }
            if (Phaser.Input.Keyboard.JustDown(this.p2Confirm)) {
                this.p2Confirmed = true;
            }
        }

        // ── Draw Stats Panels ──
        this.drawAllPanels();

        // ── Draw Grid ──
        this.gridGraphics.clear();
        const p1Key = this.p1Selection;
        const p2Key = this.p2Selection;

        for (const slot of this.slots) {
            const isP1 = slot.key === p1Key;
            const isP2 = slot.key === p2Key;
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

            // Store final selections BEFORE any transition logic
            const finalP1 = this.p1Selection;
            const finalP2 = this.p2Selection;

            console.log(`[CharSelect] Fight starting: P1="${finalP1}" vs P2="${finalP2}"`);

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
                        p1: finalP1,
                        p2: finalP2,
                    });
                });
            });
        }
    }
}
