import Fighter from '../Fighter.js';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../../config.js';

export default class Nanami extends Fighter {
    constructor(scene, x, y, playerIndex) {
        super(scene, x, y, playerIndex, CHARACTERS.NANAMI);
        this.overtimeActive = false;
        this.overtimeTimer = 0;
        this.nanamiArmorActive = false;
        this.nanamiArmorTimer = 0;
        this.nextHitGuaranteedBlackFlash = false;
        this.isCasting = false;
    }

    update(time, dt) {
        super.update(time, dt);

        if (this.overtimeActive) {
            this.overtimeTimer -= dt;
            if (this.overtimeTimer <= 0) {
                this.overtimeActive = false;
                this.power = this.charData.stats.power || 1.1;
                this.defense = this.charData.stats.defense || 0.9;
            }
        }

        if (this.nanamiArmorActive) {
            this.nanamiArmorTimer -= dt;
            if (this.nanamiArmorTimer <= 0) {
                this.nanamiArmorActive = false;
            }
        }
    }

    _check73Crit(target) {
        if (this.nextHitGuaranteedBlackFlash) {
            return true;
        }
        if (!target) return false;
        const dist = Math.abs(this.sprite.x - target.sprite.x);
        // "solo haz que si se da un golpe excato en el extremo del golpe sea un black flash asegurado"
        // Tip of the weapon range:
        const minDist = this.overtimeActive ? 60 : 65;
        const maxDist = this.overtimeActive ? 180 : 85;
        return dist >= minDist && dist <= maxDist;
    }



    onHitOpponent(opponent) {
        const isCrit = this._check73Crit(opponent);
        if (isCrit) {
            this.nextHitGuaranteedBlackFlash = false; // consume mark
            const originalPower = this.power;
            this.power *= 2.6;
            
            if (this.scene.screenEffects) {
                this.scene.screenEffects.hitFreeze(150);
                this.scene.screenEffects.flash(0x000000, 150, 0.4);
                this.scene.screenEffects.shake(0.04, 300);
            }
            try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
            this.spawnBlackFlashEffect(opponent.sprite.x, opponent.sprite.y);
            if (this.ceSystem) this.ceSystem.gain(30); // Unificado con Black Flash normal
            
            super.onHitOpponent(opponent);
            this.power = originalPower;
        } else {
            super.onHitOpponent(opponent);
        }
    }

    takeDamage(damage, kbX, kbY, stunDuration, isProjectile = false) {
        if (this.nanamiArmorActive && !isProjectile) {
            damage = Math.floor(damage * 0.5);
            kbX = 0;
            kbY = 0;
            stunDuration = 0;
            if (this.scene.screenEffects) this.scene.screenEffects.flash(0xAAAAAA, 50, 0.3);
        }
        super.takeDamage(damage, kbX, kbY, stunDuration);
    }

    drawBody(dt) {
        const g = this.graphics;
        g.clear();
        const x = this.sprite.x; const y = this.sprite.y;
        const f = this.facing;
        const isFlashing = this.hitFlash > 0 && Math.floor(this.hitFlash) % 2 === 0;
        if (this.isDead) { g.fillStyle(0x111118, 0.5); g.fillEllipse(x, y + 20, 80, 25); return; }

        const bobY = this.stateMachine.isAny('idle', 'block') ? this.idleBob : 0;
        const masterY = y + bobY;
        const isMoving = this.stateMachine.is('walk');
        const time = (this.scene.time.now * 0.0035);

        const skinColor = isFlashing ? 0xFFFFFF : 0xfed7aa;
        const suitColor = isFlashing ? 0xFFFFFF : 0xe3d5ca;
        const tieColor = isFlashing ? 0xFFFFFF : 0xfacc15;
        const shirtColor = isFlashing ? 0xFFFFFF : 0x60a5fa;
        const hairColor = isFlashing ? 0xFFFFFF : 0xfef08a;

        const ox = x;
        const oy = masterY - 15;

        // 1. LEGS (beige trousers and dark shoes)
        const legAngle = isMoving ? Math.sin(time) * 5 : 0;
        this.drawRect(g, ox - 5, oy + 28 + 18, 7.5, 38, suitColor, legAngle);
        this.drawRect(g, ox - 5, oy + 28 + 39, 9.5, 5, 0x1e1b4b);

        this.drawRect(g, ox + 5, oy + 28 + 18, 7.5, 38, suitColor, -legAngle);
        this.drawRect(g, ox + 5, oy + 28 + 39, 9.5, 5, 0x1e1b4b);

        // 2. TORSO
        this.drawRect(g, ox, oy + 5, 17, 34, suitColor);
        // Shirt
        this.drawTriangle(g, ox, oy - 4 - 3, 8, 12, shirtColor);
        // Spotted tie
        this.drawRect(g, ox, oy - 4 + 4, 2.5, 14, tieColor);
        if (!isFlashing) {
            // Draw leopard/spotted dots on tie
            g.fillStyle(0x000000, 0.8);
            g.fillRect(ox - 0.8, oy, 0.8, 0.8);
            g.fillRect(ox + 0.4, oy + 3, 0.8, 0.8);
            g.fillRect(ox - 0.6, oy + 6, 0.8, 0.8);
        }

        // 3. ARMS
        // Back Arm
        this.drawRect(g, ox - 9, oy - 10, 7.5, 28, suitColor, 22);
        this.drawCircle(g, ox - 9 - Math.sin(22*Math.PI/180)*28, oy - 10 + Math.cos(22*Math.PI/180)*28, 3.8, skinColor);

        // Front Arm holding ratio sword
        const armExtend = this.attackSwing * 35;
        let fx = ox + 9;
        let fy = oy + 17;
        let armRot = -15;

        if (this.attackSwing > 0) {
            fx = ox + 9 + 22 + armExtend;
            fy = oy - 5;
            armRot = -85;
            this.drawRect(g, ox + 9 + armExtend/2, oy - 5, 28 + armExtend, 7.5, suitColor, armRot);
        } else {
            this.drawRect(g, ox + 9, oy - 10, 7.5, 28, suitColor, armRot);
        }
        this.drawCircle(g, fx, fy, 3.8, skinColor);

        // Ratio Sword (Cleaver wrapped in spotted bandage)
        const lfx = fx - this.sprite.x;
        const lfy = fy - masterY;
        g.save();
        g.translate(lfx, lfy);
        if (this.attackSwing > 0) {
            g.rotate((-85 - this.attackSwing * 45) * Math.PI / 180);
        } else {
            g.rotate(75 * Math.PI / 180);
        }

        // Empuñadura (Handle)
        g.fillStyle(0x000000, 1);
        g.fillRect(-2.5, 0, 5, 9);
        g.lineStyle(1.8, 0x000000, 1);
        g.strokeRect(-2.5, 0, 5, 9);

        // Cleaver blade wrapped in white bandages
        g.fillStyle(0xf8fafc, 1);
        g.fillRect(-4.25, -26, 8.5, 26);
        g.strokeRect(-4.25, -26, 8.5, 26);

        // Spotted patterns on the wraps
        if (!isFlashing) {
            g.fillStyle(0x000000, 1);
            g.fillRect(-2, -23, 2, 3);
            g.fillRect(2, -18, 2, 2.5);
            g.fillRect(-3, -13, 2.5, 2);
            g.fillRect(1, -8, 2.2, 3);
            g.fillRect(-2, -4, 2, 2);
        }
        g.restore();

        // 7:3 Ratio Crit Effect Spark (when attacking at critical distance)
        if (this.attackSwing > 0 && this.scene.time.now % 100 < 50) {
            const ratioX = rx + 30 * f;
            const ratioY = ry - 18;
            g.lineStyle(2.2, 0xfacc15, 1);
            g.beginPath();
            g.moveTo(ratioX - 7, ratioY - 7); g.lineTo(ratioX + 7, ratioY + 7);
            g.moveTo(ratioX + 7, ratioY - 7); g.lineTo(ratioX - 7, ratioY + 7);
            g.strokePath();
        }

        // 4. HEAD
        const hx = ox;
        const hy = oy - 22;

        this.drawCircle(g, hx, hy, 10, skinColor);

        // Hair peinado
        this.drawCircle(g, hx, hy - 8, 9, hairColor);
        this.drawTriangle(g, hx - 4, hy - 6, 4, 8, hairColor, 45);
        this.drawTriangle(g, hx, hy - 7, 5, 8, hairColor, 15);
        this.drawTriangle(g, hx + 4, hy - 6, 5, 8, 0xeab308, -30);

        // Tired face eyes without goggles
        if (!isFlashing) {
            this.drawLine(g, hx - 5, hy + 1, hx - 1, hy + 1, 1.8, 0x000000);
            this.drawLine(g, hx - 5, hy - 1, hx - 1, hy - 1, 2, 0x451a03);

            this.drawLine(g, hx + 1, hy + 1, hx + 5, hy + 1, 1.8, 0x000000);
            this.drawLine(g, hx + 1, hy - 1, hx + 5, hy - 1, 2, 0x451a03);

            // Eye bags
            this.drawLine(g, hx - 4.5, hy + 3, hx - 1.5, hy + 3, 1, 0x94a3b8);
            this.drawLine(g, hx + 1.5, hy + 3, hx + 4.5, hy + 3, 1, 0x94a3b8);

            // Mouth
            this.drawLine(g, hx - 2.5, hy + 6, hx + 2.5, hy + 6, 1.5, 0x000000);
        }
    }

    trySpecialAttack() {
        if (this.isCasting) return;
        const tier = this.ceSystem.getTier();
        
        if (tier >= 2 && this.input.isDown('UP')) {
            this.executeRafaga();
        } else if (tier >= 1 && (this.input.isDown('LEFT') || this.input.isDown('RIGHT'))) {
            this.executeColapso();
        } else if (tier >= 1 && this.input.isDown('DOWN')) {
            this.executeArmor();
        } else if (tier >= 1) {
            this.executeMarca();
        }
    }

    executeMarca() {
        if (!this.ceSystem.spend(this.charData.skills.skill1.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(400);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'MARCA 7:3', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#FF0000', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });

        this.nextHitGuaranteedBlackFlash = true;

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeArmor() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(400);

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'ARMOR', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#AAAAAA', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });

        this.nanamiArmorActive = true;
        this.nanamiArmorTimer = 8000; // 8 seconds of armor

        this.scene.time.delayedCall(400, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeColapso() {
        if (!this.ceSystem.spend(this.charData.skills.skill2.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(800);
        this.sprite.body.setVelocityX(0);

        this.scene.time.delayedCall(300, () => {
            if (!this.isCasting) return;
            try { this.scene.sound.play('sfx_heavy_hit', { volume: 0.7 }); } catch(e) {}
            if (this.scene.screenEffects) this.scene.screenEffects.shake(0.015, 300);
            
            const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;
            
            if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 180) {
                target.takeDamage(Math.floor(65 * this.power), 200 * this.facing, -300, 1000);
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    executeRafaga() {
        if (!this.ceSystem.spend(this.charData.skills.maximum.cost)) return;
        this.isCasting = true;
        this.stateMachine.lock(1100);

        const target = (this === this.scene.p1) ? this.scene.p2 : this.scene.p1;

        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 250, () => {
                if (!this.isCasting || this.isDead) return;
                this.sprite.body.setVelocityX(this.facing * 300);
                
                if (target && !target.isDead && Math.abs(target.sprite.x - this.sprite.x) < 140) {
                    const isCrit = (i === 3) || this._check73Crit(target);
                    const dmg = isCrit ? 20 * 2.6 : 20;
                    if (isCrit) {
                        if (this.scene.screenEffects) {
                            this.scene.screenEffects.hitFreeze(150);
                            this.scene.screenEffects.flash(0x000000, 150, 0.4);
                            this.scene.screenEffects.shake(0.04, 300);
                        }
                        try { this.scene.sound.play('black_flash_sfx', { volume: 1.0 }); } catch(e) {}
                        this.spawnBlackFlashEffect(target.sprite.x, target.sprite.y);
                    }
                    target.takeDamage(Math.floor(dmg * this.power), i === 3 ? 400 * this.facing : 50 * this.facing, i === 3 ? -200 : 0, 300);
                }
            });
        }

        this.scene.time.delayedCall(1100, () => {
            this.isCasting = false;
            this.stateMachine.unlock();
            this.stateMachine.setState('idle');
        });
    }

    tryActivateDomain() {
        if (this.overtimeActive) return; // Ya está activo

        if (!this.ceSystem.spend(this.charData.skills.domain.cost)) return;

        this.overtimeActive = true;
        this.overtimeTimer = 15000;
        
        this.power = (this.charData.stats.power || 1.1) * 1.5;
        this.defense = (this.charData.stats.defense || 0.9) * 1.5;
        this.charData.stats.ceRegen = (this.charData.stats.ceRegen || 3.5) * 2.0; // Doble regeneración
        this.ceRegen = this.charData.stats.ceRegen; // Aplicar regeneración extra

        // Efecto visual instantáneo de desatarse la corbata
        if (this.scene.screenEffects) {
            this.scene.screenEffects.flash(0x44AAFF, 200, 0.4);
            this.scene.screenEffects.shake(0.02, 300);
        }
        
        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 80, 'OVERTIME!', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#0088FF', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(40);
        this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }

    drawAura(dt) {
        super.drawAura(dt);
        if (this.isDead) return;

        const ag = this.auraGraphics;
        const x = this.sprite.x; 
        const y = this.sprite.y;
        const t = this.scene.time.now;

        if (this.overtimeActive) {
            // Intense office-worker blue/gold aura indicating Overtime
            const pulse = 0.2 + Math.sin(t * 0.01) * 0.15;
            ag.fillStyle(0x0088FF, pulse);
            ag.fillEllipse(x, y - 25, 60, 100);

            // Clock hands spinning around him
            ag.lineStyle(2, 0xFFCC00, 0.6);
            const angle1 = t * 0.005;
            const angle2 = t * 0.001;
            ag.beginPath();
            ag.moveTo(x, y - 30);
            ag.lineTo(x + Math.cos(angle1) * 35, y - 30 + Math.sin(angle1) * 35);
            ag.moveTo(x, y - 30);
            ag.lineTo(x + Math.cos(angle2) * 25, y - 30 + Math.sin(angle2) * 25);
            ag.strokePath();
        }
    }
}
