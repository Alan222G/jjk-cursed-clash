// ========================================================
// Fighter — Base class for all playable characters
// ========================================================

import Phaser from 'phaser';
import StateMachine from '../systems/StateMachine.js';
import InputManager from '../systems/InputManager.js';
import CursedEnergySystem from '../systems/CursedEnergySystem.js';
import ComboSystem from '../systems/ComboSystem.js';
import { FIGHTER_DEFAULTS, ATTACKS, PHYSICS, CE_COSTS } from '../config.js';

export default class Fighter {
    constructor(scene, x, y, playerIndex, charData) {
        this.scene = scene;
        this.charData = charData;
        this.playerIndex = playerIndex;
        this.fighterName = charData.name;
        this.fighterId = charData.id;

        // ── Stats ──
        this.maxHp = charData.stats.maxHp || FIGHTER_DEFAULTS.MAX_HP;
        this.hp = this.maxHp;
        this.speed = charData.stats.speed || FIGHTER_DEFAULTS.SPEED;
        this.jumpForce = charData.stats.jumpForce || FIGHTER_DEFAULTS.JUMP_FORCE;
        this.weight = charData.stats.weight || FIGHTER_DEFAULTS.WEIGHT;
        this.power = charData.stats.power || 1.0;
        this.defense = charData.stats.defense || 1.0;

        // ── State ──
        this.facing = playerIndex === 0 ? 1 : -1;
        this.isOnGround = false;
        this.isInvulnerable = false;
        this.invulnTimer = 0;
        this.opponent = null;
        this.isDead = false;
        this.currentAttack = null;
        this.attackTimer = 0;
        this.attackPhase = 'none'; // none, startup, active, recovery
        this.hitConnected = false;
        this.stunTimer = 0;
        this.domainActive = false;
        this.flashTimer = 0;
        this.burnTickTimer = 0;
        this.burnTimer = 0;
        this.comboCooldown = 0; // 2 seconds between combos
        this.lastHitConnected = false; // To speed up combos
        this.aerialComboActive = false; // Launcher aerial combo state

        // ── Colors ──
        this.colors = charData.colors;

        // ── Animation State ──
        this.animTimer = 0;
        this.walkCycle = 0;
        this.idleBob = 0;
        this.hitFlash = 0;
        this.attackSwing = 0;

        // ── Physics Body (invisible rectangle) ──
        const bw = FIGHTER_DEFAULTS.BODY_WIDTH;
        const bh = FIGHTER_DEFAULTS.BODY_HEIGHT;
        this.sprite = scene.add.rectangle(x, y, bw, bh, 0x000000, 0);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(bw, bh);
        this.sprite.body.setGravityY(PHYSICS.GRAVITY);
        this.sprite.body.setDragX(PHYSICS.DRAG_X);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setBounce(0);
        this.sprite.body.setMaxVelocityX(600);
        this.sprite.setDepth(10);

        // ── Hitbox (attack zone, starts disabled) ──
        this.hitbox = scene.add.rectangle(x, y, 50, 40, 0xff0000, 0);
        scene.physics.add.existing(this.hitbox, false);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.enable = false;
        this.hitbox.setDepth(11);

        // ── Visual Graphics ──
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(10);

        // ── Energy Aura Graphics ──
        this.auraGraphics = scene.add.graphics();
        this.auraGraphics.setDepth(9);

        // ── Systems ──
        this.input = new InputManager(scene, playerIndex);
        this.ceSystem = new CursedEnergySystem(this);
        this.comboSystem = new ComboSystem(this);
        this.stateMachine = new StateMachine(this, 'idle');

        // ── Setup State Machine ──
        this.setupStates();
        this.stateMachine.start();

        // Store ref on sprite for collision callbacks
        this.sprite.fighterRef = this;
        this.hitbox.fighterRef = this;
    }

    setupStates() {
        const sm = this.stateMachine;

        sm.addState('idle', {
            onEnter: function () {
                this.sprite.body.setVelocityX(0);
            },
            onUpdate: function (dt) {
                this.handleMovementInput();
                this.handleAttackInput();
                this.handleBlockInput();
                this.autoFace();
            },
        });

        sm.addState('walk', {
            onUpdate: function (dt) {
                this.handleMovementInput();
                this.handleAttackInput();
                this.handleBlockInput();
                this.autoFace();
            },
        });

        sm.addState('jump', {
            onEnter: function () {
                this.sprite.body.setVelocityY(this.jumpForce);
                this.isOnGround = false;
            },
            onUpdate: function (dt) {
                // Air control
                const h = this.input.getHorizontal();
                if (h !== 0) {
                    this.sprite.body.setVelocityX(h * this.speed * 0.7);
                }
                this.handleAttackInput();
                // Check landing
                if (this.sprite.body.blocked.down || this.sprite.body.touching.down) {
                    this.isOnGround = true;
                    this.stateMachine.setState('idle');
                }
            },
        });

        sm.addState('fall', {
            onUpdate: function (dt) {
                const h = this.input.getHorizontal();
                if (h !== 0) {
                    this.sprite.body.setVelocityX(h * this.speed * 0.7);
                }
                if (this.sprite.body.blocked.down || this.sprite.body.touching.down) {
                    this.isOnGround = true;
                    this.stateMachine.setState('idle');
                }
            },
        });

        // ── Cinematic Phase 1 States (Domain Expansion) ──
        sm.addState('casting_domain', {
            onEnter: function () {
                this.sprite.body.setVelocity(0, 0); // Completely stop
                if (this.sprite.anims && this.sprite.anims.currentAnim) {
                    this.sprite.anims.pause();
                }
            },
            onExit: function () {
                if (this.sprite.anims && this.sprite.anims.currentAnim) {
                    this.sprite.anims.resume();
                }
            },
            onUpdate: function (dt) {} // Freeze
        });

        sm.addState('domain_stunned', {
            onEnter: function () {
                this.sprite.body.setVelocity(0, 0);
                this.isInvulnerable = false; // Never stay invulnerable when paralyzed
                if (this.sprite.anims && this.sprite.anims.currentAnim) {
                    this.sprite.anims.pause();
                }
            },
            onExit: function () {
                if (this.sprite.anims && this.sprite.anims.currentAnim) {
                    this.sprite.anims.resume();
                }
            },
            onUpdate: function (dt) {} // Freeze
        });

        sm.addState('attack', {
            onEnter: function () {
                this.attackTimer = 0;
                this.attackPhase = 'startup';
                this.hitConnected = false;
                this.attackSwing = 0;
            },
            onUpdate: function (dt) {
                if (!this.currentAttack) {
                    this.stateMachine.setState('idle');
                    return;
                }
                this.attackTimer += dt;
                const atk = this.currentAttack;

                if (this.attackPhase === 'startup' && this.attackTimer >= atk.startup) {
                    this.attackPhase = 'active';
                    this.enableHitbox(atk);
                    this.attackTimer = 0;
                } else if (this.attackPhase === 'active' && this.attackTimer >= atk.active) {
                    this.attackPhase = 'recovery';
                    this.disableHitbox();
                    this.attackTimer = 0;
                } else if (this.attackPhase === 'recovery' && this.attackTimer >= atk.recovery) {
                    this.attackPhase = 'none';
                    this.currentAttack = null;
                    this.stateMachine.setState('idle');
                }
            },
            onExit: function () {
                this.disableHitbox();
                this.lastHitConnected = this.hitConnected; // Save for next combo hit eval
                this.attackPhase = 'none';
            },
        });

        sm.addState('block', {
            onEnter: function () {
                this.sprite.body.setVelocityX(0);
            },
            onUpdate: function (dt) {
                if (!this.input.isDown('BLOCK')) {
                    this.stateMachine.setState('idle');
                }
            },
        });

        // Gojo Infinity — special shield that costs CE
        sm.addState('infinity', {
            onEnter: function () {
                this.sprite.body.setVelocityX(0);
                this.infinityActive = true;
            },
            onUpdate: function (dt) {
                this.stateMachine.setState('idle');
            },
            onExit: function () {
                this.infinityActive = false;
            },
        });

        sm.addState('hitstun', {
            onEnter: function () {
                this.hitFlash = 6;
            },
            onUpdate: function (dt) {
                this.stunTimer -= dt;
                if (this.stunTimer <= 0) {
                    this.stateMachine.setState('idle');
                }
            },
        });

        sm.addState('knockdown', {
            onEnter: function () {
                this.isInvulnerable = true;
            },
            onUpdate: function (dt) {
                if (this.sprite.body.blocked.down && Math.abs(this.sprite.body.velocity.x) < 30) {
                    this.stateMachine.setState('getup');
                }
            },
            onExit: function () {
                this.isInvulnerable = false;
            }
        });

        sm.addState('getup', {
            onEnter: function () {
                this.isInvulnerable = true;
                this.invulnTimer = 500;
                this.sprite.body.setVelocity(0, 0);
            },
            onUpdate: function (dt) {
                this.invulnTimer -= dt;
                if (this.invulnTimer <= 0) {
                    this.isInvulnerable = false;
                    this.stateMachine.setState('idle');
                }
            },
            onExit: function () {
                this.isInvulnerable = false;
            },
        });

        // Downslam stun — 2 second ground stun with orbiting stars
        sm.addState('downslam_stun', {
            onEnter: function () {
                this.sprite.body.setVelocityX(0);
                this.stunTimer = 2000;
                this.downslamStarTimer = 0;
                this.downslamStars = [];
                // Spawn star graphics
                for (let i = 0; i < 3; i++) {
                    const star = this.scene.add.graphics().setDepth(100);
                    this.downslamStars.push({ g: star, angle: (i * Math.PI * 2) / 3 });
                }
            },
            onUpdate: function (dt) {
                this.stunTimer -= dt;
                this.downslamStarTimer += dt * 0.005;
                // Draw orbiting stars
                if (this.downslamStars) {
                    const cx = this.sprite.x;
                    const cy = this.sprite.y - 70;
                    const orbitR = 18;
                    this.downslamStars.forEach(s => {
                        s.g.clear();
                        const a = s.angle + this.downslamStarTimer;
                        const sx = cx + Math.cos(a) * orbitR;
                        const sy = cy + Math.sin(a) * orbitR * 0.5;
                        // Draw 4-point star
                        s.g.fillStyle(0xFFDD44, 0.9);
                        s.g.beginPath();
                        s.g.moveTo(sx, sy - 6);
                        s.g.lineTo(sx + 2, sy - 2);
                        s.g.lineTo(sx + 6, sy);
                        s.g.lineTo(sx + 2, sy + 2);
                        s.g.lineTo(sx, sy + 6);
                        s.g.lineTo(sx - 2, sy + 2);
                        s.g.lineTo(sx - 6, sy);
                        s.g.lineTo(sx - 2, sy - 2);
                        s.g.closePath();
                        s.g.fillPath();
                    });
                }
                if (this.stunTimer <= 0) {
                    this.stateMachine.setState('idle');
                }
            },
            onExit: function () {
                // Cleanup stars
                if (this.downslamStars) {
                    this.downslamStars.forEach(s => { if (s.g) s.g.destroy(); });
                    this.downslamStars = null;
                }
            },
        });

        sm.addState('casting_domain', {
            onEnter: function () {
                this.sprite.body.setVelocity(0, 0);
                this.sprite.body.setAllowGravity(false);
            },
            onUpdate: function () {},
            onExit: function () {
                this.sprite.body.setAllowGravity(true);
            },
        });

        sm.addState('domain_stunned', {
            onEnter: function () {
                this.sprite.body.setVelocity(0, 0);
            },
            onUpdate: function () {},
            onExit: function () {
                // Ensure cleanup when leaving domain_stunned
                this.sprite.body.setAllowGravity(true);
            },
        });

        sm.addState('dead', {
            onEnter: function () {
                this.isDead = true;
                this.sprite.body.setVelocity(0, 0);
                this.sprite.body.setAllowGravity(false);
            },
            onUpdate: function () {},
        });
    }

    // ── Input Handlers ───────────────────────────────────

    handleMovementInput() {
        const h = this.input.getHorizontal();

        if (h !== 0) {
            this.sprite.body.setVelocityX(h * this.speed);
            if (this.stateMachine.is('idle')) {
                this.stateMachine.setState('walk');
            }
        } else {
            if (this.stateMachine.is('walk')) {
                this.stateMachine.setState('idle');
            }
        }

        // Jump
        if (this.input.justPressed('UP') && this.isOnGround) {
            if (this.aerialComboActive && this._launchTarget) {
                // Aerial boost: launch attacker to opponent's height
                const targetY = this._launchTarget.sprite.y;
                const distUp = this.sprite.y - targetY; // positive = opponent is above
                // Calculate velocity needed to reach opponent's height (boosted)
                const boostVel = Math.min(-900, -(distUp * 2.5 + 400));
                this.sprite.body.setVelocityY(boostVel);
                this.isOnGround = false;
                this.stateMachine.setState('jump');
            } else {
                this.stateMachine.setState('jump');
            }
        }
    }

    getBasicAttackData(type) {
        return ATTACKS[type];
    }

    handleAttackInput() {
        const attackAction = this.input.pollAttacks();
        if (!attackAction) return;

        // Allow subclass to override / handle specific attacks first (e.g. Ryu's combo finisher)
        if (this.handleSpecialAttackInput && this.handleSpecialAttackInput(attackAction)) {
            return;
        }

        if (attackAction === 'DOMAIN') {
            this.tryActivateDomain();
            return;
        }

        if (attackAction === 'SPECIAL') {
            this.trySpecialAttack();
            return;
        }

        // Normal attacks
        if (this.stateMachine.isAny('idle', 'walk', 'jump', 'fall')) {
            if (attackAction === 'LIGHT' && (this.comboCooldown <= 0 || this.aerialComboActive)) {
                this.comboStep = (this.comboStep || 0) + 1;
                if (this.comboStep > 4) this.comboStep = 1;
                
                let atkData;
                if (this.comboStep < 4) {
                    atkData = { ...this.getBasicAttackData('LIGHT') };
                    atkData.damage = 15;
                    atkData.stunDuration = 300;
                    
                    if (this.aerialComboActive) {
                        // Aerial combo hits: keep opponent suspended in air
                        atkData.knockbackX = 0;
                        atkData.knockbackY = 0; // No knockback — gravity is disabled
                        atkData.stunDuration = 350;
                        atkData.isAerialHit = true;
                    } else {
                        atkData.knockbackX = 0; // Sin empuje
                        atkData.knockbackY = 0;
                    }
                } else {
                    atkData = { ...this.getBasicAttackData('HEAVY') };
                    atkData.damage = 60; // Daño aumentado
                    
                    // ── LAUNCHER: 4th hit + DOWN → launch enemy upward ──
                    if (this.input.isDown('DOWN') && !this.aerialComboActive) {
                        atkData.knockbackX = 60;   // Minimal horizontal push
                        atkData.knockbackY = -800;  // Strong upward launch
                        atkData.stunDuration = 1200; // Long stun for aerial follow-up
                        atkData.isLauncher = true;
                    }
                    
                    // ── DOWNSLAM: 4th aerial hit + JUMP → slam enemy downward ──
                    if (this.aerialComboActive && this.input.isDown('UP')) {
                        atkData.knockbackX = 0;
                        atkData.knockbackY = 1200;  // Strong downward slam
                        atkData.stunDuration = 2000; // 2 second ground stun
                        atkData.damage = 80;         // Extra damage on downslam
                        atkData.isDownslam = true;
                        atkData.isAerialHit = true;
                    }
                }
                
                // Speed up combo if previous hit connected
                if (this.comboStep > 1 && this.lastHitConnected) {
                    atkData.startup = Math.floor(atkData.startup * 0.4); // 60% faster startup
                    atkData.recovery = Math.floor(atkData.recovery * 0.6); // 40% faster recovery
                }
                
                this.currentAttack = { ...atkData, type: 'COMBO', comboHit: this.comboStep };
                this.stateMachine.setState('attack');
                this.comboResetTimer = 1500;

                // Cooldown en golpes basicos luego de terminar el combo completo
                if (this.comboStep === 4) {
                    if (this.aerialComboActive) {
                        // Aerial combo finisher: end aerial state, apply normal cooldown
                        this.aerialComboActive = false;
                    }
                    this.comboCooldown = 2000;
                    this.comboStep = 0;
                }
            }
        }
    }

    handleBlockInput() {
        if (this.stateMachine.isAny('idle', 'walk', 'block')) {
            // Special modifiers on Shift+Down
            if (this.input.isDown('BLOCK') && this.input.isDown('DOWN')) {
                if (this.fighterId === 'gojo') {
                    if (!this._blockDownHandled) {
                        this.infinityActive = !this.infinityActive;
                        this._blockDownHandled = true;
                    }
                    return;
                } else if (this.fighterId === 'kenjaku' && this.swapAICurse) {
                    // Only trigger once per press
                    if (!this._blockDownHandled) {
                        this.swapAICurse();
                        this._blockDownHandled = true;
                    }
                    return;
                }
            } else {
                this._blockDownHandled = false;
            }
            
            // Normal block (any character)
            if (this.input.isDown('BLOCK') && !this.stateMachine.is('block') && !this.stateMachine.is('infinity')) {
                this.stateMachine.setState('block');
            }
        }
    }

    // ── Combat Methods ───────────────────────────────────

    enableHitbox(atkData) {
        // Continuous Hitbox: extends from behind the player to the tip of the attack.
        // The backReach ensures hits connect even when fighters overlap at the same position.
        const backReach = 20; // Pixels behind center to catch overlapping opponents
        const frontReach = atkData.range + (atkData.hitboxW / 2);
        const totalWidth = backReach + frontReach;
        
        // Center of the hitbox is shifted forward (front is longer than back)
        const offsetX = ((frontReach - backReach) / 2) * this.facing;
        
        const newX = this.sprite.x + offsetX;
        const newY = this.sprite.y - 10;
        
        this.hitbox.setPosition(newX, newY);
        this.hitbox.setSize(totalWidth, atkData.hitboxH);
        this.hitbox.body.setSize(totalWidth, atkData.hitboxH);
        this.hitbox.body.reset(newX, newY);
        this.hitbox.body.enable = true;
    }

    disableHitbox() {
        this.hitbox.body.enable = false;
    }

    takeDamage(damage, kbX, kbY, stunDuration, isProjectile = false) {
        if (this.isInvulnerable) return;
        if (this.isDead) return;

        // Gojo Infinity — blocks ALL damage and repels attacker
        if (this.infinityActive) {
            // Visual repel effect
            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.003, 100);
            }
            return; // No damage at all
        }

        const atk = this.scene?.lastHitAttack; // Set by onHitOpponent

        // Block mechanics
        if (this.stateMachine.is('block')) {
            const breaksBlock = atk?.breaksBlock || false;
            const blockKnockMult = atk?.blockKnockMult ?? 0.3;
            const ignoresBlockDamage = atk?.ignoresBlockDamage || false;

            if (breaksBlock) {
                // Heavy breaks block — reduced damage but full knockback
                damage = ignoresBlockDamage ? damage : Math.floor(damage * 0.4);
                // Force out of block into hitstun
                this.stateMachine.setState('hitstun');
                this.stunTimer = stunDuration;
            } else {
                // Normal block — 40% damage reduction
                damage = ignoresBlockDamage ? damage : Math.floor(damage * 0.6);
                kbX *= blockKnockMult;
                kbY *= blockKnockMult;
                stunDuration = 0; // No stun when blocking normally
            }
        }

        // Apply defense stat
        damage = Math.floor(damage / this.defense);
        if (damage < 1) damage = 1;

        this.hp -= damage;
        // Passive CE only: no gain on damage

        // Spawn damage number
        if (this.scene.spawnDamageNumber) {
            this.scene.spawnDamageNumber(this.sprite.x, this.sprite.y - 70, damage);
        }

        // Check death — flag hp=0 here, but let GameScene.update() handle isDead + onKnockout
        if (this.hp <= 0) {
            this.hp = 0;
            this.sprite.body.setVelocity(kbX, kbY * 1.5);
            return; // GameScene.update() will detect hp<=0 && !isDead and call onKnockout
        }

        // Apply knockback
        this.sprite.body.setVelocity(kbX, kbY);

        // Stun (only if not blocking)
        if (!this.stateMachine.is('block')) {
            this.stunTimer = stunDuration;
            
            // Domain Cancel check (Hakari and Higuruma are uncancelable by damage)
            if (this.scene.domainPhase1 && this.scene.domainOwner === this && this.scene.cancelDomain) {
                if (this.charData?.id !== 'hakari' && this.charData?.id !== 'higuruma') {
                    this.scene.cancelDomain(this);
                }
            }
            
            if (damage >= 40) {
                this.stateMachine.setState('knockdown');
            } else if (stunDuration > 0) {
                this.stateMachine.setState('hitstun');
            }
        }
    }

    /** Called when this fighter's hitbox overlaps opponent's hurtbox */
    onHitOpponent(opponent) {
        if (this.hitConnected) return;
        if (!this.currentAttack) return;
        if (opponent.isInvulnerable) return;

        // Infinity absorbs the hit — attacker recovers normally
        if (opponent.infinityActive) {
            this.hitConnected = true;
            if (this.scene.screenEffects) {
                this.scene.screenEffects.shake(0.003, 100);
            }
            return;
        }

        this.hitConnected = true;
        const atk = this.currentAttack;
        let dmg = Math.floor(atk.damage * this.power);
        const kbX = atk.knockbackX * this.facing;

        // Custom % Damage (e.g., Soul Split Katana)
        if (atk.percentDamage) {
            dmg = Math.floor(opponent.hp * atk.percentDamage * this.power);
        }

        // Fire custom hit callback if weapon provides it
        if (atk.onHit) {
            atk.onHit(this, opponent, dmg);
        }

        // ── BLACK FLASH MECHANIC ──
        // Probabilities can be multiplied per-character (e.g., Yuji = 2x)
        let isBlackFlash = false;
        if (this.fighterId !== 'sukuna') {
            const bfMult = this.blackFlashMultiplier || 1.0;
            const rand = Math.random() * 100;
            
            if (this.fighterId === 'nanami') {
                if (atk.type === 'HEAVY' && rand <= 16) isBlackFlash = true;
                else if (atk.type === 'COMBO' && atk.comboHit === 4 && rand <= 16) isBlackFlash = true;
                else if (atk.type === 'MEDIUM' && rand <= 6 * bfMult) isBlackFlash = true;
                else if (atk.type === 'LIGHT' && rand <= 2 * bfMult) isBlackFlash = true;
                else if (atk.type === 'COMBO' && rand <= 2 * bfMult) isBlackFlash = true;
            } else {
                if (atk.type === 'HEAVY' && rand <= 10 * bfMult) isBlackFlash = true;
                else if (atk.type === 'MEDIUM' && rand <= 6 * bfMult) isBlackFlash = true;
                else if (atk.type === 'LIGHT' && rand <= 2 * bfMult) isBlackFlash = true;
                else if (atk.type === 'COMBO') {
                    if (atk.comboHit === 4 && rand <= 7.5 * bfMult) isBlackFlash = true;
                    else if (rand <= 2 * bfMult) isBlackFlash = true;
                }
            }
        }

        if (isBlackFlash) {
            dmg = Math.floor(dmg * 2.5);
            this.ceSystem.gain(30); // CE boost on Black Flash
        }

        // Pass attack data to scene for block mechanics
        this.scene.lastHitAttack = atk;

        opponent.takeDamage(dmg, kbX, atk.knockbackY, atk.stunDuration);
        this.comboSystem.registerHit(atk.type);

        // ── LAUNCHER MECHANIC: Activate aerial combo on launcher hit ──
        if (atk.isLauncher) {
            this.aerialComboActive = true;
            this.aerialComboHitsLanded = 0;
            this._launchTarget = opponent; // Store ref for aerial boost jump
            this.comboCooldown = 0;      // Override cooldown for aerial follow-up
            this.comboStep = 0;          // Reset combo for fresh aerial 4-hit
            this.comboResetTimer = 4000;  // Extended timer for jump follow-up
            
            // Suspend opponent in the air (disable gravity, launch high)
            opponent.sprite.body.setAllowGravity(false);
            opponent.sprite.body.setVelocityY(-1000); // Strong upward launch
            this.scene.time.delayedCall(450, () => {
                if (opponent && !opponent.isDead) {
                    opponent.sprite.body.setVelocityY(0); // Freeze in air after reaching height
                }
            });
            // Grace timer: re-enable gravity after 1.5s if attacker hasn't followed up
            this._launcherGravityTimer = this.scene.time.delayedCall(1500, () => {
                if (opponent && !opponent.isDead && this.aerialComboHitsLanded === 0) {
                    opponent.sprite.body.setAllowGravity(true);
                    this._launchTarget = null;
                }
            });
        }

        // ── AERIAL COMBO HIT: Lock both fighters in the air ──
        if (atk.isAerialHit && this.aerialComboActive) {
            this.aerialComboHitsLanded = (this.aerialComboHitsLanded || 0) + 1;
            
            // On first aerial hit, lock BOTH fighters in the air (no gravity)
            if (this.aerialComboHitsLanded === 1) {
                this.sprite.body.setAllowGravity(false);
                this.sprite.body.setVelocityY(0);
                opponent.sprite.body.setAllowGravity(false);
                opponent.sprite.body.setVelocityY(0);
                // Cancel the grace timer since we connected
                if (this._launcherGravityTimer) {
                    this._launcherGravityTimer.destroy();
                    this._launcherGravityTimer = null;
                }
            }
            
            // Keep both stable in the air
            this.sprite.body.setVelocityY(0);
            opponent.sprite.body.setVelocityY(0);
        }

        // ── DOWNSLAM: Re-enable gravity and slam opponent down ──
        if (atk.isDownslam) {
            // Re-enable gravity for both fighters
            this.sprite.body.setAllowGravity(true);
            opponent.sprite.body.setAllowGravity(true);
            // Slam opponent downward hard
            opponent.sprite.body.setVelocityY(1200);
            this.aerialComboActive = false;
            this.aerialComboHitsLanded = 0;
            
            // Force downslam_stun state when opponent hits ground
            const checkGround = this.scene.time.addEvent({
                delay: 50,
                callback: () => {
                    if (opponent && !opponent.isDead) {
                        const onGround = opponent.sprite.body.blocked.down || opponent.sprite.body.touching.down;
                        if (onGround) {
                            opponent.stateMachine.setState('downslam_stun');
                            // Screen impact effect
                            if (this.scene.screenEffects) {
                                this.scene.screenEffects.shake(0.02, 400);
                                this.scene.screenEffects.hitFreeze(120);
                                this.scene.screenEffects.flash(0xFFFFFF, 100, 0.3);
                            }
                            checkGround.destroy();
                        }
                    } else {
                        checkGround.destroy();
                    }
                },
                loop: true,
            });
        }

        // Random slash SFX on melee impact (SUKUNA ONLY)
        if (this.fighterId === 'sukuna') {
            try {
                const slashIdx = Phaser.Math.Between(1, 11);
                // Boost volume for specials massively (multiply by 4.0)
                let rawVol = (window.gameSettings?.sfx ?? 50) / 100;
                let specialVol = rawVol * 4.0;
                
                this.scene.sound.play(`slash_${slashIdx}`, { volume: specialVol });
            } catch (e) {}
        }

        // Screen effects
        if (this.scene.screenEffects) {
            if (isBlackFlash) {
                this.scene.screenEffects.shake(0.015, 400);
                this.scene.screenEffects.hitFreeze(150);
                this.scene.screenEffects.flash(0x000000, 150, 0.4);
                this.spawnBlackFlashEffect(this.hitbox.x, this.hitbox.y);
            } else if (atk.type === 'HEAVY') {
                this.scene.screenEffects.shake(0.005, 200);
                this.scene.screenEffects.hitFreeze(80);
            } else {
                this.scene.screenEffects.shake(0.002, 100);
            }
        }
    }

    spawnBlackFlashEffect(x, y) {
        // Fallback procedural effect if the image is missing
        const sparks = this.scene.add.graphics().setDepth(100);
        for(let i=0; i<8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 40;
            sparks.lineStyle(3, Math.random() > 0.5 ? 0x000000 : 0xFF0000, 1);
            sparks.beginPath();
            sparks.moveTo(x, y);
            sparks.lineTo(x + Math.cos(angle)*r, y + Math.sin(angle)*r);
            sparks.strokePath();
        }
        
        // Official image (if loaded)
        let img = null;
        if (this.scene.textures.exists('black_flash')) {
            img = this.scene.add.image(x, y, 'black_flash').setDepth(101);
            img.setScale(0.5);
            img.setTint(0xFF0000); // Tint red-ish black
        }
        
        this.scene.tweens.add({
            targets: [img, sparks],
            alpha: 0,
            scaleX: img ? 1.5 : 1,
            scaleY: img ? 1.5 : 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                sparks.destroy();
                if (img) img.destroy();
            }
        });
    }

    autoFace() {
        if (!this.opponent) return;
        this.facing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;
    }

    // ── Special Abilities (overridden by subclasses) ─────

    trySpecialAttack() {
        // Override in subclass
    }

    applyBurn(duration) {
        this.burnTimer = duration;
        this.burnTickTimer = 500;
    }

    applyBleed(duration) {
        this.bleedTimer = duration;
        this.bleedTickTimer = 500;
    }

    tryActivateDomain() {
        // Override in subclass
    }

    onDomainEnd() {
        this.domainActive = false;
        if (this.scene.onDomainEnd) {
            this.scene.onDomainEnd(this);
        }
    }

    // ── Update ───────────────────────────────────────────

    update(time, dt) {
        if (this.isDead) {
            this.drawBody(dt);
            return;
        }

        const S = 1.35; // Scale up 35%
        this.graphics.setScale(S);
        this.graphics.setPosition(this.sprite.x * (1 - S), this.sprite.y * (1 - S));
        this.auraGraphics.setScale(S);
        this.auraGraphics.setPosition(this.sprite.x * (1 - S), this.sprite.y * (1 - S));

        // Ground check
        this.isOnGround = this.sprite.body.blocked.down || this.sprite.body.touching.down;

        // Reset aerial combo state when landing on ground
        if (this.isOnGround && this.aerialComboActive) {
            this.aerialComboActive = false;
            this.aerialComboHitsLanded = 0;
            this._launchTarget = null;
        }
        // Re-enable gravity if it was disabled and fighter is back on ground
        if (this.isOnGround && !this.sprite.body.allowGravity) {
            this.sprite.body.setAllowGravity(true);
        }

        // Fall detection
        if (!this.isOnGround && this.sprite.body.velocity.y > 50 &&
            this.stateMachine.isAny('idle', 'walk')) {
            this.stateMachine.setState('fall');
        }

        // Update systems
        this.stateMachine.update(dt);
        this.ceSystem.update(dt);
        this.comboSystem.update(dt);

        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0) {
                this.comboStep = 0;
            }
        }
        
        if (this.comboCooldown > 0) {
            this.comboCooldown -= dt;
        }

        // Infinity Drain
        if (this.fighterId === 'gojo' && this.infinityActive) {
            const drain = 25 * (dt / 1000);
            this.ceSystem.ce -= drain;
            if (this.ceSystem.ce <= 0) {
                this.ceSystem.ce = 0;
                this.infinityActive = false;
            }
        }

        // Burn DoT
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.burnTickTimer -= dt;
            if (this.burnTickTimer <= 0) {
                this.burnTickTimer = 500;
                this.hp -= 20; // tick damage
                
                if (this.scene.spawnDamageNumber) {
                    this.scene.spawnDamageNumber(this.sprite.x, this.sprite.y - 70, 20);
                }
                
                if (this.hp <= 0) {
                    this.hp = 0;
                    this.isDead = true;
                    this.stateMachine.unlock();
                    this.stateMachine.setState('dead');
                }
            }
        }

        // Bleed DoT
        if (this.bleedTimer > 0) {
            this.bleedTimer -= dt;
            this.bleedTickTimer -= dt;
            if (this.bleedTickTimer <= 0) {
                this.bleedTickTimer = 500;
                this.hp -= 10; // bleeding damage tick
                
                if (this.scene.spawnDamageNumber) {
                    // Blood explosion visual
                    const blood = this.scene.add.circle(this.sprite.x, this.sprite.y - 40, 8, 0xAA0000, 0.7);
                    this.scene.tweens.add({ targets: blood, y: '+=30', alpha: 0, scaleX: 2, scaleY: 2, duration: 400, onComplete: () => blood.destroy() });
                    
                    this.scene.spawnDamageNumber(this.sprite.x, this.sprite.y - 70, 10);
                }
                
                if (this.hp <= 0) {
                    this.hp = 0;
                    this.isDead = true;
                    this.stateMachine.unlock();
                    this.stateMachine.setState('dead');
                }
            }
        }

        // Invulnerability flash
        if (this.hitFlash > 0) this.hitFlash -= 0.3;

        // Animation
        this.animTimer += dt;
        this.idleBob = Math.sin(this.animTimer * 0.004) * 3;
        this.walkCycle = Math.sin(this.animTimer * 0.012) * 8;

        if (this.stateMachine.is('attack') && this.attackPhase === 'active') {
            this.attackSwing = Math.min(this.attackSwing + dt * 0.02, 1);
        } else {
            this.attackSwing = Math.max(this.attackSwing - dt * 0.01, 0);
        }

        // Draw
        this.drawBody(dt);
        this.drawAura(dt);
    }

    // ── Rendering (Procedural Character Drawing) ─────────

    drawBody(dt) {
        const g = this.graphics;
        g.clear();

        const x = this.sprite.x;
        const y = this.sprite.y;
        const f = this.facing;
        const colors = this.colors;

        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        let bodyColor = isFlashing ? 0xFFFFFF : colors.primary;
        let armColor = bodyColor;
        let legColor = bodyColor;

        if (this.fighterId === 'gojo' && !isFlashing) {
            bodyColor = 0x0D0D14; // Match torso panel 1
            armColor = 0x1A1A24;  // Lighter dark navy to stand out
            legColor = 0x151520;
            // The outlineColor for joints will be pure black for strong contrast
        }
        const outlineColor = (this.fighterId === 'gojo' && !isFlashing) ? 0x05050A : colors.secondary;

        if (this.isDead) {
            g.fillStyle(bodyColor, 0.5);
            g.fillEllipse(x, y + 20, 80, 25);
            return;
        }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;

        // ════════════════════════════════════════════
        // GEOMETRIC TESSELLATED CHARACTER RENDERING
        // ════════════════════════════════════════════

        // ── NECK ──
        g.fillStyle(colors.skin, 1);
        g.beginPath();
        g.moveTo(x - 4, y - 42 + bobY);
        g.lineTo(x + 4, y - 42 + bobY);
        g.lineTo(x + 5, y - 36 + bobY);
        g.lineTo(x - 5, y - 36 + bobY);
        g.fillPath();

        // ── HEAD (Octagonal polygon) ──
        const hY = y - 52 + bobY;
        g.fillStyle(colors.skin, 1);
        g.beginPath();
        g.moveTo(x - 6, hY - 12);
        g.lineTo(x + 6, hY - 12);
        g.lineTo(x + 11, hY - 6);
        g.lineTo(x + 11, hY + 4);
        g.lineTo(x + 8, hY + 10);
        g.lineTo(x, hY + 12);
        g.lineTo(x - 8, hY + 10);
        g.lineTo(x - 11, hY + 4);
        g.lineTo(x - 11, hY - 6);
        g.fillPath();

        // ── HAIR (Solid Jagged Crown) ──
        if (this.fighterId === 'gojo') {
            g.fillStyle(0xF8F8FF, 1);
            g.beginPath();
            g.moveTo(x - 14, hY - 10);
            g.lineTo(x - 18, hY - 22);
            g.lineTo(x - 6, hY - 14);
            g.lineTo(x, hY - 26);
            g.lineTo(x + 6, hY - 14);
            g.lineTo(x + 18, hY - 22);
            g.lineTo(x + 14, hY - 10);
            g.fillPath();
            // Inner shadowing
            g.fillStyle(0xE0E0F0, 1);
            g.beginPath();
            g.moveTo(x - 9, hY - 12);
            g.lineTo(x - 12, hY - 18);
            g.lineTo(x - 4, hY - 14);
            g.lineTo(x, hY - 20);
            g.lineTo(x + 4, hY - 14);
            g.lineTo(x + 12, hY - 18);
            g.lineTo(x + 9, hY - 12);
            g.fillPath();
        } else if (this.fighterId === 'sukuna') {
            g.fillStyle(0xFF8899, 1);
            g.beginPath();
            g.moveTo(x - 14, hY - 10);
            g.lineTo(x - 16, hY - 20);
            g.lineTo(x - 5, hY - 15);
            g.lineTo(x, hY - 24);
            g.lineTo(x + 5, hY - 15);
            g.lineTo(x + 16, hY - 20);
            g.lineTo(x + 14, hY - 10);
            g.fillPath();
            // Inner shadowing
            g.fillStyle(0xDD6677, 1);
            g.beginPath();
            g.moveTo(x - 9, hY - 12);
            g.lineTo(x - 10, hY - 17);
            g.lineTo(x - 3, hY - 14);
            g.lineTo(x, hY - 19);
            g.lineTo(x + 3, hY - 14);
            g.lineTo(x + 10, hY - 17);
            g.lineTo(x + 9, hY - 12);
            g.fillPath();
        } else {
            g.fillStyle(colors.hair, 1);
            g.fillEllipse(x, hY - 12, 24, 12);
        }

        this.drawFace(g, x, hY, f);

        // ── TORSO (Two-panel tessellation) ──
        const tT = y - 36 + bobY;
        const tB = y + 10 + bobY;
        const sW = 14;
        const wW = 10;

        if (this.fighterId === 'gojo') {
            // Gojo Torso (Same structure as Sukuna, just dark colors)
            g.fillStyle(0x0D0D14, 1);
            g.beginPath();
            g.moveTo(x - sW, tT); g.lineTo(x, tT); g.lineTo(x, tB); g.lineTo(x - wW, tB);
            g.fillPath();
            g.fillStyle(0x151520, 1);
            g.beginPath();
            g.moveTo(x, tT); g.lineTo(x + sW, tT); g.lineTo(x + wW, tB); g.lineTo(x, tB);
            g.fillPath();
            // Center V-neck / collar (black)
            g.fillStyle(0x050508, 1);
            g.beginPath();
            g.moveTo(x - 7, tT); g.lineTo(x, tT + 20); g.lineTo(x + 7, tT);
            g.fillPath();
            // Belt / Sash
            g.fillStyle(0x050508, 1);
            g.fillRect(x - wW, tB - 10, wW * 2, 8);
            // Chest lines
            g.lineStyle(1, 0x000000, 0.6);
            for (let i = 0; i < 3; i++) {
                g.beginPath(); g.moveTo(x - 3 + i, tT + 6 + i * 5); g.lineTo(x + 3 - i, tT + 6 + i * 5); g.strokePath();
            }
        } else if (this.fighterId === 'sukuna') {
            g.fillStyle(0xEEEEF0, 1);
            g.beginPath();
            g.moveTo(x - sW, tT); g.lineTo(x, tT); g.lineTo(x, tB); g.lineTo(x - wW, tB);
            g.fillPath();
            g.fillStyle(0xE0E0E5, 1);
            g.beginPath();
            g.moveTo(x, tT); g.lineTo(x + sW, tT); g.lineTo(x + wW, tB); g.lineTo(x, tB);
            g.fillPath();
            // Center V-neck / collar
            g.fillStyle(0x111111, 1);
            g.beginPath();
            g.moveTo(x - 7, tT); g.lineTo(x, tT + 20); g.lineTo(x + 7, tT);
            g.fillPath();
            // Belt / Sash
            g.fillStyle(0x111111, 1);
            g.fillRect(x - wW, tB - 10, wW * 2, 8);
            g.lineStyle(1, 0x000000, 0.4);
            for (let i = 0; i < 3; i++) {
                g.beginPath(); g.moveTo(x - 3 + i, tT + 6 + i * 5); g.lineTo(x + 3 - i, tT + 6 + i * 5); g.strokePath();
            }
        } else {
            g.fillStyle(bodyColor, 0.95);
            g.beginPath();
            g.moveTo(x - sW, tT); g.lineTo(x + sW, tT); g.lineTo(x + wW, tB); g.lineTo(x - wW, tB);
            g.fillPath();
        }

        // ── LIMB RENDER HELPER ──
        const strokeOrFill = (x1, y1, x2, y2, thick, color, alpha) => {
            if (this.fighterId === 'gojo') {
                const dx = x2 - x1, dy = y2 - y1, ang = Math.atan2(dy, dx);
                const px = Math.cos(ang + Math.PI/2) * (thick/2), py = Math.sin(ang + Math.PI/2) * (thick/2);
                g.fillStyle(color, alpha); g.beginPath();
                g.moveTo(x1 + px, y1 + py); g.lineTo(x2 + px, y2 + py);
                g.lineTo(x2 - px, y2 - py); g.lineTo(x1 - px, y1 - py);
                g.closePath(); g.fillPath();
            } else {
                g.lineStyle(thick, color, alpha);
                g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
            }
        };

        // ── ARMS (Segmented: upper + forearm + joint) ──
        const armY = y - 32 + bobY;
        const armExtend = this.attackSwing * 40;

        // Back arm
        const bsx = x - 12 * f;
        const bex = bsx - 6 * f;
        const bey = armY + 18;
        strokeOrFill(bsx, armY, bex, bey, 7, armColor, 0.7);
        strokeOrFill(bex, bey, bex - 2 * f, bey + 16, 6, armColor, 0.7);
        g.fillStyle(outlineColor, 0.3);
        g.fillCircle(bex, bey, 3);

        // Front arm
        const fsx = x + 12 * f;
        let fex, fey, fhx, fhy;
        if (this.attackSwing > 0 && this.fighterId !== 'sukuna') {
            fex = fsx + (10 + armExtend * 0.4) * f; fey = armY + 4;
            fhx = fsx + (22 + armExtend) * f; fhy = armY - 2;
        } else if (this.attackSwing > 0 && this.fighterId === 'sukuna') {
            fex = fsx + 8 * f; fey = armY + 6;
            fhx = fsx + (18 + armExtend * 0.7) * f; fhy = armY - 8;
        } else {
            fex = fsx + 4 * f; fey = armY + 18;
            fhx = fex + 2 * f; fhy = fey + 16;
        }
        strokeOrFill(fsx, armY, fex, fey, 8, armColor, 1);
        strokeOrFill(fex, fey, fhx, fhy, 7, armColor, 1);
        g.fillStyle(outlineColor, 0.4);
        g.fillCircle(fex, fey, 3);

        // Fist on punch
        if (this.attackSwing > 0 && this.fighterId !== 'sukuna') {
            g.fillStyle(colors.skin, 1);
            g.beginPath();
            g.moveTo(fhx - 4 * f, fhy - 5);
            g.lineTo(fhx + 4 * f, fhy - 6);
            g.lineTo(fhx + 6 * f, fhy);
            g.lineTo(fhx + 3 * f, fhy + 5);
            g.lineTo(fhx - 3 * f, fhy + 4);
            g.fillPath();
            g.fillStyle(colors.energy, 0.6);
            g.fillCircle(fhx + 2 * f, fhy, 6);
        }

        // Sukuna slash FX
        if (this.attackSwing > 0 && this.fighterId === 'sukuna') {
            const slX = fhx + 15 * f;
            for (let i = 0; i < 3; i++) {
                const startX = slX - 15 * f;
                const startY = fhy - 35 + (i - 1) * 15;
                const endX = slX + 25 * f;
                const endY = fhy + 35 + (i - 1) * 15;
                
                // White outline
                g.lineStyle(7, 0xFFFFFF, 1 - i * 0.1);
                g.beginPath();
                g.moveTo(startX, startY);
                g.lineTo(endX, endY);
                g.strokePath();
                
                // Black core
                g.lineStyle(4, 0x000000, 1 - i * 0.1);
                g.beginPath();
                g.moveTo(startX, startY);
                g.lineTo(endX, endY);
                g.strokePath();
            }
        }

        // ── LEGS (Segmented: thigh + shin + foot) ──
        const hipY = y + 2 + bobY;
        let lAng = 0, rAng = 0;
        if (this.stateMachine.is('walk')) {
            lAng = this.walkCycle * 0.06;
            rAng = -this.walkCycle * 0.06;
        }
        if (this.stateMachine.is('jump') || this.stateMachine.is('fall')) {
            lAng = -0.3; rAng = 0.3;
        }

        const drawLeg = (hipOffX, ang, alpha) => {
            const hx = x + hipOffX;
            const kx = hx + Math.sin(ang) * 18;
            const ky = hipY + Math.cos(ang) * 18;
            const fx2 = kx + Math.sin(ang * 0.3) * 16;
            const fy2 = ky + 16;
            strokeOrFill(hx, hipY, kx, ky, 9, legColor, alpha);
            strokeOrFill(kx, ky, fx2, fy2, 7, legColor, alpha);
            g.fillStyle(outlineColor, 0.3);
            g.fillCircle(kx, ky, 3);
            g.fillStyle(0x222233, 1);
            g.beginPath();
            g.moveTo(fx2 - 4, fy2); g.lineTo(fx2 + 6 * f, fy2);
            g.lineTo(fx2 + 8 * f, fy2 + 4); g.lineTo(fx2 - 5, fy2 + 4);
            g.fillPath();
        };
        drawLeg(-6, lAng, 0.8);
        drawLeg(6, rAng, 0.9);

        // ── BLOCK VISUAL (Hexagonal) ──
        if (this.stateMachine.is('block')) {
            g.lineStyle(7, armColor, 1);
            g.beginPath(); g.moveTo(x - 10, armY + 2); g.lineTo(x + 6 * f, armY - 12); g.strokePath();
            g.beginPath(); g.moveTo(x + 10, armY + 2); g.lineTo(x - 6 * f, armY - 10); g.strokePath();
            g.lineStyle(2, outlineColor, 0.4);
            for (let i = 0; i < 6; i++) {
                const a1 = i * Math.PI / 3;
                const a2 = (i + 1) * Math.PI / 3;
                g.beginPath();
                g.moveTo(x + 4 * f + Math.cos(a1) * 14, armY - 4 + Math.sin(a1) * 14);
                g.lineTo(x + 4 * f + Math.cos(a2) * 14, armY - 4 + Math.sin(a2) * 14);
                g.strokePath();
            }
        }

        // ── OUTLINE GLOW ──
        g.lineStyle(1, outlineColor, 0.2);
        g.beginPath();
        g.moveTo(x - sW, tT); g.lineTo(x + sW, tT);
        g.lineTo(x + wW, tB); g.lineTo(x - wW, tB);
        g.closePath();
        g.strokePath();


        // ── INFINITY VISUAL — Round Shield (blocks all damage) ──
        if (this.stateMachine.is('infinity')) {
            const pulse = 0.4 + Math.sin(this.animTimer * 0.008) * 0.2;
            const shieldR = 60;
            const cx = x;
            const cy = y - 15;

            // Outer thick energy ring
            g.lineStyle(5, 0x44CCFF, pulse + 0.4);
            g.strokeCircle(cx, cy, shieldR);

            // Second ring (slightly larger, dimmer)
            g.lineStyle(2, 0x88EEFF, pulse * 0.4);
            g.strokeCircle(cx, cy, shieldR + 8);

            // Inner dome fill
            g.fillStyle(0x44CCFF, pulse * 0.15);
            g.fillCircle(cx, cy, shieldR);

            // Center glow core
            g.fillStyle(0xFFFFFF, pulse * 0.3);
            g.fillCircle(cx, cy, 12);

            // Rotating hexagonal energy nodes
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI / 3) + this.animTimer * 0.003;
                const hx = cx + Math.cos(a) * 42;
                const hy = cy + Math.sin(a) * 42;
                g.fillStyle(0x88EEFF, 0.5);
                g.fillCircle(hx, hy, 6);
                // Connect nodes with faint lines
                const nextA = ((i + 1) * Math.PI / 3) + this.animTimer * 0.003;
                const nx = cx + Math.cos(nextA) * 42;
                const ny = cy + Math.sin(nextA) * 42;
                g.lineStyle(1, 0x44CCFF, 0.3);
                g.beginPath(); g.moveTo(hx, hy); g.lineTo(nx, ny); g.strokePath();
            }

            // Outer particle ring
            for (let i = 0; i < 8; i++) {
                const pa = (i * Math.PI / 4) + this.animTimer * -0.005;
                const px = cx + Math.cos(pa) * (shieldR + 15);
                const py = cy + Math.sin(pa) * (shieldR + 15);
                g.fillStyle(0xCCEEFF, 0.4 + pulse * 0.3);
                g.fillCircle(px, py, 3);
            }
        }

        // ── HITSTUN EFFECT ──
        if (this.stateMachine.is('hitstun')) {
            // Stars around head
            const starT = this.animTimer * 0.01;
            for (let i = 0; i < 3; i++) {
                const angle = starT + (i * Math.PI * 2 / 3);
                const sx = x + Math.cos(angle) * 22;
                const sy = y - 55 + Math.sin(angle) * 8;
                g.fillStyle(0xFFFF00, 0.8);
                g.fillCircle(sx, sy, 4);
            }
        }
    }

    onDomainEnd() {
        this.domainActive = false;
        if (this.scene.onDomainEnd) {
            this.scene.onDomainEnd(this);
        }
    }

    /** Override in subclass for character-specific face (blindfold, markings, etc.) */
    drawFace(g, x, y, facing) {
        // Default: simple eyes
        g.fillStyle(0x000000, 1);
        g.fillCircle(x - 5 * facing, y - 2, 2);
        g.fillCircle(x + 3 * facing, y - 2, 2);
    }

    drawAura(dt) {
        const ag = this.auraGraphics;
        ag.clear();

        if (this.isDead) return;

        const x = this.sprite.x;
        const y = this.sprite.y;

        // Domain casting aura (extreme glow) — keep this
        if (this.stateMachine.is('casting_domain')) {
            const pulse = 0.5 + Math.sin(this.animTimer * 0.008) * 0.3;
            ag.fillStyle(this.colors.energy, pulse * 0.4);
            ag.fillEllipse(x, y - 10, 120, 160);
            ag.lineStyle(2, this.colors.accent, pulse);
            ag.strokeCircle(x, y - 10, 60 + Math.sin(this.animTimer * 0.01) * 20);
        }

        // Simple Domain Visual (Cylinder field)
        if (this.hasSimpleDomain) {
            ag.lineStyle(3, 0x88CCFF, 0.7);
            ag.strokeEllipse(x, y + 25, 90, 25); // Bottom ring
            ag.fillStyle(0x88CCFF, 0.15);
            ag.fillEllipse(x, y + 25, 90, 25);
            // walls
            ag.lineStyle(1, 0x88CCFF, 0.3);
            ag.beginPath();
            ag.moveTo(x - 90, y + 25);
            ag.lineTo(x - 90, y - 60);
            ag.moveTo(x + 90, y + 25);
            ag.lineTo(x + 90, y - 60);
            ag.strokePath();
            // Top ring
            ag.strokeEllipse(x, y - 60, 90, 25);
        }

        // Fatigue visual (dim, flickering)
        if (this.ceSystem.isFatigued) {
            const flicker = Math.random() * 0.3;
            ag.fillStyle(0x444444, flicker);
            ag.fillEllipse(x, y - 10, 40, 55);
        }

        // Burn visual
        if (this.burnTimer > 0) {
            ag.fillStyle(0xFF5500, 0.5);
            ag.fillCircle(x + (Math.random()-0.5)*50, y + (Math.random()-0.5)*90, Math.random()*15+5);
            ag.fillCircle(x + (Math.random()-0.5)*50, y + (Math.random()-0.5)*90, Math.random()*10+5);
        }
    }

    // ── Getters ──────────────────────────────────────────

    getHpRatio() {
        return this.hp / this.maxHp;
    }

    getCeRatio() {
        return this.ceSystem.getRatio();
    }

    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    destroy() {
        this.sprite.destroy();
        this.hitbox.destroy();
        this.graphics.destroy();
        this.auraGraphics.destroy();
    }
}
