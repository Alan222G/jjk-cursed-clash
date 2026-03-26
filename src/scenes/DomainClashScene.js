// ========================================================
// DomainClashScene — Rhythm QTE minijuego
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DOMAIN_CLASH } from '../config.js';

export default class DomainClashScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DomainClashScene' });
    }

    init(data) {
        this.p1 = data.p1;
        this.p2 = data.p2;
        this.callback = data.callback;
    }

    create() {
        this.timer = DOMAIN_CLASH.TIME_LIMIT;
        this.p1Keys = [];
        this.p2Keys = [];
        this.p1Index = 0;
        this.p2Index = 0;
        this.p1Score = 0;
        this.p2Score = 0;
        this.finished = false;

        // Generate random sequence
        this.sequence = [];
        for (let i = 0; i < DOMAIN_CLASH.NUM_KEYS; i++) {
            this.sequence.push(DOMAIN_CLASH.KEYS[Math.floor(Math.random() * DOMAIN_CLASH.KEYS.length)]);
        }

        // ── Background Overlay ──
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);

        // ── Clash Hands Visual (Placeholder) ──
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'DOMAIN CLASH', {
            fontSize: '64px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setAlpha(0.5);

        // ── Displays ──
        this.drawSequences();

        // ── Input Listeners ──
        this.input.keyboard.on('keydown', (event) => {
            if (this.finished) return;
            const key = event.key.toUpperCase();
            this.handleInput(key);
        });

        // ── Timer Text ──
        this.timerText = this.add.text(GAME_WIDTH / 2, 80, '3.5', {
            fontSize: '48px',
            color: '#FF0000'
        }).setOrigin(0.5);
    }

    drawSequences() {
        const startX = GAME_WIDTH / 2 - 200;
        const yP1 = 200;
        const yP2 = 500;

        this.add.text(startX - 100, y1, 'P1:', { fontSize: '24px' });
        this.add.text(startX - 100, y2, 'P2:', { fontSize: '24px' });

        this.p1Visuals = [];
        this.p2Visuals = [];

        this.sequence.forEach((key, i) => {
            const x = startX + i * 50;
            this.p1Visuals.push(this.add.text(x, y1, key, { fontSize: '20px', color: '#666' }));
            this.p2Visuals.push(this.add.text(x, y2, key, { fontSize: '20px', color: '#666' }));
        });
    }

    handleInput(key) {
        // Simple logic for identification of who pressed what
        // In a real 2 player local game, we'd check specific key mappings
        // For this MVP, let's assume P1 uses WASD and P2 uses Arrows for the clash
        
        const isP1Key = ['W', 'A', 'S', 'D'].includes(key);
        const isP2Key = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT'].includes(key);
        
        let normalizedKey = key;
        if (key === 'ARROWUP') normalizedKey = 'UP';
        if (key === 'ARROWDOWN') normalizedKey = 'DOWN';
        if (key === 'ARROWLEFT') normalizedKey = 'LEFT';
        if (key === 'ARROWRIGHT') normalizedKey = 'RIGHT';

        if (isP1Key && this.p1Index < this.sequence.length) {
            if (normalizedKey === this.sequence[this.p1Index]) {
                this.p1Visuals[this.p1Index].setColor('#00FF00');
                this.p1Index++;
                if (this.p1Index === this.sequence.length) this.checkWin('P1');
            } else {
                this.cameras.main.shake(100, 0.01);
            }
        }

        if (isP2Key && this.p2Index < this.sequence.length) {
            if (normalizedKey === this.sequence[this.p2Index]) {
                this.p2Visuals[this.p2Index].setColor('#00FF00');
                this.p2Index++;
                if (this.p2Index === this.sequence.length) this.checkWin('P2');
            } else {
                this.cameras.main.shake(100, 0.01);
            }
        }
    }

    checkWin(winner) {
        if (this.finished) return;
        this.finished = true;
        this.callback(winner);
        this.scene.stop();
    }

    update(time, delta) {
        if (this.finished) return;
        this.timer -= delta;
        this.timerText.setText((this.timer / 1000).toFixed(1));

        if (this.timer <= 0) {
            this.checkWin(this.p1Index >= this.p2Index ? 'P1' : 'P2');
        }
    }
}
