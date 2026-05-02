import Fighter from '../Fighter.js';
import { CHARACTERS } from '../../config.js';
import Projectile from '../Projectile.js';

export default class Choso extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.CHOSO);
        
        this.bloodScalesActive = false;
        this.bloodScalesTimer = 0;
        this.isWingKingActive = false;
        this.wingKingTimer = 0;
    }

    // ═══════════════════════════════════════
    // PIERCING BLOOD (H1) — Sniper Ray
    // ═══════════════════════════════════════
    executeSkill1() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.stateMachine.setState('attack');
        this.sprite.body.setVelocity(0, 0);

        // Convergence visual before firing
        const cx = this.sprite.x + 30 * this.facing;
        const cy = this.sprite.y - 40;
        const bloodBall = this.scene.add.circle(cx, cy, 5, 0x880000).setDepth(15);
        this.scene.tweens.add({ targets: bloodBall, scaleX: 2.5, scaleY: 2.5, duration: 600 });

        this.scene.time.delayedCall(700, () => {
            bloodBall.destroy();
            const beam = new Projectile(this.scene, cx, cy, {
                owner: this,
                damage: this.charData.skills.skill1.damage,
                knockbackX: 800 * this.facing, knockbackY: -50,
                stunDuration: 600, speed: 2500, // FASTEST IN THE GAME
                direction: this.facing, color: 0xAA0000,
                size: { w: 100, h: 4 }, lifetime: 1200, type: 'beam',
                onHit: (target) => this.applyBloodPoison(target)
            });
            if (this.scene.projectiles) this.scene.projectiles.push(beam);
            try { this.scene.sound.play('sfx_slash', { volume: 0.8 }); } catch(e) {}
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // SUPERNOVA (H2) — AOE Spheres
    // ═══════════════════════════════════════
    executeSkill2() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.stateMachine.setState('attack');

        const spheres = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const s = this.scene.add.circle(this.sprite.x, this.sprite.y - 40, 6, 0x880000).setDepth(15);
            spheres.push({ obj: s, angle });
        }

        this.scene.time.delayedCall(500, () => {
            spheres.forEach(s => {
                const vx = Math.cos(s.angle);
                const vy = Math.sin(s.angle);
                const proj = new Projectile(this.scene, s.obj.x, s.obj.y, {
                    owner: this,
                    damage: 15,
                    knockbackX: vx * 400, knockbackY: vy * 400,
                    stunDuration: 200, speed: 800,
                    direction: 1, // Velocity handles direction
                    color: 0xAA0000, size: { w: 12, h: 12 },
                    onHit: (target) => this.applyBloodPoison(target)
                });
                proj.body.setVelocity(vx * 800, vy * 800);
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
                s.obj.destroy();
            });
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // SLICING EXORCISM (H3) — Dash Slash
    // ═══════════════════════════════════════
    executeSkill3() {
        if (!this.ceSystem.spend(40)) return;
        this.stateMachine.setState('attack');

        // Dash forward
        this.sprite.body.setVelocityX(1200 * this.facing);
        
        const blade = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0xAA0000, 0.5).setDepth(15);
        this.scene.tweens.add({ targets: blade, angle: 360, duration: 400, repeat: -1 });

        this.scene.time.delayedCall(400, () => {
            this.sprite.body.setVelocityX(0);
            blade.destroy();
            
            // Final slash hit
            const atkData = {
                name: 'Slicing Exorcism',
                damage: 60, range: 80, hitboxW: 100, hitboxH: 100,
                startup: 0, active: 200, recovery: 200,
                knockbackX: 400 * this.facing, knockbackY: -200,
                stunDuration: 400
            };
            this.currentAttack = atkData;
            this.enableHitbox(atkData);
            this.stateMachine.setState('idle');
        });
    }

    // ═══════════════════════════════════════
    // FLOWING RED SCALE (H4) — Speed Buff
    // ═══════════════════════════════════════
    executeSkill4() {
        if (!this.ceSystem.spend(30)) return;
        
        this.bloodScalesActive = true;
        this.bloodScalesTimer = 10000;
        this.speed = (this.charData.stats.speed || 320) * 1.5;
        
        // Visual effect on face
        const mark = this.scene.add.rectangle(this.sprite.x, this.sprite.y - 50, 20, 5, 0x880000).setDepth(16);
        this.scene.tweens.add({ targets: mark, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
        
        this.scene.time.delayedCall(10000, () => {
            this.bloodScalesActive = false;
            this.speed = this.charData.stats.speed || 320;
            mark.destroy();
        });
    }

    // ═══════════════════════════════════════
    // AWAKENING / WING KING
    // ═══════════════════════════════════════
    tryActivateDomain() {
        if (this.isWingKingActive) return;
        if (!this.ceSystem.spend(80)) return;

        this.isWingKingActive = true;
        this.wingKingTimer = 20000;
        
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x330000, 1000, 0.8);
            this.scene.screenEffects.shake(0.04, 500);
        }

        // Wing Visuals
        const wings = this.scene.add.image(this.sprite.x, this.sprite.y, 'wing_king_placeholder').setDepth(5).setScale(0.5);
        
        this.scene.time.addEvent({
            delay: 1000,
            repeat: 19,
            callback: () => {
                if (!this.isWingKingActive) return;
                // Auto-fire poison needles
                const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
                const proj = new Projectile(this.scene, this.sprite.x, this.sprite.y - 60, {
                    owner: this, damage: 10, speed: 1000,
                    direction: Math.sign(target.sprite.x - this.sprite.x),
                    color: 0x8800FF, size: { w: 10, h: 4 },
                    onHit: (t) => this.applyBloodPoison(t)
                });
                if (this.scene.projectiles) this.scene.projectiles.push(proj);
            }
        });

        this.scene.time.delayedCall(20000, () => {
            this.isWingKingActive = false;
            wings.destroy();
        });
    }

    applyBloodPoison(target) {
        if (!target || target.isDead) return;
        target.bloodPoisonTimer = 5000;
        target.bloodPoisonTick = 0;
        // Purplish vision effect for victim
        if (this.scene.screenEffects) this.scene.screenEffects.flash(0x8800FF, 300, 0.2);
    }

    onHitOpponent(target, damage) {
        super.onHitOpponent(target, damage);
        if (this.isWingKingActive) {
            this.applyBloodPoison(target);
        }
    }

    update(time, dt) {
        super.update(time, dt);
        
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        
        // Poison damage logic
        if (target && target.bloodPoisonTimer > 0) {
            target.bloodPoisonTimer -= dt;
            target.bloodPoisonTick += dt;
            if (target.bloodPoisonTick >= 500) {
                target.hp -= 15;
                target.bloodPoisonTick = 0;
                // Execution logic (10%)
                if (target.hp < target.maxHp * 0.1) {
                    target.hp = 0;
                    target.isDead = true;
                }
            }
        }
    }
}
