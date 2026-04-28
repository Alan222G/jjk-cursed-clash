// ========================================================
// NetworkManager — Client-side Socket.io handler
// Connects to the game server for online play
// ========================================================

import { io } from 'socket.io-client';

class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomCode = null;
        this.roomState = null;
        this.listeners = new Map();
    }

    connect(serverUrl) {
        if (this.socket) this.disconnect();

        const url = serverUrl || 'http://localhost:3001';
        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.connected = true;
            console.log('[Network] Connected to server');
            this.emit('connected');
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('[Network] Disconnected');
            this.emit('disconnected');
        });

        this.socket.on('error', (data) => {
            console.warn('[Network] Error:', data.message);
            this.emit('error', data);
        });

        // Room events
        this.socket.on('roomCreated', (state) => {
            this.roomCode = state.code;
            this.roomState = state;
            this.emit('roomCreated', state);
        });

        this.socket.on('joinedRoom', (state) => {
            this.roomCode = state.code;
            this.roomState = state;
            this.emit('joinedRoom', state);
        });

        this.socket.on('roomUpdated', (state) => {
            this.roomState = state;
            this.emit('roomUpdated', state);
        });

        this.socket.on('gameStart', (state) => {
            this.roomState = state;
            this.emit('gameStart', state);
        });

        this.socket.on('remoteInput', (data) => {
            this.emit('remoteInput', data);
        });

        this.socket.on('matchEnded', (result) => {
            this.emit('matchEnded', result);
        });

        this.socket.on('roomClosed', (data) => {
            this.roomCode = null;
            this.roomState = null;
            this.emit('roomClosed', data);
        });

        this.socket.on('roomList', (rooms) => {
            this.emit('roomList', rooms);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.roomCode = null;
        this.roomState = null;
    }

    // Room operations
    createRoom(mode, format, playerName) {
        if (!this.socket) return;
        this.socket.emit('createRoom', { mode, format, playerName });
    }

    joinRoom(roomCode, playerName) {
        if (!this.socket) return;
        this.socket.emit('joinRoom', { roomCode, playerName });
    }

    updatePlayer(charKey, ready) {
        if (!this.socket) return;
        this.socket.emit('updatePlayer', { charKey, ready });
    }

    toggleBot(slot, charKey) {
        if (!this.socket) return;
        this.socket.emit('toggleBot', { slot, charKey });
    }

    startGame() {
        if (!this.socket) return;
        this.socket.emit('startGame');
    }

    sendInput(inputData) {
        if (!this.socket) return;
        this.socket.emit('gameInput', inputData);
    }

    sendMatchResult(result) {
        if (!this.socket) return;
        this.socket.emit('matchResult', result);
    }

    listRooms() {
        if (!this.socket) return;
        this.socket.emit('listRooms');
    }

    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        const cbs = this.listeners.get(event);
        if (cbs) {
            const idx = cbs.indexOf(callback);
            if (idx >= 0) cbs.splice(idx, 1);
        }
    }

    emit(event, data) {
        const cbs = this.listeners.get(event);
        if (cbs) cbs.forEach(cb => cb(data));
    }
}

// Singleton
const networkManager = new NetworkManager();
export default networkManager;
