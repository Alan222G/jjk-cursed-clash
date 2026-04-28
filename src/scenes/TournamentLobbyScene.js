// ========================================================
// TournamentLobbyScene — Smash Bros Style Tournament Lobby
// With Among Us-style room codes for online play
// Supports 8, 4, or 2 player brackets with Bot fill
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS } from '../config.js';
import networkManager from '../systems/NetworkManager.js';

const ALL_CHAR_KEYS = Object.keys(CHARACTERS);
const NORMAL_CHAR_KEYS = ALL_CHAR_KEYS.filter(k => k !== 'SUKUNA_20');
const FORMATS = [
    { label: '1 vs 1', slots: 2 },
    { label: '4 PLAYERS', slots: 4 },
    { label: '8 PLAYERS', slots: 8 },
];

export default class TournamentLobbyScene extends Phaser.Scene {
    constructor() { super({ key: 'TournamentLobbyScene' }); }

    init(data) {
        this.isOnline = false;
        this.roomCode = null;
        this.isHost = false;
        this.joinMode = false;
        // Sukuna 20 random luck event (25% chance per tournament)
        this.sukuna20Available = Math.random() < 0.25;
        this.sukuna20TakenBySlot = -1; // index of slot that has Sukuna 20, -1 = none
    }

    create() {
        this.sound.stopAll();
        try { this.sound.play('bgm_select', { volume: (window.gameSettings?.music ?? 50)/100*0.5, loop: true }); } catch(e){}

        // Background gradient
        const bg = this.add.graphics();
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            const t = y / GAME_HEIGHT;
            bg.fillStyle((Math.floor(5+t*8)<<16)|(Math.floor(5+t*4)<<8)|Math.floor(12+t*18), 1);
            bg.fillRect(0, y, GAME_WIDTH, 4);
        }

        // Title bar
        const titleBar = this.add.graphics();
        titleBar.fillStyle(0x1A1A2E, 0.95);
        titleBar.fillRect(0, 0, GAME_WIDTH, 70);
        titleBar.lineStyle(3, 0xD4A843, 0.8);
        titleBar.lineBetween(0, 70, GAME_WIDTH, 70);

        this.add.text(GAME_WIDTH/2, 35, 'TOURNAMENT', {
            fontFamily: 'Arial Black', fontSize: '32px', color: '#D4A843',
            stroke: '#000000', strokeThickness: 4, letterSpacing: 6
        }).setOrigin(0.5).setDepth(5);

        // Show initial mode selection: LOCAL or ONLINE
        this.showModeSelection();
    }

    // ══════════════════════════════════════════════
    // MODE SELECTION: Local vs Online
    // ══════════════════════════════════════════════
    showModeSelection() {
        this.modeElements = [];
        const cx = GAME_WIDTH / 2;

        // LOCAL button
        const localBtn = this.createBigButton(cx, 200, 'LOCAL', 'Juega en este dispositivo con bots', 0x4488FF, () => {
            this.clearModeElements();
            this.isOnline = false;
            this.isHost = true;
            this.showLobby();
        });
        this.modeElements.push(localBtn);

        // CREATE ONLINE ROOM button
        const createBtn = this.createBigButton(cx, 320, 'CREAR SALA ONLINE', 'Genera un código para que otros se unan', 0x44CC44, () => {
            this.clearModeElements();
            this.isOnline = true;
            this.isHost = true;
            this.createOnlineRoom();
        });
        this.modeElements.push(createBtn);

        // JOIN WITH CODE button
        const joinBtn = this.createBigButton(cx, 440, 'UNIRSE CON CÓDIGO', 'Ingresa el código de una sala existente', 0xFF8844, () => {
            this.clearModeElements();
            this.isOnline = true;
            this.isHost = false;
            this.showJoinScreen();
        });
        this.modeElements.push(joinBtn);

        // Back button
        const backBtn = this.createMenuButton(100, GAME_HEIGHT - 40, '◀ BACK', () => {
            this.sound.stopAll();
            this.scene.start('MenuScene');
        });
        this.modeElements.push(backBtn);
    }

    clearModeElements() {
        if (this.modeElements) {
            this.modeElements.forEach(e => { if (e && e.destroy) e.destroy(); });
            this.modeElements = [];
        }
    }

    // ══════════════════════════════════════════════
    // JOIN WITH CODE SCREEN (Among Us style)
    // ══════════════════════════════════════════════
    showJoinScreen() {
        this.joinElements = [];
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Dark panel
        const panel = this.add.graphics().setDepth(10);
        panel.fillStyle(0x0A0A18, 0.95);
        panel.fillRoundedRect(cx - 250, cy - 160, 500, 320, 16);
        panel.lineStyle(3, 0xFF8844, 0.8);
        panel.strokeRoundedRect(cx - 250, cy - 160, 500, 320, 16);
        this.joinElements.push(panel);

        // Title
        const title = this.add.text(cx, cy - 120, 'INGRESA EL CÓDIGO DE SALA', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#FF8844',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);
        this.joinElements.push(title);

        // Code input field visual
        this.joinCode = '';
        const inputBg = this.add.graphics().setDepth(11);
        inputBg.fillStyle(0x0D0D14, 1);
        inputBg.fillRoundedRect(cx - 160, cy - 50, 320, 60, 8);
        inputBg.lineStyle(2, 0x555577, 0.8);
        inputBg.strokeRoundedRect(cx - 160, cy - 50, 320, 60, 8);
        this.joinElements.push(inputBg);

        this.codeDisplayText = this.add.text(cx, cy - 20, '_ _ _ _ _ _ _ _', {
            fontFamily: 'Courier New', fontSize: '32px', color: '#FFFFFF',
            letterSpacing: 8
        }).setOrigin(0.5).setDepth(12);
        this.joinElements.push(this.codeDisplayText);

        // Error text
        this.joinErrorText = this.add.text(cx, cy + 30, '', {
            fontFamily: 'Arial', fontSize: '14px', color: '#FF4444'
        }).setOrigin(0.5).setDepth(11);
        this.joinElements.push(this.joinErrorText);

        // Instructions
        this.joinElements.push(this.add.text(cx, cy + 60, 'Escribe el código y presiona ENTER', {
            fontFamily: 'Arial', fontSize: '14px', color: '#666688'
        }).setOrigin(0.5).setDepth(11));

        // Buttons
        const joinBtn = this.createMenuButton(cx, cy + 110, 'UNIRSE', () => {
            this.attemptJoin();
        });
        joinBtn.setDepth(11);
        this.joinElements.push(joinBtn);

        const backBtn = this.createMenuButton(cx, cy + 160, '◀ VOLVER', () => {
            this.clearJoinElements();
            this.showModeSelection();
        });
        backBtn.setDepth(11);
        this.joinElements.push(backBtn);

        // Keyboard handler
        this._joinKeyHandler = (event) => {
            const key = event.key;
            if (key === 'Enter') {
                this.attemptJoin();
            } else if (key === 'Escape') {
                this.clearJoinElements();
                this.showModeSelection();
            } else if (key === 'Backspace') {
                this.joinCode = this.joinCode.slice(0, -1);
                this.updateCodeDisplay();
            } else if (key.length === 1 && this.joinCode.length < 8) {
                this.joinCode += key.toUpperCase();
                this.updateCodeDisplay();
            }
        };
        this.input.keyboard.on('keydown', this._joinKeyHandler);
    }

    updateCodeDisplay() {
        if (!this.codeDisplayText) return;
        let display = '';
        for (let i = 0; i < 8; i++) {
            display += i < this.joinCode.length ? this.joinCode[i] : '_';
            if (i < 7) display += ' ';
        }
        this.codeDisplayText.setText(display);
    }

    attemptJoin() {
        if (this.joinCode.length < 3) {
            this.joinErrorText.setText('El código es muy corto');
            return;
        }
        // Connect and try to join
        const serverUrl = window._jjkServerUrl || 'http://localhost:3001';
        networkManager.connect(serverUrl);
        networkManager.on('connected', () => {
            networkManager.joinRoom('JJK-' + this.joinCode, 'Player');
        });
        networkManager.on('joinedRoom', (state) => {
            this.roomCode = state.code;
            this.clearJoinElements();
            this.showLobby(state);
        });
        networkManager.on('error', (data) => {
            if (this.joinErrorText) {
                this.joinErrorText.setText(data.message || 'Error al unirse');
            }
        });
    }

    clearJoinElements() {
        if (this._joinKeyHandler) {
            this.input.keyboard.off('keydown', this._joinKeyHandler);
            this._joinKeyHandler = null;
        }
        if (this.joinElements) {
            this.joinElements.forEach(e => { if (e && e.destroy) e.destroy(); });
            this.joinElements = [];
        }
    }

    // ══════════════════════════════════════════════
    // CREATE ONLINE ROOM
    // ══════════════════════════════════════════════
    createOnlineRoom() {
        const serverUrl = window._jjkServerUrl || 'http://localhost:3001';
        networkManager.connect(serverUrl);

        // Show connecting status
        this.connectingText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2, 'Conectando al servidor...', {
            fontFamily: 'Arial', fontSize: '20px', color: '#AAAACC'
        }).setOrigin(0.5).setDepth(10);

        networkManager.on('connected', () => {
            const format = FORMATS[0];
            networkManager.createRoom('tournament', format, 'Host');
        });

        networkManager.on('roomCreated', (state) => {
            this.roomCode = state.code;
            if (this.connectingText) this.connectingText.destroy();
            this.showLobby(state);
        });

        networkManager.on('error', (data) => {
            if (this.connectingText) {
                this.connectingText.setText('Error: ' + (data.message || 'No se pudo conectar'));
                this.connectingText.setColor('#FF4444');
            }
        });

        // Timeout fallback
        this.time.delayedCall(5000, () => {
            if (!this.roomCode) {
                if (this.connectingText) {
                    this.connectingText.setText('No se pudo conectar.\nUsando modo local con código simulado.');
                    this.connectingText.setColor('#FFAA44');
                }
                // Fallback: create a local room with a generated code
                this.roomCode = 'JJK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                this.time.delayedCall(1500, () => {
                    if (this.connectingText) this.connectingText.destroy();
                    this.showLobby();
                });
            }
        });
    }

    // ══════════════════════════════════════════════
    // LOBBY (shared for local and online)
    // ══════════════════════════════════════════════
    showLobby(onlineState) {
        this.lobbyElements = [];

        // Format selector
        this.formatIndex = 0;
        this.formatText = this.add.text(GAME_WIDTH/2, 105, '', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(5);
        this.lobbyElements.push(this.formatText);

        const leftArrow = this.createArrowBtn(GAME_WIDTH/2 - 160, 105, '◀', () => this.changeFormat(-1));
        const rightArrow = this.createArrowBtn(GAME_WIDTH/2 + 160, 105, '▶', () => this.changeFormat(1));
        this.lobbyElements.push(leftArrow, rightArrow);

        // Room code display (big and prominent, Among Us style)
        if (this.roomCode || this.isOnline) {
            const code = this.roomCode || 'GENERATING...';
            const codeBg = this.add.graphics().setDepth(5);
            codeBg.fillStyle(0x112233, 0.9);
            codeBg.fillRoundedRect(GAME_WIDTH - 250, 80, 240, 55, 8);
            codeBg.lineStyle(2, 0x44AAFF, 0.8);
            codeBg.strokeRoundedRect(GAME_WIDTH - 250, 80, 240, 55, 8);
            this.lobbyElements.push(codeBg);

            this.lobbyElements.push(this.add.text(GAME_WIDTH - 130, 92, 'ROOM CODE', {
                fontFamily: 'Arial', fontSize: '10px', color: '#88AACC', letterSpacing: 3
            }).setOrigin(0.5).setDepth(6));

            this.roomCodeText = this.add.text(GAME_WIDTH - 130, 118, code.replace('JJK-', ''), {
                fontFamily: 'Courier New', fontSize: '24px', color: '#44FFAA',
                stroke: '#000000', strokeThickness: 2, letterSpacing: 4
            }).setOrigin(0.5).setDepth(6);
            this.lobbyElements.push(this.roomCodeText);
        }

        // Slot containers
        this.slots = [];
        this.slotContainers = [];
        this.setupSlots();

        // Bottom buttons
        const btnY = GAME_HEIGHT - 45;
        const backBtn = this.createMenuButton(140, btnY, '◀ BACK', () => {
            if (this.isOnline) networkManager.disconnect();
            this.clearLobbyElements();
            this.showModeSelection();
        });
        this.lobbyElements.push(backBtn);

        const startBtn = this.createMenuButton(GAME_WIDTH/2, btnY, 'START TOURNAMENT', () => {
            this.startTournament();
        });
        this.lobbyElements.push(startBtn);

        this.updateFormatDisplay();

        // Listen for online room updates
        if (this.isOnline) {
            networkManager.on('roomUpdated', (state) => {
                // Sync slots from server
                this.syncFromServer(state);
            });
        }
    }

    clearLobbyElements() {
        if (this.lobbyElements) {
            this.lobbyElements.forEach(e => { if (e && e.destroy) e.destroy(); });
            this.lobbyElements = [];
        }
        this.slotContainers.forEach(c => c.destroy());
        this.slotContainers = [];
    }

    setupSlots() {
        this.slotContainers.forEach(c => c.destroy());
        this.slotContainers = [];

        const format = FORMATS[this.formatIndex];
        const count = format.slots;
        this.slots = [];
        this.sukuna20TakenBySlot = -1;
        for (let i = 0; i < count; i++) {
            this.slots.push({
                type: i === 0 ? 'player' : 'bot',
                charKey: NORMAL_CHAR_KEYS[i % NORMAL_CHAR_KEYS.length],
                name: i === 0 ? 'PLAYER 1' : `BOT ${i}`,
                ready: i !== 0,
            });
        }
        this.renderSlots();
    }

    renderSlots() {
        this.slotContainers.forEach(c => c.destroy());
        this.slotContainers = [];

        const format = FORMATS[this.formatIndex];
        const count = format.slots;
        const cols = count <= 4 ? count : 4;
        const slotW = 200; const slotH = 280; const gap = 16;
        const totalW = cols * slotW + (cols-1) * gap;
        const startX = (GAME_WIDTH - totalW) / 2 + slotW / 2;
        const startY = 155;

        this.slots.forEach((slot, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const sx = startX + col * (slotW + gap);
            const sy = startY + row * (slotH + gap) + slotH / 2;

            const container = this.add.container(sx, sy).setDepth(10);
            this.slotContainers.push(container);

            // Card background
            const isPlayer = slot.type === 'player';
            const cardBg = this.add.graphics();
            cardBg.fillStyle(isPlayer ? 0x112244 : 0x1A1A1A, 0.9);
            cardBg.fillRoundedRect(-slotW/2, -slotH/2, slotW, slotH, 10);
            cardBg.lineStyle(2, isPlayer ? 0x4488FF : 0x555555, 0.9);
            cardBg.strokeRoundedRect(-slotW/2, -slotH/2, slotW, slotH, 10);
            container.add(cardBg);

            // Top strip
            const strip = this.add.graphics();
            strip.fillStyle(isPlayer ? 0x4488FF : 0x886600, 0.8);
            strip.fillRoundedRect(-slotW/2, -slotH/2, slotW, 30, {tl:10,tr:10,bl:0,br:0});
            container.add(strip);

            container.add(this.add.text(0, -slotH/2 + 15, `P${i+1}`, {
                fontFamily: 'Arial Black', fontSize: '14px',
                color: isPlayer ? '#FFFFFF' : '#FFCC00',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5));

            // Portrait
            const texKey = `menu_${slot.charKey.toLowerCase()}`;
            if (this.textures.exists(texKey)) {
                container.add(this.add.image(0, -slotH/2 + 105, texKey).setDisplaySize(130, 110));
            }

            // Character name
            const charData = CHARACTERS[slot.charKey];
            container.add(this.add.text(0, -slotH/2 + 175, charData?.name || slot.charKey, {
                fontFamily: 'Arial Black', fontSize: '11px', color: '#FFFFFF',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5));

            // Type label
            container.add(this.add.text(0, -slotH/2 + 195, isPlayer ? 'PLAYER' : 'BOT', {
                fontFamily: 'Arial', fontSize: '12px', color: isPlayer ? '#44AAFF' : '#FFAA00'
            }).setOrigin(0.5));

            // Toggle button
            const toggleBg = this.add.graphics();
            toggleBg.fillStyle(0x222233, 0.9);
            toggleBg.fillRoundedRect(-55, -slotH/2 + 210, 110, 26, 5);
            toggleBg.lineStyle(1, 0xD4A843, 0.4);
            toggleBg.strokeRoundedRect(-55, -slotH/2 + 210, 110, 26, 5);
            container.add(toggleBg);

            const toggleText = this.add.text(0, -slotH/2 + 223, isPlayer ? 'SET BOT' : 'SET PLAYER', {
                fontFamily: 'Arial', fontSize: '10px', color: '#CCCCDD'
            }).setOrigin(0.5);
            container.add(toggleText);

            const toggleZone = this.add.zone(0, -slotH/2 + 223, 110, 26).setInteractive({ useHandCursor: true });
            container.add(toggleZone);
            toggleZone.on('pointerdown', () => {
                slot.type = slot.type === 'player' ? 'bot' : 'player';
                slot.name = slot.type === 'player' ? `PLAYER ${i+1}` : `BOT ${i+1}`;
                slot.ready = slot.type === 'bot';
                this.renderSlots();
            });

            // Character change arrows
            const leftA = this.add.text(-slotW/2+12, -slotH/2+105, '◀', {
                fontFamily: 'Arial Black', fontSize: '18px', color: '#D4A843'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            container.add(leftA);
            leftA.on('pointerdown', () => {
                let idx = ALL_CHAR_KEYS.indexOf(slot.charKey);
                let newIdx = (idx - 1 + ALL_CHAR_KEYS.length) % ALL_CHAR_KEYS.length;
                // Skip SUKUNA_20 if unavailable or taken by another
                if (ALL_CHAR_KEYS[newIdx] === 'SUKUNA_20') {
                    if (!this.sukuna20Available || (this.sukuna20TakenBySlot >= 0 && this.sukuna20TakenBySlot !== i)) {
                        newIdx = (newIdx - 1 + ALL_CHAR_KEYS.length) % ALL_CHAR_KEYS.length;
                    }
                }
                if (slot.charKey === 'SUKUNA_20') this.sukuna20TakenBySlot = -1;
                slot.charKey = ALL_CHAR_KEYS[newIdx];
                if (slot.charKey === 'SUKUNA_20') this.sukuna20TakenBySlot = i;
                this.renderSlots();
            });

            const rightA = this.add.text(slotW/2-12, -slotH/2+105, '▶', {
                fontFamily: 'Arial Black', fontSize: '18px', color: '#D4A843'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            container.add(rightA);
            rightA.on('pointerdown', () => {
                let idx = ALL_CHAR_KEYS.indexOf(slot.charKey);
                let newIdx = (idx + 1) % ALL_CHAR_KEYS.length;
                if (ALL_CHAR_KEYS[newIdx] === 'SUKUNA_20') {
                    if (!this.sukuna20Available || (this.sukuna20TakenBySlot >= 0 && this.sukuna20TakenBySlot !== i)) {
                        newIdx = (newIdx + 1) % ALL_CHAR_KEYS.length;
                    }
                }
                if (slot.charKey === 'SUKUNA_20') this.sukuna20TakenBySlot = -1;
                slot.charKey = ALL_CHAR_KEYS[newIdx];
                if (slot.charKey === 'SUKUNA_20') this.sukuna20TakenBySlot = i;
                this.renderSlots();
            });

            // Ready indicator
            if (slot.ready) {
                container.add(this.add.text(0, slotH/2 - 18, 'READY', {
                    fontFamily: 'Arial Black', fontSize: '12px', color: '#44FF44',
                    stroke: '#000000', strokeThickness: 2
                }).setOrigin(0.5));
            }
        });
    }

    syncFromServer(state) {
        // Rebuild slots from server state
        this.slots = state.players.map((p, i) => ({
            type: p.isBot ? 'bot' : 'player',
            charKey: p.charKey,
            name: p.name,
            ready: p.ready,
        }));
        this.renderSlots();
    }

    changeFormat(dir) {
        this.formatIndex = (this.formatIndex + dir + FORMATS.length) % FORMATS.length;
        this.updateFormatDisplay();
        this.setupSlots();
    }

    updateFormatDisplay() {
        if (this.formatText) this.formatText.setText(FORMATS[this.formatIndex].label);
    }

    startTournament() {
        const format = FORMATS[this.formatIndex];
        const bracketData = this.slots.map((s, i) => ({
            id: i, charKey: s.charKey, name: s.name, isBot: s.type === 'bot',
        }));

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('TournamentBracketScene', { bracket: bracketData, format });
        });
    }

    // ══════════════════════════════════════════════
    // UI HELPERS
    // ══════════════════════════════════════════════
    createBigButton(x, y, label, subtitle, color, callback) {
        const container = this.add.container(x, y).setDepth(10);
        const btnW = 400; const btnH = 80;
        const bg = this.add.graphics();
        bg.fillStyle(0x0A0A18, 0.95);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        bg.lineStyle(3, color, 0.8);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        container.add(bg);

        container.add(this.add.text(0, -12, label, {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#FFFFFF', letterSpacing: 3
        }).setOrigin(0.5));
        container.add(this.add.text(0, 16, subtitle, {
            fontFamily: 'Arial', fontSize: '12px', color: '#888899'
        }).setOrigin(0.5));

        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
        container.add(zone);
        zone.on('pointerover', () => {
            bg.clear(); bg.fillStyle(Phaser.Display.Color.ComponentToHex(color) ? 0x1A1A3E : 0x1A1A3E, 0.95);
            bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
            bg.lineStyle(4, color, 1);
            bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        });
        zone.on('pointerout', () => {
            bg.clear(); bg.fillStyle(0x0A0A18, 0.95);
            bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
            bg.lineStyle(3, color, 0.8);
            bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        });
        zone.on('pointerdown', callback);
        return container;
    }

    createArrowBtn(x, y, label, cb) {
        const txt = this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#D4A843',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
        txt.on('pointerover', () => txt.setColor('#FFFFFF'));
        txt.on('pointerout', () => txt.setColor('#D4A843'));
        txt.on('pointerdown', cb);
        return txt;
    }

    createMenuButton(x, y, label, callback) {
        const container = this.add.container(x, y).setDepth(20);
        const btnW = 240; const btnH = 42;
        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.95);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        bg.lineStyle(2, 0xD4A843, 0.7);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        container.add(bg);
        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#FFFFFF', letterSpacing: 2
        }).setOrigin(0.5);
        container.add(text);
        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
        container.add(zone);
        zone.on('pointerover', () => {
            text.setColor('#FFD700');
            bg.clear(); bg.fillStyle(0x4A2288, 0.95);
            bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
            bg.lineStyle(3, 0xFFE066, 1);
            bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        });
        zone.on('pointerout', () => {
            text.setColor('#FFFFFF');
            bg.clear(); bg.fillStyle(0x1A1A2E, 0.95);
            bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
            bg.lineStyle(2, 0xD4A843, 0.7);
            bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
        });
        zone.on('pointerdown', callback);
        return container;
    }
}
