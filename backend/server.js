const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Room storage in memory
// Key: roomId
// Value: { data: GameRoom, lastActivity: timestamp, hostSocketId: string }
const rooms = new Map();

// Helper to update lastActivity
const touchRoom = (roomId) => {
  if (rooms.has(roomId)) {
    rooms.get(roomId).lastActivity = Date.now();
  }
};

io.on('connection', (socket) => {
  console.log(`[+] User connected: ${socket.id}`);

  // Host creates a room
  socket.on('createRoom', (roomData, callback) => {
    const roomId = roomData.id;
    rooms.set(roomId, {
      data: roomData,
      lastActivity: Date.now(),
      hostSocketId: socket.id
    });
    socket.join(roomId);
    console.log(`[+] Room created: ${roomId} by ${socket.id}`);
    if (typeof callback === 'function') callback({ success: true, room: roomData });
  });

  // User joins a room
  socket.on('joinRoom', (roomCode, callback) => {
    // Find room by code
    let foundRoomId = null;
    let foundRoom = null;
    
    for (const [id, r] of rooms.entries()) {
      if (r.data.code === roomCode) {
        foundRoomId = id;
        foundRoom = r;
        break;
      }
    }

    if (foundRoomId) {
      socket.join(foundRoomId);
      touchRoom(foundRoomId);
      console.log(`[+] User ${socket.id} joined room ${foundRoomId}`);
      if (typeof callback === 'function') callback({ success: true, room: foundRoom.data });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Sala no encontrada' });
    }
  });
  
  socket.on('joinRoomById', (roomId, callback) => {
    if (rooms.has(roomId)) {
      socket.join(roomId);
      touchRoom(roomId);
      console.log(`[+] User ${socket.id} joined room ${roomId}`);
      if (typeof callback === 'function') callback({ success: true, room: rooms.get(roomId).data });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Sala eliminada' });
    }
  });

  // User/Host updates a room (extract number, shout bingo, validate, etc.)
  socket.on('updateRoom', (roomId, changes, callback) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Update room data with changes
      room.data = { ...room.data, ...changes };
      room.lastActivity = Date.now();
      
      // Broadcast the whole updated room state
      io.to(roomId).emit('roomUpdated', room.data);
      
      if (typeof callback === 'function') callback({ success: true });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Sala no encontrada' });
    }
  });

  // Specific atomic operations to prevent race conditions
  socket.on('addBingoCaller', (roomId, playerName, callback) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (!room.data.bingoCallers) room.data.bingoCallers = [];
      if (!room.data.bingoCallers.includes(playerName)) {
        room.data.bingoCallers.push(playerName);
      }
      room.lastActivity = Date.now();
      io.to(roomId).emit('roomUpdated', room.data);
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  socket.on('removeBingoCaller', (roomId, playerName, callback) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.data.bingoCallers) {
        room.data.bingoCallers = room.data.bingoCallers.filter(c => c !== playerName);
      }
      room.lastActivity = Date.now();
      io.to(roomId).emit('roomUpdated', room.data);
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  socket.on('addWinner', (roomId, newWinner, callback) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (!room.data.winnersHistory) room.data.winnersHistory = [];
      room.data.winnersHistory.push(newWinner);
      room.data.bingoCallers = []; // Clear callers
      room.lastActivity = Date.now();
      io.to(roomId).emit('roomUpdated', room.data);
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  // Host deletes room
  socket.on('deleteRoom', (roomId, callback) => {
    if (rooms.has(roomId)) {
      // Notify everyone
      io.to(roomId).emit('roomDeleted');
      // Clean up sockets and memory
      io.in(roomId).socketsLeave(roomId);
      rooms.delete(roomId);
      console.log(`[-] Room deleted manually: ${roomId}`);
      if (typeof callback === 'function') callback({ success: true });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] User disconnected: ${socket.id}`);
  });
});

// Auto-cleanup cron job (runs every hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  console.log(`[CRON] Running room cleanup task... Active rooms: ${rooms.size}`);
  
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > INACTIVITY_LIMIT) {
      console.log(`[-] Auto-deleting inactive room: ${roomId}`);
      io.to(roomId).emit('roomDeleted');
      io.in(roomId).socketsLeave(roomId);
      rooms.delete(roomId);
    }
  }
}, CLEANUP_INTERVAL);

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`🚀 Bingo Backend running on port ${PORT}`);
});
