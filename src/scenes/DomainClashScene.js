// ========================================================
// DomainClashScene — Rhythm QTE minijuego (Tug-of-War Mashing)
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DOMAIN_CLASH, KEY_MAPS } from '../config.js';

export default class DomainClashScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DomainClashScene' });
    }

    init(data) {
        this.p1 = data.p1;
        this.p2 = data.p2;
        this.callback = data.callback;
        
        // Use their Light attack keys or predefined clash keys
        this.p1Key = KEY_MAPS.P1.LIGHT || 'J';
        this.p2Key = KEY_MAPS.P2.LIGHT || 'NUMPAD_1';
        
        if (this.p2Key === 'NUMPAD_1') this.p2KeyDisplay = '1';
        else this.p2KeyDisplay = this.p2Key;
    }

    create() {
        this.timer = DOMAIN_CLASH.TIME_LIMIT;
        
        // Clash tug-of-war logic (0 to 100).
        // 50 is center. >50 means P1 winning. <50 means P2 winning.
        this.clashProgress = 50; 
        this.finished = false;

        // ── Background Overlay ──
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0);

        // ── Clash Title Text ──
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'DOMAIN CLASH!', {
            fontSize: '64px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // ── Mash Prompts ──
        // P1 Blue Alert
        this.p1Prompt = this.add.text(GAME_WIDTH / 4, GAME_HEIGHT / 2 + 80, `[ ${this.p1Key} ]`, {
            fontSize: '52px',
            fontFamily: 'Arial Black',
            color: '#44CCFF',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH / 4, GAME_HEIGHT / 2 + 130, 'SPAM!', { fontSize: '24px', color: '#FFF' }).setOrigin(0.5);

        // P2 Red Alert
        this.p2Prompt = this.add.text((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2 + 80, `[ ${this.p2KeyDisplay} ]`, {
            fontSize: '52px',
            fontFamily: 'Arial Black',
            color: '#FF2200',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.add.text((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2 + 130, 'SPAM!', { fontSize: '24px', color: '#FFF' }).setOrigin(0.5);

        // ── The Tug-of-War Bar ──
        this.barWidth = 600;
        this.barHeight = 40;
        this.barX = GAME_WIDTH / 2 - this.barWidth / 2;
        this.barY = GAME_HEIGHT / 2 - this.barHeight / 2;

        this.barOutline = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.barWidth + 8, this.barHeight + 8, 0xFFFFFF).setOrigin(0.5);
        
        // P2 Red Background (Fills visually behind P1's bar)
        this.p2Bar = this.add.rectangle(this.barX, this.barY, this.barWidth, this.barHeight, 0xFF2200).setOrigin(0);
        
        // P1 Blue Foreground (Scales based on percentage)
        this.p1Bar = this.add.rectangle(this.barX, this.barY, this.barWidth / 2, this.barHeight, 0x44CCFF).setOrigin(0);

        // Center Marker
        this.centerMarker = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 6, this.barHeight + 20, 0xFFFFFF).setOrigin(0.5);

        // ── Input Listeners ──
        // Support NumPad keys
        const p1KeyCode = Phaser.Input.Keyboard.KeyCodes[this.p1Key] || this.p1Key.charCodeAt(0);
        let p2KeyCode = Phaser.Input.Keyboard.KeyCodes[this.p2Key] || this.p2Key.charCodeAt(0);
        if (this.p2Key === 'NUMPAD_1') p2KeyCode = Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE;

        this.key1 = this.input.keyboard.addKey(p1KeyCode);
        this.key1.on('down', () => this.handleFlash(true));

        this.key2 = this.input.keyboard.addKey(p2KeyCode);
        this.key2.on('down', () => this.handleFlash(false));

        // ── Timer Text ──
        this.timerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 180, '5.0', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF'
        }).setOrigin(0.5);
    }

    handleFlash(isP1) {
        if (this.finished) return;
        
        if (isP1) {
            this.clashProgress += 2.5; // Tweaked for balance
            this.tweens.add({
                targets: this.p1Prompt,
                scaleX: 1.3, scaleY: 1.3,
                yoyo: true, duration: 50
            });
        } else {
            this.clashProgress -= 2.5;
            this.tweens.add({
                targets: this.p2Prompt,
                scaleX: 1.3, scaleY: 1.3,
                yoyo: true, duration: 50
            });
        }
        
        // Clamp
        if (this.clashProgress <= 0) this.clashProgress = 0;
        if (this.clashProgress >= 100) this.clashProgress = 100;

        // Instant win logic
        if (this.clashProgress >= 100) this.checkWin('P1');
        if (this.clashProgress <= 0) this.checkWin('P2');
    }

    checkWin(winner) {
        if (this.finished) return;
        this.finished = true;
        
        // Final visual boom
        this.cameras.main.flash(500, winner === 'P1' ? 68 : 255, winner === 'P1' ? 204 : 34, winner === 'P1' ? 255 : 0);
        this.time.delayedCall(500, () => {
             this.callback(winner);
             this.scene.stop();
        });
    }

    update(time, delta) {
        if (this.finished) return;
        
        this.timer -= delta;
        this.timerText.setText(Math.max(0, this.timer / 1000).toFixed(1));

        // Update the bar UI
        const p1Width = (this.clashProgress / 100) * this.barWidth;
        this.p1Bar.width = p1Width;

        // Move the center marker to follow the clash edge
        this.centerMarker.x = this.barX + p1Width;

        if (this.timer <= 0) {
            // Time Out - decide winner based on current bar position
            this.checkWin(this.clashProgress >= 50 ? 'P1' : 'P2');
        }
    }
}
