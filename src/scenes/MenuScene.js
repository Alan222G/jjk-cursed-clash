// ========================================================
// MenuScene — Main menu with cursed energy aesthetic
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.particles = [];
        this.menuTimer = 0;

        // ── Background ──
        this.bg = this.add.graphics();
        this.drawBackground();

        // ── BGM Loop ──
        const targetVol = (window.gameSettings?.music ?? 50) / 100 * 0.5;
        const existingBgm = this.sound.get('bgm_menu');

        if (existingBgm && existingBgm.isPlaying) {
            existingBgm.setVolume(targetVol);
        } else {
            this.sound.stopAll();
            try {
                this.sound.play('bgm_menu', { volume: targetVol, loop: true });
            } catch(e) { console.warn('Menu BGM error', e); }
        }

        // ── Floating Particles ──
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * GAME_HEIGHT,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.5 - Math.random() * 1.5,
                size: 1 + Math.random() * 3,
                alpha: 0.2 + Math.random() * 0.5,
                color: Math.random() > 0.5 ? 0x7722CC : 0x4444FF,
            });
        }
        this.particleGraphics = this.add.graphics().setDepth(2);

        // ── Title ──
        this.add.text(GAME_WIDTH / 2, 120, '呪術廻戦', {
            fontFamily: 'serif',
            fontSize: '72px',
            color: '#FFFFFF',
            stroke: '#7722CC',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(5);

        this.titleSub = this.add.text(GAME_WIDTH / 2, 195, 'CURSED CLASH', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '48px',
            color: '#D4A843',
            stroke: '#000000',
            strokeThickness: 6,
            letterSpacing: 8,
        }).setOrigin(0.5).setDepth(5);

        this.add.text(GAME_WIDTH / 2, 245, 'J U J U T S U   K A I S E N', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#8866AA',
            letterSpacing: 6,
        }).setOrigin(0.5).setDepth(5);

        // ── Decorative Lines ──
        const deco = this.add.graphics().setDepth(4);
        deco.lineStyle(2, COLORS.MENU_GOLD, 0.6);
        deco.lineBetween(GAME_WIDTH / 2 - 250, 275, GAME_WIDTH / 2 + 250, 275);
        deco.lineStyle(1, COLORS.MENU_GOLD, 0.3);
        deco.lineBetween(GAME_WIDTH / 2 - 200, 280, GAME_WIDTH / 2 + 200, 280);

        // ── Menu Options ──
        const menuItems = [
            { text: 'FIGHT', action: () => this.startFight() },
            { text: 'TOURNAMENT', action: () => { this.scene.start('OptionsScene'); } },
            { text: 'CRÉDITOS', action: () => {} },
        ];

        this.menuButtons = [];
        menuItems.forEach((item, i) => {
            const y = 340 + i * 70;
            const btn = this.createMenuButton(GAME_WIDTH / 2, y, item.text, item.action);
            this.menuButtons.push(btn);
        });

        // ── "Press Start" blink ──
        this.pressStart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'PRESS ENTER OR CLICK "FIGHT" TO BEGIN', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#666688',
        }).setOrigin(0.5).setDepth(5);

        this.tweens.add({
            targets: this.pressStart,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 1000,
        });

        // ── Keyboard shortcuts ──
        this.input.keyboard.on('keydown-ENTER', () => this.startFight());
        this.input.keyboard.on('keydown-SPACE', () => this.startFight());

        // ── Version text ──
        this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 25, 'Versión 1.5.5 - Refresca el navegador si ves una versión anterior', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#555555',
        }).setOrigin(1, 0.5).setDepth(5); // Adjusted origin to bottom-right
    }

    createMenuButton(x, y, label, callback) {
        const container = this.add.container(x, y).setDepth(5);

        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.8);
        bg.fillRoundedRect(-160, -25, 320, 50, 8);
        bg.lineStyle(2, COLORS.MENU_GOLD, 0.6);
        bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        container.add(bg);

        // Button text
        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '24px',
            color: '#CCCCDD',
            letterSpacing: 6,
        }).setOrigin(0.5);
        container.add(text);

        // Interactive zone
        const zone = this.add.zone(x, y, 320, 50).setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => {
            text.setColor('#FFFFFF');
            bg.clear();
            bg.fillStyle(COLORS.MENU_ACCENT, 0.4);
            bg.fillRoundedRect(-160, -25, 320, 50, 8);
            bg.lineStyle(2, COLORS.MENU_GOLD, 1);
            bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        });

        zone.on('pointerout', () => {
            text.setColor('#CCCCDD');
            bg.clear();
            bg.fillStyle(0x1A1A2E, 0.8);
            bg.fillRoundedRect(-160, -25, 320, 50, 8);
            bg.lineStyle(2, COLORS.MENU_GOLD, 0.6);
            bg.strokeRoundedRect(-160, -25, 320, 50, 8);
        });

        zone.on('pointerdown', callback);

        return container;
    }

    drawBackground() {
        this.bg.clear();
        // Dark gradient
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            const t = y / GAME_HEIGHT;
            const r = Math.floor(10 + t * 8);
            const g = Math.floor(10 + t * 5);
            const b = Math.floor(18 + t * 15);
            const color = (r << 16) | (g << 8) | b;
            this.bg.fillStyle(color, 1);
            this.bg.fillRect(0, y, GAME_WIDTH, 4);
        }

        // Talisman border patterns (vertical lines on sides)
        this.bg.lineStyle(1, COLORS.MENU_GOLD, 0.15);
        for (let i = 0; i < 8; i++) {
            this.bg.lineBetween(20 + i * 6, 0, 20 + i * 6, GAME_HEIGHT);
            this.bg.lineBetween(GAME_WIDTH - 20 - i * 6, 0, GAME_WIDTH - 20 - i * 6, GAME_HEIGHT);
        }
    }

    startFight() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('CharSelectScene');
        });
    }

    update(time, delta) {
        this.menuTimer += delta;

        // Update floating particles
        this.particleGraphics.clear();
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha = 0.2 + Math.sin(this.menuTimer * 0.002 + p.x * 0.01) * 0.3;

            if (p.y < -10) {
                p.y = GAME_HEIGHT + 10;
                p.x = Math.random() * GAME_WIDTH;
            }

            this.particleGraphics.fillStyle(p.color, p.alpha);
            this.particleGraphics.fillCircle(p.x, p.y, p.size);
        }

        // Title pulse
        const scale = 1 + Math.sin(this.menuTimer * 0.002) * 0.02;
        this.titleSub.setScale(scale);
    }
}
