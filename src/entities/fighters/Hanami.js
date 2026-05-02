import Fighter from '../Fighter.js';
import { CHARACTERS } from '../../config.js';
import Projectile from '../Projectile.js';

export default class Hanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.HANAMI);
        
        // Custom Hanami properties
        this.flowerFieldActive = false;
        this.flowerFieldTimer = 0;
        this.rootsCooldown = 0;
        this.domainLifesteal = 0.25;
    }

    // ═══════════════════════════════════════
    // WOOD BUDS (H1) — Drain CE
    // ═══════════════════════════════════════
    executeSkill1() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.stateMachine.setState('attack');
        
        this.castWithAudio('sfx_slash', () => {
            for (let i = 0; i < 2; i++) {
                this.scene.time.delayedCall(i * 150, () => {
                    const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 20, {
                        owner: this,
                        damage: 15,
                        knockbackX: 10 * this.facing, knockbackY: -5,
                        stunDuration: 100, speed: 700,
                        direction: this.facing, color: 0x88AA88,
                        size: { w: 15, h: 15 },
                        onHit: (target) => {
                            // Apply CE drain effect to target
                            target.ceDrainTimer = 3000;
                            if (this.scene.screenEffects) this.scene.screenEffects.flash(0x44FF44, 100, 0.3);
                        }
                    });
                    if (this.scene.projectiles) this.scene.projectiles.push(proj);
                });
            }
        }, 500);
    }

    // ═══════════════════════════════════════
    // EMERGING ROOTS (H2) — Knockup
    // ═══════════════════════════════════════
    executeSkill2() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.stateMachine.setState('attack');

        this.castWithAudio('sfx_heavy_hit', () => {
            const startX = this.sprite.x + 80 * this.facing;
            const groundY = this.sprite.y + 20;

            for (let i = 0; i < 5; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    const rootX = startX + (i * 70) * this.facing;
                    
                    // Visual root
                    const root = this.scene.add.rectangle(rootX, groundY, 40, 100, 0x443322).setOrigin(0.5, 1).setDepth(5);
                    this.scene.tweens.add({
                        targets: root,
                        y: groundY - 80,
                        duration: 150,
                        yoyo: true,
                        hold: 200,
                        onComplete: () => root.destroy()
                    });

                    // Hit detection
                    const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                    const dist = Math.abs(target.sprite.x - rootX);
                    if (dist < 40 && Math.abs(target.sprite.y - groundY) < 100) {
                        target.takeDamage(this.charData.skills.skill2.damage, 50 * this.facing, -800, 600);
                        if (this.scene.screenEffects) this.scene.screenEffects.shake(0.02, 200);
                    }
                });
            }
        }, 800);
    }

    // ═══════════════════════════════════════
    // FIELD OF FLOWERS (H3) — Disable Sprint + Blur
    // ═══════════════════════════════════════
    executeSkill3() {
        if (!this.ceSystem.spend(30)) return;
        this.stateMachine.setState('attack');

        this.castWithAudio('sfx_wind', () => {
            this.flowerFieldActive = true;
            this.flowerFieldTimer = 6000;

            // Visual field
            const field = this.scene.add.circle(this.sprite.x, this.sprite.y, 250, 0xFF99CC, 0.2).setDepth(2);
            this.scene.tweens.add({
                targets: field,
                alpha: 0,
                duration: 6000,
                onUpdate: () => {
                    field.setPosition(this.sprite.x, this.sprite.y);
                    const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y);
                    
                    if (dist < 250) {
                        target.canSprint = false;
                        if (target.playerIndex === 0 || target.playerIndex === 1) {
                            // Blur effect simulation via camera if it's a player
                            // Simplified: we just reduce their speed stat temporarily
                            target.speedMultiplier = 0.5;
                        }
                    } else {
                        target.canSprint = true;
                        target.speedMultiplier = 1.0;
                    }
                },
                onComplete: () => {
                    field.destroy();
                    this.flowerFieldActive = false;
                }
            });
        }, 400);
    }

    // ═══════════════════════════════════════
    // DISASTER ARM (H4) — Block Breaker
    // ═══════════════════════════════════════
    executeSkill4() {
        if (!this.ceSystem.spend(40)) return;
        this.stateMachine.setState('attack');

        this.castWithAudio('sfx_heavy_hit', () => {
            const atkData = {
                name: 'Disaster Arm',
                damage: 80,
                range: 120,
                hitboxW: 150,
                hitboxH: 100,
                startup: 0,
                active: 200,
                recovery: 400,
                knockbackX: 1200,
                knockbackY: -200,
                stunDuration: 800,
                breaksBlock: true
            };
            this.currentAttack = atkData;
            this.enableHitbox(atkData);
            
            // Branch visual
            const branch = this.scene.add.rectangle(this.sprite.x + 60 * this.facing, this.sprite.y, 160, 40, 0x224422)
                .setOrigin(this.facing === 1 ? 0 : 1, 0.5).setDepth(15);
            this.scene.tweens.add({ targets: branch, scaleX: 1.5, alpha: 0, duration: 400, onComplete: () => branch.destroy() });
        }, 1000);
    }

    // ═══════════════════════════════════════
    // ULTIMATE: SOLAR BEAM (MAXIMUM)
    // ═══════════════════════════════════════
    executeMaximum() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.stateMachine.setState('attack');
        this.sprite.body.setVelocity(0, 0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0xCCFFCC, 1000, 0.5);
            this.scene.screenEffects.slowMotion(0.3, 2000);
        }

        // Absorption VFX
        for (let i = 0; i < 20; i++) {
            this.scene.time.delayedCall(i * 50, () => {
                const rx = this.sprite.x + Phaser.Math.Between(-200, 200);
                const ry = this.sprite.y + Phaser.Math.Between(-200, 200);
                const particle = this.scene.add.circle(rx, ry, 4, 0x44FF44).setDepth(40);
                this.scene.tweens.add({
                    targets: particle,
                    x: this.sprite.x,
                    y: this.sprite.y - 40,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => particle.destroy()
                });
            });
        }

        this.scene.time.delayedCall(1500, () => {
            const beam = new Projectile(this.scene, this.sprite.x + 50 * this.facing, this.sprite.y - 40, {
                owner: this,
                damage: this.charData.skills.maximum.damage,
                knockbackX: 1500 * this.facing, knockbackY: -100,
                stunDuration: 1000, speed: 0, // Static beam
                direction: this.facing, color: 0xFFFFEE,
                size: { w: 1000, h: 80 }, lifetime: 1000, type: 'beam'
            });
            if (this.scene.projectiles) this.scene.projectiles.push(beam);
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.06, 1000);
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // DOMAIN EXPANSION: DAICHI NO MEGUMI
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.scene.domainActive) return;
        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;
        this.scene.onDomainActivated(this, 'HANAMI');
    }

    onHitOpponent(target, damage) {
        super.onHitOpponent(target, damage);
        // Life steal during domain
        if (this.scene.domainActive && this.scene.domainOwner === this) {
            const heal = damage * this.domainLifesteal;
            this.hp = Math.min(this.maxHp, this.hp + heal);
        }
    }

    update(time, dt) {
        super.update(time, dt);
        
        // Domain teleport mechanic: Pressing UP in domain teleports behind enemy
        if (this.scene.domainActive && this.scene.domainOwner === this && !this.scene.domainPhase1) {
            if (this.input.justPressed('UP')) {
                const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                this.sprite.x = target.sprite.x - 80 * target.facing;
                this.sprite.y = target.sprite.y;
                if (this.scene.screenEffects) this.scene.screenEffects.flash(0x44FF44, 200, 0.4);
            }
        }
    }
}
