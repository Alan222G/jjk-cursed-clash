// ========================================================
// DomainClashScene — Sequence QTE Tug-of-War
// Both players must follow a displayed key sequence.
// Each correct press pushes the bar in their favor.
// Wrong keys do nothing. The sequence loops infinitely.
// Duration: 12 seconds.
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DOMAIN_CLASH } from '../config.js';

// ── Key Display Labels ──
// Maps internal key names to what we show on screen
const KEY_LABELS = {
    // P1 keys (letters)
    'U': 'U',
    'I': 'I',
    'J': 'J',
    'A': 'A',
    'S': 'S',
    'D': 'D',
    'W': 'W',
    // P2 keys (arrows + numpad)
    'UP': '▲',
    'DOWN': '▼',
    'LEFT': '◀',
    'RIGHT': '▶',
    'NUMPAD_ONE': '1',
};

// Map Phaser keycode events to our sequence key names
const PHASER_KEY_TO_NAME = {
    'U': 'U', 'I': 'I', 'J': 'J', 'A': 'A', 'S': 'S', 'D': 'D', 'W': 'W',
    'UP': 'UP', 'DOWN': 'DOWN', 'LEFT': 'LEFT', 'RIGHT': 'RIGHT',
};

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
        this.timer = DOMAIN_CLASH.TIME_LIMIT;
        this.p1Hits = 0;
        this.p2Hits = 0;

        // ── Sequences ──
        this.p1Sequence = DOMAIN_CLASH.P1_SEQUENCE;
        this.p2Sequence = DOMAIN_CLASH.P2_SEQUENCE;
        this.p1Index = 0; // Current position in P1's sequence
        this.p2Index = 0; // Current position in P2's sequence

        // ── Stop all sounds and play Clash BGM ──
        try { 
            this.sound.stopAll(); 
            const targetVol = (window.gameSettings?.music ?? 50) / 100 * 0.6;
            this.clashBgm = this.sound.add('bgm_domain_clash', { volume: targetVol, loop: true });
            this.clashBgm.play();
        } catch(e) { console.warn("Error playing clash bgm", e); }

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

        // ── QTE Key Display ──
        this.createKeyDisplays();

        // ── Hit Counter Text ──
        this.p1CountText = this.add.text(GAME_WIDTH / 4, GAME_HEIGHT - 75, '0', {
            fontSize: '48px', fontFamily: 'Arial Black',
            color: '#44CCFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        this.p2CountText = this.add.text(GAME_WIDTH * 0.75, GAME_HEIGHT - 75, '0', {
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
        this.setupInputListeners();

        // ── Intro flash ──
        this.cameras.main.flash(500, 255, 255, 255);
    }

    // ═══════════════════════════════════════════
    // QTE KEY DISPLAYS — Large current key indicator
    // ═══════════════════════════════════════════
    createKeyDisplays() {
        const keyY = GAME_HEIGHT - 180;

        // ── P1 Current Key ──
        // Background circle
        this.p1KeyBg = this.add.graphics().setDepth(18);
        this.drawKeyCircle(this.p1KeyBg, GAME_WIDTH / 4, keyY, 55, 0x44CCFF, 0.3);

        // Key text
        this.p1KeyText = this.add.text(GAME_WIDTH / 4, keyY, '', {
            fontSize: '58px', fontFamily: 'Arial Black',
            color: '#FFFFFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(22);

        // "PRESIONA" label above
        this.add.text(GAME_WIDTH / 4, keyY - 75, 'PRESIONA', {
            fontSize: '14px', fontFamily: 'Arial Black',
            color: '#44CCFF', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(20);

        // Pulse glow ring
        this.p1GlowRing = this.add.circle(GAME_WIDTH / 4, keyY, 60, 0x44CCFF, 0).setDepth(17);
        this.p1GlowRing.setStrokeStyle(3, 0x44CCFF, 0.6);
        this.tweens.add({
            targets: this.p1GlowRing, scaleX: 1.3, scaleY: 1.3, alpha: 0,
            duration: 800, repeat: -1, ease: 'Sine.easeOut'
        });

        // ── P2 Current Key ──
        this.p2KeyBg = this.add.graphics().setDepth(18);
        this.drawKeyCircle(this.p2KeyBg, GAME_WIDTH * 0.75, keyY, 55, 0xFF2200, 0.3);

        this.p2KeyText = this.add.text(GAME_WIDTH * 0.75, keyY, '', {
            fontSize: '58px', fontFamily: 'Arial Black',
            color: '#FFFFFF', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(22);

        this.add.text(GAME_WIDTH * 0.75, keyY - 75, 'PRESIONA', {
            fontSize: '14px', fontFamily: 'Arial Black',
            color: '#FF2200', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(20);

        this.p2GlowRing = this.add.circle(GAME_WIDTH * 0.75, keyY, 60, 0xFF2200, 0).setDepth(17);
        this.p2GlowRing.setStrokeStyle(3, 0xFF2200, 0.6);
        this.tweens.add({
            targets: this.p2GlowRing, scaleX: 1.3, scaleY: 1.3, alpha: 0,
            duration: 800, repeat: -1, ease: 'Sine.easeOut'
        });

        // Set initial keys
        this.updateKeyDisplay();
    }

    drawKeyCircle(graphics, x, y, radius, color, alpha) {
        // Outer glow
        graphics.fillStyle(color, alpha * 0.3);
        graphics.fillCircle(x, y, radius + 15);
        // Main circle
        graphics.fillStyle(0x0A0A1A, 0.9);
        graphics.fillCircle(x, y, radius);
        // Border
        graphics.lineStyle(4, color, 0.8);
        graphics.strokeCircle(x, y, radius);
    }

    updateKeyDisplay() {
        const p1CurrentKey = this.p1Sequence[this.p1Index];
        const p2CurrentKey = this.p2Sequence[this.p2Index];

        this.p1KeyText.setText(KEY_LABELS[p1CurrentKey] || p1CurrentKey);
        this.p2KeyText.setText(KEY_LABELS[p2CurrentKey] || p2CurrentKey);
    }

    // ═══════════════════════════════════════════
    // INPUT LISTENERS — Listen for all relevant keys
    // ═══════════════════════════════════════════
    setupInputListeners() {
        // ── P1 Keys: U, I, J, A, S, D, W ──
        const p1Keys = ['U', 'I', 'J', 'A', 'S', 'D', 'W'];
        p1Keys.forEach(keyName => {
            this.input.keyboard.on(`keydown-${keyName}`, () => {
                this.onKeyPress(true, keyName);
            });
        });

        // ── P2 Keys: Arrow keys + Numpad 1 ──
        this.input.keyboard.on('keydown-UP', () => this.onKeyPress(false, 'UP'));
        this.input.keyboard.on('keydown-DOWN', () => this.onKeyPress(false, 'DOWN'));
        this.input.keyboard.on('keydown-LEFT', () => this.onKeyPress(false, 'LEFT'));
        this.input.keyboard.on('keydown-RIGHT', () => this.onKeyPress(false, 'RIGHT'));

        // Numpad 1
        const numpad1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE);
        numpad1.on('down', () => this.onKeyPress(false, 'NUMPAD_ONE'));

        // Regular '1' key as fallback for P2
        this.input.keyboard.on('keydown-ONE', () => this.onKeyPress(false, 'NUMPAD_ONE'));
    }

    // ═══════════════════════════════════════════
    // KEY PRESS — Check if correct, advance sequence
    // ═══════════════════════════════════════════
    onKeyPress(isP1, pressedKey) {
        if (this.finished) return;

        if (isP1) {
            const expectedKey = this.p1Sequence[this.p1Index];
            if (pressedKey === expectedKey) {
                // ✅ Correct!
                this.p1Hits++;
                this.p1Index = (this.p1Index + 1) % this.p1Sequence.length;
                this.clashProgress = Math.min(100, this.clashProgress + DOMAIN_CLASH.PROGRESS_PER_HIT);
                this.p1CountText.setText(this.p1Hits.toString());

                this.showCorrectFeedback(true);
                this.spawnHitParticles(true);
                this.cameras.main.shake(60, 0.003);
                this.updateKeyDisplay();
                this.updateBar();
            }
            // Wrong key: do nothing (no penalty, no advance)
        } else {
            const expectedKey = this.p2Sequence[this.p2Index];
            if (pressedKey === expectedKey) {
                // ✅ Correct!
                this.p2Hits++;
                this.p2Index = (this.p2Index + 1) % this.p2Sequence.length;
                this.clashProgress = Math.max(0, this.clashProgress - DOMAIN_CLASH.PROGRESS_PER_HIT);
                this.p2CountText.setText(this.p2Hits.toString());

                this.showCorrectFeedback(false);
                this.spawnHitParticles(false);
                this.cameras.main.shake(60, 0.003);
                this.updateKeyDisplay();
                this.updateBar();
            }
        }
    }

    // ═══════════════════════════════════════════
    // VISUAL FEEDBACK — Green flash on correct press
    // ═══════════════════════════════════════════
    showCorrectFeedback(isP1) {
        const keyY = GAME_HEIGHT - 180;
        const x = isP1 ? GAME_WIDTH / 4 : GAME_WIDTH * 0.75;
        const color = isP1 ? 0x00FF44 : 0x00FF44; // Both flash green on success

        // Green explosion ring
        const ring = this.add.circle(x, keyY, 30, color, 0.6).setDepth(30);
        this.tweens.add({
            targets: ring,
            scaleX: 2.5, scaleY: 2.5, alpha: 0,
            duration: 300, ease: 'Power2',
            onComplete: () => ring.destroy()
        });

        // Flash the key text green briefly
        const keyText = isP1 ? this.p1KeyText : this.p2KeyText;
        keyText.setColor('#00FF44');
        this.time.delayedCall(150, () => {
            keyText.setColor('#FFFFFF');
        });

        // Redraw key circle background with green flash
        const keyBg = isP1 ? this.p1KeyBg : this.p2KeyBg;
        const baseColor = isP1 ? 0x44CCFF : 0xFF2200;
        keyBg.clear();
        this.drawKeyCircle(keyBg, x, keyY, 55, 0x00FF44, 0.6);

        // Return to normal color after brief flash
        this.time.delayedCall(200, () => {
            keyBg.clear();
            this.drawKeyCircle(keyBg, x, keyY, 55, baseColor, 0.3);
        });

        // Scale punch on the key text
        this.tweens.add({
            targets: keyText,
            scaleX: 1.4, scaleY: 1.4,
            duration: 80, yoyo: true, ease: 'Back.easeOut'
        });

        // Impact text
        const impactText = isP1 ? this.p1Impact : this.p2Impact;
        this.showImpact(impactText, '✓', '#00FF44');
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

    spawnHitParticles(isP1) {
        const baseX = isP1 ? GAME_WIDTH / 4 : GAME_WIDTH * 0.75;
        const baseY = GAME_HEIGHT - 180;
        const color = 0x00FF44; // Green for success

        for (let i = 0; i < 5; i++) {
            const px = baseX + (Math.random() - 0.5) * 80;
            const py = baseY + (Math.random() - 0.5) * 60;
            const size = 3 + Math.random() * 6;
            const particle = this.add.circle(px, py, size, color, 0.9).setDepth(28);

            this.tweens.add({
                targets: particle,
                x: px + (Math.random() - 0.5) * 80,
                y: py - 20 - Math.random() * 50,
                alpha: 0, scaleX: 0.1, scaleY: 0.1,
                duration: 350 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
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

        const angle1 = -35 * (Math.PI / 180);
        this.drawStripLines(cx - 160, cy, angle1, halfW, diagLen, 0x44CCFF);

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

        g.fillStyle(color, 0.08);
        g.beginPath();
        g.moveTo(p1x, p1y);
        g.lineTo(p2x, p2y);
        g.lineTo(p3x, p3y);
        g.lineTo(p4x, p4y);
        g.closePath();
        g.fillPath();

        g.lineStyle(6, color, 0.7);
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.strokePath();
        g.beginPath(); g.moveTo(p4x, p4y); g.lineTo(p3x, p3y); g.strokePath();

        g.lineStyle(14, color, 0.15);
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.strokePath();
        g.beginPath(); g.moveTo(p4x, p4y); g.lineTo(p3x, p3y); g.strokePath();

        this.tweens.add({
            targets: g, alpha: 0.4, yoyo: true, repeat: -1,
            duration: 600, ease: 'Sine.easeInOut'
        });
    }

    // ═══════════════════════════════════════════
    // DOMAIN SIGNS — Show both characters' portraits
    // ═══════════════════════════════════════════
    createDomainSigns() {
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

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'VS', {
            fontSize: '64px', fontFamily: 'Arial Black',
            color: '#FFD700', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(6);
    }

    getSignKey(charKey) {
        const signMap = {
            'GOJO': 'gojo_sign',
            'SUKUNA': 'sukuna_sign',
            'KENJAKU': 'kenjaku_sign',
            'TOJI': 'toji_sign',
            'ISHIGORI': 'ishigori_sign',
            'KUROROSHI': 'kuroroshi_sign',
        };
        return signMap[charKey] || null;
    }

    // ═══════════════════════════════════════════
    // TUG-OF-WAR BAR UPDATE
    // ═══════════════════════════════════════════
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
        if (timeLeft <= 3) {
            this.timerText.setColor('#FF4444');
        } else if (timeLeft <= 6) {
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
        const intensity = Math.abs(this.clashProgress - 50) / 50;

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
