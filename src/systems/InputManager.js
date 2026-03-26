// ========================================================
// Input Manager — Per-player key mapping and buffering
// ========================================================

import { KEY_MAPS } from '../config.js';

export default class InputManager {
    constructor(scene, playerIndex) {
        this.scene = scene;
        this.playerIndex = playerIndex;
        this.keys = {};
        this.buffer = [];
        this.bufferWindow = 150; // ms

        const map = playerIndex === 0 ? KEY_MAPS.P1 : KEY_MAPS.P2;

        // Register all keys
        for (const [action, keyName] of Object.entries(map)) {
            const phaserKey = Phaser.Input.Keyboard.KeyCodes[keyName] || keyName.charCodeAt(0);
            this.keys[action] = scene.input.keyboard.addKey(phaserKey);
        }
    }

    /** Check if a directional/action key is currently held */
    isDown(action) {
        return this.keys[action] && this.keys[action].isDown;
    }

    /** Check if a key was just pressed this frame */
    justPressed(action) {
        return this.keys[action] && Phaser.Input.Keyboard.JustDown(this.keys[action]);
    }

    /** Get horizontal input (-1, 0, 1) */
    getHorizontal() {
        let h = 0;
        if (this.isDown('LEFT')) h -= 1;
        if (this.isDown('RIGHT')) h += 1;
        return h;
    }

    /** Get vertical input (-1, 0, 1) */
    getVertical() {
        let v = 0;
        if (this.isDown('UP')) v -= 1;
        if (this.isDown('DOWN')) v += 1;
        return v;
    }

    /** Add an action to the input buffer with timestamp */
    bufferAction(action) {
        this.buffer.push({
            action,
            time: this.scene.time.now,
        });
        // Keep only last 5 inputs
        if (this.buffer.length > 5) {
            this.buffer.shift();
        }
    }

    /** Check if an action exists in the buffer within the time window */
    hasBuffered(action) {
        const now = this.scene.time.now;
        return this.buffer.some(
            entry => entry.action === action && (now - entry.time) <= this.bufferWindow
        );
    }

    /** Clear the input buffer */
    clearBuffer() {
        this.buffer = [];
    }

    /** Check for attack inputs and buffer them */
    pollAttacks() {
        if (this.justPressed('LIGHT')) {
            this.bufferAction('LIGHT');
            return 'LIGHT';
        }
        if (this.justPressed('MEDIUM')) {
            this.bufferAction('MEDIUM');
            return 'MEDIUM';
        }
        if (this.justPressed('HEAVY')) {
            this.bufferAction('HEAVY');
            return 'HEAVY';
        }
        if (this.justPressed('SPECIAL')) {
            this.bufferAction('SPECIAL');
            return 'SPECIAL';
        }
        if (this.justPressed('DOMAIN')) {
            this.bufferAction('DOMAIN');
            return 'DOMAIN';
        }
        return null;
    }
}
