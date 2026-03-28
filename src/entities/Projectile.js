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
        this.type = config.type || 'normal'; // normal, heavy, beam
        this.alive = true;
        this.timer = 0;

        // Physics sprite
        this.sprite = scene.add.rectangle(x, y, this.size.w, this.size.h, this.color, 0.9);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setVelocityX(this.speed * this.direction);
        this.sprite.body.setAllowGravity(false);
        this.sprite.setDepth(5);
        // Glow and trail removed for performance
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

        // Sync removed for performance
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
        }
        // Hit effect removed for performance
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
        if (this.sprite) this.sprite.destroy();
    }

    isAlive() {
        return this.alive;
    }
}
