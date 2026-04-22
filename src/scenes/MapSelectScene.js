import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

const MAPS = [
    { id: 'abyss_of_despair.gif', name: 'ABYSS OF DESPAIR' },
    { id: 'abyssal_depths.gif', name: 'ABYSSAL DEPTHS' },
    { id: 'ancient_cursed_forest.webp', name: 'ANCIENT CURSED FOREST' },
    { id: 'castle_of_shadows.gif', name: 'CASTLE OF SHADOWS' },
    { id: 'cursed_battleground.gif', name: 'CURSED BATTLEGROUND' },
    { id: 'cursed_shore.gif', name: 'CURSED SHORE' },
    { id: 'demon_lord_castle.gif', name: 'DEMON LORD CASTLE' },
    { id: 'forbidden_shrine.gif', name: 'FORBIDDEN SHRINE' },
    { id: 'forest_of_despair.webp', name: 'FOREST OF DESPAIR' },
    { id: 'gateway_of_souls.gif', name: 'GATEWAY OF SOULS' },
    { id: 'heian_era_wasteland.gif', name: 'HEIAN ERA WASTELAND' },
    { id: 'heian_warship.gif', name: 'HEIAN WARSHIP' },
    { id: 'jujutsu_colosseum.gif', name: 'JUJUTSU COLOSSEUM' },
    { id: 'phantom_village.gif', name: 'PHANTOM VILLAGE' },
    { id: 'sacred_temple_dawn.gif', name: 'SACRED TEMPLE DAWN' },
    { id: 'sacred_temple_dusk.gif', name: 'SACRED TEMPLE DUSK' },
    { id: 'shattered_imperial_palace.gif', name: 'SHATTERED IMPERIAL PALACE' },
    { id: 'skyline_sanctuary.gif', name: 'SKYLINE SANCTUARY' },
    { id: 'sukunas_heian_throne.gif', name: 'SUKUNA\'S HEIAN THRONE' },
    { id: 'tectonic_cataclysm.gif', name: 'TECTONIC CATACLYSM' }
];

export default class MapSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapSelectScene' });
    }

    init(data) {
        this.p1Selection = data.p1;
        this.p2Selection = data.p2;
    }

    create() {
        // Stop all previous audio
        this.sound.stopAll();

        // Resume bgm_select if not playing
        const targetVol = (window.gameSettings?.music ?? 50) / 100 * 0.5;
        try {
            this.sound.play('bgm_select', { volume: targetVol, loop: true });
        } catch(e) { console.warn('Select BGM error', e); }

        // Background
        const bg = this.add.graphics();
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            const t = y / GAME_HEIGHT;
            const r = Math.floor(8 + t * 6);
            const g = Math.floor(8 + t * 4);
            const b = Math.floor(15 + t * 12);
            bg.fillStyle((r << 16) | (g << 8) | b, 1);
            bg.fillRect(0, y, GAME_WIDTH, 4);
        }

        // Title
        this.add.text(GAME_WIDTH / 2, 35, 'SELECT BATTLEGROUND', {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize: '36px',
            color: '#D4A843',
            stroke: '#000000',
            strokeThickness: 4,
            letterSpacing: 4,
        }).setOrigin(0.5).setDepth(5);

        // Deco line
        const deco = this.add.graphics().setDepth(4);
        deco.lineStyle(2, COLORS.MENU_GOLD, 0.5);
        deco.lineBetween(100, 65, GAME_WIDTH - 100, 65);

        // Back button
        this.createBackButton();

        // Layout parameters
        this.cols = 5;
        this.rows = Math.ceil((MAPS.length + 1) / this.cols); // +1 for RANDOM
        this.slotW = 140;
        this.slotH = 90;
        this.startX = GAME_WIDTH / 2 - (this.cols * this.slotW) / 2 + this.slotW / 2 + 150; // offset right
        this.startY = 150;

        // Create Grid Items
        this.gridItems = [];
        this.gridGraphics = this.add.graphics().setDepth(10);

        // Insert 'RANDOM' as the first option
        const displayMaps = [{ id: 'random', name: 'RANDOM' }, ...MAPS];

        displayMaps.forEach((mapData, i) => {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const x = this.startX + col * this.slotW;
            const y = this.startY + row * this.slotH;

            this.gridItems.push({ ...mapData, col, row, x, y });

            // Slot Background
            const box = this.add.graphics();
            box.fillStyle(0x0A0A18, 0.6);
            box.fillRect(x - this.slotW/2 + 5, y - this.slotH/2 + 5, this.slotW - 10, this.slotH - 10);
            box.lineStyle(2, 0x444466, 0.5);
            box.strokeRect(x - this.slotW/2 + 5, y - this.slotH/2 + 5, this.slotW - 10, this.slotH - 10);

            // Thumbnail (scaled down)
            if (mapData.id === 'random') {
                this.add.text(x, y - 10, '?', {
                    fontFamily: 'Arial Black', fontSize: '32px', color: '#D4A843'
                }).setOrigin(0.5);
            } else {
                const texKey = `map_${mapData.id.split('.')[0]}`;
                if (this.textures.exists(texKey)) {
                    this.add.image(x, y - 5, texKey)
                        .setDisplaySize(this.slotW - 14, this.slotH - 24)
                        .setDepth(5);
                }
            }

            // Name
            this.add.text(x, y + this.slotH/2 - 12, mapData.name.substring(0, 15), {
                fontFamily: 'Arial', fontSize: '10px', color: '#AAAACC'
            }).setOrigin(0.5).setDepth(6);
        });

        // Current Selection
        this.selectedRow = 0;
        this.selectedCol = 0;
        this.confirmed = false;

        // Preview Panel on the Left
        this.previewPanel = this.add.container(250, GAME_HEIGHT / 2);
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x0A0A18, 0.9);
        panelBg.fillRect(-220, -180, 440, 360);
        panelBg.lineStyle(3, 0xD4A843, 1);
        panelBg.strokeRect(-220, -180, 440, 360);
        this.previewPanel.add(panelBg);

        this.previewName = this.add.text(0, 140, '', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);
        this.previewPanel.add(this.previewName);

        this.previewDOM = this.add.dom(0, -20, 'img', 'width: 400px; height: 260px; object-fit: cover; border-radius: 4px; pointer-events: none; opacity: 1;');
        this.previewPanel.add(this.previewDOM);

        this.updatePreview();

        // Ready Text
        this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', {
            fontFamily: 'Arial Black, Impact', fontSize: '42px', color: '#FFD700',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(20).setAlpha(0);

        // Inputs
        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,NUMPAD_ONE,ESC');
        
        // P1
        this.keys.A.on('down', () => this.moveSelection(-1, 0));
        this.keys.D.on('down', () => this.moveSelection(1, 0));
        this.keys.W.on('down', () => this.moveSelection(0, -1));
        this.keys.S.on('down', () => this.moveSelection(0, 1));
        this.keys.J.on('down', () => this.confirmSelection());

        // P2 (Any player can choose map)
        this.keys.LEFT.on('down', () => this.moveSelection(-1, 0));
        this.keys.RIGHT.on('down', () => this.moveSelection(1, 0));
        this.keys.UP.on('down', () => this.moveSelection(0, -1));
        this.keys.DOWN.on('down', () => this.moveSelection(0, 1));
        this.keys.NUMPAD_ONE.on('down', () => this.confirmSelection());

        this.keys.ESC.on('down', () => {
            if (!this.confirmed) {
                this.sound.stopAll();
                this.previewDOM.node.style.display = 'none';
                this.scene.start('CharSelectScene');
            }
        });
    }

    moveSelection(dx, dy) {
        if (this.confirmed) return;
        
        try {
            this.sound.play('sfx_dash', { volume: 0.2 });
        } catch(e) {}

        let newCol = this.selectedCol + dx;
        let newRow = this.selectedRow + dy;

        if (newCol < 0) newCol = this.cols - 1;
        if (newCol >= this.cols) newCol = 0;

        if (newRow < 0) newRow = this.rows - 1;
        if (newRow >= this.rows) newRow = 0;

        // Check if the slot exists
        const index = newRow * this.cols + newCol;
        if (index >= this.gridItems.length) {
            // wrap to first valid item in that row or previous row
            if (dy > 0) {
                newRow = 0;
            } else if (dy < 0) {
                newRow = this.rows - 1;
                newCol = (this.gridItems.length - 1) % this.cols;
            } else if (dx > 0) {
                newRow++;
                if (newRow >= this.rows) newRow = 0;
                newCol = 0;
            } else if (dx < 0) {
                newRow--;
                if (newRow < 0) newRow = this.rows - 1;
                newCol = (this.gridItems.length - 1) % this.cols;
            }
        }

        this.selectedCol = newCol;
        this.selectedRow = newRow;

        this.updatePreview();
    }

    updatePreview() {
        const index = this.selectedRow * this.cols + this.selectedCol;
        const item = this.gridItems[index];
        if (!item) return;

        this.previewName.setText(item.name);

        if (item.id === 'random') {
            this.previewDOM.node.src = '';
            this.previewDOM.node.style.backgroundColor = '#000000';
        } else {
            this.previewDOM.node.src = `assets/maps/${item.id}`;
            this.previewDOM.node.style.backgroundColor = 'transparent';
        }
    }

    confirmSelection() {
        if (this.confirmed) return;
        this.confirmed = true;

        const index = this.selectedRow * this.cols + this.selectedCol;
        const item = this.gridItems[index];

        let finalMapId = item.id;
        let finalMapSrc = '';
        if (finalMapId === 'random') {
            const randomMap = MAPS[Math.floor(Math.random() * MAPS.length)];
            finalMapId = randomMap.id;
            this.previewName.setText(`RANDOM: ${randomMap.name}`);
            this.previewDOM.node.src = `assets/maps/${finalMapId}`;
            this.previewDOM.node.style.backgroundColor = 'transparent';
        }

        try {
            this.sound.play('heavy_smash', { volume: 0.5 });
        } catch(e) {}

        this.readyText.setText('MAP SELECTED!');
        this.readyText.setAlpha(1);
        this.tweens.add({
            targets: this.readyText,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 800,
        });

        // Fade out DOM element manually
        this.tweens.add({
            targets: this.previewDOM.node,
            opacity: 0,
            duration: 400,
            delay: 1200
        });

        this.time.delayedCall(1200, () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('GameScene', {
                    p1: this.p1Selection,
                    p2: this.p2Selection,
                    mapKey: finalMapId
                });
            });
        });
    }

    update() {
        this.gridGraphics.clear();
        
        const index = this.selectedRow * this.cols + this.selectedCol;
        const item = this.gridItems[index];

        if (item) {
            const x = item.x;
            const y = item.y;
            const halfW = this.slotW / 2 - 3;
            const halfH = this.slotH / 2 - 3;

            this.gridGraphics.lineStyle(4, 0xFFD700, 1);
            this.gridGraphics.strokeRect(x - halfW, y - halfH, halfW * 2, halfH * 2);

            // P1/P2 indicators
            this.gridGraphics.fillStyle(0x4488FF, 0.95);
            this.gridGraphics.fillTriangle(x - 9, y + halfH + 12, x + 9, y + halfH + 12, x, y + halfH + 4);
            
            this.gridGraphics.fillStyle(0xFF4444, 0.95);
            this.gridGraphics.fillTriangle(x - 9, y - halfH - 12, x + 9, y - halfH - 12, x, y - halfH - 4);
        }
    }

    createBackButton() {
        const container = this.add.container(70, 35).setDepth(10);
        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.8);
        bg.fillRoundedRect(-50, -16, 100, 32, 6);
        bg.lineStyle(2, 0xD4A843, 0.5);
        bg.strokeRoundedRect(-50, -16, 100, 32, 6);
        container.add(bg);

        const text = this.add.text(0, 0, '◀ BACK', {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '13px',
            color: '#AAAACC',
        }).setOrigin(0.5);
        container.add(text);

        const zone = this.add.zone(0, 0, 100, 32).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerdown', () => {
            if (!this.confirmed) {
                this.sound.stopAll();
                this.previewDOM.node.style.display = 'none';
                this.scene.start('CharSelectScene');
            }
        });
    }
}
