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
        this.type = config.type || 'normal'; // normal, heavy, beam, circle, slash, fire_arrow, worm, uzumaki
        this.alive = true;
        this.timer = 0;
        this.onHitCallback = config.onHitCallback || null;

        // Custom visuals
        this.customGraphics = scene.add.graphics().setDepth(6);

        // Determine shape based on type
        const isCircle = this.type === 'circle' || this.type === 'heavy';
        
        if (isCircle) {
            this.sprite = scene.add.circle(x, y, this.size.w / 2, this.color, 0.9);
            this.glow = scene.add.circle(x, y, this.size.w / 2 + 12, this.color, 0.3);
        } else {
            // Invisible physics body for custom drawn types including worm
            const alpha = (this.type === 'slash' || this.type === 'fire_arrow' || this.type === 'worm') ? 0 : 0.9;
            this.sprite = scene.add.rectangle(x, y, this.size.w, this.size.h, this.color, alpha);
            this.glow = scene.add.rectangle(x, y, this.size.w + 12, this.size.h + 12, this.color, alpha === 0 ? 0 : 0.3);
            // Si es el gusano, inicializar el Sprite visual de Phaser que va a seguir a la hitbox
            if (this.type === 'worm') {
                this.wormSprite = scene.add.sprite(x, y, 'sprite_worm_1');
                this.wormSprite.setDepth(15);
                this.wormSprite.setFlipX(this.direction < 0); // El sprite original mira hacia la derecha, entonces se voltea si la dir. es -1
                this.wormSprite.setScale(1.2); // Escala para que luzca bien y proporcionado a las dimensiones originales
                this.wormSprite.play('anim_worm');
            }
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

        // Update trail (Length depends on type)
        const px = this.sprite.x;
        const py = this.sprite.y;
        const dir = this.direction;
        const pulse = 0.2 + Math.sin(this.timer * 0.01) * 0.15;
        this.glow.setAlpha(this.type === 'slash' || this.type === 'fire_arrow' ? 0 : pulse);

        const maxTrail = this.type === 'fire_arrow' ? 25 : 12;
        this.trailPoints.push({ x: px, y: py, alpha: 1 });
        if (this.trailPoints.length > maxTrail) this.trailPoints.shift();

        this.trail.clear();
        for (let i = 0; i < this.trailPoints.length; i++) {
            const p = this.trailPoints[i];
            p.alpha -= (this.type === 'fire_arrow' ? 0.04 : 0.08);
            if (p.alpha > 0) {
                if (this.type === 'fire_arrow') {
                    // Flame trail spreading out chaotic
                    const s = (i / this.trailPoints.length) * 35;
                    const chaos = (Math.random() - 0.5) * 15;
                    this.trail.fillStyle(0xFF3300, p.alpha * 0.4);
                    this.trail.fillCircle(p.x - (20 * dir), p.y + chaos, s);
                    this.trail.fillStyle(0xFFDD00, p.alpha * 0.6);
                    this.trail.fillCircle(p.x - (10 * dir) + chaos, p.y + chaos/2, s * 0.6);
                } else {
                    this.trail.fillStyle(this.color, p.alpha * 0.5);
                    const s = (i / this.trailPoints.length) * this.size.w;
                    this.trail.fillEllipse(p.x, p.y, s, s * 0.6);
                }
            }
        }

        // Custom rendering
        this.customGraphics.clear();

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
        else if (this.type === 'worm') {
            // Actualizar la posición de la imagen al cuerpo físico
            if (this.wormSprite) {
                // Hacer que siga el body invisible pero agregándole offset si es necesario
                this.wormSprite.setPosition(px + (30 * dir), py);
                
                // Animación (cambia de imagen 1,2,3,4 basado en el tiempo)
                // Se recorren las texturas cada 100ms
                const currentFrameUrl = 1 + (Math.floor(this.timer / 100) % 4);
                this.wormSprite.setTexture(`sprite_worm_${currentFrameUrl}`);
            }
        }
        else if (this.type === 'uzumaki') {
            // Uzumaki Beam
            const w = this.size.w; // Massive width
            const h = this.size.h; // Massive height
            
            // Core beam
            this.customGraphics.fillStyle(0x000000, 0.8);
            this.customGraphics.fillRect(px - (dir > 0 ? w : 0), py - h/2, w, h);
            
            // Spiral aura
            this.customGraphics.lineStyle(6, 0xAA00FF, pulse + 0.5);
            this.customGraphics.strokeRect(px - (dir > 0 ? w : 0), py - h/2, w, h);

            // Swirling faces inside beam
            for(let i=0; i<8; i++) {
                const fx = px - (dir > 0 ? Math.random()*w : -Math.random()*w);
                const fy = py - h/2 + Math.random()*h;
                this.customGraphics.fillStyle(0x550088, 0.7);
                this.customGraphics.fillEllipse(fx, fy, 15, 20);
                // Eyes
                this.customGraphics.fillStyle(0xFF0000, 0.9);
                this.customGraphics.fillCircle(fx-3, fy-2, 2);
                this.customGraphics.fillCircle(fx+3, fy-2, 2);
            }
        }
        else if (this.type === 'circle') {
            if (this.color === 0xFF2222) { // RED
                // Repulsion Rings that emit outward
                const ringSize = 25 + (this.timer % 150) / 3;
                this.customGraphics.lineStyle(3, 0xFFFFFF, Math.max(0, 1 - (this.timer % 150)/150));
                this.customGraphics.strokeCircle(px + 10 * dir, py, ringSize);
                
                this.customGraphics.lineStyle(5, 0xFF2222, pulse);
                this.customGraphics.strokeCircle(px, py, 18);
            } 
            else if (this.color === 0x9922FF) { // HOLLOW PURPLE
                // Devastating Black/Purple lightning spikes
                for (let i = 0; i < 4; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = 40 + Math.random() * 40;
                    const endX = px + Math.cos(ang) * r;
                    const endY = py + Math.sin(ang) * r;
                    this.customGraphics.lineStyle(3, Math.random() > 0.5 ? 0x000000 : 0xAA00FF, 0.8);
                    this.customGraphics.beginPath();
                    this.customGraphics.moveTo(px, py);
                    this.customGraphics.lineTo(px + Math.cos(ang)*(r/2) + (Math.random()-0.5)*10, py + Math.sin(ang)*(r/2) + (Math.random()-0.5)*10);
                    this.customGraphics.lineTo(endX, endY);
                    this.customGraphics.strokePath();
                }
            }
        }
    }

    /** Get the physics body for collision checks */
    getBody() {
        return this.sprite;
    }

    /** Called when hitting an opponent */
    onHit(target) {
        if (!this.alive) return;

        if (this.onHitCallback) {
            const override = this.onHitCallback(this, target);
            if (override) return; // If callback returns true, skip default hit logic
        }

        // Apply damage
        if (target && target.takeDamage) {
            target.takeDamage(this.damage, this.knockbackX * this.direction, this.knockbackY, this.stunDuration);
            if ((this.type === 'burn' || this.type === 'fire_arrow') && target.applyBurn) {
                target.applyBurn(5000); // 5 seconds burn
            }
            if (this.type === 'slash') {
                try {
                    const slashIdx = Phaser.Math.Between(1, 11);
                    const slashVol = (window.gameSettings?.sfx ?? 50) / 100 * 1.5;
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
        
        // Destrucción / Estallido del Gusano Sprite
        if (this.wormSprite) {
            this.wormSprite.setTexture('sprite_worm_5');
            this.scene.tweens.add({
                targets: this.wormSprite,
                alpha: 0,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 400,
                onComplete: () => {
                    this.wormSprite.destroy();
                }
            });
        }
    }

    isAlive() {
        return this.alive;
    }
}
