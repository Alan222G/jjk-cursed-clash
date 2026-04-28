// ========================================================
// Main Entry Point — Configuración de Phaser
// ========================================================

import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import CharSelectScene from './scenes/CharSelectScene.js';
import MapSelectScene from './scenes/MapSelectScene.js';
import GameScene from './scenes/GameScene.js';
import DomainClashScene from './scenes/DomainClashScene.js';
import OptionsScene from './scenes/OptionsScene.js';
import PauseScene from './scenes/PauseScene.js';
import TournamentLobbyScene from './scenes/TournamentLobbyScene.js';
import TournamentBracketScene from './scenes/TournamentBracketScene.js';
import RaidLobbyScene from './scenes/RaidLobbyScene.js';
import RaidFightScene from './scenes/RaidFightScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

// Inicializar configuración global desde localStorage
let saved = JSON.parse(localStorage.getItem('jjk_settings')) || {};
window.gameSettings = {
    graphics: saved.graphics ?? 'low',
    music: saved.music ?? 50,
    sfx: saved.sfx ?? 50
};

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    transparent: true,
    dom: {
        createContainer: true
    },
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
    scene: [BootScene, MenuScene, OptionsScene, CharSelectScene, MapSelectScene, GameScene, PauseScene, DomainClashScene, TournamentLobbyScene, TournamentBracketScene, RaidLobbyScene, RaidFightScene]
};

const game = new Phaser.Game(config);

