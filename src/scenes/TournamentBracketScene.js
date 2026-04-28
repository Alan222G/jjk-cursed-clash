// ========================================================
// TournamentBracketScene — Visual bracket with progression
// Runs sequential matches (bots use AI, player uses P1 controls)
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS } from '../config.js';

export default class TournamentBracketScene extends Phaser.Scene {
    constructor() { super({ key: 'TournamentBracketScene' }); }

    init(data) {
        this.bracketData = data.bracket || [];
        this.format = data.format || { slots: 2 };
        this.currentRound = 0;
        this.matchIndex = 0;
        this.rounds = [];
        this.matchResult = data.matchResult || null;
    }

    create() {
        this.sound.stopAll();
        try { this.sound.play('bgm_select', { volume: (window.gameSettings?.music ?? 50)/100*0.4, loop: true }); } catch(e){}

        // Dark background
        const bg = this.add.graphics();
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            const t = y / GAME_HEIGHT;
            bg.fillStyle((Math.floor(4+t*6)<<16)|(Math.floor(4+t*3)<<8)|Math.floor(10+t*14), 1);
            bg.fillRect(0, y, GAME_WIDTH, 4);
        }

        // Title
        this.add.text(GAME_WIDTH/2, 30, 'TOURNAMENT BRACKET', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#D4A843',
            stroke: '#000000', strokeThickness: 4, letterSpacing: 4
        }).setOrigin(0.5).setDepth(5);

        // Build bracket rounds if not already built
        if (this.rounds.length === 0) {
            this.buildBracket();
        }

        // Process match result from returning game
        if (this.matchResult !== null) {
            this.processMatchResult(this.matchResult);
        }

        // Draw bracket
        this.drawBracket();

        // Check if tournament is over
        if (this.isTournamentOver()) {
            this.showWinner();
        } else {
            this.showNextMatch();
        }
    }

    buildBracket() {
        // Round 0: Initial pairings
        let participants = [...this.bracketData];
        this.rounds = [];

        while (participants.length > 1) {
            const round = [];
            for (let i = 0; i < participants.length; i += 2) {
                round.push({
                    p1: participants[i],
                    p2: participants[i + 1] || { id: -1, charKey: 'BYE', name: 'BYE', isBot: true },
                    winner: null,
                    played: false,
                });
            }
            this.rounds.push(round);
            // Next round placeholders
            participants = round.map(() => null);
        }
    }

    processMatchResult(result) {
        const round = this.rounds[this.currentRound];
        if (!round) return;
        const match = round[this.matchIndex];
        if (!match) return;

        match.winner = result.winnerId === 0 ? match.p1 : match.p2;
        match.played = true;

        // Advance winner to next round
        if (this.currentRound + 1 < this.rounds.length) {
            const nextRound = this.rounds[this.currentRound + 1];
            const nextSlot = Math.floor(this.matchIndex / 2);
            const nextMatch = nextRound[nextSlot];
            if (nextMatch) {
                if (this.matchIndex % 2 === 0) nextMatch.p1 = match.winner;
                else nextMatch.p2 = match.winner;
            }
        }

        // Advance to next match
        this.matchIndex++;
        if (this.matchIndex >= round.length) {
            this.currentRound++;
            this.matchIndex = 0;
        }

        this.matchResult = null;
    }

    drawBracket() {
        const g = this.add.graphics().setDepth(3);
        const totalRounds = this.rounds.length;
        const bracketW = GAME_WIDTH - 100;
        const roundW = bracketW / totalRounds;

        this.rounds.forEach((round, ri) => {
            const x = 50 + ri * roundW + roundW / 2;
            const matchCount = round.length;
            const availH = GAME_HEIGHT - 140;
            const matchH = availH / matchCount;

            // Round label
            const roundLabel = ri === totalRounds - 1 ? 'FINAL' : ri === totalRounds - 2 ? 'SEMIS' : `ROUND ${ri + 1}`;
            this.add.text(x, 60, roundLabel, {
                fontFamily: 'Arial', fontSize: '12px', color: '#888899'
            }).setOrigin(0.5).setDepth(5);

            round.forEach((match, mi) => {
                const my = 100 + mi * matchH + matchH / 2;
                const cardW = Math.min(roundW - 20, 180);
                const cardH = 60;

                // Match card background
                const isCurrentMatch = ri === this.currentRound && mi === this.matchIndex;
                const bgColor = match.played ? 0x0A1A0A : (isCurrentMatch ? 0x1A1A3E : 0x0A0A18);
                const borderCol = match.played ? 0x44AA44 : (isCurrentMatch ? 0xFFD700 : 0x333355);

                g.fillStyle(bgColor, 0.9);
                g.fillRoundedRect(x - cardW/2, my - cardH/2, cardW, cardH, 6);
                g.lineStyle(2, borderCol, 0.8);
                g.strokeRoundedRect(x - cardW/2, my - cardH/2, cardW, cardH, 6);

                // P1 name
                const p1Name = match.p1 ? (match.p1.name || match.p1.charKey).substring(0, 10) : '???';
                const p1Color = match.winner === match.p1 ? '#44FF44' : (match.played && match.winner !== match.p1 ? '#666666' : '#CCCCDD');
                this.add.text(x, my - 12, p1Name, {
                    fontFamily: 'Arial', fontSize: '11px', color: p1Color
                }).setOrigin(0.5).setDepth(5);

                // VS divider
                g.lineStyle(1, 0x555555, 0.5);
                g.lineBetween(x - cardW/2 + 5, my, x + cardW/2 - 5, my);

                // P2 name
                const p2Name = match.p2 ? (match.p2.name || match.p2.charKey).substring(0, 10) : '???';
                const p2Color = match.winner === match.p2 ? '#44FF44' : (match.played && match.winner !== match.p2 ? '#666666' : '#CCCCDD');
                this.add.text(x, my + 12, p2Name, {
                    fontFamily: 'Arial', fontSize: '11px', color: p2Color
                }).setOrigin(0.5).setDepth(5);

                // Connection lines to next round
                if (ri < totalRounds - 1) {
                    const nextX = x + roundW;
                    const nextMatchCount = this.rounds[ri + 1].length;
                    const nextMatchH = availH / nextMatchCount;
                    const nextMi = Math.floor(mi / 2);
                    const nextMy = 100 + nextMi * nextMatchH + nextMatchH / 2;
                    g.lineStyle(2, 0x444466, 0.5);
                    g.lineBetween(x + cardW/2, my, nextX - cardW/2 - 10, nextMy);
                }
            });
        });
    }

    isTournamentOver() {
        const lastRound = this.rounds[this.rounds.length - 1];
        return lastRound && lastRound[0] && lastRound[0].played;
    }

    showWinner() {
        const lastRound = this.rounds[this.rounds.length - 1];
        const winner = lastRound[0].winner;

        this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, 500, 200, 0x000000, 0.85).setDepth(50);
        this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 40, '🏆 CHAMPION 🏆', {
            fontFamily: 'Arial Black', fontSize: '36px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(51);
        this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 20, (winner.name || winner.charKey).toUpperCase(), {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(51);

        const backBtn = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 70, 'PRESS ENTER TO RETURN', {
            fontFamily: 'Arial', fontSize: '16px', color: '#888899'
        }).setOrigin(0.5).setDepth(51);
        this.tweens.add({ targets: backBtn, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 });

        this.input.keyboard.once('keydown-ENTER', () => {
            this.sound.stopAll();
            this.scene.start('MenuScene');
        });
    }

    showNextMatch() {
        const round = this.rounds[this.currentRound];
        if (!round || !round[this.matchIndex]) return;
        const match = round[this.matchIndex];

        // Handle BYE
        if (match.p2.charKey === 'BYE') {
            match.winner = match.p1;
            match.played = true;
            this.matchIndex++;
            if (this.matchIndex >= round.length) {
                this.currentRound++;
                this.matchIndex = 0;
            }
            // Advance and redraw
            if (this.currentRound + 1 <= this.rounds.length) {
                this.scene.restart({ bracket: this.bracketData, format: this.format, matchResult: null });
            }
            return;
        }

        // Next match button
        const btnY = GAME_HEIGHT - 55;
        this.createMenuButton(GAME_WIDTH/2, btnY, `FIGHT: ${match.p1.name} vs ${match.p2.name}`, () => {
            // Both bots? Auto-resolve
            if (match.p1.isBot && match.p2.isBot) {
                const winner = Math.random() > 0.5 ? 0 : 1;
                this.scene.restart({
                    bracket: this.bracketData, format: this.format,
                    matchResult: { winnerId: winner }
                });
            } else {
                // Player plays the match
                const p1Key = match.p1.charKey;
                const p2Key = match.p2.charKey;
                // Store tournament state
                window._tournamentState = {
                    bracket: this.bracketData, format: this.format,
                    currentRound: this.currentRound, matchIndex: this.matchIndex,
                    rounds: this.rounds,
                };
                // Set bot control if opponent is bot
                const origP2Control = window.gameSettings.p2Control;
                if (match.p2.isBot) window.gameSettings.p2Control = 'cpu';
                else window.gameSettings.p2Control = 'humano';

                this.sound.stopAll();
                this.scene.start('MapSelectScene', { p1: p1Key, p2: p2Key, tournamentMode: true });
            }
        });
    }

    createMenuButton(x, y, label, callback) {
        const container = this.add.container(x, y).setDepth(20);
        const btnW = Math.max(320, label.length * 12); const btnH = 48;
        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.95);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        bg.lineStyle(3, 0xD4A843, 0.8);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        container.add(bg);
        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#FFFFFF', letterSpacing: 2
        }).setOrigin(0.5);
        container.add(text);
        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
        container.add(zone);
        zone.on('pointerover', () => { text.setColor('#FFD700'); });
        zone.on('pointerout', () => { text.setColor('#FFFFFF'); });
        zone.on('pointerdown', callback);
        return container;
    }
}
