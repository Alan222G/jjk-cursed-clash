// ========================================================
// HUD — Native Phaser.Graphics health/CE bars + avatars
// ========================================================

import Phaser from 'phaser';
import { HUD_STYLE, GAME_WIDTH, ROUNDS } from '../config.js';

export default class HUD {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(100);
        this.graphics.setScrollFactor(0);

        // Round indicators
        this.p1Rounds = 0;
        this.p2Rounds = 0;
        this.roundNum = 1;
        this.timer = 99;
        this.timerEvent = null;

        // Combo display texts
        this.p1ComboText = scene.add.text(180, 95, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '20px',
            color: '#FFAA00',
            stroke: '#000000',
            strokeThickness: 4,
        }).setDepth(101).setScrollFactor(0).setAlpha(0);

        this.p2ComboText = scene.add.text(GAME_WIDTH - 180, 95, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '20px',
            color: '#FFAA00',
            stroke: '#000000',
            strokeThickness: 4,
        }).setDepth(101).setScrollFactor(0).setAlpha(0).setOrigin(1, 0);

        // Fight Text (Start of round)
        this.fightText = scene.add.text(GAME_WIDTH / 2, HUD_STYLE.TIMER_Y + 40, '', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '56px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
        }).setDepth(101).setScrollFactor(0).setOrigin(0.5, 0);

        // Pause Button (Replaces Timer)
        this.pauseBtn = scene.add.text(GAME_WIDTH / 2, HUD_STYLE.TIMER_Y, '⏸️ PAUSE', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '20px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#AA2222',
            padding: { x: 6, y: 3 }
        }).setDepth(101).setScrollFactor(0).setOrigin(0.5, 0)
          .setInteractive({ useHandCursor: true });
          
        this.pauseBtn.on('pointerdown', () => {
            if (scene.sound.get('musica_pausa')) {
                scene.sound.play('musica_pausa', { volume: 0.6, loop: true });
            }
            scene.physics.pause();
            scene.scene.pause();
            // Try to launch pause scene if exists
            if (scene.scene.manager.keys['PauseScene']) {
                scene.scene.launch('PauseScene');
            } else {
                console.log("PauseScene not found, creating a simple overlay...");
                // Just as a fallback if PauseScene isn't fully created
            }
        });

        // Round text
        this.roundText = scene.add.text(GAME_WIDTH / 2, 68, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#AAAACC',
            stroke: '#000000',
            strokeThickness: 2,
        }).setDepth(101).setScrollFactor(0).setOrigin(0.5, 0);

        // Player name texts
        this.p1NameText = scene.add.text(HUD_STYLE.AVATAR_RADIUS * 2 + HUD_STYLE.MARGIN + 10, 68, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#CCCCDD',
        }).setDepth(101).setScrollFactor(0);

        this.p2NameText = scene.add.text(GAME_WIDTH - HUD_STYLE.AVATAR_RADIUS * 2 - HUD_STYLE.MARGIN - 10, 68, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#CCCCDD',
        }).setDepth(101).setScrollFactor(0).setOrigin(1, 0);

        // ── Character Portrait Images ──
        const ar = HUD_STYLE.AVATAR_RADIUS;
        const p1cx = HUD_STYLE.MARGIN + ar;
        const p2cx = GAME_WIDTH - HUD_STYLE.MARGIN - ar;
        const acy = 45;

        // Create circular masks for portraits
        this.p1PortraitMask = scene.add.graphics();
        this.p1PortraitMask.fillStyle(0xffffff);
        this.p1PortraitMask.fillCircle(p1cx, acy, ar - 4);
        this.p2PortraitMask = scene.add.graphics();
        this.p2PortraitMask.fillStyle(0xffffff);
        this.p2PortraitMask.fillCircle(p2cx, acy, ar - 4);
    }

    setPortraits(p1Key, p2Key) {
        const ar = HUD_STYLE.AVATAR_RADIUS;
        const p1cx = HUD_STYLE.MARGIN + ar;
        const p2cx = GAME_WIDTH - HUD_STYLE.MARGIN - ar;
        const acy = 45;
        
        const p1Tex = p1Key === 'GOJO' ? 'portrait_gojo' : 'portrait_sukuna';
        const p2Tex = p2Key === 'GOJO' ? 'portrait_gojo' : 'portrait_sukuna';

        if (this.scene.textures.exists(p1Tex)) {
            this.p1Portrait = this.scene.add.image(p1cx, acy, p1Tex)
                .setDisplaySize(ar * 2 - 8, ar * 2 - 8)
                .setDepth(100.5)
                .setScrollFactor(0);
            this.p1Portrait.setMask(this.p1PortraitMask.createGeometryMask());
        }

        if (this.scene.textures.exists(p2Tex)) {
            this.p2Portrait = this.scene.add.image(p2cx, acy, p2Tex)
                .setDisplaySize(ar * 2 - 8, ar * 2 - 8)
                .setDepth(100.5)
                .setScrollFactor(0);
            this.p2Portrait.setMask(this.p2PortraitMask.createGeometryMask());
            this.p2Portrait.setFlipX(true); // Always face center for P2
        }
    }

    startTimer() {
        if(this.fightText) {
            this.fightText.setText('FIGHT!');
            this.scene.tweens.add({
                targets: this.fightText,
                alpha: 0,
                delay: 1500,
                duration: 1000,
                onComplete: () => this.fightText.destroy()
            });
        }
    }

    stopTimer() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
    }

    setNames(p1Name, p2Name) {
        this.p1NameText.setText(p1Name);
        this.p2NameText.setText(p2Name);
    }

    setRounds(p1Rounds, p2Rounds) {
        this.p1Rounds = p1Rounds;
        this.p2Rounds = p2Rounds;
    }

    update(p1, p2) {
        const g = this.graphics;
        const s = HUD_STYLE;
        g.clear();

        // ── Background Bar Panel ──
        g.fillStyle(0x000000, 0.65);
        g.fillRect(0, 0, GAME_WIDTH, 90);
        g.lineStyle(2, s.BORDER_COLOR_DARK, 0.8);
        g.lineBetween(0, 90, GAME_WIDTH, 90);

        // ── Player 1 (Left Side) ──
        const p1x = s.AVATAR_RADIUS * 2 + s.MARGIN + 10;
        const p1y = 22;
        this.drawHealthBar(g, p1x, p1y, p1.getHpRatio(), s.BAR_WIDTH, false);
        this.drawCEBar(g, p1x, p1y + s.BAR_HEIGHT + 6, p1.getCeRatio(), s.BAR_WIDTH, false, p1.ceSystem.isFatigued);
        this.drawAvatar(g, s.MARGIN + s.AVATAR_RADIUS, 45, p1.colors, false);
        this.drawRoundPips(g, p1x, p1y + s.BAR_HEIGHT + 6 + s.CE_BAR_HEIGHT + 6, this.p1Rounds, false);

        // ── Player 2 (Right Side — mirrored) ──
        const p2x = GAME_WIDTH - s.AVATAR_RADIUS * 2 - s.MARGIN - 10 - s.BAR_WIDTH;
        const p2y = 22;
        this.drawHealthBar(g, p2x, p2y, p2.getHpRatio(), s.BAR_WIDTH, true);
        this.drawCEBar(g, p2x, p2y + s.BAR_HEIGHT + 6, p2.getCeRatio(), s.BAR_WIDTH, true, p2.ceSystem.isFatigued);
        this.drawAvatar(g, GAME_WIDTH - s.MARGIN - s.AVATAR_RADIUS, 45, p2.colors, true);
        this.drawRoundPips(g, p2x + s.BAR_WIDTH, p2y + s.BAR_HEIGHT + 6 + s.CE_BAR_HEIGHT + 6, this.p2Rounds, true);

        // ── Round display ──
        this.roundText.setText(`DEATHMATCH`);

        // ── Combo counters ──
        if (p1.comboSystem.getCount() > 1) {
            this.p1ComboText.setText(`${p1.comboSystem.getCount()} HITS!`);
            this.p1ComboText.setAlpha(1);
        } else {
            this.p1ComboText.setAlpha(0);
        }
        if (p2.comboSystem.getCount() > 1) {
            this.p2ComboText.setText(`${p2.comboSystem.getCount()} HITS!`);
            this.p2ComboText.setAlpha(1);
        } else {
            this.p2ComboText.setAlpha(0);
        }
    }

    drawHealthBar(g, x, y, ratio, width, mirrored) {
        const s = HUD_STYLE;
        ratio = Phaser.Math.Clamp(ratio, 0, 1);

        // Background
        g.fillStyle(s.BG_COLOR, 0.9);
        g.fillRect(x, y, width, s.BAR_HEIGHT);

        // Health fill
        let hpColor = s.HP_COLOR_HIGH;
        if (ratio < 0.5) hpColor = s.HP_COLOR_MED;
        if (ratio < 0.25) hpColor = s.HP_COLOR_LOW;

        const fillW = width * ratio;
        if (mirrored) {
            g.fillStyle(hpColor, 0.95);
            g.fillRect(x + width - fillW, y, fillW, s.BAR_HEIGHT);
        } else {
            g.fillStyle(hpColor, 0.95);
            g.fillRect(x, y, fillW, s.BAR_HEIGHT);
        }

        // Shine line
        g.fillStyle(0xFFFFFF, 0.15);
        g.fillRect(x, y, width, s.BAR_HEIGHT / 3);

        // Gold border
        g.lineStyle(s.BORDER_WIDTH, s.BORDER_COLOR, 1);
        g.strokeRect(x, y, width, s.BAR_HEIGHT);

        // Inner glow line
        g.lineStyle(1, s.BORDER_COLOR, 0.3);
        g.strokeRect(x + 2, y + 2, width - 4, s.BAR_HEIGHT - 4);
    }

    drawCEBar(g, x, y, ratio, width, mirrored, fatigued) {
        const s = HUD_STYLE;
        ratio = Phaser.Math.Clamp(ratio, 0, 1);

        // Background
        g.fillStyle(0x0A0A1E, 0.9);
        g.fillRect(x, y, width, s.CE_BAR_HEIGHT);

        // CE fill
        const ceColor = fatigued ? 0x444444 : s.CE_COLOR;
        const fillW = width * ratio;
        if (mirrored) {
            g.fillStyle(ceColor, 0.9);
            g.fillRect(x + width - fillW, y, fillW, s.CE_BAR_HEIGHT);
        } else {
            g.fillStyle(ceColor, 0.9);
            g.fillRect(x, y, fillW, s.CE_BAR_HEIGHT);
        }

        // Glow overlay
        if (!fatigued && ratio > 0.5) {
            g.fillStyle(s.CE_GLOW, 0.2);
            g.fillRect(x, y, width * ratio, s.CE_BAR_HEIGHT);
        }

        // Border
        g.lineStyle(2, s.BORDER_COLOR_DARK, 0.8);
        g.strokeRect(x, y, width, s.CE_BAR_HEIGHT);

        // Tier markers
        const tiers = [0.15, 0.3, 0.5, 0.75]; // 30/200, 60/200, 100/200, 150/200
        for (const t of tiers) {
            const mx = x + width * t;
            g.lineStyle(1, s.BORDER_COLOR, 0.5);
            g.lineBetween(mx, y, mx, y + s.CE_BAR_HEIGHT);
        }
    }

    drawAvatar(g, cx, cy, colors, mirrored) {
        const s = HUD_STYLE;
        const r = s.AVATAR_RADIUS;

        // Outer ornamental border
        g.lineStyle(s.AVATAR_BORDER + 2, s.BORDER_COLOR, 1);
        g.strokeCircle(cx, cy, r + 4);

        // Dark fill (behind portrait)
        g.fillStyle(0x0A0A1E, 1);
        g.fillCircle(cx, cy, r);

        // Energy glow ring
        g.lineStyle(2, colors.energy, 0.5);
        g.strokeCircle(cx, cy, r - 2);
    }

    drawRoundPips(g, x, y, wins, mirrored) {
        const pipSize = 6;
        const pipGap = 14;
        const needed = Math.ceil(ROUNDS.BEST_OF / 2);

        for (let i = 0; i < needed; i++) {
            const px = mirrored ? x - i * pipGap - pipSize : x + i * pipGap + pipSize;
            if (i < wins) {
                g.fillStyle(0xFFD700, 1);
                g.fillCircle(px, y, pipSize);
                g.lineStyle(1, 0xFFA500, 1);
                g.strokeCircle(px, y, pipSize);
            } else {
                g.fillStyle(0x333344, 0.8);
                g.fillCircle(px, y, pipSize);
                g.lineStyle(1, 0x555566, 0.5);
                g.strokeCircle(px, y, pipSize);
            }
        }
    }

    destroy() {
        this.stopTimer();
        this.graphics.destroy();
        this.p1ComboText.destroy();
        this.p2ComboText.destroy();
        this.timerText.destroy();
        this.roundText.destroy();
        this.p1NameText.destroy();
        this.p2NameText.destroy();
        if (this.p1Portrait) this.p1Portrait.destroy();
        if (this.p2Portrait) this.p2Portrait.destroy();
        if (this.p1PortraitMask) this.p1PortraitMask.destroy();
        if (this.p2PortraitMask) this.p2PortraitMask.destroy();
    }
}
