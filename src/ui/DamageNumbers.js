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
        // [SAFE MODE]: Desactivado para evitar el desbordamiento de la Tarjeta Gráfica
        // o CPU en laptops de gama baja. Cada llamada repetida a la API de CanvasText
        // en Phaser puede congelar la pestaña.
        return;
        
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
            // Removed stroke and shadow as they create huge canvases per number and freeze low-RAM PCs
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
