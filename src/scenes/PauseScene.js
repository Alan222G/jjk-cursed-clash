// ========================================================
// PauseScene — Scrollable Pause Menu with Dynamic Controls
// Audio settings fixed at top, character-specific controls
// in a scrollable masked container below.
// ========================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CHARACTERS } from '../config.js';
import AIManager from '../systems/AIManager.js';

// ── Per-character control data factory ──────────────────
function getCharacterControls(charKey, playerIndex) {
    const char = CHARACTERS[charKey];
    if (!char) return [];

    const isP1 = playerIndex === 0;
    const sk = char.skills;

    // Movement keys
    const moveKeys = isP1
        ? { left: 'A', right: 'D', up: 'W', down: 'S', block: 'Shift' }
        : { left: '←', right: '→', up: '↑', down: '↓', block: 'Num0' };

    const atkKeys = isP1
        ? { light: 'J', medium: 'K', heavy: 'L', special: 'U', domain: 'I' }
        : { light: 'Num1', medium: 'Num2', heavy: 'Num3', special: 'Num4', domain: 'Num5' };

    const sections = [];

    // ── MOVEMENT ──
    sections.push({
        title: 'MOVIMIENTO',
        lines: [
            `${moveKeys.left} / ${moveKeys.right} — Caminar`,
            `${moveKeys.up} — Saltar`,
            `${moveKeys.down} — Agacharse / Modificador`,
            `${moveKeys.block} — Bloquear`,
        ]
    });

    // ── BASIC ATTACKS ──
    sections.push({
        title: 'COMBO FÍSICO',
        lines: [
            `${atkKeys.light} — Golpe (x3 stun, x4 lanzamiento)`,
        ]
    });

    // ── CHARACTER-SPECIFIC SPECIALS ──
    if (charKey === 'GOJO') {
        sections.push({
            title: 'TÉCNICAS MALDITAS',
            lines: [
                `${atkKeys.special} — ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `${atkKeys.special}+${moveKeys.down} — ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
                `${moveKeys.block}+${moveKeys.down} — Alternar Infinito`,
            ]
        });
        sections.push({
            title: 'EXPANSIÓN DE DOMINIO',
            lines: [
                `${atkKeys.domain} — ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Parálisis total del oponente`,
                `El dominio dura mientras la voz suene`,
            ]
        });
    } else if (charKey === 'SUKUNA') {
        sections.push({
            title: 'TÉCNICAS MALDITAS',
            lines: [
                `${atkKeys.special} — ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `${atkKeys.special}+${moveKeys.up} — Embestida  (${sk.skill1.cost} CE)`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `${atkKeys.special}+${moveKeys.down} — ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
            ]
        });
        sections.push({
            title: 'EXPANSIÓN DE DOMINIO',
            lines: [
                `${atkKeys.domain} — ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Cortes continuos de daño`,
                `El oponente puede moverse pero recibe daño`,
            ]
        });
    } else if (charKey === 'TOJI') {
        sections.push({
            title: 'ARSENAL DE ARMAS',
            lines: [
                `${atkKeys.special}+${moveKeys.down} — Cambiar Arma`,
                `  Playful Cloud → Soul Katana → Inverted Spear`,
                `${atkKeys.special} — Buff Físico  (50 CE)`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — Especial del Arma`,
                `  Cloud: Ráfaga multi-golpe`,
                `  Katana: Postura de Contraataque (teleport)`,
                `  Spear: Postura de Contraataque (destruye proyectil)`,
            ]
        });
        sections.push({
            title: 'MODIFICADORES DE ARMA',
            lines: [
                `${atkKeys.domain} (con Cloud) — Afilar (sangrado)`,
                `${atkKeys.domain} (con Katana) — Robo de Vida 10s`,
                `${atkKeys.domain} (con Spear) — Modo Cadena / Romper Dominio`,
                `Sin Dominio — Toji no tiene energía maldita`,
            ]
        });
    } else if (charKey === 'KENJAKU') {
        sections.push({
            title: 'MANIPULACION DE ESPIRITUS',
            lines: [
                `${atkKeys.special} -- Invocar Espiritu Maldito  (${sk.skill1.cost} CE)`,
                `  Tipo actual depende del selector`,
                `${moveKeys.block}+${moveKeys.down} -- Cambiar Tipo de Espiritu`,
                `  Tonta > Tanque > Distancia > Control`,
                `${atkKeys.special}+${isP1 ? '<- / ->' : '<- / ->'} -- Gusano dirigido  (${sk.skill1.cost} CE)`,
                `${atkKeys.special}+${moveKeys.down} -- ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
            ]
        });
        sections.push({
            title: 'EXPANSION DE DOMINIO',
            lines: [
                `${atkKeys.domain} -- ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Gravedad aplastante continua`,
            ]
        });
    } else if (charKey === 'ISHIGORI') {
        sections.push({
            title: 'TECNICAS MALDITAS',
            lines: [
                `${atkKeys.special} -- ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `${atkKeys.special}+${isP1 ? '<- / ->' : '<- / ->'} -- ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `${atkKeys.special}+${moveKeys.down} -- ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
            ]
        });
        sections.push({
            title: 'EXPANSION DE DOMINIO',
            lines: [
                `${atkKeys.domain} -- ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Rafagas de energia maldita concentrada`,
            ]
        });
    } else if (charKey === 'KUROROSHI') {
        sections.push({
            title: 'TECNICAS MALDITAS',
            lines: [
                `${atkKeys.special} -- ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `${atkKeys.special}+${isP1 ? '<- / ->' : '<- / ->'} -- ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `${atkKeys.special}+${moveKeys.down} -- ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
            ]
        });
        sections.push({
            title: 'EXPANSION DE DOMINIO',
            lines: [
                `${atkKeys.domain} -- ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Enjambre de plagas devoradoras`,
            ]
        });
    } else if (charKey === 'SUKUNA_20') {
        sections.push({
            title: 'TÉCNICAS MALDITAS (FORMA VERDADERA)',
            lines: [
                `${atkKeys.special} — ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `  Triple corte simultáneo (3 proyectiles)`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — Dominio Simple  (15+ CE)`,
                `  Escudo intocable por 10s (como Infinito)`,
                `  Consume CE constante + extra al recibir ataques`,
                `${atkKeys.special}+${moveKeys.down} — ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
                `  Red de cortes gigante + SANGRADO (30 dmg/s, 8s)`,
            ]
        });
        sections.push({
            title: 'HABILIDADES PASIVAS',
            lines: [
                `Técnica Cursed Inversa: Regenera 15 HP/s`,
                `4 Brazos: Mayor alcance de combate`,
                `HP Dinámico: Se ajusta según número de oponentes`,
            ]
        });
        sections.push({
            title: 'EXPANSIÓN DE DOMINIO',
            lines: [
                `${atkKeys.domain} — ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Dominio sin barrera, cortes devastadores`,
                `80 daño por tick (mejorado)`,
            ]
        });
    } else if (charKey === 'YUJI') {
        sections.push({
            title: 'TÉCNICAS MALDITAS (SHINJUKU)',
            lines: [
                `${atkKeys.special} — ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `  Golpe físico + explosión de CE retardada (200ms)`,
                `${atkKeys.special}+${moveKeys.up} — Soul Dismantle  (15 CE)`,
                `  3 cortes de alma heredados de Sukuna`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `  Rayo de sangre de alta velocidad`,
                `${atkKeys.special}+${moveKeys.down} — ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
                `  5 Black Flash consecutivos garantizados (x2.5 dmg c/u)`,
            ]
        });
        sections.push({
            title: 'HABILIDADES PASIVAS',
            lines: [
                `Black Flash x2: DOBLE probabilidad de Black Flash`,
                `Sin Dominio: No puede activar expansión de dominio`,
                `Instinto de Combate: Velocidad superior (370)`,
            ]
        });
    } else if (charKey === 'MAHITO') {
        sections.push({
            title: 'TÉCNICAS MALDITAS (TRANSFIGURACIÓN)',
            lines: [
                `${atkKeys.special} — ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `  Transforma brazo en cuchilla (5s, +40% daño)`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `  Invoca humano transfigurado (ataca al oponente)`,
                `${atkKeys.special}+${moveKeys.up} — Body Repel  (35 CE)`,
                `  Explosión de almas AOE (4 proyectiles)`,
                `${atkKeys.special}+${moveKeys.down} — ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
                `  Forma verdadera 120% (15s, x2 poder, x1.8 def)`,
            ]
        });
        sections.push({
            title: 'HABILIDADES PASIVAS',
            lines: [
                `Defensa de Alma: 25% reducción de daño físico`,
                `Transfiguración: Inmunidad parcial a ataques normales`,
            ]
        });
        sections.push({
            title: 'EXPANSIÓN DE DOMINIO',
            lines: [
                `${atkKeys.domain} — ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `Efecto: Toque de alma garantizado (60 dmg/tick)`,
                `Ignora defensa, daño directo al HP`,
            ]
        });
    } else if (charKey === 'YUTA') {
        sections.push({
            title: 'TÉCNICAS MALDITAS (YUTA + RIKA)',
            lines: [
                `${atkKeys.special} — ${sk.skill1.name}  (${sk.skill1.cost} CE)`,
                `  Dash + 3 cortes de katana + golpe final de Rika`,
                `${atkKeys.special}+${moveKeys.up} — Discurso Maldito  (25 CE)`,
                `  Stun 2s en cono frontal (auto-daño 3%)`,
                `${atkKeys.special}+${isP1 ? '← / →' : '← / →'} — ${sk.skill2.name}  (${sk.skill2.cost} CE)`,
                `  Onda de choque que IGNORA bloqueo`,
                `${atkKeys.special}+${moveKeys.down} — ${sk.maximum.name}  (${sk.maximum.cost} CE)`,
                `  Rayo de amor rosa gigante (CHOQUE con otros rayos)`,
            ]
        });
        sections.push({
            title: 'EXPANSIÓN DE DOMINIO',
            lines: [
                `${atkKeys.domain} — ${sk.domain.name}  (${sk.domain.cost} CE)`,
                `MENOR COSTO DE CE DEL JUEGO (60 CE)`,
                `Efecto: COPIA las habilidades del rival`,
                `  (excepto dominios) durante toda la duración`,
            ]
        });
    }

    // ── UNIVERSAL MECHANICS ──
    sections.push({
        title: 'MECÁNICAS UNIVERSALES',
        lines: [
            `Black Flash: Probabilidad aleatoria al golpear (x2.5 daño)`,
            `Domain Clash: Si ambos activan dominio a la vez → QTE`,
            `ESC — Pausar / Reanudar`,
        ]
    });

    return sections;
}

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    init(data) {
        this.p1Key = data?.p1Key || 'GOJO';
        this.p2Key = data?.p2Key || 'SUKUNA';
    }

    create() {
        // ── Dark overlay ──
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0).setDepth(0);

        // Pause BGM
        try { this.sound.pauseAll(); } catch(e) {}
        try {
            this.sound.play('musica_pausa', { volume: (window.gameSettings?.music ?? 50) / 100 * 0.6, loop: true });
        } catch(e) {}

        const cx = GAME_WIDTH / 2;

        // ════════════════════════════════════
        // FIXED HEADER: Title + Audio Settings
        // ════════════════════════════════════
        const headerBg = this.add.graphics().setDepth(30);
        headerBg.fillStyle(0x0A0A14, 0.97);
        headerBg.fillRoundedRect(cx - 470, 15, 940, 165, 12);
        headerBg.lineStyle(3, 0xD4A843, 0.8);
        headerBg.strokeRoundedRect(cx - 470, 15, 940, 165, 12);

        // Title
        this.add.text(cx, 45, 'PAUSA', {
            fontFamily: 'Arial Black', fontSize: '40px', color: '#FFFFFF',
            stroke: '#D4A843', strokeThickness: 5, letterSpacing: 4
        }).setOrigin(0.5).setDepth(31);

        // ── Audio Sliders (fixed) ──
        const sliderBaseY = 90;

        this.add.text(cx - 80, sliderBaseY, 'MÚSICA:', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#CCCCDD'
        }).setOrigin(1, 0.5).setDepth(31);
        this.musicText = this.add.text(cx + 130, sliderBaseY, `${window.gameSettings?.music ?? 50}%`, {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#D4A843'
        }).setOrigin(0, 0.5).setDepth(31);
        this.createSlider(cx - 60, sliderBaseY, 'music');

        this.add.text(cx - 80, sliderBaseY + 40, 'EFECTOS:', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#CCCCDD'
        }).setOrigin(1, 0.5).setDepth(31);
        this.sfxText = this.add.text(cx + 130, sliderBaseY + 40, `${window.gameSettings?.sfx ?? 50}%`, {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#D4A843'
        }).setOrigin(0, 0.5).setDepth(31);
        this.createSlider(cx - 60, sliderBaseY + 40, 'sfx');

        // Hint for scrolling
        this.add.text(cx, 168, '↓  Desplaza con la rueda del ratón para ver los controles  ↓', {
            fontFamily: 'Arial', fontSize: '12px', color: '#666688', fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(31);

        // ── P2 Control Toggle (CPU / Human) — In-Game ──
        if (!window.gameSettings.p2Control) window.gameSettings.p2Control = 'cpu';
        
        const p2CtrlY = sliderBaseY + 80;
        this.add.text(cx - 80, p2CtrlY, 'P2 CONTROL:', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#CCCCDD'
        }).setOrigin(1, 0.5).setDepth(31);
        
        this.p2CtrlToggle = this.add.text(cx + 20, p2CtrlY, window.gameSettings.p2Control.toUpperCase(), {
            fontFamily: 'Arial Black', fontSize: '16px',
            color: window.gameSettings.p2Control === 'cpu' ? '#D4A843' : '#44CCFF'
        }).setOrigin(0, 0.5).setDepth(31).setInteractive({ useHandCursor: true });
        
        this.p2CtrlToggle.on('pointerdown', () => {
            window.gameSettings.p2Control = window.gameSettings.p2Control === 'cpu' ? 'humano' : 'cpu';
            this.p2CtrlToggle.setText(window.gameSettings.p2Control.toUpperCase());
            this.p2CtrlToggle.setColor(window.gameSettings.p2Control === 'cpu' ? '#D4A843' : '#44CCFF');
            this.saveSettings();
            
            // Apply immediately to current game
            const gameScene = this.scene.get('GameScene');
            if (gameScene) {
                if (window.gameSettings.p2Control === 'humano') {
                    gameScene.aiManager = null;
                } else {
                    gameScene.aiManager = new AIManager(gameScene.p2, gameScene.p1);
                }
            }
        });

        // ════════════════════════════════════
        // SCROLLABLE AREA: Controls
        // ════════════════════════════════════
        const scrollAreaTop = 195;
        const scrollAreaBottom = GAME_HEIGHT - 85;
        const scrollAreaHeight = scrollAreaBottom - scrollAreaTop;
        const scrollAreaWidth = 920;

        // Panel background for scroll area
        const scrollBg = this.add.graphics().setDepth(4);
        scrollBg.fillStyle(0x0D0D18, 0.92);
        scrollBg.fillRoundedRect(cx - scrollAreaWidth / 2, scrollAreaTop, scrollAreaWidth, scrollAreaHeight, 10);
        scrollBg.lineStyle(2, 0x333355, 0.6);
        scrollBg.strokeRoundedRect(cx - scrollAreaWidth / 2, scrollAreaTop, scrollAreaWidth, scrollAreaHeight, 10);

        // ── Create the container for scrollable content ──
        this.scrollContainer = this.add.container(0, 0).setDepth(10);

        // Build content inside the container
        let yPos = scrollAreaTop + 20;

        // Section title
        const sectionTitle = this.add.text(cx, yPos, '— CONTROLES DE COMBATE —', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#D4A843', letterSpacing: 3
        }).setOrigin(0.5);
        this.scrollContainer.add(sectionTitle);
        yPos += 40;

        // ── P1 Character Card ──
        yPos = this.buildCharacterCard(cx, yPos, this.p1Key, 0, scrollAreaWidth - 40);
        yPos += 25;

        // ── P2 Character Card ──
        yPos = this.buildCharacterCard(cx, yPos, this.p2Key, 1, scrollAreaWidth - 40);
        yPos += 20;

        // ── Store total content height for scroll bounds ──
        this.contentHeight = yPos - scrollAreaTop;
        this.scrollAreaTop = scrollAreaTop;
        this.scrollAreaHeight = scrollAreaHeight;
        this.scrollY = 0;
        this.maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight + 30);

        // ── Geometry Mask for scroll clipping ──
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(cx - scrollAreaWidth / 2, scrollAreaTop, scrollAreaWidth, scrollAreaHeight);
        const mask = maskShape.createGeometryMask();
        this.scrollContainer.setMask(mask);

        // ── Scrollbar indicator ──
        if (this.maxScroll > 0) {
            const sbX = cx + scrollAreaWidth / 2 - 8;
            const sbTrackH = scrollAreaHeight - 20;

            this.scrollTrack = this.add.rectangle(sbX, scrollAreaTop + 10, 6, sbTrackH, 0x222244, 0.5)
                .setOrigin(0.5, 0).setDepth(15);

            const thumbH = Math.max(30, (scrollAreaHeight / this.contentHeight) * sbTrackH);
            this.scrollThumb = this.add.rectangle(sbX, scrollAreaTop + 10, 6, thumbH, 0xD4A843, 0.7)
                .setOrigin(0.5, 0).setDepth(16);
            this.scrollThumb.setStrokeStyle(1, 0xFFE066, 0.5);
            this.scrollThumbHeight = thumbH;
            this.scrollTrackHeight = sbTrackH;
        }

        // ── Mouse wheel scrolling ──
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.doScroll(deltaY * 0.5);
        });

        // ── Mouse click-and-drag scrolling ──
        this.dragScrollZone = this.add.rectangle(
            cx, scrollAreaTop + scrollAreaHeight / 2,
            scrollAreaWidth - 20, scrollAreaHeight,
            0x000000, 0
        ).setDepth(14).setInteractive({ useHandCursor: false });

        this.isDragging = false;
        this.lastDragY = 0;

        this.dragScrollZone.on('pointerdown', (pointer) => {
            this.isDragging = true;
            this.lastDragY = pointer.y;
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isDragging) return;
            const deltaY = this.lastDragY - pointer.y;
            this.lastDragY = pointer.y;
            this.doScroll(deltaY * 1.5);
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

        // ── Arrow key scrolling ──
        this.input.keyboard.on('keydown-DOWN', () => this.doScroll(40));
        this.input.keyboard.on('keydown-UP', () => this.doScroll(-40));
        // Also S/W for P1
        this.input.keyboard.on('keydown-S', () => this.doScroll(40));
        this.input.keyboard.on('keydown-W', () => this.doScroll(-40));

        // ════════════════════════════════════
        // FIXED FOOTER: Buttons
        // ════════════════════════════════════
        const btnY = GAME_HEIGHT - 42;

        this.createMenuButton(cx - 200, btnY, 'REANUDAR', () => {
            this.resumeGame();
        });

        this.createMenuButton(cx + 200, btnY, 'ABANDONAR PARTIDA', () => {
            this.sound.stopAll();
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        });

        // ESC to resume
        this.input.keyboard.on('keydown-ESC', () => {
            this.resumeGame();
        });
    }

    // ═══════════════════════════════════════════
    // Scroll Logic
    // ═══════════════════════════════════════════
    doScroll(amount) {
        this.scrollY = Phaser.Math.Clamp(this.scrollY + amount, 0, this.maxScroll);
        this.scrollContainer.y = -this.scrollY;

        // Update scrollbar thumb position
        if (this.scrollThumb && this.maxScroll > 0) {
            const ratio = this.scrollY / this.maxScroll;
            const trackRange = this.scrollTrackHeight - this.scrollThumbHeight;
            this.scrollThumb.y = this.scrollAreaTop + 10 + ratio * trackRange;
        }
    }

    // ═══════════════════════════════════════════
    // Build a Character Control Card
    // ═══════════════════════════════════════════
    buildCharacterCard(cx, startY, charKey, playerIndex, cardWidth) {
        const char = CHARACTERS[charKey];
        if (!char) return startY;

        const isP1 = playerIndex === 0;
        const accentColor = isP1 ? 0x4488FF : 0xFF4444;
        const accentHex = isP1 ? '#4488FF' : '#FF4444';
        const labelColor = isP1 ? '#AACCFF' : '#FFAACC';
        const playerLabel = isP1 ? 'JUGADOR 1' : 'JUGADOR 2';

        let yPos = startY;

        // ── Card Border & Background ──
        const sections = getCharacterControls(charKey, playerIndex);

        // Pre-calculate card height (approximate)
        let cardContentLines = 0;
        sections.forEach(s => { cardContentLines += 1 + s.lines.length; }); // title + lines per section
        const cardHeight = 55 + cardContentLines * 22 + sections.length * 18;

        const cardG = this.add.graphics();
        cardG.fillStyle(0x111122, 0.7);
        cardG.fillRoundedRect(cx - cardWidth / 2, yPos, cardWidth, cardHeight, 8);
        cardG.lineStyle(2, accentColor, 0.6);
        cardG.strokeRoundedRect(cx - cardWidth / 2, yPos, cardWidth, cardHeight, 8);

        // Top accent bar
        cardG.fillStyle(accentColor, 0.15);
        cardG.fillRoundedRect(cx - cardWidth / 2, yPos, cardWidth, 40, { tl: 8, tr: 8, bl: 0, br: 0 });

        this.scrollContainer.add(cardG);

        // ── Player + Character Name Header ──
        const headerText = this.add.text(cx - cardWidth / 2 + 20, yPos + 12, `${playerLabel}  ·  ${char.name.toUpperCase()}`, {
            fontFamily: 'Arial Black', fontSize: '18px', color: accentHex,
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0, 0);
        this.scrollContainer.add(headerText);

        const titleText = this.add.text(cx + cardWidth / 2 - 20, yPos + 14, char.title, {
            fontFamily: 'Arial', fontSize: '14px', color: '#888899', fontStyle: 'italic'
        }).setOrigin(1, 0);
        this.scrollContainer.add(titleText);

        yPos += 50;

        // ── Control Sections ──
        sections.forEach(section => {
            // Section title
            const secTitle = this.add.text(cx - cardWidth / 2 + 30, yPos, section.title, {
                fontFamily: 'Arial Black', fontSize: '13px', color: '#D4A843'
            }).setOrigin(0, 0);
            this.scrollContainer.add(secTitle);
            yPos += 22;

            // Lines
            section.lines.forEach(line => {
                const lineText = this.add.text(cx - cardWidth / 2 + 45, yPos, line, {
                    fontFamily: 'Arial', fontSize: '13px', color: labelColor
                }).setOrigin(0, 0);
                this.scrollContainer.add(lineText);
                yPos += 20;
            });

            yPos += 8; // Spacing between sections
        });

        return yPos;
    }

    // ═══════════════════════════════════════════
    // Resume Game
    // ═══════════════════════════════════════════
    resumeGame() {
        this.sound.stopByKey('musica_pausa');
        this.sound.resumeAll();

        const mainScene = this.scene.get('GameScene');
        if (mainScene) {
            mainScene.scene.resume();
            mainScene.physics.resume();
        }
        this.scene.stop();
    }

    // ═══════════════════════════════════════════
    // Audio Slider
    // ═══════════════════════════════════════════
    createSlider(x, y, type) {
        let currentVal = window.gameSettings?.[type] ?? 50;
        const sliderW = 170;

        const bg = this.add.rectangle(x, y, sliderW, 12, 0x222233).setOrigin(0, 0.5).setDepth(31);
        bg.setStrokeStyle(2, 0x444455);

        const fillW = (currentVal / 100) * sliderW;
        const fill = this.add.rectangle(x, y, fillW, 12, 0xD4A843).setOrigin(0, 0.5).setDepth(32);

        const knob = this.add.circle(x + fillW, y, 10, 0xFFFFFF).setInteractive({ useHandCursor: true }).setDepth(33);
        knob.setStrokeStyle(3, 0x886611);

        this.input.setDraggable(knob);

        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject !== knob) return;
            const newX = Phaser.Math.Clamp(dragX, x, x + sliderW);
            knob.x = newX;
            const percentage = (newX - x) / sliderW;
            fill.width = percentage * sliderW;
            const val = Math.round(percentage * 100);
            window.gameSettings[type] = val;

            if (type === 'music') {
                this.musicText.setText(`${val}%`);
                const pauseMusic = this.sound.get('musica_pausa');
                if (pauseMusic) pauseMusic.setVolume((val / 100) * 0.6);
            } else {
                this.sfxText.setText(`${val}%`);
            }
            this.saveSettings();
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (gameObject === knob && type === 'sfx') {
                try {
                    let vol = (window.gameSettings.sfx ?? 50) / 100;
                    this.sound.play('sfx_slash', { volume: vol });
                } catch(e) {}
            }
        });
    }

    saveSettings() {
        localStorage.setItem('jjk_settings', JSON.stringify(window.gameSettings));
    }

    // ═══════════════════════════════════════════
    // Menu Button
    // ═══════════════════════════════════════════
    createMenuButton(x, y, label, callback) {
        const container = this.add.container(x, y).setDepth(30);
        const btnW = 320;
        const btnH = 52;

        const bg = this.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.95);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
        bg.lineStyle(3, 0xD4A843, 0.8);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
        container.add(bg);

        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FFFFFF', letterSpacing: 2
        }).setOrigin(0.5);
        container.add(text);

        const zone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerover', () => {
            text.setColor('#FFD700');
            bg.clear();
            bg.fillStyle(0x4A2288, 0.95);
            bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            bg.lineStyle(4, 0xFFE066, 1);
            bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
        });

        zone.on('pointerout', () => {
            text.setColor('#FFFFFF');
            bg.clear();
            bg.fillStyle(0x1A1A2E, 0.95);
            bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            bg.lineStyle(3, 0xD4A843, 0.8);
            bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
        });

        zone.on('pointerdown', callback);
        return container;
    }

    saveSettings() {
        localStorage.setItem('jjk_settings', JSON.stringify(window.gameSettings));
    }
}
