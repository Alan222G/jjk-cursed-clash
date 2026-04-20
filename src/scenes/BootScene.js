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
        this.load.image('ground_texture', 'assets/backgrounds/ground_texture.png');
        // Domains (official images)
        this.load.image('gojo_void', 'assets/domains/gojo_void.jpg');
        this.load.image('sukuna_shrine', 'assets/domains/sukuna_shrine.png');
        // Character Portraits
        this.load.image('portrait_gojo', 'assets/portraits/gojo_portrait.jpg');
        this.load.image('portrait_sukuna', 'assets/portraits/sukuna_portrait.jpg');
        this.load.image('portrait_toji', 'assets/portraits/toji_portrait.jpg');
        this.load.image('portrait_kenjaku', 'assets/portraits/kenjaku_portrait.jpg');
        // Character Menu Avatars
        this.load.image('menu_gojo', 'assets/menus/gojo_menu.jpg');
        this.load.image('menu_sukuna', 'assets/menus/sukuna_menu.jpg');
        this.load.image('menu_toji', 'assets/menus/toji_menu.jpg');
        this.load.image('menu_kenjaku', 'assets/menus/kenjaku_menu.jpg');
        // Character Sprites (Pixel Art)
        this.load.image('sprite_gojo_idle', 'assets/sprites/gojo_idle.png');
        
        // Kenjaku Hookworm Sprites
        for(let i=1; i<=5; i++) {
            this.load.image(`sprite_worm_${i}`, `assets/sprites/kenjaku/hookworm/${i}.png`);
        }

        // Audio
        this.load.audio('gojo_domain_voice', 'assets/audio/gojo_domain.m4a');
        this.load.audio('sukuna_domain_voice', 'assets/audio/sukuna_domain.m4a');
        // Black Flash Assets
        this.load.image('black_flash', 'assets/images/black_flash.png');
        this.load.image('gojo_sign', 'assets/images/gojo_sign.jpg');
        this.load.image('sukuna_sign', 'assets/images/sukuna_sign.jpg');
        this.load.audio('black_flash_sfx', 'assets/audio/black_flash_better.m4a');

        // SFX Hooks
        this.load.audio('sfx_blue', 'assets/audio/gojo_blue.m4a');
        this.load.audio('sfx_red', 'assets/audio/ultimate_red.m4a');
        this.load.audio('sfx_purple', 'assets/audio/ultimate_purple.m4a');
        this.load.audio('sfx_slash', 'assets/audio/ultimate_dismantle.m4a');
        this.load.audio('sfx_cleave', 'assets/audio/ultimate_dismantle.m4a'); // Fallback to dismantle
        this.load.audio('sfx_fire', 'assets/audio/fuga_better.m4a');
        this.load.audio('sfx_dash', 'assets/audio/dbz_dash.mp3');

        // Slash Array for Sukuna Domain
        for(let i=1; i<=11; i++){
            this.load.audio(`slash_${i}`, `assets/audio/Slash.${i}.m4a`);
        }

        // BGM Tracks (Con espacios corregidos para evitar 404 en navegadores)
        this.load.audio('bgm_menu', 'assets/audio/bgm_menu.mp3');
        this.load.audio('bgm_select', 'assets/audio/bgm_select.mp3');
        this.load.audio('bgm_combat', 'assets/audio/bgm_combat.m4a');
        this.load.audio('bgm_gameover', 'assets/audio/bgm_gameover.m4a');
        this.load.audio('musica_pausa', 'assets/audio/bgm_pausa.mp3');
        this.load.audio('bgm_domain_clash', 'assets/audio/domain_clash.m4a');
    }

    create() {
        // Transition to menu after brief delay
        this.time.delayedCall(600, () => {
            // Generate 1x1 pixel texture for reuse
            const pixel = this.add.graphics();
            pixel.fillStyle(0xFFFFFF, 1);
            pixel.fillRect(0, 0, 1, 1);
            pixel.generateTexture('pixel', 1, 1);
            pixel.destroy();

            // Create Worm Animation
            this.anims.create({
                key: 'anim_worm',
                frames: [
                    { key: 'sprite_worm_1' },
                    { key: 'sprite_worm_2' },
                    { key: 'sprite_worm_3' },
                    { key: 'sprite_worm_4' },
                    { key: 'sprite_worm_5' }
                ],
                frameRate: 20, // Faster and smoother
                repeat: -1
            });

            this.scene.start('MenuScene');
        });
    }
}
