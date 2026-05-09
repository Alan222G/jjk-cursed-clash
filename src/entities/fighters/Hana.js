// ========================================================
// Hana Kurusu — Angel's Cursed Technique
// Jacob's Ladder, Technique Extinguishment, Holy Wings
// ========================================================

import Fighter from '../Fighter.js';
import Projectile from '../Projectile.js';
import { CHARACTERS, CE_COSTS, PHYSICS } from '../../config.js';

export default class Hana extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.HANA);
        this.isCasting = false;

        // Angel Wings state (flight)
        this.wingsActive = false;
        this.wingsTimer = 0;

        // Extinguishment state
        this.extinguishActive = false;
        this.extinguishTimer = 0;
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();

        // While wings active, U+Down = divebomb
        if (this.wingsActive && this.input.isDown('DOWN')) {
            this.castDivineJudgment();
            return;
        }

        if (tier >= 4 && this.input.isDown('DOWN')) {
            this.castJacobsLadder();
        } else if (tier >= 2 && this.input.isDown('UP')) {
            this.castAngelWings();
        } else if (tier >= 2 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.castHolyLance();
        } else if (tier >= 1) {
            this.castLightBeam();
        }
    }

    // H1: Light Beam — Quick forward projectile
    castLightBeam() {
        if (!this.ceSystem.spend(25)) return;
        this.isCasting = true; this.stateMachine.lock(500);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_beam', { volume: 0.7 }); } catch(e) {}

        const proj = new Projectile(this.scene, this.sprite.x + 40 * this.facing, this.sprite.y - 10, {
            owner: this,
            damage: 30 * this.power,
            knockbackX: 250,
            knockbackY: -100,
            stunDuration: 300,
            speed: 1100,
            direction: this.facing,
            color: 0xFFFF88,
            size: { w: 40, h: 15 },
            lifetime: 800,
            type: 'normal'
        });
        if (this.scene.projectiles) this.scene.projectiles.push(proj);

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H2: Holy Lance — Longer range, higher damage
    castHolyLance() {
        if (!this.ceSystem.spend(45)) return;
        this.isCasting = true; this.stateMachine.lock(700);
        this.sprite.body.setVelocityX(0);

        try { this.scene.sound.play('sfx_slash', { volume: 0.9 }); } catch(e) {}

        // Visual lance
        const lance = this.scene.add.rectangle(this.sprite.x + 60 * this.facing, this.sprite.y, 120, 8, 0xFFFF88).setDepth(15);
        this.scene.tweens.add({ targets: lance, x: lance.x + 300 * this.facing, alpha: 0, duration: 400, onComplete: () => lance.destroy() });

        this.scene.time.delayedCall(200, () => {
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 300) {
                target.takeDamage(55 * this.power, 500 * this.facing, -200, 500);
            }
        });

        this.scene.time.delayedCall(700, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H3: Angel Wings — Flight mode
    castAngelWings() {
        if (!this.ceSystem.spend(40)) return;
        this.isCasting = true; this.stateMachine.lock(300);

        try { this.scene.sound.play('sfx_dash', { volume: 0.8 }); } catch(e) {}

        const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0xFFFF88, 0.5).setDepth(15);
        this.scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });

        this.sprite.body.setVelocityY(-1000);
        this.wingsActive = true;
        this.wingsTimer = 4000; // 4 seconds hover

        this.scene.time.delayedCall(300, () => {
            this.isCasting = false; this.stateMachine.unlock();
        });
    }

    // Aerial divebomb while wings are active
    castDivineJudgment() {
        this.isCasting = true; this.stateMachine.lock(500);
        this.wingsActive = false;
        this.sprite.body.setAllowGravity(true);

        try { this.scene.sound.play('sfx_dash', { volume: 1.0 }); } catch(e) {}

        this.sprite.body.setVelocityY(1400);
        this.sprite.body.setVelocityX(200 * this.facing);

        this.scene.time.delayedCall(250, () => {
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.04, 300);
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 1.0 }); } catch(e) {}

            const wave = this.scene.add.circle(this.sprite.x, this.sprite.y + 20, 50, 0xFFFF88, 0.7).setDepth(15);
            this.scene.tweens.add({ targets: wave, scale: 3, alpha: 0, duration: 400, onComplete: () => wave.destroy() });

            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 120) {
                target.takeDamage(65 * this.power, 500 * this.facing, -600, 700);
            }
        });

        this.scene.time.delayedCall(500, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // H4: Jacob's Ladder (Maximum) — Massive beam from the sky
    castJacobsLadder() {
        if (!this.ceSystem.spend(CE_COSTS.MAXIMUM)) return;
        this.isCasting = true; this.stateMachine.lock(2000);
        this.sprite.body.setVelocityX(0);

        if (this.scene.screenEffects) {
            this.scene.screenEffects.slowMotion(0.3, 1000);
            this.scene.screenEffects.flash(0xFFFF88, 400, 0.7);
        }
        try { this.scene.sound.play('heavy_smash', { volume: 1.5 }); } catch(e) {}

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        const targetX = target ? target.sprite.x : this.sprite.x + 200 * this.facing;

        this.scene.time.delayedCall(500, () => {
            // Giant light pillar from sky
            const pillar = this.scene.add.rectangle(targetX, 0, 80, PHYSICS.GROUND_Y + 100, 0xFFFF88, 0.9).setDepth(22).setOrigin(0.5, 0);
            const core = this.scene.add.rectangle(targetX, 0, 30, PHYSICS.GROUND_Y + 100, 0xFFFFFF, 0.8).setDepth(23).setOrigin(0.5, 0);

            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.08, 800);

            if (target && !target.isDead) {
                const dist = Math.abs(target.sprite.x - targetX);
                if (dist < 80) {
                    target.takeDamage(180 * this.power, 400 * this.facing, -600, 1200, true);
                }
            }

            this.scene.tweens.add({ targets: [pillar, core], alpha: 0, duration: 800, onComplete: () => { pillar.destroy(); core.destroy(); } });
        });

        this.scene.time.delayedCall(2000, () => {
            this.isCasting = false; this.stateMachine.unlock(); this.stateMachine.setState('idle');
        });
    }

    // Domain: Technique Extinguishment — Disables opponent's CE for duration
    tryActivateDomain() {
        if (this.isCasting) return;
        if (!this.ceSystem.canAfford(CE_COSTS.DOMAIN)) return;
        if (this.scene.domainActive || this.scene.domainPhase1) {
            if (this.scene.domainOwner !== this) {
                const clash = this.scene.attemptDomainClash(this);
                if (!clash) return;
            } else return;
        } else if (this.domainActive) return;

        this.ceSystem.spend(CE_COSTS.DOMAIN);
        this.domainActive = true;
        this.ceSystem.startDomain();
        if (this.stateMachine.is('attack')) this.stateMachine.setState('idle');

        try { this.scene.sound.play('sfx_heal', { volume: 1.0 }); } catch(e) {}
        if (this.scene.onDomainActivated) this.scene.onDomainActivated(this, 'technique_extinguishment');

        this.domainTimer = 12000;
        this.extinguishActive = true;
        this.power = (this.charData.stats.power || 1.0) * 1.3;

        // Drain opponent CE continuously
        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
        if (target && target.ceSystem) {
            this.extinguishInterval = this.scene.time.addEvent({
                delay: 500, loop: true,
                callback: () => {
                    if (!this.domainActive || !target || target.isDead) {
                        if (this.extinguishInterval) this.extinguishInterval.destroy();
                        return;
                    }
                    target.ceSystem.ce = Math.max(0, target.ceSystem.ce - 8);
                }
            });
        }
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.wingsActive) {
            this.wingsTimer -= dt;
            if (this.wingsTimer > 0) {
                this.sprite.body.setAllowGravity(false);
                if (this.input.isDown('LEFT')) this.sprite.body.setVelocityX(-this.speed * 1.2);
                else if (this.input.isDown('RIGHT')) this.sprite.body.setVelocityX(this.speed * 1.2);
                else this.sprite.body.setVelocityX(0);
                this.sprite.body.setVelocityY(0);
            } else {
                this.wingsActive = false;
                this.sprite.body.setAllowGravity(true);
            }
        }

        if (this.domainActive) {
            this.domainTimer -= dt;
            if (this.domainTimer <= 0) {
                this.domainActive = false;
                this.extinguishActive = false;
                this.power = this.charData.stats.power || 1.0;
                if (this.extinguishInterval) { this.extinguishInterval.destroy(); this.extinguishInterval = null; }
                this.ceSystem.endDomain();
                if (this.scene.onDomainEnded) this.scene.onDomainEnded();
            }
        }
    }

    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 60, 20); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;

        const skinColor = isFlashing ? 0xFFFFFF : 0xFFE0CC;
        const robeColor = isFlashing ? 0xFFFFFF : 0xFFFFEE;
        const hairColor = isFlashing ? 0xFFFFFF : 0x222222;
        const armExtend = this.attackSwing * 30;

        // Legs
        const legY = masterY + 10;
        let leftLeg = 30, rightLeg = 30;
        if (this.stateMachine.is('walk')) { leftLeg += this.walkCycle; rightLeg -= this.walkCycle; }
        else if (this.stateMachine.isAny('jump', 'fall') || this.wingsActive) { leftLeg = 10; rightLeg = 10; }
        g.fillStyle(robeColor, 1);
        g.fillTriangle(x - 8, legY, x - 8 - 10, legY + leftLeg, x - 8 + 10, legY + leftLeg - 5);
        g.fillTriangle(x + 8, legY, x + 8 - 12 * f, legY + rightLeg, x + 8 + 12 * f, legY + rightLeg - 2);

        // Torso
        g.fillStyle(robeColor, 1);
        g.beginPath();
        g.moveTo(x - 14, masterY - 30);
        g.lineTo(x + 14, masterY - 30);
        g.lineTo(x + 12, masterY + 15);
        g.lineTo(x - 12, masterY + 15);
        g.fillPath();

        // Wings visual while active
        if (this.wingsActive) {
            g.fillStyle(0xFFFF88, 0.5);
            // Left wing
            g.beginPath();
            g.moveTo(x - 5, masterY - 20);
            g.lineTo(x - 40, masterY - 50);
            g.lineTo(x - 50, masterY - 30);
            g.lineTo(x - 30, masterY - 10);
            g.fillPath();
            // Right wing
            g.beginPath();
            g.moveTo(x + 5, masterY - 20);
            g.lineTo(x + 40, masterY - 50);
            g.lineTo(x + 50, masterY - 30);
            g.lineTo(x + 30, masterY - 10);
            g.fillPath();
        }

        // Arms
        const armY = masterY - 26;
        g.lineStyle(8, skinColor, 1);
        g.beginPath(); g.moveTo(x - 10 * f, armY); g.lineTo(x - 20 * f, armY + 15); g.strokePath();
        g.beginPath(); g.moveTo(x + 10 * f, armY); g.lineTo(x + (20 + armExtend) * f, armY + 5); g.strokePath();

        // Head
        const hx = x; const hy = masterY - 45;
        g.fillStyle(skinColor, 1);
        g.fillCircle(hx, hy, 12);

        // Hair
        g.fillStyle(hairColor, 1);
        g.beginPath();
        g.moveTo(hx - 12, hy - 5);
        g.lineTo(hx - 14, hy + 15);
        g.lineTo(hx - 6, hy + 18);
        g.lineTo(hx, hy - 12);
        g.lineTo(hx + 6, hy + 18);
        g.lineTo(hx + 14, hy + 15);
        g.lineTo(hx + 12, hy - 5);
        g.fillPath();

        // Halo when domain/wings active
        if (this.wingsActive || this.domainActive) {
            g.lineStyle(2, 0xFFFF88, 0.7);
            g.strokeEllipse(hx, hy - 18, 20, 8);
        }
    }
}
