// ========================================================
// AI Manager — CPU opponent logic overriding Player 2 inputs
// ========================================================

export default class AIManager {
    constructor(bot, opponent) {
        this.bot = bot;
        this.opponent = opponent;
        
        this.virtualKeys = {
            LEFT: false, RIGHT: false, UP: false, DOWN: false,
            LIGHT: false, MEDIUM: false, HEAVY: false,
            BLOCK: false, SPECIAL: false, DOMAIN: false, DASH: false
        };
        
        this.justPressedKeys = new Set();
        this.timer = 0;
        this.lastDecisionTime = 0;

        // Override bot's InputManager hooks
        this.bot.input.isDown = (action) => this.virtualKeys[action];
        this.bot.input.justPressed = (action) => this.justPressedKeys.has(action);
        
        this.bot.input.getHorizontal = () => {
            let h = 0;
            if (this.virtualKeys['LEFT']) h -= 1;
            if (this.virtualKeys['RIGHT']) h += 1;
            return h;
        };
        
        this.bot.input.getVertical = () => {
            let v = 0;
            if (this.virtualKeys['UP']) v -= 1;
            if (this.virtualKeys['DOWN']) v += 1;
            return v;
        };
        
        this.bot.input.pollAttacks = () => {
            if (this.justPressedKeys.has('LIGHT')) return 'LIGHT';
            if (this.justPressedKeys.has('MEDIUM')) return 'MEDIUM';
            if (this.justPressedKeys.has('HEAVY')) return 'HEAVY';
            if (this.justPressedKeys.has('SPECIAL')) return 'SPECIAL';
            if (this.justPressedKeys.has('DOMAIN')) return 'DOMAIN';
            return null;
        };
    }

    update(time, delta) {
        this.timer += delta;
        this.justPressedKeys.clear(); // Reset just pressed each frame

        if (this.bot.isDead || this.opponent.isDead) return;
        if (this.bot.scene.matchEnded) return;

        // Make AI decisions every 400ms (simulate human reaction time)
        if (this.timer - this.lastDecisionTime > 400) {
            this.lastDecisionTime = this.timer;
            this.makeDecision();
        }
    }

    press(action) {
        this.virtualKeys[action] = true;
        this.justPressedKeys.add(action);
    }

    releaseAll() {
        for (let key in this.virtualKeys) {
            this.virtualKeys[key] = false;
        }
    }

    makeDecision() {
        this.releaseAll();
        
        const dist = Math.abs(this.opponent.sprite.x - this.bot.sprite.x);
        const dir = this.opponent.sprite.x < this.bot.sprite.x ? 'LEFT' : 'RIGHT';
        const myCe = this.bot.ceSystem.current;
        
        // Defensive Block
        if (this.opponent.stateMachine.is('attack') && Math.random() < 0.5) {
            this.press('BLOCK');
            return;
        }

        // Domain Expansion priority
        if (myCe >= 150 && !this.bot.domainActive) {
            if (Math.random() < 0.6) {
                this.press('DOMAIN');
                return;
            }
        }

        if (dist > 280) {
            // Far away
            if (myCe >= 30 && Math.random() < 0.4) {
                this.press('SPECIAL'); // Ranged attacks
            } else {
                this.press(dir); // Move closer
            }
        } else if (dist > 120) {
            // Mid range
            if (Math.random() < 0.6) {
                this.press(dir);
            } else if (myCe >= 50 && Math.random() < 0.3) {
                this.press('UP');
                this.press('SPECIAL'); // Rush attacks
            } else {
                this.press('HEAVY');
            }
        } else {
            // Close Range Combat
            const rand = Math.random();
            if (rand < 0.4) {
                this.press('LIGHT');
            } else if (rand < 0.6) {
                this.press('MEDIUM');
            } else if (rand < 0.75) {
                this.press('BLOCK');
            } else {
                // Backstep
                this.press(dir === 'LEFT' ? 'RIGHT' : 'LEFT');
            }
        }
    }
}
