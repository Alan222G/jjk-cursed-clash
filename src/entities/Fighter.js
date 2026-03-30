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
        this.burnTimer = 0;
        this.burnTickTimer = 0;

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
                // Drain CE while active (15 CE per second — very notable)
                const drain = 15 * (dt / 1000);
                this.ceSystem.ce -= drain;
                if (this.ceSystem.ce <= 0) {
                    this.ceSystem.ce = 0;
                    this.infinityActive = false;
                    this.stateMachine.setState('idle');
                    return;
                }
                
                // Toggle OFF if they press I again or let go of shift
                if (this.input.justPressed('DOMAIN')) {
                    this.infinityActive = false;
                    this.stateMachine.setState('idle');
                }
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

        sm.addState('casting_domain', {
            onEnter: function () {
                this.isInvulnerable = true;
                this.sprite.body.setVelocity(0, 0);
                this.sprite.body.setAllowGravity(false);
            },
            onUpdate: function () {},
            onExit: function () {
                this.isInvulnerable = false;
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
            this.stateMachine.setState('jump');
        }
    }

    handleAttackInput() {
        const attackAction = this.input.pollAttacks();
        if (!attackAction) return;

        if (attackAction === 'DOMAIN') {
            // Ignore Domain cast if they are trying to toggle Infinity (holding BLOCK)
            if (this.input.isDown('BLOCK') && this.fighterId === 'gojo') {
                return; 
            }
            this.tryActivateDomain();
            return;
        }

        if (attackAction === 'SPECIAL') {
            this.trySpecialAttack();
            return;
        }

        // Normal attacks
        if (this.stateMachine.isAny('idle', 'walk', 'jump', 'fall')) {
            const atkData = ATTACKS[attackAction];
            if (atkData) {
                this.currentAttack = { ...atkData, type: attackAction };
                this.stateMachine.setState('attack');
            }
        }
    }

    handleBlockInput() {
        if (this.stateMachine.isAny('idle', 'walk', 'block')) {
            // Check for Infinity Toggle (Gojo only: SHIFT + I/DOMAIN)
            if (this.input.isDown('BLOCK') && this.input.justPressed('DOMAIN') && this.fighterId === 'gojo') {
                if (this.ceSystem.ce > 0) {
                    this.stateMachine.setState('infinity');
                    return;
                }
            }
            // Normal block
            if (this.input.isDown('BLOCK') && !this.stateMachine.is('block') && !this.stateMachine.is('infinity')) {
                this.stateMachine.setState('block');
            }
        }
    }

    // ── Combat Methods ───────────────────────────────────

    enableHitbox(atkData) {
        const offsetX = atkData.range * this.facing;
        const newX = this.sprite.x + offsetX;
        const newY = this.sprite.y - 10;
        this.hitbox.setPosition(newX, newY);
        this.hitbox.setSize(atkData.hitboxW, atkData.hitboxH);
        this.hitbox.body.setSize(atkData.hitboxW, atkData.hitboxH);
        this.hitbox.body.reset(newX, newY);
        this.hitbox.body.enable = true;
    }

    disableHitbox() {
        this.hitbox.body.enable = false;
    }

    takeDamage(damage, kbX, kbY, stunDuration) {
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

            if (breaksBlock) {
                // Heavy breaks block — reduced damage but full knockback
                damage = Math.floor(damage * 0.4);
                // Force out of block into hitstun
                this.stateMachine.setState('hitstun');
                this.stunTimer = stunDuration;
            } else {
                // Normal block — 40% damage reduction
                damage = Math.floor(damage * 0.6);
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

        this.hitConnected = true;
        const atk = this.currentAttack;
        const dmg = Math.floor(atk.damage * this.power);
        const kbX = atk.knockbackX * this.facing;

        // Pass attack data to scene for block mechanics
        this.scene.lastHitAttack = atk;

        opponent.takeDamage(dmg, kbX, atk.knockbackY, atk.stunDuration); // Passive CE only: no gain on hit
        this.comboSystem.registerHit(atk.type);

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
            if (atk.type === 'HEAVY') {
                this.scene.screenEffects.shake(0.005, 200);
                this.scene.screenEffects.hitFreeze(80);
            } else {
                this.scene.screenEffects.shake(0.002, 100);
            }
        }
    }

    autoFace() {
        if (!this.opponent) return;
        this.facing = this.opponent.sprite.x > this.sprite.x ? 1 : -1;
    }

    // ── Special Abilities (overridden by subclasses) ─────

    trySpecialAttack() {
        // Override in subclass
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

    applyBurn(duration) {
        this.burnTimer = duration;
        this.burnTickTimer = 500;
    }

    // ── Update ───────────────────────────────────────────

    update(time, dt) {
        if (this.isDead) {
            this.drawBody(dt);
            return;
        }

        // Ground check
        this.isOnGround = this.sprite.body.blocked.down || this.sprite.body.touching.down;

        // Fall detection
        if (!this.isOnGround && this.sprite.body.velocity.y > 50 &&
            this.stateMachine.isAny('idle', 'walk')) {
            this.stateMachine.setState('fall');
        }

        // Update systems
        this.stateMachine.update(dt);
        this.ceSystem.update(dt);
        this.comboSystem.update(dt);

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

        // Hit flash effect
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        let bodyColor = isFlashing ? 0xFFFFFF : colors.primary;
        let armColor = bodyColor;
        let legColor = bodyColor;

        if (this.fighterId === 'gojo' && !isFlashing) {
            bodyColor = 0x111118; // Dark Navy/Black for uniform
            armColor = 0x111118;
            legColor = 0x151520;  // Slightly distinct dark tone for pants
        }
        const outlineColor = colors.secondary;

        // Dead state — simple fallen figure
        if (this.isDead) {
            g.fillStyle(bodyColor, 0.5);
            g.fillEllipse(x, y + 20, 80, 25);
            return;
        }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;

        // ── BODY OUTLINE GLOW ──
        g.lineStyle(4, outlineColor, 0.4);
        // Torso
        g.strokeRect(x - 14, y - 28 + bobY, 28, 38);

        // ── HEAD & HAIR ──
        if (this.fighterId === 'gojo' && !this.isDead) { // Custom Gojo Head (Pixel-art style)
            // High collar that covers chin/neck
            g.fillStyle(bodyColor, 1);
            g.fillRect(x - 12, y - 48 + bobY, 24, 18);
            g.lineStyle(2, 0x05050A, 0.5);
            g.strokeRect(x - 12, y - 48 + bobY, 24, 18);

            // Skin (only upper face visible above collar)
            g.fillStyle(colors.skin, 1);
            g.beginPath();
            g.arc(x, y - 48 + bobY, 15, Math.PI, 0); // Semicircle
            g.fillPath();

            // Custom face details (Blindfold)
            this.drawFace(g, x, y - 48 + bobY, f);

            // Spiky Hair (White/Silver)
            g.fillStyle(colors.hair, 1);
            g.beginPath();
            g.moveTo(x - 16, y - 50 + bobY);
            // Left to right spikes
            g.lineTo(x - 20, y - 62 + bobY);
            g.lineTo(x - 10, y - 58 + bobY);
            g.lineTo(x - 5, y - 72 + bobY);
            g.lineTo(x + 2, y - 60 + bobY);
            g.lineTo(x + 12, y - 68 + bobY);
            g.lineTo(x + 15, y - 55 + bobY);
            g.lineTo(x + 22, y - 60 + bobY);
            g.lineTo(x + 16, y - 50 + bobY);
            g.fillPath();
            // Inner hair details (shadows/depth)
            g.lineStyle(2, 0xDDDDEE, 0.8);
            g.beginPath();
            g.moveTo(x - 5, y - 72 + bobY); g.lineTo(x - 2, y - 55 + bobY);
            g.moveTo(x + 12, y - 68 + bobY); g.lineTo(x + 8, y - 58 + bobY);
            g.strokePath();
        } else {
            // Default Head
            g.fillStyle(colors.skin, 1);
            g.fillCircle(x, y - 46 + bobY, 16);
            // Default Hair
            g.fillStyle(colors.hair, 1);
            g.fillEllipse(x, y - 55 + bobY, 30, 14);
            // Face
            this.drawFace(g, x, y - 46 + bobY, f);
        }

        // ── TORSO / CLOTHING ──
        if (this.fighterId === 'gojo') {
            // Gojo Uniform (Dark Navy/Black) - Trapezoid (wider shoulders)
            g.fillStyle(bodyColor, 0.95);
            g.beginPath();
            g.moveTo(x - 17, y - 28 + bobY); // Left shoulder (slightly wider)
            g.lineTo(x + 17, y - 28 + bobY); // Right shoulder
            g.lineTo(x + 11, y + 10 + bobY); // Right waist
            g.lineTo(x - 11, y + 10 + bobY); // Left waist
            g.fillPath();
            // Jacket collar, zipper line, and creases
            g.lineStyle(2, 0x05050A, 0.8);
            g.beginPath();
            g.moveTo(x, y - 28 + bobY);
            g.lineTo(x, y + 10 + bobY); // Zipper
            // Creases
            g.moveTo(x - 8, y - 28 + bobY);
            g.lineTo(x - 5, y + 5 + bobY);
            g.moveTo(x + 8, y - 28 + bobY);
            g.lineTo(x + 5, y + 5 + bobY);
            g.strokePath();
            // Torso already closed in previous step
        } else if (this.fighterId === 'sukuna') {
            // Sukuna Kimono - Trapezoid
            g.fillStyle(0xf0f0f5, 0.95);
            g.beginPath();
            g.moveTo(x - 18, y - 28 + bobY);
            g.lineTo(x + 18, y - 28 + bobY);
            g.lineTo(x + 14, y + 12 + bobY);
            g.lineTo(x - 14, y + 12 + bobY);
            g.fillPath();
            // Black neck trim (V-neck)
            g.fillStyle(0x111111, 1);
            g.beginPath();
            g.moveTo(x - 10, y - 28 + bobY);
            g.lineTo(x, y - 6 + bobY);
            g.lineTo(x + 10, y - 28 + bobY);
            g.fillPath();
            // Dark Sash/Belt
            g.fillStyle(0x111111, 1);
            g.fillRect(x - 15, y + bobY - 2, 30, 10);
        } else {
            // Default generic body
            g.fillStyle(bodyColor, 0.95);
            g.beginPath();
            g.moveTo(x - 15, y - 28 + bobY);
            g.lineTo(x + 15, y - 28 + bobY);
            g.lineTo(x + 12, y + 10 + bobY);
            g.lineTo(x - 12, y + 10 + bobY);
            g.fillPath();
        }

        // ── ARMS ──
        const armY = y - 24 + bobY;
        const armExtend = this.attackSwing * 35;

        // Custom Idle pose for Gojo (Pixel art ref: Hand in pocket, other hand up)
        const isGojoIdle = this.fighterId === 'gojo' && this.stateMachine.isAny('idle', 'walk') && this.attackSwing === 0;

        // Back arm
        g.lineStyle(11, armColor, 0.7);
        g.beginPath();
        g.moveTo(x - 12 * f, armY);
        if (isGojoIdle) {
            // Relaxed arm (in pocket)
            g.lineTo(x - 14 * f, armY + 22);
            g.lineTo(x - 8 * f, armY + 36);
        } else {
            // Ready stance back arm
            g.lineTo(x - 22 * f, armY + 18);
        }
        g.strokePath();

        // Front arm (attack arm)
        g.lineStyle(11, armColor, 1);
        g.beginPath();
        g.moveTo(x + 12 * f, armY);
        
        if (isGojoIdle) {
            // Arm raised doing gesture
            g.lineTo(x + 18 * f, armY - 5);
            g.lineTo(x + 24 * f, armY - 20);
            // Hand/fingers gesture indicator
            g.fillStyle(colors.skin, 1);
            g.fillCircle(x + 24 * f, armY - 22, 5);
        } else if (this.attackSwing > 0 && this.fighterId !== 'sukuna') {
            // Normal Fighter Punch
            g.lineTo(x + (25 + armExtend) * f, armY - 5);
            // Fist glow during attack
            g.fillStyle(colors.energy, 0.8);
            g.fillCircle(x + (28 + armExtend) * f, armY - 5, 8);
        } else {
            // Arm stays by side (Sukuna attacks hands-free or normal generic idle)
            g.lineTo(x + 18 * f, armY + 22);
        }
        g.strokePath();

        // ── SUKUNA INVISIBLE SLASH FX ──
        if (this.attackSwing > 0 && this.fighterId === 'sukuna') {
            const slashX = x + (25 + armExtend) * f + (15 * f);
            const slashY = armY - 5;
            
            // Big thick black crescent slash with white outline (Polygonal to avoid freeze)
            g.lineStyle(14, 0xFFFFFF, 0.9);
            g.beginPath();
            g.moveTo(slashX - 15 * f, slashY - 45);
            g.lineTo(slashX + 30 * f, slashY - 10);
            g.lineTo(slashX + 30 * f, slashY + 10);
            g.lineTo(slashX - 15 * f, slashY + 45);
            g.strokePath();
            
            g.lineStyle(8, 0x000000, 1);
            g.beginPath();
            g.moveTo(slashX - 15 * f, slashY - 45);
            g.lineTo(slashX + 30 * f, slashY - 10);
            g.lineTo(slashX + 30 * f, slashY + 10);
            g.lineTo(slashX - 15 * f, slashY + 45);
            g.strokePath();
        }

        // ── LEGS ──
        const legY = y + 8 + bobY;
        let leftLegX = -8;
        let rightLegX = 8;
        let leftKnee = 25;
        let rightKnee = 25;

        if (this.stateMachine.is('walk')) {
            leftKnee += this.walkCycle;
            rightKnee -= this.walkCycle;
        }
        if (this.stateMachine.is('jump') || this.stateMachine.is('fall')) {
            leftKnee = 15;
            rightKnee = 15;
            leftLegX = -12;
            rightLegX = 12;
        }

        g.lineStyle(12, legColor, 0.9);
        g.beginPath();
        g.moveTo(x + leftLegX, legY);
        g.lineTo(x + leftLegX - 3, legY + leftKnee);
        g.strokePath();

        g.beginPath();
        g.moveTo(x + rightLegX, legY);
        g.lineTo(x + rightLegX + 3, legY + rightKnee);
        g.strokePath();

        // ── BLOCK VISUAL — Crouch + Arms Crossed (no shield) ──
        if (this.stateMachine.is('block')) {
            // Draw crossed arms in front of body
            g.lineStyle(8, armColor, 1);
            // Left arm crossed over
            g.beginPath();
            g.moveTo(x - 12, armY);
            g.lineTo(x + 8 * f, armY - 15);
            g.strokePath();
            // Right arm crossed over
            g.beginPath();
            g.moveTo(x + 12, armY);
            g.lineTo(x - 8 * f, armY - 10);
            g.strokePath();
        }

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
        const ceRatio = this.ceSystem.getRatio();

        // Base energy aura (intensity based on CE level)
        if (ceRatio > 0.1) {
            const intensity = ceRatio * 0.25;
            const auraSize = 50 + ceRatio * 30;
            ag.fillStyle(this.colors.energy, intensity * 0.3);
            ag.fillEllipse(x, y - 10, auraSize, auraSize * 1.4);

            // Floating energy particles
            const numParticles = Math.floor(ceRatio * 6);
            for (let i = 0; i < numParticles; i++) {
                const angle = this.animTimer * 0.002 + (i * Math.PI * 2 / numParticles);
                const radius = 30 + Math.sin(this.animTimer * 0.003 + i) * 15;
                const px = x + Math.cos(angle) * radius;
                const py = y - 10 + Math.sin(angle) * radius * 0.6 - ceRatio * 20;
                const pSize = 2 + Math.sin(this.animTimer * 0.005 + i * 2) * 1.5;
                ag.fillStyle(this.colors.energy, 0.6);
                ag.fillCircle(px, py, pSize);
            }
        }

        // Domain casting aura (extreme glow)
        if (this.stateMachine.is('casting_domain')) {
            const pulse = 0.5 + Math.sin(this.animTimer * 0.008) * 0.3;
            ag.fillStyle(this.colors.energy, pulse * 0.4);
            ag.fillEllipse(x, y - 10, 120, 160);
            ag.lineStyle(2, this.colors.accent, pulse);
            ag.strokeCircle(x, y - 10, 60 + Math.sin(this.animTimer * 0.01) * 20);
        }

        // Fatigue visual (dim, flickering aura)
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
