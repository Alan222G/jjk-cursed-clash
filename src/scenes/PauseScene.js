import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
        
        // Pause all ongoing BGM (like DEATHMATCH combat bgm)
        this.sound.pauseAll();
        
        // Play Pause Music
        if (this.sound.get('musica_pausa')) {
            this.sound.play('musica_pausa', { volume: 0.6, loop: true });
        }

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        this.add.text(cx, cy - 100, 'PAUSA', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.createButton(cx, cy, 'REANUDAR', () => {
            this.sound.stopByKey('musica_pausa');
            this.sound.resumeAll();
            
            // Reanudar la escena principal y sus dinámicas
            const mainScene = this.scene.get('GameScene');
            if(mainScene) {
                mainScene.scene.resume();
                mainScene.physics.resume();
            }
            this.scene.stop();
        });

        this.createButton(cx, cy + 80, 'ABANDONAR PARTIDA', () => {
            this.sound.stopAll();
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        });
        
        // Listen for ESC to resume
        this.input.keyboard.on('keydown-ESC', () => {
            this.sound.stopByKey('musica_pausa');
            this.sound.resumeAll();
            
            const mainScene = this.scene.get('GameScene');
            if(mainScene) {
                mainScene.scene.resume();
                mainScene.physics.resume();
            }
            this.scene.stop();
        });
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#AAAAAA'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setColor('#D4A843'));
        btn.on('pointerout', () => btn.setColor('#AAAAAA'));
        btn.on('pointerdown', callback);
    }
}
