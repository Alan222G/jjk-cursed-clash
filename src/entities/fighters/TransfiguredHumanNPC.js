// ========================================================
// Transfigured Human NPC — Standalone AI Shikigami/Minion (NOT a Fighter)
// ========================================================

import { PHYSICS, GAME_WIDTH } from '../../config.js';

export default class TransfiguredHumanNPC {
    constructor(scene, x, y, owner) {
        this.scene = scene;
        this.owner = owner;

        // Resolve target: the opponent of the owner
        this.target = (owner === scene.p1) ? scene.p2 : scene.p1;

        // Stats
        this.maxHp = 500;
        this.hp = this.maxHp;
        this.speed = 450;
        this.power = 1.0;
        this.defense = 1.0;
        this.facing = owner.facing;
        this.isDead = false;
        this.isInvulnerable = false;
        this.stunTimer = 0;
        this.actionCooldown = 0;
        this.lifetimeTimer = 10000; // Lasts 10 seconds
        this.state = 'idle'; // 'idle', 'walk', 'attack', 'hitstun', 'dead'

        // ── Physics Body (Small size) ──
        this.sprite = scene.add.rectangle(x, y, 40, 60, 0x000000, 0);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(40, 60);
        this.sprite.body.setGravityY(PHYSICS.GRAVITY);
        this.sprite.body.setDragX(PHYSICS.DRAG_X);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setBounce(0);
        this.sprite.body.setMaxVelocityX(600);
        this.sprite.setDepth(10);

        // ── Hitbox (attack zone) ──
        this.hitbox = scene.add.rectangle(x, y, 50, 40, 0xff0000, 0);
        scene.physics.add.existing(this.hitbox, false);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.enable = false;
        this.hitbox.setDepth(11);

        // ── Visual Graphics ──
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(10);

        // Store ref on sprite for collision callbacks
        this.sprite.fighterRef = this;
        this.hitbox.fighterRef = this;
        
        // Spawn effect
        const aura = this.scene.add.circle(this.sprite.x, this.sprite.y, 10, 0x44AAFF, 0.8);
        this.scene.tweens.add({ targets: aura, scale: 5, alpha: 0, duration: 400, onComplete: () => aura.destroy() });
    }

    takeDamage(damage, kbX, kbY, stunDuration, isProjectile = false) {
        if (this.isInvulnerable || this.isDead) return;

        damage = Math.floor(damage / this.defense);
        if (damage < 1) damage = 1;
        this.hp -= damage;

        if (this.scene.spawnDamageNumber) {
            this.scene.spawnDamageNumber(this.sprite.x, this.sprite.y - 60, damage);
        }

        if (this.hp <= 0) {
            this.die();
            return;
        }

        if (this.sprite.body) {
            this.sprite.body.setVelocity(kbX, kbY);
        }

        if (stunDuration > 0) {
            this.state = 'hitstun';
            this.stunTimer = stunDuration;
        }
    }

    onHitOpponent(target) {}

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.hp = 0;
        this.state = 'dead';
        
        const splatter = this.scene.add.circle(this.sprite.x, this.sprite.y, 30, 0x222222, 0.8);
        this.scene.tweens.add({ targets: splatter, scale: 2, alpha: 0, duration: 400, onComplete: () => splatter.destroy() });

        if (this.owner && this.owner.transfiguredHumans) {
            this.owner.transfiguredHumans = this.owner.transfiguredHumans.filter(h => h !== this);
        }

        this.scene.time.delayedCall(100, () => {
            try {
                if (this.sprite && this.sprite.active) this.sprite.destroy();
                if (this.graphics) this.graphics.destroy();
                if (this.hitbox && this.hitbox.active) this.hitbox.destroy();
            } catch(e) {}
        });
    }

    drawCharacter() {
        if (!this.graphics || this.isDead) return;
        this.graphics.clear();

        const sx = this.sprite.x;
        const sy = this.sprite.y;
        const f = this.facing;

        // Bizarre twisted body shape (Transfigured Human)
        this.graphics.fillStyle(0x8899AA, 1);
        
        // Torso
        this.graphics.fillEllipse(sx, sy, 25, 40);
        
        // Asymmetrical arms
        this.graphics.lineStyle(5, 0x778899, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(sx, sy - 10);
        if (this.state === 'attack') {
            this.graphics.lineTo(sx + 35 * f, sy - 10);
        } else {
            this.graphics.lineTo(sx + 20 * f, sy + 15);
        }
        this.graphics.strokePath();

        // Legs
        this.graphics.lineStyle(6, 0x667788, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(sx - 5, sy + 15);
        this.graphics.lineTo(sx - 10, sy + 30);
        this.graphics.moveTo(sx + 5, sy + 15);
        this.graphics.lineTo(sx + 10, sy + 30);
        this.graphics.strokePath();

        // Twisted Head
        this.graphics.fillStyle(0x99AABB, 1);
        this.graphics.fillCircle(sx + 5 * f, sy - 25, 12);
        
        // Eye
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(sx + 8 * f, sy - 28, 2);
    }

    update(time, dt) {
        if (this.isDead) return;
        if (!this.sprite || !this.sprite.active) return;

        this.lifetimeTimer -= dt;
        if (this.lifetimeTimer <= 0) {
            this.die();
            return;
        }

        this.drawCharacter();
        this.hitbox.setPosition(this.sprite.x + 20 * this.facing, this.sprite.y);

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.state = 'idle';
            }
            return;
        }

        if (this.state === 'attack') return;

        this.actionCooldown -= dt;
        if (this.actionCooldown > 0) return;

        if (!this.target || this.target.isDead || !this.target.sprite || !this.target.sprite.active) return;

        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
        this.facing = this.target.sprite.x > this.sprite.x ? 1 : -1;

        if (dist > 60) {
            this.sprite.body.setVelocityX(this.speed * this.facing);
            this.state = 'walk';
        } else {
            this.sprite.body.setVelocityX(0);
            this.state = 'idle';

            if (Math.random() < 0.1) { // Attack
                this.castPunch();
            }
        }
    }

    castPunch() {
        this.state = 'attack';
        this.actionCooldown = 800; // Attack every 0.8s
        this.sprite.body.setVelocityX(150 * this.facing);

        this.scene.time.delayedCall(150, () => {
            if (!this.target || this.target.isDead || !this.target.sprite) {
                this.state = 'idle';
                return;
            }
            const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
            if (dist < 80 && this.target.takeDamage) {
                try { this.scene.sound.play('sfx_dash', { volume: 0.5 }); } catch(e) {}
                this.target.takeDamage(Math.floor(15 * this.power), 100 * this.facing, -50, 200);
            }
            this.scene.time.delayedCall(200, () => { this.state = 'idle'; });
        });
    }
}
