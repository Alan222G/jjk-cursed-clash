// ========================================================
// CharSelectScene — Character selection grid (MK style)
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS, COLORS } from '../config.js';

// Map character key → portrait texture key
const PORTRAIT_KEY = {
    GOJO: 'portrait_gojo',
    SUKUNA: 'portrait_sukuna',
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

        const roster = Object.keys(CHARACTERS);

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

        // ── Character Grid (Center) ──
        this.gridGraphics = this.add.graphics().setDepth(5);
        this.slotSize = 120;
        this.gridX = GAME_WIDTH / 2 - (roster.length * this.slotSize) / 2;
        this.gridY = GAME_HEIGHT / 2 - 10;

        this.slots = [];
        // Track portrait thumbnails in slots
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

            // Portrait thumbnail inside the slot (if texture loaded)
            const texKey = PORTRAIT_KEY[key];
            if (texKey && this.textures.exists(texKey)) {
                const thumb = this.add.image(sx, sy - 6, texKey)
                    .setDisplaySize(this.slotSize - 16, this.slotSize - 16)
                    .setDepth(5)
                    .setAlpha(0.85);
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

        // ── Player 1 Portrait Area (Left) ──
        this.p1FrameGraphics = this.add.graphics().setDepth(6);
        this.p1PortraitImg = null; // will be created dynamically

        this.p1NameText = this.add.text(160, 540, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '26px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(7);

        this.p1TitleText = this.add.text(160, 570, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#AAAACC',
        }).setOrigin(0.5).setDepth(7);

        this.p1Label = this.add.text(160, 100, 'PLAYER 1', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '18px',
            color: '#4488FF',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(6);

        // ── Player 2 Portrait Area (Right) ──
        this.p2FrameGraphics = this.add.graphics().setDepth(6);
        this.p2PortraitImg = null;

        this.p2NameText = this.add.text(GAME_WIDTH - 160, 540, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '26px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(7);

        this.p2TitleText = this.add.text(GAME_WIDTH - 160, 570, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#AAAACC',
        }).setOrigin(0.5).setDepth(7);

        this.p2Label = this.add.text(GAME_WIDTH - 160, 100, 'PLAYER 2', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '18px',
            color: '#FF4444',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(6);

        // ── Instructions ──
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50,
            'P1: A/D to select, J to confirm  |  P2: ←/→ to select, Numpad 1 to confirm', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#666688',
        }).setOrigin(0.5).setDepth(5);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Or click a character slot', {
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

        this.transitioning = false;

        // Track last selection to only update images on change
        this._lastP1 = null;
        this._lastP2 = null;
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

        // ── Update Portrait Images (only when selection changes) ──
        if (this.p1Selection !== this._lastP1) {
            this._lastP1 = this.p1Selection;
            this._setPortraitImage('p1', this.p1Selection, 160, 320);
            this.p1NameText.setText(CHARACTERS[this.p1Selection].name);
            this.p1TitleText.setText(CHARACTERS[this.p1Selection].title);
        }
        if (this.p2Selection !== this._lastP2) {
            this._lastP2 = this.p2Selection;
            this._setPortraitImage('p2', this.p2Selection, GAME_WIDTH - 160, 320);
            this.p2NameText.setText(CHARACTERS[this.p2Selection].name);
            this.p2TitleText.setText(CHARACTERS[this.p2Selection].title);
        }

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

        // ── Draw portrait frames (static elements) ──
        this._drawPortraitFrame(this.p1FrameGraphics, 160, 320, CHARACTERS[this.p1Selection], this.p1Confirmed, 0x4488FF);
        this._drawPortraitFrame(this.p2FrameGraphics, GAME_WIDTH - 160, 320, CHARACTERS[this.p2Selection], this.p2Confirmed, 0xFF4444);

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

    /** Set or swap the portrait image for a player */
    _setPortraitImage(player, charKey, cx, cy) {
        const texKey = PORTRAIT_KEY[charKey];
        const imgProp = player === 'p1' ? 'p1PortraitImg' : 'p2PortraitImg';
        const W = 200;
        const H = 280;

        // Destroy old image
        if (this[imgProp]) {
            this[imgProp].destroy();
            this[imgProp] = null;
        }

        if (texKey && this.textures.exists(texKey)) {
            // Use real portrait image, clipped to portrait frame size
            this[imgProp] = this.add.image(cx, cy - 10, texKey)
                .setDisplaySize(W - 8, H - 8)
                .setDepth(6.5)
                .setAlpha(1);
        }
    }

    /** Draw the decorative frame (border, glow, confirmed stamp) */
    _drawPortraitFrame(g, cx, cy, charData, confirmed, accentColor) {
        g.clear();
        const W = 200;
        const H = 280;
        const colors = charData.colors;

        // Outer glow
        const pulse = 0.15 + Math.sin(this.timer * 0.003) * 0.08;
        g.fillStyle(colors.energy, pulse);
        g.fillRoundedRect(cx - W / 2 - 8, cy - H / 2 - 8, W + 16, H + 16, 14);

        // Frame background
        g.fillStyle(0x06060F, 0.92);
        g.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 10);

        // Border
        if (confirmed) {
            g.lineStyle(4, 0xFFD700, 1);
        } else {
            g.lineStyle(2, accentColor, 0.8);
        }
        g.strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, 10);

        // Inner accent lines
        g.lineStyle(1, colors.energy, 0.3);
        g.strokeRoundedRect(cx - W / 2 + 4, cy - H / 2 + 4, W - 8, H - 8, 8);

        // Confirmed stamp overlay
        if (confirmed) {
            g.fillStyle(0xFFD700, 0.15);
            g.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 10);
            g.fillStyle(0x000000, 0.55);
            g.fillRoundedRect(cx - 55, cy + H / 2 - 42, 110, 34, 6);
            g.lineStyle(1, 0xFFD700, 0.9);
            g.strokeRoundedRect(cx - 55, cy + H / 2 - 42, 110, 34, 6);
        }
    }
}
