// ========================================================
// RaidFightScene — Sequential fights vs Sukuna 20 Fingers
// Sukuna keeps HP between fights, challengers fight in order
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS } from '../config.js';

export default class RaidFightScene extends Phaser.Scene {
    constructor() { super({ key: 'RaidFightScene' }); }

    create() {
        const state = window._raidState;
        if (!state) { this.scene.start('MenuScene'); return; }

        this.sound.stopAll();

        // Dark red background
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0A0000).setOrigin(0);

        const challenger = state.challengers[state.currentFightIdx];
        if (!challenger) {
            // Sukuna survived all challengers
            this.showRaidResult(true);
            return;
        }

        // Show matchup screen
        this.add.text(GAME_WIDTH/2, 80, `RAID — FIGHT ${state.currentFightIdx + 1} / ${state.challengers.length}`, {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#FF4444',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(5);

        // Sukuna side
        this.add.text(GAME_WIDTH/2 - 200, 200, 'SUKUNA', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#FF2200',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH/2 - 200, 240, 'TRUE FORM', {
            fontFamily: 'Arial', fontSize: '14px', color: '#CC6644'
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH/2 - 200, 280, `HP: ${Math.floor(state.sukunaHp)} / 15000`, {
            fontFamily: 'Arial', fontSize: '16px', color: '#FF8866'
        }).setOrigin(0.5);

        // VS
        this.add.text(GAME_WIDTH/2, 230, 'VS', {
            fontFamily: 'Arial Black', fontSize: '48px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        // Challenger side
        const charData = CHARACTERS[challenger.charKey];
        this.add.text(GAME_WIDTH/2 + 200, 200, charData?.name || challenger.charKey, {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#4488FF',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH/2 + 200, 240, challenger.isBot ? '🤖 BOT' : '👤 PLAYER', {
            fontFamily: 'Arial', fontSize: '14px', color: challenger.isBot ? '#FFAA00' : '#44AAFF'
        }).setOrigin(0.5);

        // Fight button
        const fightBtn = this.add.text(GAME_WIDTH/2, 420, 'PRESS ENTER TO FIGHT', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(5);
        this.tweens.add({ targets: fightBtn, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });

        this.input.keyboard.once('keydown-ENTER', () => {
            this.launchFight(state, challenger);
        });

        // Also auto-start after 3 seconds
        this.time.delayedCall(3000, () => {
            this.launchFight(state, challenger);
        });
    }

    launchFight(state, challenger) {
        // Sukuna is always P1 in raid
        const sukunaKey = 'SUKUNA_20';
        const challengerKey = challenger.charKey;

        // Configure bot control
        if (state.sukunaIsBot && !challenger.isBot) {
            // Player is challenger (P2), Sukuna is bot (P1 bot, but our system does P2 bot)
            // We'll put player as P1 and Sukuna as P2
            window.gameSettings.p2Control = 'cpu';
            window._raidFightConfig = { p1: challengerKey, p2: sukunaKey, sukunaIsP2: true };
        } else if (!state.sukunaIsBot && challenger.isBot) {
            // Player is Sukuna (P1), challenger is bot (P2)
            window.gameSettings.p2Control = 'cpu';
            window._raidFightConfig = { p1: sukunaKey, p2: challengerKey, sukunaIsP2: false };
        } else {
            // Both bots or both players
            window.gameSettings.p2Control = challenger.isBot ? 'cpu' : 'humano';
            window._raidFightConfig = { p1: sukunaKey, p2: challengerKey, sukunaIsP2: false };
        }

        this.sound.stopAll();
        this.scene.start('MapSelectScene', {
            p1: window._raidFightConfig.p1,
            p2: window._raidFightConfig.p2,
            raidMode: true,
        });
    }

    showRaidResult(sukunaWins) {
        this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, 600, 250, 0x000000, 0.9).setDepth(50);

        if (sukunaWins) {
            this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 40, 'SUKUNA WINS THE RAID!', {
                fontFamily: 'Arial Black', fontSize: '32px', color: '#FF2200',
                stroke: '#000000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(51);
            this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 20, 'The King of Curses is unstoppable.', {
                fontFamily: 'Arial', fontSize: '18px', color: '#CC8888'
            }).setOrigin(0.5).setDepth(51);
        } else {
            this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 40, 'CHALLENGERS WIN!', {
                fontFamily: 'Arial Black', fontSize: '32px', color: '#44FF44',
                stroke: '#000000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(51);
            this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 20, 'The King of Curses has been defeated!', {
                fontFamily: 'Arial', fontSize: '18px', color: '#88CC88'
            }).setOrigin(0.5).setDepth(51);
        }

        const retText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 70, 'PRESS ENTER', {
            fontFamily: 'Arial', fontSize: '16px', color: '#888899'
        }).setOrigin(0.5).setDepth(51);
        this.tweens.add({ targets: retText, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });
        this.input.keyboard.once('keydown-ENTER', () => {
            window._raidState = null;
            this.sound.stopAll();
            this.scene.start('MenuScene');
        });
    }
}
