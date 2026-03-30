// ========================================================
// Projectile — Cursed Energy ranged attacks
// ========================================================

import Phaser from 'phaser';

export default class Projectile {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.owner = config.owner;
        this.damage = config.damage || 30;
        this.knockbackX = config.knockbackX || 300;
        this.knockbackY = config.knockbackY || -100;
        this.stunDuration = config.stunDuration || 300;
        this.speed = config.speed || 600;
        this.direction = config.direction || 1;
        this.lifetime = config.lifetime || 2000;
        this.color = config.color || 0x4488FF;
        this.size = config.size || { w: 30, h: 20 };
        this.type = config.type || 'normal'; // normal, heavy, beam, circle, slash, fire_arrow
        this.alive = true;
        this.timer = 0;

        // Custom visuals
        this.customGraphics = scene.add.graphics().setDepth(6);

        // Determine shape based on type
        const isCircle = this.type === 'circle' || this.type === 'heavy';
        
        if (isCircle) {
            this.sprite = scene.add.circle(x, y, this.size.w / 2, this.color, 0.9);
            this.glow = scene.add.circle(x, y, this.size.w / 2 + 12, this.color, 0.3);
        } else {
            // Invisible physics body for custom drawn types
            const alpha = (this.type === 'slash' || this.type === 'fire_arrow') ? 0 : 0.9;
            this.sprite = scene.add.rectangle(x, y, this.size.w, this.size.h, this.color, alpha);
            this.glow = scene.add.rectangle(x, y, this.size.w + 12, this.size.h + 12, this.color, alpha === 0 ? 0 : 0.3);
        }

        scene.physics.add.existing(this.sprite);
        this.sprite.body.setVelocityX(this.speed * this.direction);
        this.sprite.body.setAllowGravity(false);
        this.sprite.setDepth(5);
        this.glow.setDepth(4);

        // Trail particles
        this.trail = scene.add.graphics();
        this.trail.setDepth(3);
        this.trailPoints = [];
    }

    update(dt) {
        if (!this.alive) return;

        this.timer += dt;

        // Lifetime check
        if (this.timer >= this.lifetime) {
            this.destroy();
            return;
        }

        // Out of bounds check
        if (this.sprite.x < -50 || this.sprite.x > 1330) {
            this.destroy();
            return;
        }

        // Sync glow
        this.glow.setPosition(this.sprite.x, this.sprite.y);

        // Update trail
        this.trailPoints.push({ x: this.sprite.x, y: this.sprite.y, alpha: 1 });
        if (this.trailPoints.length > 12) this.trailPoints.shift();

        this.trail.clear();
        for (let i = 0; i < this.trailPoints.length; i++) {
            const p = this.trailPoints[i];
            p.alpha -= 0.08;
            if (p.alpha > 0) {
                this.trail.fillStyle(this.color, p.alpha * 0.5);
                const s = (i / this.trailPoints.length) * this.size.w;
                this.trail.fillEllipse(p.x, p.y, s, s * 0.6);
            }
        }

        // Pulsating glow
        const pulse = 0.2 + Math.sin(this.timer * 0.01) * 0.15;
        this.glow.setAlpha(this.type === 'slash' || this.type === 'fire_arrow' ? 0 : pulse);

        // Custom rendering
        this.customGraphics.clear();
        const px = this.sprite.x;
        const py = this.sprite.y;
        const dir = this.direction;

        if (this.type === 'slash') {
            // Black slash anime style
            this.customGraphics.lineStyle(4, 0x000000, 1); // Black core
            this.customGraphics.beginPath();
            this.customGraphics.moveTo(px - 15 * dir, py - 40);
            this.customGraphics.lineTo(px + 20 * dir, py);
            this.customGraphics.lineTo(px - 15 * dir, py + 40);
            this.customGraphics.strokePath();

            // Red/Dark red outer aura
            this.customGraphics.lineStyle(2, 0xFF0000, pulse + 0.3);
            this.customGraphics.beginPath();
            this.customGraphics.moveTo(px - 18 * dir, py - 45);
            this.customGraphics.lineTo(px + 25 * dir, py);
            this.customGraphics.lineTo(px - 18 * dir, py + 45);
            this.customGraphics.strokePath();
        } 
        else if (this.type === 'fire_arrow') {
            // Fuga Arrow (Flaming)
            const fColor = (Math.floor(this.timer) % 4 < 2) ? 0xFF5500 : 0xFFDD00;
            // Arrow shaft
            this.customGraphics.lineStyle(6, 0x000000, 0.9);
            this.customGraphics.beginPath();
            this.customGraphics.moveTo(px - 60 * dir, py);
            this.customGraphics.lineTo(px + 10 * dir, py);
            this.customGraphics.strokePath();
            // Fire Aura
            this.customGraphics.lineStyle(10, fColor, 0.6);
            this.customGraphics.beginPath();
            this.customGraphics.moveTo(px - 70 * dir, py);
            this.customGraphics.lineTo(px + 5 * dir, py);
            this.customGraphics.strokePath();
            // Arrow head
            this.customGraphics.fillStyle(0x000000, 1);
            this.customGraphics.fillTriangle(
                px + 30 * dir, py,
                px + 10 * dir, py - 15,
                px + 10 * dir, py + 15
            );
            // Fire head aura
            this.customGraphics.fillStyle(fColor, 0.5);
            this.customGraphics.fillTriangle(
                px + 45 * dir, py,
                px + 5 * dir, py - 25,
                px + 5 * dir, py + 25
            );
        }
    }

    /** Get the physics body for collision checks */
    getBody() {
        return this.sprite;
    }

    /** Called when hitting an opponent */
    onHit(target) {
        if (!this.alive) return;
        // Apply damage
        if (target && target.takeDamage) {
            target.takeDamage(this.damage, this.knockbackX * this.direction, this.knockbackY, this.stunDuration);
            if (this.type === 'burn' && target.applyBurn) {
                target.applyBurn(5000); // 5 seconds burn
            }
            if (this.type === 'slash') {
                try {
                    const slashIdx = Phaser.Math.Between(1, 11);
                    const slashVol = (window.gameSettings?.sfx || 50) / 100 * 0.5;
                    this.scene.sound.play(`slash_${slashIdx}`, { volume: slashVol });
                } catch (e) {}
            }
        }
        this.spawnHitEffect();
        this.destroy();
    }

    spawnHitEffect() {
        const x = this.sprite.x;
        const y = this.sprite.y;
        // Flash circle
        const flash = this.scene.add.circle(x, y, 30, this.color, 0.8);
        flash.setDepth(10);
        this.scene.tweens.add({
            targets: flash,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flash.destroy(),
        });
    }

    destroy() {
        this.alive = false;
        this.sprite.destroy();
        this.glow.destroy();
        this.trail.destroy();
        if (this.customGraphics) this.customGraphics.destroy();
    }

    isAlive() {
        return this.alive;
    }
}
