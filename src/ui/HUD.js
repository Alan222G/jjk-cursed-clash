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
        
        // Character keys for pause menu
        this.p1Key = null;
        this.p2Key = null;

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

        // Pause Button — styled like menu buttons
        const btnX = GAME_WIDTH / 2;
        const btnY = HUD_STYLE.TIMER_Y;
        const btnW = 100;
        const btnH = 32;
        
        // Button background (drawn in update for hover effect)
        this.pauseBtnGraphics = scene.add.graphics().setDepth(101).setScrollFactor(0);
        this.pauseBtnHover = false;
        
        // Draw initial button
        this._drawPauseButton(false);
        
        // ‖ symbol + text
        this.pauseBtn = scene.add.text(btnX, btnY + btnH / 2, 'II PAUSA', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '14px',
            color: '#D4A843',
            stroke: '#000000',
            strokeThickness: 3,
            letterSpacing: 2
        }).setDepth(102).setScrollFactor(0).setOrigin(0.5, 0.5);
        
        // Interactive zone on top
        this.pauseZone = scene.add.zone(btnX, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true })
            .setDepth(103).setScrollFactor(0);
            
        this.pauseZone.on('pointerover', () => {
            this.pauseBtnHover = true;
            this.pauseBtn.setColor('#FFFFFF');
            this._drawPauseButton(true);
        });
        this.pauseZone.on('pointerout', () => {
            this.pauseBtnHover = false;
            this.pauseBtn.setColor('#D4A843');
            this._drawPauseButton(false);
        });
        
        this.pauseZone.on('pointerdown', () => {
            if (scene.matchEnded) return;
            scene.physics.pause();
            scene.scene.pause();
            scene.scene.launch('PauseScene', { p1Key: this.p1Key, p2Key: this.p2Key });
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
        // Store keys for pause menu
        this.p1Key = p1Key;
        this.p2Key = p2Key;
        
        const ar = HUD_STYLE.AVATAR_RADIUS;
        const p1cx = HUD_STYLE.MARGIN + ar;
        const p2cx = GAME_WIDTH - HUD_STYLE.MARGIN - ar;
        const acy = 45;
        
        const p1Tex = `portrait_${p1Key.toLowerCase()}`;
        const p2Tex = `portrait_${p2Key.toLowerCase()}`;

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
            this.timerEvent.destroy();
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
        this.drawHealthBar(g, p1x, p1y, p1.getHpRatio(), s.BAR_WIDTH, false, p1.bloodPoisonActive);
        this.drawCEBar(g, p1x, p1y + s.BAR_HEIGHT + 6, p1.getCeRatio(), s.BAR_WIDTH, false, p1.ceSystem.isFatigued, p1.colors.energy);
        this.drawAvatar(g, s.MARGIN + s.AVATAR_RADIUS, 45, p1.colors, false);
        this.drawRoundPips(g, p1x, p1y + s.BAR_HEIGHT + 6 + s.CE_BAR_HEIGHT + 6, this.p1Rounds, false);

        // ── Player 2 (Right Side — mirrored) ──
        const p2x = GAME_WIDTH - s.AVATAR_RADIUS * 2 - s.MARGIN - 10 - s.BAR_WIDTH;
        const p2y = 22;
        this.drawHealthBar(g, p2x, p2y, p2.getHpRatio(), s.BAR_WIDTH, true, p2.bloodPoisonActive);
        this.drawCEBar(g, p2x, p2y + s.BAR_HEIGHT + 6, p2.getCeRatio(), s.BAR_WIDTH, true, p2.ceSystem.isFatigued, p2.colors.energy);
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

    drawHealthBar(g, x, y, ratio, width, mirrored, isPoisoned) {
        const s = HUD_STYLE;
        ratio = Phaser.Math.Clamp(ratio, 0, 1);
        const h = s.BAR_HEIGHT;

        // Background (Retro solid dark border style)
        g.fillStyle(0x000000, 1);
        g.fillRect(x - 2, y - 2, width + 4, h + 4);
        g.fillStyle(s.BG_COLOR, 1);
        g.fillRect(x, y, width, h);

        // Health fill
        let hpColor = s.HP_COLOR_HIGH;
        if (ratio < 0.5) hpColor = s.HP_COLOR_MED;
        if (ratio < 0.25) hpColor = s.HP_COLOR_LOW;
        if (isPoisoned) {
            hpColor = 0xAA00AA; // Purple for poisoned
            g.globalAlpha = 0.8 + Math.sin(this.scene.time.now * 0.005) * 0.2; // Pulsing alpha
        }

        const fillW = width * ratio;
        if (fillW > 0) {
            if (mirrored) {
                g.fillStyle(hpColor, 1);
                g.fillRect(x + width - fillW, y, fillW, h);
                // Retro top-shine (sharp block)
                g.fillStyle(0xFFFFFF, 0.2);
                g.fillRect(x + width - fillW, y, fillW, h / 3);
            } else {
                g.fillStyle(hpColor, 1);
                g.fillRect(x, y, fillW, h);
                // Retro top-shine
                g.fillStyle(0xFFFFFF, 0.2);
                g.fillRect(x, y, fillW, h / 3);
            }
        }
        
        g.globalAlpha = 1; // Reset alpha in case it was poisoned

        // Retro arcade segments (every 25%)
        g.lineStyle(1, 0x000000, 0.5);
        for(let i=1; i<4; i++) {
            const sx = x + (width / 4) * i;
            g.lineBetween(sx, y, sx, y + h);
        }

        // Thick retro gold border
        g.lineStyle(3, 0xD4A843, 1);
        g.strokeRect(x - 2, y - 2, width + 4, h + 4);
    }

    drawCEBar(g, x, y, ratio, width, mirrored, fatigued, ceColor) {
        const s = HUD_STYLE;
        ratio = Phaser.Math.Clamp(ratio, 0, 1);
        const h = s.CE_BAR_HEIGHT;

        // Background
        g.fillStyle(0x000000, 1);
        g.fillRect(x - 2, y - 2, width + 4, h + 4);
        g.fillStyle(0x0A0A1E, 1);
        g.fillRect(x, y, width, h);

        // CE fill — use character-specific energy color
        const ceBase = fatigued ? 0x444444 : (ceColor || 0x0055FF);
        const fillW = width * ratio;
        
        if (fillW > 0) {
            if (mirrored) {
                g.fillStyle(ceBase, 1);
                g.fillRect(x + width - fillW, y, fillW, h);
                g.fillStyle(0xFFFFFF, 0.25);
                g.fillRect(x + width - fillW, y, fillW, h / 2);
            } else {
                g.fillStyle(ceBase, 1);
                g.fillRect(x, y, fillW, h);
                g.fillStyle(0xFFFFFF, 0.25);
                g.fillRect(x, y, fillW, h / 2);
            }
        }

        // Border — use character CE color for border glow
        const borderColor = fatigued ? 0x666666 : (ceColor || 0x4488FF);
        g.lineStyle(2, borderColor, 1);
        g.strokeRect(x - 2, y - 2, width + 4, h + 4);

        // Tier markers (Divided into exactly 3 parts visually)
        const tiers = [1/3, 2/3];
        for (const t of tiers) {
            const mx = x + width * t;
            g.lineStyle(2, 0xFFFFFF, 0.8);
            g.lineBetween(mx, y, mx, y + h);
        }
    }

    drawAvatar(g, cx, cy, colors, mirrored) {
        const s = HUD_STYLE;
        const r = s.AVATAR_RADIUS;

        // Outer ornamental border (Retro thick block border)
        g.lineStyle(6, 0x000000, 1);
        g.strokeCircle(cx, cy, r + 4);

        // Dark fill (behind portrait)
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx, cy, r);

        // Inner solid border
        g.lineStyle(4, 0xD4A843, 1);
        g.strokeCircle(cx, cy, r + 2);

        // Energy glow ring
        g.lineStyle(2, colors.energy, 0.8);
        g.strokeCircle(cx, cy, r);
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

    _drawPauseButton(isHover) {
        const g = this.pauseBtnGraphics;
        g.clear();
        const btnX = GAME_WIDTH / 2;
        const btnY = HUD_STYLE.TIMER_Y;
        const btnW = 100;
        const btnH = 32;
        const x = btnX - btnW / 2;
        const y = btnY;
        
        // Background
        g.fillStyle(isHover ? 0x2A2A4E : 0x0A0A18, 0.85);
        g.fillRoundedRect(x, y, btnW, btnH, 6);
        // Border
        g.lineStyle(2, isHover ? 0xFFD700 : 0xD4A843, isHover ? 1 : 0.7);
        g.strokeRoundedRect(x, y, btnW, btnH, 6);
    }

    destroy() {
        this.stopTimer();
        this.graphics.destroy();
        this.p1ComboText.destroy();
        this.p2ComboText.destroy();
        this.roundText.destroy();
        this.p1NameText.destroy();
        this.p2NameText.destroy();
        if (this.pauseBtn) this.pauseBtn.destroy();
        if (this.pauseZone) this.pauseZone.destroy();
        if (this.pauseBtnGraphics) this.pauseBtnGraphics.destroy();
        if (this.p1Portrait) this.p1Portrait.destroy();
        if (this.p2Portrait) this.p2Portrait.destroy();
        if (this.p1PortraitMask) this.p1PortraitMask.destroy();
        if (this.p2PortraitMask) this.p2PortraitMask.destroy();
    }
}
