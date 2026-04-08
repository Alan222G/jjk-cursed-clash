// ========================================================
// DomainClashScene — FNF Style Rhythm Minigame
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const BEAT_INTERVAL = 300; // spawn a note every 300ms
const NOTE_SPEED = 400; // pixels per second
const HIT_WINDOW = 60; // +/- pixels for a "Hit"
const MISS_PENALTY = 2.0; // Tug-of-war penalty
const HIT_REWARD = 2.5; // Tug-of-war reward

const LANE_COLORS = [0xFF00FF, 0x00FFFF, 0x00FF00, 0xFF0000]; // Left, Down, Up, Right

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
        this.clashProgress = 50; 
        this.finished = false;
        
        this.timer = 12000; // 12 seconds duration
        this.spawnTimer = 0;

        // Ensure no previous music overlaps
        try { this.sound.stopAll(); } catch(e) {}
        
        let vol = ((window.gameSettings?.music ?? 50) / 100);
        try { this.sound.play('battle_music', { volume: vol, loop: true }); } catch(e) {}

        // Background
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0A0A10, 0.95).setOrigin(0);

        // Titles
        this.add.text(GAME_WIDTH / 2, 50, 'DOMAIN CLASH!', {
            fontSize: '42px', fontFamily: 'Arial Black', color: '#FFFFFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        this.timerText = this.add.text(GAME_WIDTH / 2, 100, '12.0', {
            fontSize: '32px', fontFamily: 'Arial Black', color: '#FFD700'
        }).setOrigin(0.5);

        // ── The Tug-of-War Bar ──
        this.barWidth = 600;
        this.barHeight = 30;
        this.barX = GAME_WIDTH / 2 - this.barWidth / 2;
        this.barY = 140;

        this.add.rectangle(GAME_WIDTH / 2, this.barY + this.barHeight/2, this.barWidth + 8, this.barHeight + 8, 0xFFFFFF).setOrigin(0.5);
        this.p2Bar = this.add.rectangle(this.barX, this.barY, this.barWidth, this.barHeight, 0xFF2200).setOrigin(0);
        this.p1Bar = this.add.rectangle(this.barX, this.barY, this.barWidth / 2, this.barHeight, 0x44CCFF).setOrigin(0);

        // ── Lanes Setup ──
        this.hitY = GAME_HEIGHT - 100;
        
        // P1 Lanes: A, S, W, D (Left, Down, Up, Right)
        this.p1Lanes = [
            { key: 'A', x: GAME_WIDTH / 4 - 120, keyCode: Phaser.Input.Keyboard.KeyCodes.A },
            { key: 'S', x: GAME_WIDTH / 4 - 40, keyCode: Phaser.Input.Keyboard.KeyCodes.S },
            { key: 'W', x: GAME_WIDTH / 4 + 40, keyCode: Phaser.Input.Keyboard.KeyCodes.W },
            { key: 'D', x: GAME_WIDTH / 4 + 120, keyCode: Phaser.Input.Keyboard.KeyCodes.D },
        ];

        // P2 Lanes: LEFT, DOWN, UP, RIGHT
        this.p2Lanes = [
            { key: '←', x: GAME_WIDTH * 0.75 - 120, keyCode: Phaser.Input.Keyboard.KeyCodes.LEFT },
            { key: '↓', x: GAME_WIDTH * 0.75 - 40, keyCode: Phaser.Input.Keyboard.KeyCodes.DOWN },
            { key: '↑', x: GAME_WIDTH * 0.75 + 40, keyCode: Phaser.Input.Keyboard.KeyCodes.UP },
            { key: '→', x: GAME_WIDTH * 0.75 + 120, keyCode: Phaser.Input.Keyboard.KeyCodes.RIGHT },
        ];

        // Draw hit zones
        this.createHitZones(this.p1Lanes);
        this.createHitZones(this.p2Lanes);

        // Note groups
        this.p1Notes = [];
        this.p2Notes = [];

        // Input Setup
        this.setupInputs();

        // Feedbacks
        this.p1Feedback = this.add.text(GAME_WIDTH / 4, this.hitY - 80, '', { fontSize: '28px', fontFamily: 'Arial Black' }).setOrigin(0.5);
        this.p2Feedback = this.add.text(GAME_WIDTH * 0.75, this.hitY - 80, '', { fontSize: '28px', fontFamily: 'Arial Black' }).setOrigin(0.5);
    }

    createHitZones(lanes) {
        lanes.forEach((lane, i) => {
            // Lane track background
            this.add.rectangle(lane.x, 0, 60, GAME_HEIGHT, 0xFFFFFF, 0.05).setOrigin(0.5, 0);
            
            // Hit box
            const box = this.add.graphics();
            box.lineStyle(4, 0x888888, 1);
            box.strokeRect(lane.x - 30, this.hitY - 30, 60, 60);

            // Label
            this.add.text(lane.x, this.hitY + 50, lane.key, {
                fontSize: '20px', fontFamily: 'Arial Black', color: '#FFFFFF'
            }).setOrigin(0.5);
        });
    }

    setupInputs() {
        this.p1Lanes.forEach((lane, i) => {
            const keyObj = this.input.keyboard.addKey(lane.keyCode);
            keyObj.on('down', () => this.handleKeyPress(true, i));
        });
        
        this.p2Lanes.forEach((lane, i) => {
            const keyObj = this.input.keyboard.addKey(lane.keyCode);
            keyObj.on('down', () => this.handleKeyPress(false, i));
        });
    }

    spawnNotes() {
        // Pick a random lane (0 to 3)
        const laneIdx = Phaser.Math.Between(0, 3);
        
        // Spawn for P1
        const p1Note = this.add.rectangle(this.p1Lanes[laneIdx].x, -50, 50, 50, LANE_COLORS[laneIdx]);
        p1Note.setStrokeStyle(3, 0xFFFFFF);
        p1Note.laneIdx = laneIdx;
        this.p1Notes.push(p1Note);

        // Spawn for P2
        const p2Note = this.add.rectangle(this.p2Lanes[laneIdx].x, -50, 50, 50, LANE_COLORS[laneIdx]);
        p2Note.setStrokeStyle(3, 0xFFFFFF);
        p2Note.laneIdx = laneIdx;
        this.p2Notes.push(p2Note);
    }

    handleKeyPress(isP1, laneIdx) {
        if (this.finished) return;

        const notes = isP1 ? this.p1Notes : this.p2Notes;
        const feedback = isP1 ? this.p1Feedback : this.p2Feedback;
        
        // Find the lowest note in this lane
        let targetNote = null;
        let targetNoteIdx = -1;
        let lowestY = -999;

        for (let i = 0; i < notes.length; i++) {
            if (notes[i].laneIdx === laneIdx) {
                if (notes[i].y > lowestY) {
                    lowestY = notes[i].y;
                    targetNote = notes[i];
                    targetNoteIdx = i;
                }
            }
        }

        if (targetNote) {
            const diff = Math.abs(targetNote.y - this.hitY);
            if (diff <= HIT_WINDOW) {
                // HIT!
                this.clashProgress += isP1 ? HIT_REWARD : -HIT_REWARD;
                this.showFeedback(feedback, 'HIT!', '#44FF44');
                targetNote.destroy();
                notes.splice(targetNoteIdx, 1);
            } else if (targetNote.y > this.hitY - 150) {
                // Too early (still counts as miss)
                this.clashProgress += isP1 ? -MISS_PENALTY : MISS_PENALTY;
                this.showFeedback(feedback, 'MISS', '#FF4444');
                targetNote.destroy();
                notes.splice(targetNoteIdx, 1);
            }
        } else {
            // Pressed blank lane (Miss penalty)
            this.clashProgress += isP1 ? -MISS_PENALTY : MISS_PENALTY;
            this.showFeedback(feedback, 'MISS', '#FF4444');
        }

        this.updateBar();
    }

    showFeedback(labelObj, text, color) {
        labelObj.setText(text);
        labelObj.setColor(color);
        labelObj.setAlpha(1);
        labelObj.y = this.hitY - 80;
        
        this.tweens.add({
            targets: labelObj,
            y: this.hitY - 120,
            alpha: 0,
            duration: 500,
            ease: 'Power2'
        });
    }

    updateBar() {
        if (this.clashProgress <= 0) {
            this.clashProgress = 0;
            this.checkWin('P2');
        } else if (this.clashProgress >= 100) {
            this.clashProgress = 100;
            this.checkWin('P1');
        }
        
        this.p1Bar.width = (this.clashProgress / 100) * this.barWidth;
    }

    checkWin(winner) {
        if (this.finished) return;
        this.finished = true;
        
        try { this.sound.stopAll(); } catch(e) {}
        
        // Final visual boom
        this.cameras.main.flash(800, winner === 'P1' ? 68 : 255, winner === 'P1' ? 204 : 34, winner === 'P1' ? 255 : 0);
        
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${winner} WINS THE CLASH!`, {
            fontSize: '56px', fontFamily: 'Arial Black', color: '#FFFFFF', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(100);

        this.time.delayedCall(1500, () => {
             this.callback(winner);
             this.scene.stop();
        });
    }

    update(time, delta) {
        if (this.finished) return;

        // Timer
        this.timer -= delta;
        this.timerText.setText(Math.max(0, this.timer / 1000).toFixed(1));

        if (this.timer <= 0) {
            // Time Out - decide winner visually
            const winner = this.clashProgress >= 50 ? 'P1' : 'P2';
            this.checkWin(winner);
            return;
        }

        // Spawner
        this.spawnTimer += delta;
        if (this.spawnTimer >= BEAT_INTERVAL && this.timer > 2000) {
            this.spawnTimer = 0;
            this.spawnNotes();
        }

        // Move Notes
        const moveNotes = (notesList, isP1) => {
            for (let i = notesList.length - 1; i >= 0; i--) {
                const note = notesList[i];
                note.y += (NOTE_SPEED * delta) / 1000;

                // Miss boundary
                if (note.y > this.hitY + HIT_WINDOW) {
                    note.destroy();
                    notesList.splice(i, 1);
                    // Penalty for not hitting
                    this.clashProgress += isP1 ? -MISS_PENALTY : MISS_PENALTY;
                    this.showFeedback(isP1 ? this.p1Feedback : this.p2Feedback, 'MISS', '#FF4444');
                    this.updateBar();
                }
            }
        };

        moveNotes(this.p1Notes, true);
        moveNotes(this.p2Notes, false);
    }
}
