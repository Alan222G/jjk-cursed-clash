// ========================================================
// Toji Fushiguro — The Sorcerer Killer
// Zero CE Fighter — Stances, Counters, and \% Damage
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, ATTACKS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

const WEAPONS = [
    { name: 'Playful Cloud', key: 'cloud', color: 0x55FF55 },
    { name: 'Soul Katana', key: 'katana', color: 0xFF44AA },
    { name: 'Inverted Spear', key: 'spear', color: 0x88CCFF },
];

export default class Toji extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.TOJI);
        this.isCasting = false;
        
        // Weapon switching
        this.currentWeaponIndex = 0;
        this.switchCooldown = 0;
        this.weaponSwitchText = null;

        // Weapon states
        this.cloudSharp = false; // Bleed toggle
        this.katanaLifestealTimer = 0; // Lifesteal toggle
        this.spearChainMode = false; // Chain range toggle

        // Buff state
        this.buffTimer = 0;
        
        // Counter Stance tracking
        this.counterStanceWeapon = null; // 'katana' or 'spear'
        this.counterTimer = 0;
    }

    get currentWeapon() {
        return WEAPONS[this.currentWeaponIndex];
    }

    /** Overrides default basic attacks depending on active weapon & state */
    getBasicAttackData(type) {
        const base = { ...ATTACKS[type] }; // clone

        // If in counter stance, you cannot do basic attacks until it finishes
        if (this.counterTimer > 0) return null;

        if (this.currentWeapon.key === 'cloud') {
            // Playful Cloud Overrides
            if (type === 'LIGHT') {
                base.breaksBlock = true;
                base.knockbackX = 350;
                base.damage = 30;
                base.stunDuration = 400;
            } else if (type === 'HEAVY') {
                base.knockbackX = 1200; // Launch across map
                base.knockbackY = -400;
                base.damage = 60;
            }
            if (this.cloudSharp) {
                base.onHit = (attacker, victim, dmg) => {
                    victim.applyBleed(3000); // 3 seconds of bleed
                };
            }
        } 
        else if (this.currentWeapon.key === 'katana') {
            // Katana Overrides
            base.ignoresBlockDamage = true; // Damage passes through shield
            
            // Set percent damage based on attack type
            if (type === 'LIGHT') base.percentDamage = 0.02; // 2%
            if (type === 'MEDIUM') base.percentDamage = 0.04; // 4%
            if (type === 'HEAVY') base.percentDamage = 0.07; // 7%

            if (this.katanaLifestealTimer > 0) {
                base.onHit = (attacker, victim, dmg) => {
                    attacker.hp = Math.min(attacker.charData.stats.maxHp, attacker.hp + Math.floor(dmg * 0.5));
                };
            }
        }
        else if (this.currentWeapon.key === 'spear') {
            // Inverted Spear Overrides
            if (this.spearChainMode) {
                // Extended range
                base.range = 300;
                base.hitboxW = 100;
                base.startup += 50; // Slower because of chain
                base.recovery += 100;
            }
        }

        return base;
    }

    drawFace(g, x, y, facing) {
        g.fillStyle(0x222222, 1);
        g.fillRect(x - 7 * facing, y - 3, 4, 2);
        g.fillRect(x + 3 * facing, y - 3, 4, 2);
        g.lineStyle(1, 0x884444, 0.8);
        g.beginPath();
        g.moveTo(x - 3, y + 3);
        g.lineTo(x + 4, y + 5);
        g.strokePath();
    }

    /** Override drawBody — Toji's unique muscular design + Inventory Curse + weapons */
    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x;
        const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;

        if (this.isDead) {
            g.fillStyle(0x111118, 0.5);
            g.fillEllipse(x, y + 20, 80, 25);
            return;
        }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.004);

        const skinColor = isFlashing ? 0xFFFFFF : 0xeec7b8;
        const clothesColor = isFlashing ? 0xFFFFFF : 0x111113;
        const pantsColor = isFlashing ? 0xFFFFFF : 0xe5e7eb;
        const wormColor = isFlashing ? 0xFFFFFF : 0x6b327a;
        const hairColor = isFlashing ? 0xFFFFFF : 0x000000;
        const jointColor = isFlashing ? 0xFFFFFF : 0x22c55e;

        const ox = x;
        const oy = masterY;

        const rotArmSup = isMoving ? Math.sin(time) * 10 : 5;
        const rotLegSup = isMoving ? Math.cos(time) * 4 : 0;
        const rotLegInf = isMoving ? Math.cos(time + 0.5) * 3 : 0;

        // ── Legs (white/grey baggy pants) ──
        this.drawRect(g, ox - 7, oy + 41, 9, 28, pantsColor, rotLegSup);
        this.drawCircle(g, ox - 7, oy + 54, 4, jointColor); // Green knee
        this.drawRect(g, ox - 7, oy + 67, 8, 25, pantsColor, rotLegInf);

        this.drawRect(g, ox + 7, oy + 41, 9, 28, pantsColor, -rotLegSup);
        this.drawCircle(g, ox + 7, oy + 54, 4, jointColor); // Green knee
        this.drawRect(g, ox + 7, oy + 67, 8, 25, pantsColor, -rotLegInf);

        // ── Inventory Curse (behind shoulder) ──
        if (!isFlashing) {
            this.drawCircle(g, ox - 15, oy - 18, 11, wormColor);
            this.drawCircle(g, ox - 18, oy - 21, 1.5, 0x000000);
            this.drawCircle(g, ox - 13, oy - 19, 1.5, 0x000000);
            this.drawCircle(g, ox - 12, oy - 2, 7, wormColor);
            this.drawCircle(g, ox + 12, oy + 18, 6.5, wormColor);
        }

        // ── Torso (black tight shirt — wider/muscular) ──
        this.drawRect(g, ox, oy + 18, 26, 18, clothesColor);
        this.drawRect(g, ox, oy - 10, 27, 38, clothesColor);
        this.drawRect(g, ox, oy - 31, 12, 10, skinColor); // Neck

        // ── Abs detail lines ──
        if (!isFlashing) {
            this.drawLine(g, ox - 7, oy - 5, ox - 2, oy - 5, 1.5, 0x222226);
            this.drawLine(g, ox + 2, oy - 5, ox + 7, oy - 5, 1.5, 0x222226);
            this.drawLine(g, ox, oy + 2, ox, oy + 14, 1.5, 0x222226);
        }

        // ── Arms (muscular, thicker) ──
        this.drawRect(g, ox - 16, oy - 13, 8.5, 22, clothesColor, rotArmSup);
        this.drawCircle(g, ox - 17, oy - 2, 4, jointColor); // Green elbow
        this.drawRect(g, ox - 16, oy + 9, 7, 20, skinColor, 5);

        this.drawRect(g, ox + 16, oy - 13, 8.5, 22, clothesColor, -rotArmSup);
        this.drawCircle(g, ox + 17, oy - 2, 4, jointColor); // Green elbow
        this.drawRect(g, ox + 16, oy + 9, 7, 20, skinColor, -5);

        // ── Head ──
        this.drawCircle(g, ox, oy - 45, 13, skinColor);

        // ── Eyes (serious brows) ──
        if (!isFlashing) {
            this.drawLine(g, ox - 5, oy - 46, ox - 1, oy - 46, 1.5, 0x000000);
            this.drawLine(g, ox + 1, oy - 46, ox + 5, oy - 46, 1.5, 0x000000);
            // Mouth scar
            this.drawLine(g, ox - 4, oy - 40, ox - 1, oy - 41, 1.5, 0x7f1d1d);
        }

        // ── Hair (black bangs falling down) ──
        this.drawRect(g, ox, oy - 56, 26, 6, hairColor);
        this.drawTriangle(g, ox - 6, oy - 50, 6, 10, hairColor, 15);
        this.drawTriangle(g, ox, oy - 49, 7, 12, hairColor, 2);
        this.drawTriangle(g, ox + 6, oy - 50, 6, 10, hairColor, -15);

        // ── Weapon in hand (idle) ──
        const armX = x + 15 * f;
        const armY = y - 40;
        if (!this.stateMachine.is('attack')) {
            g.fillStyle(this.currentWeapon.color, 0.8);
            g.fillRect(armX - 2, armY - 10, 4, 30);
        } else {
            const swing = this.attackSwing;
            const armExtend = swing * 40;
            const handX = x + (34 + armExtend) * f;
            const handY = y - 36;

            if (this.currentWeapon.key === 'spear' && this.spearChainMode) {
                const reach = this.currentAttack?.range || 300;
                const endX = handX + (swing * reach * f);
                const endY = handY;
                g.lineStyle(3, 0x555555, 1);
                const links = 16;
                for (let i = 0; i < links; i++) {
                    const cx = Phaser.Math.Interpolation.Linear([handX, endX], i / (links - 1));
                    const cy = Phaser.Math.Interpolation.Linear([handY, endY], i / (links - 1));
                    if (i % 2 === 0) g.strokeEllipse(cx, cy, 6, 3);
                    else g.strokeEllipse(cx, cy, 3, 6);
                }
                g.fillStyle(0x88CCFF, 1);
                g.beginPath();
                g.moveTo(endX, endY - 6);
                g.lineTo(endX + 20 * f, endY);
                g.lineTo(endX, endY + 6);
                g.fillPath();
            } else {
                g.lineStyle(6, this.currentWeapon.color, 1);
                g.beginPath();
                g.moveTo(handX, handY);
                let angle;
                if (f > 0) angle = (swing * Math.PI) - Math.PI / 2;
                else angle = Math.PI + Math.PI / 2 - (swing * Math.PI);
                const len = 70;
                g.lineTo(handX + Math.cos(angle) * len, handY + Math.sin(angle) * len);
                g.strokePath();
                if (this.currentWeapon.key === 'katana') {
                    g.lineStyle(2, 0xFFFFFF, 0.5);
                    g.beginPath();
                    g.moveTo(handX, handY);
                    g.lineTo(handX + Math.cos(angle) * len, handY + Math.sin(angle) * len);
                    g.strokePath();
                }
            }
        }

        // ── Hitstun stars ──
        if (this.stateMachine.is('hitstun')) {
            const starT = this.animTimer * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                g.fillStyle(0xFFFF00, 0.8);
                g.fillTriangle(
                    x + Math.cos(angle) * 22, y - 55 + Math.sin(angle) * 10,
                    x + Math.cos(angle + 0.3) * 16, y - 60 + Math.sin(angle + 0.3) * 6,
                    x + Math.cos(angle - 0.3) * 16, y - 60 + Math.sin(angle - 0.3) * 6
                );
            }
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        if (this.counterTimer > 0) return;

        // "U + Abajo/S" = Swap weapon
        if (this.input.isDown('DOWN')) {
            this.switchWeapon();
            return;
        }
        
        // "U + Arriba/W" = Tool Barrage
        if (this.input.isDown('UP')) {
            this.castCursedToolBarrage();
            return;
        }

        // "U + Izquierda/Derecha" = Weapon Special
        if (this.input.isDown('LEFT') || this.input.isDown('RIGHT')) {
            this.executeWeaponSpecial();
            return;
        }

        // "U" solo = Physical Buff (Uses CE stamina)
        this.castPhysicalBuff();
    }

    switchWeapon() {
        if (this.switchCooldown > 0) return;
        this.switchCooldown = 400;

        // Reset states from previous weapon
        this.spearChainMode = false;
        
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % WEAPONS.length;
        
        if (this.weaponSwitchText) this.weaponSwitchText.destroy();
        this.weaponSwitchText = this.scene.add.text(
            this.sprite.x, this.sprite.y - 70, 
            `[ARMA] ${this.currentWeapon.name}`, {
                fontSize: '14px', fontFamily: 'Arial Black',
                color: '#' + this.currentWeapon.color.toString(16).padStart(6, '0'),
                stroke: '#000000', strokeThickness: 3,
            }
        ).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: this.weaponSwitchText,
            y: this.sprite.y - 100, alpha: 0,
            duration: 1000, ease: 'Power2',
            onComplete: () => {
                if (this.weaponSwitchText) {
                    this.weaponSwitchText.destroy();
                    this.weaponSwitchText = null;
                }
            }
        });
    }

    castPhysicalBuff() {
        if (this.buffTimer > 0) return;
        if (!this.ceSystem.spend(50)) return; // Requires some CE/Stamina to buff

        this.buffTimer = 8000; // 8 seconds
        
        // Apply buffs
        this.speed *= 1.4;
        this.power *= 1.3;
        this.defense *= 1.2;
        this.jumpForce *= 1.2;

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x55FF55, 300, 0.3);
        }
    }

    castCursedToolBarrage() {
        if (!this.ceSystem.spend(40)) return; // Requires some CE/stamina
        
        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        // Quick burst of 3 forward attacks with active weapon
        let hits = 0;
        const color = this.currentWeapon.color;
        
        const barrageEvent = this.scene.time.addEvent({
            delay: 150,
            repeat: 2,
            callback: () => {
                hits++;
                this.sprite.body.setVelocityX(200 * this.facing);
                
                // Visual swipe
                const x = this.sprite.x + 30 * this.facing;
                const y = this.sprite.y - 20;
                const swipe = this.scene.add.graphics().setDepth(15);
                swipe.lineStyle(4, color, 0.8);
                swipe.beginPath();
                swipe.moveTo(x, y - 20);
                swipe.lineTo(x + 50 * this.facing, y);
                swipe.lineTo(x, y + 20);
                swipe.strokePath();
                
                this.scene.tweens.add({ targets: swipe, alpha: 0, duration: 150, onComplete: () => swipe.destroy() });

                // Hitbox detection
                if (this.opponent) {
                    const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                    if (dist < 100) {
                        const finalHit = hits === 3;
                        const dmg = finalHit ? Math.floor(40 * this.power) : Math.floor(15 * this.power);
                        const kbx = finalHit ? 300 * this.facing : 50 * this.facing;
                        const kby = finalHit ? -200 : -20;
                        const stun = finalHit ? 400 : 200;
                        
                        this.opponent.takeDamage(dmg, kbx, kby, stun);
                        this.comboSystem.registerHit('SPECIAL');
                    }
                }

                if (hits >= 3) {
                    this.scene.time.delayedCall(200, () => {
                        this.isCasting = false;
                        this.stateMachine.unlock();
                        this.stateMachine.setState('idle');
                    });
                }
            }
        });
    }

    executeWeaponSpecial() {
        switch (this.currentWeapon.key) {
            case 'cloud': 
                this.castCloudRush(); 
                break;
            case 'katana': 
                this.enterCounterStance('katana'); 
                break;
            case 'spear': 
                this.enterCounterStance('spear'); 
                break;
        }
    }

    // ── Weapon 1: Playful Cloud ──
    castCloudRush() {
        this.isCasting = true;
        this.stateMachine.lock(99999);
        this.sprite.body.setVelocityX(0);

        // Flurry rush multi-hits
        let hits = 0;
        const rushTimer = this.scene.time.addEvent({
            delay: 150,
            repeat: 4,
            callback: () => {
                hits++;
                this.sprite.body.setVelocityX(400 * this.facing);
                this.spawnPlayfulCloudEffect(0.5); // Smaller effect

                if (this.opponent) {
                    const dist = Math.abs(this.opponent.sprite.x - this.sprite.x);
                    if (dist < 100) {
                        this.opponent.takeDamage(Math.floor(20 * this.power), 100 * this.facing, -50, 200);
                        this.comboSystem.registerHit('SPECIAL');
                    }
                }

                if (hits >= 5) {
                    this.scene.time.delayedCall(200, () => {
                        this.isCasting = false;
                        this.stateMachine.unlock();
                        this.stateMachine.setState('idle');
                    });
                }
            }
        });
    }

    // ── Weapon 2 & 3: Counter Mechanics ──
    enterCounterStance(weaponKey) {
        this.counterStanceWeapon = weaponKey;
        this.counterTimer = 1500; // Active for 1.5s
        this.stateMachine.lock(1500); 
        this.sprite.body.setVelocityX(0);

        // Visual indicator of stance
        const color = weaponKey === 'katana' ? 0xFF44AA : 0x88CCFF;
        this.stanceAura = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, color, 0.4).setDepth(10);
    }

    triggerKatanaCounter(projectile) {
        if (!this.opponent) return;

        // Teleport behind opponent
        const teleportX = this.opponent.sprite.x - (50 * this.facing);
        this.sprite.setPosition(teleportX, this.opponent.sprite.y);
        this.facing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;

        // Instant Heavy Attack
        this.spawnSoulKatanaEffect();
        this.opponent.takeDamage(Math.floor(this.opponent.hp * 0.1 * this.power), 600 * this.facing, -300, 600);
        this.comboSystem.registerHit('HEAVY');
        
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xFF44AA, 200, 0.4);
            this.scene.screenEffects.shake(0.04, 300);
        }

        // End stance immediately
        this.counterTimer = 0;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');
    }

    triggerSpearCounter(projectile) {
        // Just destroy the projectile cleanly with a visual
        this.spawnSpearEffect();
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x88CCFF, 150, 0.3);
        }

        // End stance immediately
        this.counterTimer = 0;
        this.stateMachine.unlock();
        this.stateMachine.setState('idle');
    }

    // ── Button 'I' (Domain Key) ──
    tryActivateDomain() {
        if (this.isCasting) return;

        if (this.currentWeapon.key === 'cloud') {
            // Sharpen Cloud -> Bleed
            this.cloudSharp = true;
            this.showWeaponBuffText("SHARPENED!");
        } 
        else if (this.currentWeapon.key === 'katana') {
            // Lifesteal for 10s
            this.katanaLifestealTimer = 10000;
            this.showWeaponBuffText("SOUL SIPHON!");
        } 
        else if (this.currentWeapon.key === 'spear') {
            if (this.scene.domainActive && this.scene.domainOwner !== this) {
                // BREAK DOMAIN
                this.breakDomain();
            } else {
                // Toggle Chain Mode
                this.spearChainMode = !this.spearChainMode;
                this.showWeaponBuffText(this.spearChainMode ? "CHAIN EQUIPPED" : "CHAIN UNEQUIPPED");
            }
        }
    }

    breakDomain() {
        this.isCasting = true;
        this.stateMachine.lock(1500);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.2, 1000);
            this.scene.screenEffects.flash(0xFFFFFF, 800, 0.6);
        }

        // Visual: multiple slashes shattering the screen
        const g = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
        for(let i=0; i<10; i++) {
            const x1 = Math.random() * GAME_WIDTH;
            const y1 = Math.random() * GAME_HEIGHT;
            const x2 = x1 + (Math.random() - 0.5) * 800;
            const y2 = y1 + (Math.random() - 0.5) * 800;
            g.lineStyle(8, 0x88CCFF, 0.9);
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
            g.lineStyle(4, 0xFFFFFF, 1);
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
        }

        this.scene.time.delayedCall(600, () => {
            g.destroy();
            // End the domain directly and force fatigue on the owner
            if (this.scene.domainOwner) {
                const owner = this.scene.domainOwner;
                owner.ceSystem.ce = 0;
                owner.ceSystem.endDomain();
                this.scene.onDomainEnd(owner);
                
                // Stop domain audio
                try { this.scene.sound.stopAll(); } catch(e) {}
            }
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    showWeaponBuffText(text) {
        const txt = this.scene.add.text(
            this.sprite.x, this.sprite.y - 70, 
            text, {
                fontSize: '16px', fontFamily: 'Arial Black',
                color: '#' + this.currentWeapon.color.toString(16).padStart(6, '0'),
                stroke: '#000000', strokeThickness: 4,
            }
        ).setOrigin(0.5).setDepth(20);

        this.scene.tweens.add({
            targets: txt, y: '-=40', alpha: 0, duration: 1500, onComplete: () => txt.destroy()
        });
    }

    // ── Update ──
    update(time, dt) {
        super.update(time, dt);

        if (this.switchCooldown > 0) this.switchCooldown -= dt;
        
        // Counter Stance tracking & Projectile collision override
        if (this.counterTimer > 0) {
            this.counterTimer -= dt;
            if (this.stanceAura) {
                this.stanceAura.setPosition(this.sprite.x, this.sprite.y);
            }

            // Check projectile collisions manually to intercept them
            if (this.scene.projectiles) {
                for (let i = this.scene.projectiles.length - 1; i >= 0; i--) {
                    const proj = this.scene.projectiles[i];
                    if (proj.owner === this) continue; // Ignore own projectiles

                    // Exclude massive/super projectiles from counter
                    const isSuper = proj.type === 'fire' || proj.damage > 100 || proj.size.w > 100;
                    
                    if (!isSuper) {
                        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, proj.sprite.x, proj.sprite.y);
                        if (dist < 100) {
                            // Intercepted!
                            if (this.counterStanceWeapon === 'katana') {
                                this.triggerKatanaCounter(proj);
                            } else if (this.counterStanceWeapon === 'spear') {
                                this.triggerSpearCounter(proj);
                            }
                            proj.destroy(); // Destroy it
                            this.scene.projectiles.splice(i, 1);
                        }
                    }
                }
            }

            if (this.counterTimer <= 0) {
                if (this.stanceAura) { this.stanceAura.destroy(); this.stanceAura = null; }
                if (this.stateMachine.is('block')) this.stateMachine.unlock();
            }
        } else {
            if (this.stanceAura) { this.stanceAura.destroy(); this.stanceAura = null; }
        }

        // Buff timer tracking
        if (this.buffTimer > 0) {
            this.buffTimer -= dt;
            
            // Draw green flash effect behind
            if (Math.random() < 0.1) {
                const g = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0x55FF55, 0.4).setDepth(9);
                this.scene.tweens.add({ targets: g, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 300, onComplete: () => g.destroy() });
            }

            if (this.buffTimer <= 0) {
                // Revert buffs
                this.speed /= 1.4;
                this.power /= 1.3;
                this.defense /= 1.2;
                this.jumpForce /= 1.2;
            }
        }

        if (this.katanaLifestealTimer > 0) {
            this.katanaLifestealTimer -= dt;
        }
    }

    applySureHitTick(opponent) {
        // None
    }

    // ── VFX ──
    spawnSpearEffect() {
        const x = this.sprite.x + 30 * this.facing;
        const y = this.sprite.y - 10;
        const g = this.scene.add.graphics().setDepth(15);
        
        g.lineStyle(3, 0xCCCCCC, 1);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 90 * this.facing, y); g.strokePath();
        
        g.fillStyle(0x88CCFF, 1);
        g.beginPath();
        const tipX = x + 90 * this.facing;
        g.moveTo(tipX, y - 7); g.lineTo(tipX + 18 * this.facing, y); g.lineTo(tipX, y + 7);
        g.closePath(); g.fillPath();

        this.scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
    }

    spawnPlayfulCloudEffect(scale = 1.0) {
        const x = this.sprite.x + (40 * scale) * this.facing;
        const y = this.sprite.y - 20;
        const g = this.scene.add.graphics().setDepth(16);
        
        for (let s = 0; s < 3; s++) {
            const sx = x + (s * 25 - 25) * this.facing * scale;
            g.fillStyle(0x886633, 1);
            g.fillRect(sx - 3, y - 15*scale, 6, 30*scale);
        }

        const flash = this.scene.add.circle(x, y, 30*scale, 0x55FF55, 0.6).setDepth(17);
        this.scene.tweens.add({
            targets: [g, flash], alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 300,
            onComplete: () => { g.destroy(); flash.destroy(); }
        });
    }

    spawnSoulKatanaEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y - 15;
        const g = this.scene.add.graphics().setDepth(15);

        const startAngle = this.facing > 0 ? -Math.PI / 3 : Math.PI + Math.PI / 3;
        const sweep = Math.PI * 0.8;
        
        for (let i = 0; i < 15; i++) {
            const angle = startAngle + (i / 14) * sweep * this.facing;
            const len = 120 + Math.sin(i * 0.5) * 20;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            g.lineStyle(6, 0xFF44AA, 0.8 - (i / 15) * 0.4);
            g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
        }

        const bladeEnd = x + 100 * this.facing;
        g.lineStyle(4, 0xCCCCDD, 1);
        g.beginPath(); g.moveTo(x + 10 * this.facing, y); g.lineTo(bladeEnd, y - 20); g.strokePath();

        this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    }
}
