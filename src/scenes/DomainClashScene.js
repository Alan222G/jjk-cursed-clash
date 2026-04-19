// ========================================================
// DomainClashScene — QTE Button-Mashing Tug-of-War
// When both players expand domains simultaneously, they
// clash in a mashing contest. Winner expands, loser loses CE.
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DOMAIN_CLASH } from '../config.js';

const MASH_POWER = 1.8;       // Progress per key press
const DECAY_RATE = 0.3;       // Passive decay toward center per second
const PULSE_INTERVAL = 80;    // Minimum ms between valid presses (anti-spam)

export default class DomainClashScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DomainClashScene' });
    }

    init(data) {
        this.p1 = data.p1;
        this.p2 = data.p2;
        this.p1Key = data.p1Key || 'GOJO';
        this.p2Key = data.p2Key || 'SUKUNA';
        this.callback = data.callback;
    }

    create() {
        // ── State ──
        this.clashProgress = 50;  // 0 = P2 wins, 100 = P1 wins
        this.finished = false;
        this.timer = DOMAIN_CLASH.TIME_LIMIT || 6000;
        this.p1LastPress = 0;
        this.p2LastPress = 0;
        this.p1Presses = 0;
        this.p2Presses = 0;

        // ── Stop all sounds ──
        try { this.sound.stopAll(); } catch(e) {}

        // ── Background ──
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050510, 0.98).setOrigin(0).setDepth(0);

        // ── Energy Collision VFX (center clash point) ──
        this.clashGraphics = this.add.graphics().setDepth(5);

        // ── Parallel Lines for BOTH Players ──
        this.createParallelLines();

        // ── Domain Signs (Portraits) ──
        this.createDomainSigns();

        // ── Title ──
        this.add.text(GAME_WIDTH / 2, 40, '領域衝突', {
            fontSize: '52px', fontFamily: 'Arial Black',
            color: '#FFFFFF', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(20);

        this.add.text(GAME_WIDTH / 2, 90, 'DOMAIN CLASH!', {
            fontSize: '28px', fontFamily: 'Arial Black',
            color: '#FFD700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        // ── Timer ──
        this.timerText = this.add.text(GAME_WIDTH / 2, 130, '', {
            fontSize: '36px', fontFamily: 'Arial Black',
            color: '#FFD700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        // ── Tug-of-War Bar ──
        this.barWidth = 700;
        this.barHeight = 40;
        this.barX = GAME_WIDTH / 2 - this.barWidth / 2;
        this.barY = 180;

        // Bar border
        const borderG = this.add.graphics().setDepth(15);
        borderG.lineStyle(4, 0xFFFFFF, 1);
        borderG.strokeRoundedRect(this.barX - 4, this.barY - 4, this.barWidth + 8, this.barHeight + 8, 8);

        // P2 background (full bar red)
        this.p2Bar = this.add.rectangle(this.barX, this.barY, this.barWidth, this.barHeight, 0xFF2200).setOrigin(0).setDepth(10);

        // P1 fill (grows from left)
        this.p1Bar = this.add.rectangle(this.barX, this.barY, this.barWidth * 0.5, this.barHeight, 0x44CCFF).setOrigin(0).setDepth(11);

        // Center marker
        this.add.rectangle(GAME_WIDTH / 2, this.barY + this.barHeight / 2, 4, this.barHeight + 16, 0xFFFFFF, 0.6).setDepth(12);

        // ── Player Labels ──
        const p1Name = this.p1?.charData?.name || 'P1';
        const p2Name = this.p2?.charData?.name || 'P2';

        this.add.text(this.barX, this.barY + this.barHeight + 12, p1Name.toUpperCase(), {
            fontSize: '18px', fontFamily: 'Arial Black',
            color: '#44CCFF', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0).setDepth(15);

        this.add.text(this.barX + this.barWidth, this.barY + this.barHeight + 12, p2Name.toUpperCase(), {
            fontSize: '18px', fontFamily: 'Arial Black',
            color: '#FF2200', stroke: '#000000', strokeThickness: 3
        }).setOrigin(1, 0).setDepth(15);

        // ── Mashing Prompts ──
        const mashKeyP1 = DOMAIN_CLASH.P1_MASH_KEY || 'J';
        const mashKeyP2 = DOMAIN_CLASH.P2_MASH_KEY || '1';

        this.p1Prompt = this.add.text(GAME_WIDTH / 4, GAME_HEIGHT - 140, `¡MACHACA [${mashKeyP1}]!`, {
            fontSize: '36px', fontFamily: 'Arial Black',
            color: '#44CCFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        this.p2Prompt = this.add.text(GAME_WIDTH * 0.75, GAME_HEIGHT - 140, `¡MACHACA [${mashKeyP2}]!`, {
            fontSize: '36px', fontFamily: 'Arial Black',
            color: '#FF2200', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        // Pulse animation on prompts
        this.tweens.add({
            targets: this.p1Prompt, scaleX: 1.1, scaleY: 1.1,
            yoyo: true, repeat: -1, duration: 300, ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: this.p2Prompt, scaleX: 1.1, scaleY: 1.1,
            yoyo: true, repeat: -1, duration: 300, ease: 'Sine.easeInOut'
        });

        // ── Press Counter Text ──
        this.p1CountText = this.add.text(GAME_WIDTH / 4, GAME_HEIGHT - 90, '0', {
            fontSize: '48px', fontFamily: 'Arial Black',
            color: '#44CCFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        this.p2CountText = this.add.text(GAME_WIDTH * 0.75, GAME_HEIGHT - 90, '0', {
            fontSize: '48px', fontFamily: 'Arial Black',
            color: '#FF2200', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        // ── Impact Feedback ──
        this.p1Impact = this.add.text(GAME_WIDTH / 4, GAME_HEIGHT / 2 + 40, '', {
            fontSize: '32px', fontFamily: 'Arial Black'
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        this.p2Impact = this.add.text(GAME_WIDTH * 0.75, GAME_HEIGHT / 2 + 40, '', {
            fontSize: '32px', fontFamily: 'Arial Black'
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        // ── Input Setup ──
        this.input.keyboard.on('keydown-J', () => this.onMash(true));

        // Numpad 1
        const numpad1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE);
        numpad1.on('down', () => this.onMash(false));

        // Also support regular '1' key as fallback for P2
        this.input.keyboard.on('keydown-ONE', () => this.onMash(false));

        // ── Intro flash ──
        this.cameras.main.flash(500, 255, 255, 255);
    }

    // ═══════════════════════════════════════════
    // PARALLEL LINES — Both players' diagonal strips
    // ═══════════════════════════════════════════
    createParallelLines() {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const diagLen = GAME_WIDTH * 2;
        const stripWidth = 250;
        const halfW = stripWidth / 2;

        // P1 lines (angle -35°) — left side
        const angle1 = -35 * (Math.PI / 180);
        this.drawStripLines(cx - 160, cy, angle1, halfW, diagLen, 0x44CCFF);

        // P2 lines (angle +35°) — right side
        const angle2 = 35 * (Math.PI / 180);
        this.drawStripLines(cx + 160, cy, angle2, halfW, diagLen, 0xFF2200);
    }

    drawStripLines(cx, cy, angleRad, halfW, diagLen, color) {
        const perpX = Math.cos(angleRad + Math.PI / 2);
        const perpY = Math.sin(angleRad + Math.PI / 2);
        const paraX = Math.cos(angleRad);
        const paraY = Math.sin(angleRad);

        const p1x = cx - paraX * diagLen + perpX * halfW;
        const p1y = cy - paraY * diagLen + perpY * halfW;
        const p2x = cx + paraX * diagLen + perpX * halfW;
        const p2y = cy + paraY * diagLen + perpY * halfW;
        const p3x = cx + paraX * diagLen - perpX * halfW;
        const p3y = cy + paraY * diagLen - perpY * halfW;
        const p4x = cx - paraX * diagLen - perpX * halfW;
        const p4y = cy - paraY * diagLen - perpY * halfW;

        const g = this.add.graphics().setDepth(3);

        // Filled strip background
        g.fillStyle(color, 0.08);
        g.beginPath();
        g.moveTo(p1x, p1y);
        g.lineTo(p2x, p2y);
        g.lineTo(p3x, p3y);
        g.lineTo(p4x, p4y);
        g.closePath();
        g.fillPath();

        // Border lines
        g.lineStyle(6, color, 0.7);
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.strokePath();
        g.beginPath(); g.moveTo(p4x, p4y); g.lineTo(p3x, p3y); g.strokePath();

        // Glow lines
        g.lineStyle(14, color, 0.15);
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.strokePath();
        g.beginPath(); g.moveTo(p4x, p4y); g.lineTo(p3x, p3y); g.strokePath();

        // Pulsing glow animation
        this.tweens.add({
            targets: g, alpha: 0.4, yoyo: true, repeat: -1,
            duration: 600, ease: 'Sine.easeInOut'
        });
    }

    // ═══════════════════════════════════════════
    // DOMAIN SIGNS — Show both characters' portraits
    // ═══════════════════════════════════════════
    createDomainSigns() {
        // P1 sign (left side)
        const p1SignKey = this.getSignKey(this.p1Key);
        if (p1SignKey && this.textures.exists(p1SignKey)) {
            this.p1Sign = this.add.image(GAME_WIDTH / 4, GAME_HEIGHT / 2 + 20, p1SignKey)
                .setDepth(4).setOrigin(0.5).setAlpha(0.6);
            const scale1 = Math.min(300 / this.p1Sign.width, 300 / this.p1Sign.height);
            this.p1Sign.setScale(scale1);
            this.tweens.add({
                targets: this.p1Sign, scaleX: scale1 * 1.05, scaleY: scale1 * 1.05,
                yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut'
            });
        }

        // P2 sign (right side)
        const p2SignKey = this.getSignKey(this.p2Key);
        if (p2SignKey && this.textures.exists(p2SignKey)) {
            this.p2Sign = this.add.image(GAME_WIDTH * 0.75, GAME_HEIGHT / 2 + 20, p2SignKey)
                .setDepth(4).setOrigin(0.5).setAlpha(0.6);
            const scale2 = Math.min(300 / this.p2Sign.width, 300 / this.p2Sign.height);
            this.p2Sign.setScale(scale2);
            this.tweens.add({
                targets: this.p2Sign, scaleX: scale2 * 1.05, scaleY: scale2 * 1.05,
                yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut'
            });
        }

        // VS text in center
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'VS', {
            fontSize: '64px', fontFamily: 'Arial Black',
            color: '#FFD700', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(6);
    }

    getSignKey(charKey) {
        if (charKey === 'GOJO') return 'gojo_sign';
        if (charKey === 'SUKUNA') return 'sukuna_sign';
        if (charKey === 'KENJAKU') return 'kenjaku_sign';
        return null;
    }

    // ═══════════════════════════════════════════
    // MASHING LOGIC
    // ═══════════════════════════════════════════
    onMash(isP1) {
        if (this.finished) return;

        const now = this.time.now;
        const lastPress = isP1 ? this.p1LastPress : this.p2LastPress;

        // Anti-spam: minimum interval between valid presses
        if (now - lastPress < PULSE_INTERVAL) return;

        if (isP1) {
            this.p1LastPress = now;
            this.p1Presses++;
            this.clashProgress = Math.min(100, this.clashProgress + MASH_POWER);
            this.p1CountText.setText(this.p1Presses.toString());
            this.showImpact(this.p1Impact, 'HIT!', '#44CCFF');
            this.spawnMashParticle(true);
        } else {
            this.p2LastPress = now;
            this.p2Presses++;
            this.clashProgress = Math.max(0, this.clashProgress - MASH_POWER);
            this.p2CountText.setText(this.p2Presses.toString());
            this.showImpact(this.p2Impact, 'HIT!', '#FF2200');
            this.spawnMashParticle(false);
        }

        // Screen shake on every press
        this.cameras.main.shake(60, 0.003);

        this.updateBar();
    }

    showImpact(textObj, text, color) {
        textObj.setText(text);
        textObj.setColor(color);
        textObj.setAlpha(1);
        textObj.setScale(1.5);

        this.tweens.add({
            targets: textObj,
            alpha: 0, scaleX: 0.5, scaleY: 0.5,
            duration: 200, ease: 'Power2'
        });
    }

    spawnMashParticle(isP1) {
        const baseX = isP1 ? GAME_WIDTH / 4 : GAME_WIDTH * 0.75;
        const color = isP1 ? 0x44CCFF : 0xFF2200;

        for (let i = 0; i < 3; i++) {
            const px = baseX + (Math.random() - 0.5) * 100;
            const py = GAME_HEIGHT / 2 + (Math.random() - 0.5) * 80;
            const size = 4 + Math.random() * 8;
            const particle = this.add.circle(px, py, size, color, 0.8).setDepth(8);

            this.tweens.add({
                targets: particle,
                x: px + (Math.random() - 0.5) * 60,
                y: py - 30 - Math.random() * 40,
                alpha: 0, scaleX: 0.1, scaleY: 0.1,
                duration: 300 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    updateBar() {
        this.clashProgress = Phaser.Math.Clamp(this.clashProgress, 0, 100);
        this.p1Bar.width = (this.clashProgress / 100) * this.barWidth;

        // Check instant win conditions
        if (this.clashProgress >= 100) {
            this.finishClash('P1');
        } else if (this.clashProgress <= 0) {
            this.finishClash('P2');
        }
    }

    // ═══════════════════════════════════════════
    // FINISH — Determine Winner
    // ═══════════════════════════════════════════
    finishClash(winner) {
        if (this.finished) return;
        this.finished = true;

        try { this.sound.stopAll(); } catch(e) {}

        // Flash in winner's color
        const flashR = winner === 'P1' ? 68 : 255;
        const flashG = winner === 'P1' ? 204 : 34;
        const flashB = winner === 'P1' ? 255 : 0;
        this.cameras.main.flash(1000, flashR, flashG, flashB);
        this.cameras.main.shake(500, 0.02);

        // Winner text
        const winnerName = winner === 'P1'
            ? (this.p1?.charData?.name || 'P1')
            : (this.p2?.charData?.name || 'P2');

        const winColor = winner === 'P1' ? '#44CCFF' : '#FF2200';

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `¡${winnerName.toUpperCase()} DOMINA!`, {
            fontSize: '56px', fontFamily: 'Arial Black',
            color: winColor, stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(100);

        // Delay before returning
        this.time.delayedCall(2000, () => {
            this.callback(winner);
            this.scene.stop();
        });
    }

    // ═══════════════════════════════════════════
    // UPDATE — Timer & Clash VFX
    // ═══════════════════════════════════════════
    update(time, delta) {
        if (this.finished) return;

        // Timer countdown
        this.timer -= delta;
        const timeLeft = Math.max(0, this.timer / 1000);
        this.timerText.setText(timeLeft.toFixed(1));

        // Urgency color
        if (timeLeft <= 2) {
            this.timerText.setColor('#FF4444');
        } else if (timeLeft <= 4) {
            this.timerText.setColor('#FFAA00');
        }

        // Time's up
        if (this.timer <= 0) {
            const winner = this.clashProgress >= 50 ? 'P1' : 'P2';
            this.finishClash(winner);
            return;
        }

        // ── Center clash energy VFX ──
        this.clashGraphics.clear();

        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2 + 20;
        const intensity = Math.abs(this.clashProgress - 50) / 50; // 0 to 1

        // Energy rings at center
        const pulse = 0.5 + Math.sin(time * 0.01) * 0.3;

        // P1 energy wave (from left)
        const p1Strength = this.clashProgress / 100;
        this.clashGraphics.fillStyle(0x44CCFF, p1Strength * pulse * 0.3);
        this.clashGraphics.fillCircle(centerX - 30, centerY, 40 + p1Strength * 30);

        // P2 energy wave (from right)
        const p2Strength = 1 - p1Strength;
        this.clashGraphics.fillStyle(0xFF2200, p2Strength * pulse * 0.3);
        this.clashGraphics.fillCircle(centerX + 30, centerY, 40 + p2Strength * 30);

        // Collision sparks
        this.clashGraphics.lineStyle(2, 0xFFFFFF, pulse);
        for (let i = 0; i < 4; i++) {
            const angle = (time * 0.005) + (i * Math.PI / 2);
            const r = 20 + intensity * 30;
            const sx = centerX + Math.cos(angle) * r;
            const sy = centerY + Math.sin(angle) * r;
            this.clashGraphics.beginPath();
            this.clashGraphics.moveTo(centerX, centerY);
            this.clashGraphics.lineTo(sx, sy);
            this.clashGraphics.strokePath();
        }
    }
}
