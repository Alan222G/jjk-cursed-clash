// ========================================================
// Generic Finite State Machine (FSM)
// ========================================================

export default class StateMachine {
    constructor(owner, initialState = 'idle') {
        this.owner = owner;
        this.states = {};
        this.currentState = null;
        this.previousState = null;
        this.stateTime = 0;
        this.locked = false;
        this.lockTimer = 0;

        if (initialState) {
            this.initialState = initialState;
        }
    }

    addState(name, config) {
        this.states[name] = {
            name,
            onEnter: config.onEnter || (() => {}),
            onUpdate: config.onUpdate || (() => {}),
            onExit: config.onExit || (() => {}),
            canTransitionTo: config.canTransitionTo || null, // null = can go anywhere
        };
    }

    setState(name, ...args) {
        if (this.locked) return false;
        if (!this.states[name]) {
            console.warn(`State "${name}" does not exist.`);
            return false;
        }
        if (this.currentState === name) return false;

        // Check allowed transitions
        const current = this.states[this.currentState];
        if (current && current.canTransitionTo) {
            if (!current.canTransitionTo.includes(name)) {
                return false;
            }
        }

        // Exit previous state
        if (current) {
            current.onExit.call(this.owner, ...args);
        }

        this.previousState = this.currentState;
        this.currentState = name;
        this.stateTime = 0;

        // Enter new state
        this.states[name].onEnter.call(this.owner, ...args);
        return true;
    }

    update(dt) {
        if (this.locked) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) {
                this.locked = false;
                this.lockTimer = 0;
            }
            return;
        }

        this.stateTime += dt;
        const state = this.states[this.currentState];
        if (state) {
            state.onUpdate.call(this.owner, dt);
        }
    }

    /** Lock state machine for a duration (ms) - prevents transitions */
    lock(durationMs) {
        this.locked = true;
        this.lockTimer = durationMs;
    }

    /** Force-unlock */
    unlock() {
        this.locked = false;
        this.lockTimer = 0;
    }

    /** Check if in a specific state */
    is(stateName) {
        return this.currentState === stateName;
    }

    /** Check if in any of the given states */
    isAny(...stateNames) {
        return stateNames.includes(this.currentState);
    }

    /** Time spent in current state (ms) */
    getStateTime() {
        return this.stateTime;
    }

    /** Initialize with the starting state */
    start() {
        if (this.initialState && this.states[this.initialState]) {
            this.currentState = this.initialState;
            this.states[this.initialState].onEnter.call(this.owner);
        }
    }
}
