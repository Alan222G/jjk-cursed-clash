// ========================================================
// GameScene — Escena principal de combate
// ========================================================

import Phaser from 'phaser';
import Gojo from '../entities/fighters/Gojo.js';
import Sukuna from '../entities/fighters/Sukuna.js';
import HUD from '../ui/HUD.js';
import DamageNumbers from '../ui/DamageNumbers.js';
import ScreenEffects from '../ui/ScreenEffects.js';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from '../config.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.p1Key = data.p1 || 'GOJO';
        this.p2Key = data.p2 || 'SUKUNA';
    }

    create() {
        // ── Background ──
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_shibuya').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

        // ── Groups ──
        this.projectiles = [];
        
        // ── Entities ──
        this.p1 = this.createFighter(this.p1Key, 300, PHYSICS.GROUND_Y - 50, 0);
        this.p2 = this.createFighter(this.p2Key, 980, PHYSICS.GROUND_Y - 50, 1);
        
        this.p1.opponent = this.p2;
        this.p2.opponent = this.p1;

        // ── Systems ──
        this.hud = new HUD(this);
        this.hud.setNames(this.p1.fighterName, this.p2.fighterName);
        this.hud.startTimer();
        
        this.damageNumbers = new DamageNumbers(this);
        this.screenEffects = new ScreenEffects(this);

        // ── Collisions ──
        this.physics.add.overlap(this.p1.hitbox, this.p2.sprite, () => {
            this.p1.onHitOpponent(this.p2);
        });
        this.physics.add.overlap(this.p2.hitbox, this.p1.sprite, () => {
            this.p2.onHitOpponent(this.p1);
        });

        // ── Domain System ──
        this.domainActive = false;
        this.domainOwner = null;
        this.domainBg = null;
    }

    createFighter(key, x, y, index) {
        if (key === 'GOJO') return new Gojo(this, x, y, index);
        if (key === 'SUKUNA') return new Sukuna(this, x, y, index);
        return new Gojo(this, x, y, index);
    }

    onDomainActivated(owner, domainType) {
        if (this.domainActive) {
            // Initiate Domain Clash
            this.scene.pause();
            this.scene.launch('DomainClashScene', {
                p1: this.p1,
                p2: this.p2,
                callback: (winner) => {
                    this.scene.resume();
                    const winObj = winner === 'P1' ? this.p1 : this.p2;
                    const loseObj = winner === 'P1' ? this.p2 : this.p1;
                    this.handleDomainWin(winObj, domainType);
                }
            });
        } else {
            this.handleDomainWin(owner, domainType);
        }
    }

    handleDomainWin(owner, domainType) {
        this.domainActive = true;
        this.domainOwner = owner;
        this.screenEffects.domainFlash();
        
        // Change background
        const bgKey = owner.charData.domainBg;
        if (this.domainBg) this.domainBg.destroy();
        this.domainBg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-1);
    }

    onDomainEnd(owner) {
        this.domainActive = false;
        if (this.domainBg) this.domainBg.destroy();
        this.domainBg = null;
    }

    spawnDamageNumber(x, y, amount) {
        this.damageNumbers.spawn(x, y, amount);
    }

    update(time, delta) {
        this.p1.update(time, delta);
        this.p2.update(time, delta);

        this.hud.update(this.p1, this.p2);

        // Projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.update(delta);
            
            // Collision check
            const target = p.owner === this.p1 ? this.p2 : this.p1;
            if (this.physics.overlap(p.getBody(), target.sprite)) {
                p.onHit(target);
                return false;
            }
            
            return p.isAlive();
        });

        // Sure-Hit Ticks
        if (this.domainActive && this.time.now % 500 < 20) {
            this.domainOwner.applySureHitTick(this.domainOwner === this.p1 ? this.p2 : this.p1);
        }
    }
}
