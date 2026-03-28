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

    destroy() {
        this.flashGraphics.destroy();
    }
}
