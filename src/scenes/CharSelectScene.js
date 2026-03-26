// ========================================================
// CharSelectScene — Character selection grid (MK style)
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS, COLORS } from '../config.js';

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
        this.slotSize = 110;
        this.gridX = GAME_WIDTH / 2 - (roster.length * this.slotSize) / 2;
        this.gridY = GAME_HEIGHT / 2 - 20;

        this.slots = [];
        roster.forEach((key, i) => {
            const char = CHARACTERS[key];
            const sx = this.gridX + i * this.slotSize + this.slotSize / 2;
            const sy = this.gridY;

            this.slots.push({
                key,
                char,
                x: sx,
                y: sy,
            });

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
        });

        // ── Player 1 Portrait Area (Left) ──
        this.p1Portrait = this.add.graphics().setDepth(6);
        this.p1NameText = this.add.text(160, 520, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(6);

        this.p1TitleText = this.add.text(160, 555, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#AAAACC',
        }).setOrigin(0.5).setDepth(6);

        this.p1Label = this.add.text(160, 105, 'PLAYER 1', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '18px',
            color: '#4488FF',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(6);

        // ── Player 2 Portrait Area (Right) ──
        this.p2Portrait = this.add.graphics().setDepth(6);
        this.p2NameText = this.add.text(GAME_WIDTH - 160, 520, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(6);

        this.p2TitleText = this.add.text(GAME_WIDTH - 160, 555, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#AAAACC',
        }).setOrigin(0.5).setDepth(6);

        this.p2Label = this.add.text(GAME_WIDTH - 160, 105, 'PLAYER 2', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '18px',
            color: '#FF4444',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(6);

        // ── Instructions ──
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'P1: A/D to select, J to confirm  |  P2: ←/→ to select, Numpad 1 to confirm', {
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
        this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '', {
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

        // ── Draw Grid ──
        this.gridGraphics.clear();
        for (const slot of this.slots) {
            const isP1 = slot.key === this.p1Selection;
            const isP2 = slot.key === this.p2Selection;
            const x = slot.x;
            const y = slot.y;
            const half = this.slotSize / 2 - 5;

            // Slot background
            let bgColor = 0x1A1A2E;
            let borderColor = 0x444466;
            let borderAlpha = 0.6;

            if (isP1 && isP2) {
                borderColor = 0xFFDD00;
                borderAlpha = 1;
            } else if (isP1) {
                borderColor = 0x4488FF;
                borderAlpha = 1;
            } else if (isP2) {
                borderColor = 0xFF4444;
                borderAlpha = 1;
            }

            this.gridGraphics.fillStyle(bgColor, 0.8);
            this.gridGraphics.fillRect(x - half, y - half, half * 2, half * 2);
            this.gridGraphics.lineStyle(3, borderColor, borderAlpha);
            this.gridGraphics.strokeRect(x - half, y - half, half * 2, half * 2);

            // Character visual (colored circle with initials)
            this.gridGraphics.fillStyle(slot.char.colors.primary, 0.7);
            this.gridGraphics.fillCircle(x, y - 8, 28);
            this.gridGraphics.lineStyle(2, slot.char.colors.secondary, 0.8);
            this.gridGraphics.strokeCircle(x, y - 8, 28);

            // Selection indicators
            if (isP1) {
                this.gridGraphics.fillStyle(0x4488FF, 0.9);
                this.gridGraphics.fillTriangle(x - 8, y + half - 8, x + 8, y + half - 8, x, y + half - 16);
            }
            if (isP2) {
                this.gridGraphics.fillStyle(0xFF4444, 0.9);
                this.gridGraphics.fillTriangle(x - 8, y - half + 8, x + 8, y - half + 8, x, y - half + 16);
            }
        }

        // ── Draw Portraits ──
        this.drawPortrait(this.p1Portrait, 160, 320, CHARACTERS[this.p1Selection], this.p1Confirmed);
        this.p1NameText.setText(CHARACTERS[this.p1Selection].name);
        this.p1TitleText.setText(CHARACTERS[this.p1Selection].title);

        this.drawPortrait(this.p2Portrait, GAME_WIDTH - 160, 320, CHARACTERS[this.p2Selection], this.p2Confirmed);
        this.p2NameText.setText(CHARACTERS[this.p2Selection].name);
        this.p2TitleText.setText(CHARACTERS[this.p2Selection].title);

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

    drawPortrait(g, cx, cy, charData, confirmed) {
        g.clear();
        const w = 200;
        const h = 280;

        // Outer frame
        g.fillStyle(0x0A0A18, 0.9);
        g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 12);

        if (confirmed) {
            g.lineStyle(3, 0xFFD700, 1);
        } else {
            g.lineStyle(2, COLORS.MENU_GOLD, 0.6);
        }
        g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 12);

        // Character body preview
        const colors = charData.colors;

        // Energy aura
        const pulse = 0.3 + Math.sin(this.timer * 0.003) * 0.15;
        g.fillStyle(colors.energy, pulse);
        g.fillEllipse(cx, cy - 20, 100, 140);

        // Head
        g.fillStyle(colors.skin, 1);
        g.fillCircle(cx, cy - 80, 30);
        // Hair
        g.fillStyle(colors.hair, 1);
        g.fillEllipse(cx, cy - 95, 55, 24);
        // Body
        g.fillStyle(colors.primary, 0.9);
        g.fillRect(cx - 25, cy - 50, 50, 70);
        // Energy core
        g.fillStyle(colors.secondary, 0.7);
        g.fillCircle(cx, cy - 20, 12);

        // Confirmed stamp
        if (confirmed) {
            g.fillStyle(0x000000, 0.5);
            g.fillRoundedRect(cx - 50, cy + 60, 100, 30, 5);
            g.lineStyle(1, 0xFFD700, 0.8);
            g.strokeRoundedRect(cx - 50, cy + 60, 100, 30, 5);
        }
    }
}
