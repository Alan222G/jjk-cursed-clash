// ========================================================
// DamageNumbers — Floating damage text
// ========================================================

import { COLORS } from '../config.js';

export default class DamageNumbers {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
    }

    spawn(x, y, amount, type = 'normal') {
        let color = '#FF4444';
        let fontSize = '22px';

        if (type === 'ce') {
            color = '#BB44FF';
            fontSize = '26px';
        } else if (type === 'critical') {
            color = '#FFAA00';
            fontSize = '32px';
        } else if (amount >= 80) {
            color = '#FF6600';
            fontSize = '28px';
        }

        const text = this.scene.add.text(x, y, `-${amount}`, {
            fontFamily: 'Arial Black, Impact, sans-serif',
            fontSize,
            color,
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true },
        }).setDepth(120).setOrigin(0.5);

        // Float up and fade
        this.scene.tweens.add({
            targets: text,
            y: y - 60 - Math.random() * 20,
            x: x + (Math.random() - 0.5) * 40,
            alpha: 0,
            scaleX: 0.6,
            scaleY: 0.6,
            duration: 900,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }
}
