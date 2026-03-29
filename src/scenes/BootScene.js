// ========================================================
// BootScene — Asset preloading with cursed-style progress bar
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // ── Progress Bar ──
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        const bg = this.add.graphics();
        bg.fillStyle(0x0A0A12, 1);
        bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Title
        this.add.text(cx, cy - 80, '呪', {
            fontFamily: 'serif',
            fontSize: '64px',
            color: '#7722CC',
        }).setOrigin(0.5);

        this.add.text(cx, cy - 30, 'LOADING CURSED ENERGY...', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#8866CC',
            letterSpacing: 4,
        }).setOrigin(0.5);

        // Bar background
        const barBg = this.add.graphics();
        barBg.fillStyle(0x1A1A2E, 1);
        barBg.fillRect(cx - 200, cy + 10, 400, 20);
        barBg.lineStyle(2, 0xD4A843, 0.8);
        barBg.strokeRect(cx - 200, cy + 10, 400, 20);

        // Bar fill
        const barFill = this.add.graphics();

        const percentText = this.add.text(cx, cy + 45, '0%', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#D4A843',
        }).setOrigin(0.5);

        // ── Progress Events ──
        this.load.on('progress', (value) => {
            barFill.clear();
            barFill.fillStyle(0x7722CC, 1);
            barFill.fillRect(cx - 198, cy + 12, 396 * value, 16);
            // Glow
            barFill.fillStyle(0xAA44FF, 0.3);
            barFill.fillRect(cx - 198, cy + 12, 396 * value, 8);
            percentText.setText(`${Math.floor(value * 100)}%`);
        });

        this.load.on('complete', () => {
            percentText.setText('100%');
        });

        // ── Load Assets ──
        // Backgrounds
        this.load.image('bg_shibuya', 'assets/backgrounds/shibuya.png');
        // Domains (official images)
        this.load.image('gojo_void', 'assets/domains/gojo_void.jpg');
        this.load.image('sukuna_shrine', 'assets/domains/sukuna_shrine.png');
        // Character Portraits
        this.load.image('portrait_gojo', 'assets/portraits/gojo_portrait.jpg');
        this.load.image('portrait_sukuna', 'assets/portraits/sukuna_portrait.jpg');
        // Character Menu Avatars
        this.load.image('menu_gojo', 'assets/menus/gojo_menu.jpg');
        this.load.image('menu_sukuna', 'assets/menus/sukuna_menu.jpg');
        // Audio
        this.load.audio('gojo_domain_voice', 'assets/audio/gojo_domain.mp3');
        this.load.audio('sukuna_domain_voice', 'assets/audio/sukuna_domain.mp3');
        // SFX Hooks
        this.load.audio('sfx_blue', 'assets/audio/blue.mp3');
        this.load.audio('sfx_red', 'assets/audio/red.mp3');
        this.load.audio('sfx_purple', 'assets/audio/purple.mp3');
        this.load.audio('sfx_slash', 'assets/audio/slash.mp3');
        this.load.audio('sfx_cleave', 'assets/audio/cleave.mp3');
        this.load.audio('sfx_fire', 'assets/audio/fire.mp3');

        // BGM Tracks (Copied from Game_Music folder)
        this.load.audio('bgm_menu', 'assets/audio/Music_ Menu.mp3');
        this.load.audio('bgm_select', 'assets/audio/Music_Selctcahracter.mp3');
        this.load.audio('bgm_combat', 'assets/audio/DEATHMATCH.mp4');
        this.load.audio('bgm_gameover', 'assets/audio/GAME OVER.mp4');
        this.load.audio('musica_pausa', 'assets/audio/Musica de pausa.mp3');
    }

    create() {
        // Generate 1x1 pixel texture for reuse
        const pixel = this.add.graphics();
        pixel.fillStyle(0xFFFFFF, 1);
        pixel.fillRect(0, 0, 1, 1);
        pixel.generateTexture('pixel', 1, 1);
        pixel.destroy();

        // Transition to menu after brief delay
        this.time.delayedCall(600, () => {
            this.scene.start('MenuScene');
        });
    }
}
