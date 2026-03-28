// ========================================================
// Main Entry Point — Configuración de Phaser
// ========================================================

import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import CharSelectScene from './scenes/CharSelectScene.js';
import GameScene from './scenes/GameScene.js';
import DomainClashScene from './scenes/DomainClashScene.js';
import OptionsScene from './scenes/OptionsScene.js';
import PauseScene from './scenes/PauseScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

// Inicializar configuración global desde localStorage
window.gameSettings = JSON.parse(localStorage.getItem('jjk_settings')) || {
    graphics: 'low',
    music: 50,
    sfx: 50
};

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, OptionsScene, CharSelectScene, GameScene, PauseScene, DomainClashScene]
};

const game = new Phaser.Game(config);
