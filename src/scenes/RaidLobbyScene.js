// ========================================================
// RaidLobbyScene — Raid mode lobby (All vs Sukuna 20 Dedos)
// With Among Us-style room code for online play
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS } from '../config.js';
import networkManager from '../systems/NetworkManager.js';

const CHAR_KEYS = Object.keys(CHARACTERS).filter(k => k !== 'SUKUNA_20');

export default class RaidLobbyScene extends Phaser.Scene {
    constructor() { super({ key: 'RaidLobbyScene' }); }

    create() {
        this.sound.stopAll();
        try { this.sound.play('bgm_select', { volume: (window.gameSettings?.music ?? 50)/100*0.5, loop: true }); } catch(e){}
        this.isOnline = false;
        this.isHost = false;
        this.roomCode = null;

        // Background with red tint
        const bg = this.add.graphics();
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            const t = y / GAME_HEIGHT;
            bg.fillStyle((Math.floor(12+t*10)<<16)|(Math.floor(3+t*2)<<8)|Math.floor(3+t*4), 1);
            bg.fillRect(0, y, GAME_WIDTH, 4);
        }

        // Title
        const titleBar = this.add.graphics();
        titleBar.fillStyle(0x1A0A0A, 0.95);
        titleBar.fillRect(0, 0, GAME_WIDTH, 70);
        titleBar.lineStyle(3, 0xFF2200, 0.8);
        titleBar.lineBetween(0, 70, GAME_WIDTH, 70);

        this.add.text(GAME_WIDTH/2, 35, 'RAID — SUKUNA 20 FINGERS', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#FF4444',
            stroke: '#000000', strokeThickness: 4, letterSpacing: 4
        }).setOrigin(0.5).setDepth(5);

        this.showModeSelection();
    }

    // ══════════════════════════════════════════════
    // MODE SELECTION
    // ══════════════════════════════════════════════
    showModeSelection() {
        this.modeElements = [];
        const cx = GAME_WIDTH / 2;

        this.modeElements.push(this.createBigButton(cx, 180, 'LOCAL', 'Juega contra Sukuna con bots', 0xFF4444, () => {
            this.clearElements(this.modeElements);
            this.isOnline = false; this.isHost = true;
            this.showLobby();
        }));

        this.modeElements.push(this.createBigButton(cx, 290, 'CREAR SALA ONLINE', 'Genera código de sala', 0x44CC44, () => {
            this.clearElements(this.modeElements);
            this.isOnline = true; this.isHost = true;
            this.roomCode = 'JJK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            this.showLobby();
        }));

        this.modeElements.push(this.createBigButton(cx, 400, 'UNIRSE CON CÓDIGO', 'Ingresa código de sala', 0xFF8844, () => {
            this.clearElements(this.modeElements);
            this.isOnline = true; this.isHost = false;
            this.showJoinScreen();
        }));

        this.modeElements.push(this.createMenuButton(100, GAME_HEIGHT - 40, '◀ BACK', () => {
            this.sound.stopAll(); this.scene.start('MenuScene');
        }));
    }

    clearElements(arr) {
        if (arr) arr.forEach(e => { if (e && e.destroy) e.destroy(); });
        arr.length = 0;
    }

    // ══════════════════════════════════════════════
    // JOIN SCREEN
    // ══════════════════════════════════════════════
    showJoinScreen() {
        this.joinElements = [];
        const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
        this.joinCode = '';

        const panel = this.add.graphics().setDepth(10);
        panel.fillStyle(0x0A0A18, 0.95);
        panel.fillRoundedRect(cx-250, cy-140, 500, 280, 14);
        panel.lineStyle(3, 0xFF8844, 0.8);
        panel.strokeRoundedRect(cx-250, cy-140, 500, 280, 14);
        this.joinElements.push(panel);

        this.joinElements.push(this.add.text(cx, cy-100, 'INGRESA EL CÓDIGO DE SALA', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#FF8844', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(11));

        const inputBg = this.add.graphics().setDepth(11);
        inputBg.fillStyle(0x0D0D14, 1);
        inputBg.fillRoundedRect(cx-140, cy-40, 280, 50, 8);
        inputBg.lineStyle(2, 0x555577, 0.8);
        inputBg.strokeRoundedRect(cx-140, cy-40, 280, 50, 8);
        this.joinElements.push(inputBg);

        this.codeDisplayText = this.add.text(cx, cy-15, '_ _ _ _ _ _', {
            fontFamily: 'Courier New', fontSize: '28px', color: '#FFFFFF', letterSpacing: 6
        }).setOrigin(0.5).setDepth(12);
        this.joinElements.push(this.codeDisplayText);

        this.joinElements.push(this.add.text(cx, cy+30, 'Escribe el código y presiona ENTER', {
            fontFamily: 'Arial', fontSize: '13px', color: '#666688'
        }).setOrigin(0.5).setDepth(11));

        const joinBtn = this.createMenuButton(cx, cy+75, 'UNIRSE', () => {
            if (this.joinCode.length >= 3) {
                this.roomCode = 'JJK-' + this.joinCode;
                this.clearElements(this.joinElements);
                if (this._joinKeyHandler) { this.input.keyboard.off('keydown', this._joinKeyHandler); }
                this.showLobby();
            }
        });
        joinBtn.setDepth(11);
        this.joinElements.push(joinBtn);

        const backBtn = this.createMenuButton(cx, cy+120, '◀ VOLVER', () => {
            this.clearElements(this.joinElements);
            if (this._joinKeyHandler) { this.input.keyboard.off('keydown', this._joinKeyHandler); }
            this.showModeSelection();
        });
        backBtn.setDepth(11);
        this.joinElements.push(backBtn);

        this._joinKeyHandler = (event) => {
            if (event.key === 'Backspace') { this.joinCode = this.joinCode.slice(0,-1); }
            else if (event.key === 'Enter' && this.joinCode.length >= 3) {
                this.roomCode = 'JJK-' + this.joinCode;
                this.clearElements(this.joinElements);
                this.input.keyboard.off('keydown', this._joinKeyHandler);
                this.showLobby();
            } else if (event.key.length === 1 && this.joinCode.length < 6) {
                this.joinCode += event.key.toUpperCase();
            }
            if (this.codeDisplayText) {
                let d = '';
                for (let i = 0; i < 6; i++) { d += i < this.joinCode.length ? this.joinCode[i] : '_'; if (i<5) d+=' '; }
                this.codeDisplayText.setText(d);
            }
        };
        this.input.keyboard.on('keydown', this._joinKeyHandler);
    }

    // ══════════════════════════════════════════════
    // LOBBY
    // ══════════════════════════════════════════════
    showLobby() {
        this.lobbyElements = [];

        // Info
        this.lobbyElements.push(this.add.text(GAME_WIDTH/2, 95, 'Un jugador al azar será SUKUNA FORMA VERDADERA (15,000 HP)', {
            fontFamily: 'Arial', fontSize: '13px', color: '#CC8888', align: 'center'
        }).setOrigin(0.5).setDepth(5));

        // Room code (if online)
        if (this.roomCode) {
            const codeBg = this.add.graphics().setDepth(5);
            codeBg.fillStyle(0x110A0A, 0.9);
            codeBg.fillRoundedRect(GAME_WIDTH-240, 80, 230, 50, 8);
            codeBg.lineStyle(2, 0xFF4444, 0.7);
            codeBg.strokeRoundedRect(GAME_WIDTH-240, 80, 230, 50, 8);
            this.lobbyElements.push(codeBg);
            this.lobbyElements.push(this.add.text(GAME_WIDTH-125, 90, 'ROOM CODE', {
                fontFamily: 'Arial', fontSize: '9px', color: '#CC8888', letterSpacing: 3
            }).setOrigin(0.5).setDepth(6));
            this.lobbyElements.push(this.add.text(GAME_WIDTH-125, 115, this.roomCode.replace('JJK-',''), {
                fontFamily: 'Courier New', fontSize: '22px', color: '#FF6644',
                stroke: '#000000', strokeThickness: 2, letterSpacing: 4
            }).setOrigin(0.5).setDepth(6));
        }

        // Slot count selector
        this.slotCount = 4;
        const counts = [2, 4, 8];
        let countIdx = 1;

        this.lobbyElements.push(this.add.text(GAME_WIDTH/2 - 100, 130, 'CHALLENGERS:', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#CCCCDD'
        }).setOrigin(0, 0.5).setDepth(5));

        this.countText = this.add.text(GAME_WIDTH/2 + 60, 130, `${this.slotCount}`, {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#FF4444'
        }).setOrigin(0.5).setDepth(5);
        this.lobbyElements.push(this.countText);

        this.lobbyElements.push(this.createArrowBtn(GAME_WIDTH/2+30, 130, '◀', () => {
            countIdx = (countIdx-1+counts.length)%counts.length;
            this.slotCount = counts[countIdx]; this.countText.setText(`${this.slotCount}`);
            this.rebuildSlots();
        }));
        this.lobbyElements.push(this.createArrowBtn(GAME_WIDTH/2+90, 130, '▶', () => {
            countIdx = (countIdx+1)%counts.length;
            this.slotCount = counts[countIdx]; this.countText.setText(`${this.slotCount}`);
            this.rebuildSlots();
        }));

        this.slotContainer = this.add.container(0, 0).setDepth(10);
        this.lobbyElements.push(this.slotContainer);
        this.slots = [];
        this.rebuildSlots();

        const btnY = GAME_HEIGHT - 45;
        this.lobbyElements.push(this.createMenuButton(140, btnY, '◀ BACK', () => {
            this.clearElements(this.lobbyElements);
            this.showModeSelection();
        }));
        this.lobbyElements.push(this.createMenuButton(GAME_WIDTH/2, btnY, 'BEGIN RAID', () => this.startRaid()));
    }

    rebuildSlots() {
        this.slots = [];
        for (let i = 0; i < this.slotCount; i++) {
            this.slots.push({
                type: i === 0 ? 'player' : 'bot',
                charKey: CHAR_KEYS[i % CHAR_KEYS.length],
                name: i === 0 ? 'PLAYER 1' : `BOT ${i}`,
            });
        }
        this.renderSlots();
    }

    renderSlots() {
        this.slotContainer.removeAll(true);
        const cols = Math.min(this.slotCount, 4);
        const slotW = 160; const slotH = 210; const gap = 12;
        const totalW = cols * slotW + (cols-1) * gap;
        const startX = (GAME_WIDTH - totalW) / 2 + slotW / 2;
        const startY = 165;

        this.slots.forEach((slot, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const sx = startX + col * (slotW + gap);
            const sy = startY + row * (slotH + gap + 5) + slotH / 2;

            const cardBg = this.add.graphics();
            cardBg.fillStyle(slot.type === 'player' ? 0x112244 : 0x1A1A1A, 0.9);
            cardBg.fillRoundedRect(sx-slotW/2, sy-slotH/2, slotW, slotH, 8);
            cardBg.lineStyle(2, slot.type === 'player' ? 0x4488FF : 0x555555, 0.8);
            cardBg.strokeRoundedRect(sx-slotW/2, sy-slotH/2, slotW, slotH, 8);
            this.slotContainer.add(cardBg);

            const texKey = `menu_${slot.charKey.toLowerCase()}`;
            if (this.textures.exists(texKey)) {
                this.slotContainer.add(this.add.image(sx, sy - 25, texKey).setDisplaySize(100, 85));
            }

            const charData = CHARACTERS[slot.charKey];
            this.slotContainer.add(this.add.text(sx, sy + 45, charData?.name || slot.charKey, {
                fontFamily: 'Arial', fontSize: '10px', color: '#FFFFFF'
            }).setOrigin(0.5));

            this.slotContainer.add(this.add.text(sx, sy + 62, slot.type === 'player' ? 'PLAYER' : 'BOT', {
                fontFamily: 'Arial', fontSize: '10px', color: slot.type === 'player' ? '#44AAFF' : '#FFAA00'
            }).setOrigin(0.5));

            // Toggle
            const tZone = this.add.zone(sx, sy + 82, 80, 22).setInteractive({ useHandCursor: true });
            this.slotContainer.add(tZone);
            const tBg = this.add.graphics();
            tBg.fillStyle(0x222233, 0.9); tBg.fillRoundedRect(sx-40, sy+71, 80, 22, 4);
            this.slotContainer.add(tBg);
            this.slotContainer.add(this.add.text(sx, sy+82, 'TOGGLE', { fontFamily:'Arial', fontSize:'9px', color:'#AAAACC' }).setOrigin(0.5));
            tZone.on('pointerdown', () => {
                slot.type = slot.type === 'player' ? 'bot' : 'player';
                slot.name = slot.type === 'player' ? `PLAYER ${i+1}` : `BOT ${i+1}`;
                this.renderSlots();
            });

            // Character arrows
            const la = this.add.text(sx-slotW/2+10, sy-25, '◀', {
                fontFamily:'Arial Black', fontSize:'14px', color:'#D4A843'
            }).setOrigin(0.5).setInteractive({useHandCursor:true});
            this.slotContainer.add(la);
            la.on('pointerdown', () => {
                const idx = CHAR_KEYS.indexOf(slot.charKey);
                slot.charKey = CHAR_KEYS[(idx-1+CHAR_KEYS.length)%CHAR_KEYS.length];
                this.renderSlots();
            });
            const ra = this.add.text(sx+slotW/2-10, sy-25, '▶', {
                fontFamily:'Arial Black', fontSize:'14px', color:'#D4A843'
            }).setOrigin(0.5).setInteractive({useHandCursor:true});
            this.slotContainer.add(ra);
            ra.on('pointerdown', () => {
                const idx = CHAR_KEYS.indexOf(slot.charKey);
                slot.charKey = CHAR_KEYS[(idx+1)%CHAR_KEYS.length];
                this.renderSlots();
            });
        });
    }

    startRaid() {
        const sukunaIdx = Math.floor(Math.random() * this.slots.length);
        const challengers = this.slots.filter((_, i) => i !== sukunaIdx).map((s, i) => ({
            id: i, charKey: s.charKey, name: s.name, isBot: s.type === 'bot',
        }));
        for (let i = challengers.length-1; i > 0; i--) {
            const j = Math.floor(Math.random()*(i+1));
            [challengers[i], challengers[j]] = [challengers[j], challengers[i]];
        }
        window._raidState = {
            sukunaPlayer: this.slots[sukunaIdx],
            sukunaIsBot: this.slots[sukunaIdx].type === 'bot',
            challengers, currentFightIdx: 0, sukunaHp: 15000,
        };
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => this.scene.start('RaidFightScene'));
    }

    // ══════════════════════════════════════════════
    // UI HELPERS
    // ══════════════════════════════════════════════
    createBigButton(x, y, label, subtitle, color, cb) {
        const container = this.add.container(x, y).setDepth(10);
        const btnW = 380; const btnH = 75;
        const bg = this.add.graphics();
        bg.fillStyle(0x0A0A18, 0.95);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        bg.lineStyle(3, color, 0.8);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        container.add(bg);
        container.add(this.add.text(0, -10, label, {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FFFFFF', letterSpacing: 3
        }).setOrigin(0.5));
        container.add(this.add.text(0, 14, subtitle, {
            fontFamily: 'Arial', fontSize: '11px', color: '#888899'
        }).setOrigin(0.5));
        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({useHandCursor:true});
        container.add(zone);
        zone.on('pointerover', () => { bg.clear(); bg.fillStyle(0x1A1A3E,0.95); bg.fillRoundedRect(-btnW/2,-btnH/2,btnW,btnH,12); bg.lineStyle(4,color,1); bg.strokeRoundedRect(-btnW/2,-btnH/2,btnW,btnH,12); });
        zone.on('pointerout', () => { bg.clear(); bg.fillStyle(0x0A0A18,0.95); bg.fillRoundedRect(-btnW/2,-btnH/2,btnW,btnH,12); bg.lineStyle(3,color,0.8); bg.strokeRoundedRect(-btnW/2,-btnH/2,btnW,btnH,12); });
        zone.on('pointerdown', cb);
        return container;
    }

    createArrowBtn(x, y, label, cb) {
        const txt = this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#FF4444', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(5).setInteractive({useHandCursor:true});
        txt.on('pointerdown', cb);
        return txt;
    }

    createMenuButton(x, y, label, cb) {
        const container = this.add.container(x, y).setDepth(20);
        const btnW = 220; const btnH = 40;
        const bg = this.add.graphics();
        bg.fillStyle(0x1A0A0A, 0.95);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        bg.lineStyle(2, 0xFF2200, 0.7);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        container.add(bg);
        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#FFFFFF', letterSpacing: 2
        }).setOrigin(0.5);
        container.add(text);
        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({useHandCursor:true});
        container.add(zone);
        zone.on('pointerover', () => text.setColor('#FF6644'));
        zone.on('pointerout', () => text.setColor('#FFFFFF'));
        zone.on('pointerdown', cb);
        return container;
    }
}
