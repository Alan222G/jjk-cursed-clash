// ========================================================
// ScreenEffects — Camera shake, flash, slow-motion
// ========================================================

export default class ScreenEffects {
    constructor(scene) {
        this.scene = scene;
        this.flashGraphics = scene.add.graphics();
        this.flashGraphics.setDepth(200);
        this.flashGraphics.setScrollFactor(0);
        this.flashGraphics.setAlpha(0);
        this.isFrozen = false;
        this.freezeTimer = 0;
    }

    /** Camera shake */
    shake(intensity = 0.005, duration = 150) {
        if (window.gameSettings && window.gameSettings.graphics === 'low') {
            intensity *= 0.5;
            duration *= 0.5;
        }
        this.scene.cameras.main.shake(duration, intensity);
    }

    /** White/colored screen flash */
    flash(color = 0xFFFFFF, duration = 300, alpha = 0.8) {
        this.flashGraphics.clear();
        this.flashGraphics.fillStyle(color, 1);
        this.flashGraphics.fillRect(0, 0, 1280, 720);
        this.flashGraphics.setAlpha(alpha);

        this.scene.tweens.add({
            targets: this.flashGraphics,
            alpha: 0,
            duration,
            ease: 'Power2',
        });
    }

    /** Hit freeze (hitstop) — brief pause for impact feel */
    hitFreeze(duration = 50) {
        if (window.gameSettings && window.gameSettings.graphics === 'low') return;

        if (this.isFrozen) return;
        this.isFrozen = true;
        this.scene.physics.pause();
        this.scene.time.delayedCall(duration, () => {
            this.scene.physics.resume();
            this.isFrozen = false;
        });
    }

    /** Slow motion effect */
    slowMotion(timeScale = 0.3, duration = 1000) {
        this.scene.time.timeScale = timeScale;
        this.scene.physics.world.timeScale = 1 / timeScale;

        this.scene.time.delayedCall(duration * timeScale, () => {
            this.scene.time.timeScale = 1;
            this.scene.physics.world.timeScale = 1;
        });
    }

    /** Domain activation flash — dramatic dark-to-light */
    domainFlash(color = 0x4488FF) {
        // Dark flash first
        this.flash(0x000000, 200, 1);
        this.scene.time.delayedCall(200, () => {
            this.flash(color, 800, 0.6);
            this.shake(0.01, 500);
        });
    }

    /** Round transition overlay */
    fadeToBlack(duration = 500) {
        return new Promise(resolve => {
            this.flashGraphics.clear();
            this.flashGraphics.fillStyle(0x000000, 1);
            this.flashGraphics.fillRect(0, 0, 1280, 720);
            this.flashGraphics.setAlpha(0);

            this.scene.tweens.add({
                targets: this.flashGraphics,
                alpha: 1,
                duration,
                ease: 'Power2',
                onComplete: () => resolve(),
            });
        });
    }

    fadeFromBlack(duration = 500) {
        this.flashGraphics.clear();
        this.flashGraphics.fillStyle(0x000000, 1);
        this.flashGraphics.fillRect(0, 0, 1280, 720);
        this.flashGraphics.setAlpha(1);

        this.scene.tweens.add({
            targets: this.flashGraphics,
            alpha: 0,
            duration,
            ease: 'Power2',
        });
    }

    /** Stylized anime impact frame lasting exactly 1-2 frames (e.g. 30ms) */
    triggerImpactFrame(type = 'black_flash') {
        const cam = this.scene.cameras.main;
        const p1 = this.scene.p1;
        const p2 = this.scene.p2;
        if (!p1 || !p2 || !cam) return;

        // Brief freeze to emphasize impact (hitstop)
        this.hitFreeze(60);

        this.flashGraphics.clear();

        // 1. Define colors based on type
        let bgColor = 0x000000;
        let p1Color = 0xFFFFFF;
        let p2Color = 0xFFFFFF;
        let extraGraphicsCallback = null;

        if (type === 'purple') {
            bgColor = 0x1F003D; // Deep hollow purple
            p1Color = 0xFF00FF; // Gojo hot pink glow
            p2Color = 0x00FFFF; // Target cyan silhouette
        } else if (type === 'fuga') {
            bgColor = 0x000000;
            p1Color = 0xFF3300; // Sukuna bright orange/red
            p2Color = 0xFFFFFF;
        } else if (type === 'beam') {
            bgColor = 0xFF5500; // Ryu blast orange
            p1Color = 0xFFFFFF;
            p2Color = 0x002288; // Deep blue silhouette
        } else if (type === 'black_flash') {
            bgColor = 0x000000;
            p1Color = 0xFF0033; // Stark crimson
            p2Color = 0xFFFFFF;
            extraGraphicsCallback = (g) => {
                // Draw jagged lightning sparks
                g.lineStyle(4, 0xFF0000, 1);
                for (let i = 0; i < 8; i++) {
                    const lx = Math.random() * 1280;
                    const ly = Math.random() * 720;
                    g.beginPath();
                    g.moveTo(lx, ly);
                    g.lineTo(lx + (Math.random() - 0.5) * 400, ly + (Math.random() - 0.5) * 400);
                    g.strokePath();
                }
            };
        }

        // Draw background
        this.flashGraphics.fillStyle(bgColor, 1);
        this.flashGraphics.fillRect(0, 0, 1280, 720);

        // Draw silhouettes
        const drawSilhouette = (fighter, color) => {
            if (!fighter.sprite || !fighter.sprite.active) return;
            const screenX = (fighter.sprite.x - cam.scrollX) * cam.zoom;
            const screenY = (fighter.sprite.y - cam.scrollY) * cam.zoom;
            const z = cam.zoom;

            this.flashGraphics.fillStyle(color, 1);
            
            // Draw head
            this.flashGraphics.fillCircle(screenX, screenY - 52 * z, 15 * z);

            // Draw body capsule
            this.flashGraphics.fillRoundedRect(screenX - 18 * z, screenY - 35 * z, 36 * z, 80 * z, 8 * z);

            // Draw arms (simplified block sticks)
            this.flashGraphics.fillRect(screenX - 25 * z, screenY - 25 * z, 8 * z, 50 * z);
            this.flashGraphics.fillRect(screenX + 17 * z, screenY - 25 * z, 8 * z, 50 * z);

            // Draw legs
            this.flashGraphics.fillRect(screenX - 15 * z, screenY + 45 * z, 10 * z, 50 * z);
            this.flashGraphics.fillRect(screenX + 5 * z, screenY + 45 * z, 10 * z, 50 * z);
        };

        drawSilhouette(p1, p1Color);
        drawSilhouette(p2, p2Color);

        // Draw extra graphics (e.g. lightning)
        if (extraGraphicsCallback) {
            extraGraphicsCallback(this.flashGraphics);
        }

        this.flashGraphics.setAlpha(1);

        // Clear after 30ms (exactly 1-2 frames of gameplay)
        this.scene.time.delayedCall(30, () => {
            this.flashGraphics.clear();
            this.flashGraphics.setAlpha(0);
        });
    }

    destroy() {
        this.flashGraphics.destroy();
    }
}
