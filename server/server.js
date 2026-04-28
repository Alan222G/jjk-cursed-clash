// ========================================================
// Server — Node.js + Socket.io backend for online play
// Handles rooms, matchmaking, tournament brackets, and raid
// ========================================================

import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Room storage
const rooms = new Map();
let roomCounter = 1000;

function generateRoomCode() {
    roomCounter++;
    return `JJK-${roomCounter}`;
}

// ── Room class ──
class GameRoom {
    constructor(hostSocket, mode, format) {
        this.code = generateRoomCode();
        this.hostId = hostSocket.id;
        this.mode = mode; // 'tournament' | 'raid'
        this.format = format; // { slots: 2|4|8 }
        this.players = new Map();
        this.state = 'lobby'; // lobby | playing | finished
        this.createdAt = Date.now();

        // Add host
        this.players.set(hostSocket.id, {
            id: hostSocket.id,
            name: 'Host',
            charKey: 'GOJO',
            isBot: false,
            slot: 0,
            ready: false,
        });
    }

    addPlayer(socket, name) {
        if (this.players.size >= this.format.slots) return false;
        const slot = this.players.size;
        this.players.set(socket.id, {
            id: socket.id,
            name: name || `Player ${slot + 1}`,
            charKey: 'SUKUNA',
            isBot: false,
            slot: slot,
            ready: false,
        });
        return true;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        // If host leaves, close room
        if (socketId === this.hostId) {
            this.state = 'finished';
            return true; // Room should be destroyed
        }
        return false;
    }

    getPublicState() {
        return {
            code: this.code,
            mode: this.mode,
            format: this.format,
            state: this.state,
            hostId: this.hostId,
            players: Array.from(this.players.values()),
            playerCount: this.players.size,
            maxPlayers: this.format.slots,
        };
    }
}

// ── Socket Events ──
io.on('connection', (socket) => {
    console.log(`[+] Player connected: ${socket.id}`);

    // Create Room
    socket.on('createRoom', ({ mode, format, playerName }) => {
        const room = new GameRoom(socket, mode, format);
        room.players.get(socket.id).name = playerName || 'Host';
        rooms.set(room.code, room);
        socket.join(room.code);
        socket.roomCode = room.code;
        socket.emit('roomCreated', room.getPublicState());
        console.log(`[Room] Created ${room.code} (${mode}, ${format.slots} slots)`);
    });

    // Join Room
    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        if (room.state !== 'lobby') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }
        if (!room.addPlayer(socket, playerName)) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.emit('joinedRoom', room.getPublicState());
        io.to(roomCode).emit('roomUpdated', room.getPublicState());
        console.log(`[Room] ${playerName} joined ${roomCode}`);
    });

    // Update Player (character selection, ready state)
    socket.on('updatePlayer', ({ charKey, ready }) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        const player = room.players.get(socket.id);
        if (!player) return;
        if (charKey) player.charKey = charKey;
        if (ready !== undefined) player.ready = ready;
        io.to(socket.roomCode).emit('roomUpdated', room.getPublicState());
    });

    // Add/Remove Bot
    socket.on('toggleBot', ({ slot, charKey }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || socket.id !== room.hostId) return;
        // Add bot to empty slot
        const botId = `bot_${slot}`;
        if (room.players.has(botId)) {
            room.players.delete(botId);
        } else if (room.players.size < room.format.slots) {
            room.players.set(botId, {
                id: botId,
                name: `BOT ${slot + 1}`,
                charKey: charKey || 'GOJO',
                isBot: true,
                slot: slot,
                ready: true,
            });
        }
        io.to(socket.roomCode).emit('roomUpdated', room.getPublicState());
    });

    // Start Game (host only)
    socket.on('startGame', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || socket.id !== room.hostId) return;
        room.state = 'playing';
        io.to(socket.roomCode).emit('gameStart', room.getPublicState());
        console.log(`[Room] ${socket.roomCode} started!`);
    });

    // Game State Sync (send inputs, receive state)
    socket.on('gameInput', (inputData) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        // Broadcast input to all other players in room
        socket.to(socket.roomCode).emit('remoteInput', {
            playerId: socket.id,
            input: inputData,
        });
    });

    // Match Result (from host)
    socket.on('matchResult', (result) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        io.to(socket.roomCode).emit('matchEnded', result);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`[-] Player disconnected: ${socket.id}`);
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                const shouldDestroy = room.removePlayer(socket.id);
                if (shouldDestroy) {
                    io.to(socket.roomCode).emit('roomClosed', { reason: 'Host disconnected' });
                    rooms.delete(socket.roomCode);
                    console.log(`[Room] ${socket.roomCode} closed`);
                } else {
                    io.to(socket.roomCode).emit('roomUpdated', room.getPublicState());
                }
            }
        }
    });

    // List rooms
    socket.on('listRooms', () => {
        const publicRooms = [];
        rooms.forEach((room) => {
            if (room.state === 'lobby') {
                publicRooms.push(room.getPublicState());
            }
        });
        socket.emit('roomList', publicRooms);
    });
});

// Cleanup stale rooms every 5 minutes
setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, code) => {
        if (now - room.createdAt > 30 * 60 * 1000) { // 30 min timeout
            io.to(code).emit('roomClosed', { reason: 'Room expired' });
            rooms.delete(code);
            console.log(`[Cleanup] Room ${code} expired`);
        }
    });
}, 5 * 60 * 1000);

httpServer.listen(PORT, () => {
    console.log(`\n🎮 JJK Cursed Clash Server running on port ${PORT}`);
    console.log(`   Waiting for connections...\n`);
});
