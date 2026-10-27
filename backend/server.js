const express = require('express');
const http = require('node:http');
const { randomInt, randomUUID, randomBytes } = require('node:crypto');
const { Server } = require('socket.io');

function createBingoServer({ drawDuration = 3000, maxPlayers = 50 } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 8192 });
  const rooms = new Map();
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const fail = (message) => { throw new Error(message); };
  const validNumber = value => Number.isInteger(value) && value >= 10 && value <= 150;
  const broadcast = room => {
    room.lastActivity = Date.now();
    room.data.playerCount = room.players.size;
    io.to(room.data.id).emit('roomUpdated', room.data);
  };
  const cancelDraw = room => {
    clearTimeout(room.timer);
    room.timer = null;
    room.data.tombolaActive = false;
    room.data.tombolaEndsAt = null;
  };
  const resetRound = (room, maxNumber = room.data.maxNumber) => {
    cancelDraw(room);
    Object.assign(room.data, {
      maxNumber, drawnNumbers: [], bingoCallers: [], phase: 'playing',
      roundId: randomUUID(), roundNumber: room.data.roundNumber + 1
    });
  };
  const leaveRoom = socket => {
    const room = rooms.get(socket.data.roomId);
    if (room) {
      const player = room.players.get(socket.data.playerId);
      if (player) {
        player.sockets.delete(socket.id);
        if (!player.sockets.size) room.players.delete(socket.data.playerId);
      }
      socket.leave(room.data.id);
      delete socket.data.roomId;
      delete socket.data.role;
      delete socket.data.playerId;
      delete socket.data.playerName;
      broadcast(room);
    }
  };
  const destroyRoom = room => {
    cancelDraw(room);
    io.to(room.data.id).emit('roomDeleted', { roomId: room.data.id });
    for (const id of io.sockets.adapter.rooms.get(room.data.id) || []) {
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        delete socket.data.roomId;
        delete socket.data.role;
      }
    }
    io.in(room.data.id).socketsLeave(room.data.id);
    rooms.delete(room.data.id);
  };

  io.on('connection', socket => {
    let rateStart = Date.now();
    let rateCount = 0;
    const handle = (event, action) => socket.on(event, (payload, callback) => {
      try {
        if (Date.now() - rateStart > 10000) { rateStart = Date.now(); rateCount = 0; }
        if (++rateCount > 100) fail('Espera unos segundos antes de volver a intentarlo.');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Solicitud inválida.');
        const result = action(payload) || {};
        if (typeof callback === 'function') callback({ success: true, ...result });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, error: error.message || 'No se pudo completar la acción.' });
      }
    });
    const getRoom = (payload, hostOnly = false) => {
      const room = rooms.get(payload.roomId);
      if (!room) fail('La sala ya no está disponible.');
      if (socket.data.roomId !== room.data.id) fail('Primero debes entrar a esta sala.');
      if (hostOnly && socket.data.role !== 'host') fail('Solo el anfitrión puede realizar esta acción.');
      if (payload.roundId !== room.data.roundId) fail('La partida cambió. Revisa el tablero e inténtalo otra vez.');
      return room;
    };
    const findRoom = code => [...rooms.values()].find(room => room.data.code === code);

    handle('createRoom', payload => {
      if (rooms.size >= 10) fail('Hay muchas salas abiertas. Intenta más tarde.');
      const maxNumber = payload.maxNumber ?? 75;
      if (!validNumber(maxNumber)) fail('El rango debe ser un entero entre 10 y 150.');
      let code;
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (findRoom(code));
      const data = {
        id: randomUUID(), code, createdAt: Date.now(), maxNumber,
        drawnNumbers: [], currentMode: 'manual', tombolaActive: false, tombolaEndsAt: null,
        bingoCallers: [], winnersHistory: [], phase: 'playing', roundId: randomUUID(), roundNumber: 1,
        playerCount: 0, maxPlayers
      };
      const room = { data, hostToken: randomBytes(32).toString('hex'), players: new Map(), timer: null, lastActivity: Date.now() };
      rooms.set(data.id, room);
      leaveRoom(socket);
      socket.join(data.id);
      Object.assign(socket.data, { roomId: data.id, role: 'host' });
      return { room: data, hostToken: room.hostToken };
    });
    handle('getRoomInfo', payload => {
      const room = findRoom(payload.code);
      if (!room) fail('No encontramos esa sala. Revisa el código con el anfitrión.');
      return { code: room.data.code };
    });
    handle('joinRoom', payload => {
      const room = findRoom(payload.code);
      if (!room) fail('La sala ya no está disponible. Pide un nuevo código al anfitrión.');
      const isHost = payload.role === 'host' && payload.hostToken === room.hostToken;
      if (payload.role === 'host' && !isHost) fail('Abre el panel desde el navegador que creó la sala.');
      if (!isHost) {
        if (typeof payload.playerId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(payload.playerId)) fail('Identidad de jugador inválida.');
        if (typeof payload.playerName !== 'string' || !payload.playerName.trim() || payload.playerName.trim().length > 40) fail('Escribe un nombre de hasta 40 caracteres.');
        if (!room.players.has(payload.playerId) && room.players.size >= maxPlayers) fail(`La sala está completa: admite ${maxPlayers} jugadores.`);
      }
      leaveRoom(socket);
      socket.join(room.data.id);
      Object.assign(socket.data, { roomId: room.data.id, role: isHost ? 'host' : 'player' });
      if (!isHost) {
        const player = room.players.get(payload.playerId) || { sockets: new Set() };
        player.sockets.add(socket.id);
        room.players.set(payload.playerId, player);
        Object.assign(socket.data, { playerId: payload.playerId, playerName: payload.playerName.trim() });
      }
      broadcast(room);
      return { room: room.data, role: socket.data.role };
    });
    handle('leaveRoom', () => { leaveRoom(socket); });
    handle('setNumber', payload => {
      const room = getRoom(payload, true);
      if (room.data.tombolaActive || room.data.phase === 'finished') fail('Espera a que termine el sorteo o inicia otra partida.');
      if (!Number.isInteger(payload.number) || payload.number < 1 || payload.number > room.data.maxNumber) fail('El número está fuera del rango del tablero.');
      if (typeof payload.drawn !== 'boolean') fail('Acción inválida.');
      const index = room.data.drawnNumbers.indexOf(payload.number);
      if (payload.drawn && index < 0) room.data.drawnNumbers.push(payload.number);
      if (!payload.drawn && index >= 0) room.data.drawnNumbers.splice(index, 1);
      broadcast(room);
    });
    handle('drawNumber', payload => {
      const room = getRoom(payload, true);
      if (room.data.phase === 'finished') fail('Esta partida terminó. Puedes iniciar una nueva.');
      if (room.data.currentMode !== 'tombola') fail('Activa el modo tómbola para sortear.');
      if (room.data.bingoCallers.length) fail('Revisa los avisos de Bingo antes de continuar.');
      if (room.data.tombolaActive) fail('La tómbola ya está girando.');
      const remaining = Array.from({ length: room.data.maxNumber }, (_, i) => i + 1).filter(n => !room.data.drawnNumbers.includes(n));
      if (!remaining.length) fail('Ya salieron todos los números. Puedes iniciar otra partida.');
      const number = remaining[randomInt(remaining.length)];
      room.data.tombolaActive = true;
      room.data.tombolaEndsAt = Date.now() + drawDuration;
      const roundId = room.data.roundId;
      room.timer = setTimeout(() => {
        if (!rooms.has(room.data.id) || room.data.roundId !== roundId) return;
        room.data.drawnNumbers.push(number);
        cancelDraw(room);
        broadcast(room);
      }, drawDuration);
      broadcast(room);
    });
    handle('setMode', payload => {
      const room = getRoom(payload, true);
      if (!['manual', 'tombola'].includes(payload.mode)) fail('Modo inválido.');
      if (room.data.tombolaActive) fail('Espera a que termine el giro.');
      room.data.currentMode = payload.mode;
      broadcast(room);
    });
    handle('newRound', payload => {
      const room = getRoom(payload, true);
      resetRound(room);
      broadcast(room);
    });
    handle('configureRoom', payload => {
      const room = getRoom(payload, true);
      if (!validNumber(payload.maxNumber)) fail('El rango debe ser un entero entre 10 y 150.');
      resetRound(room, payload.maxNumber);
      broadcast(room);
    });
    handle('addBingoCaller', payload => {
      const room = getRoom(payload);
      if (socket.data.role !== 'player') fail('Esta acción es para los jugadores.');
      if (room.data.drawnNumbers.length < 4) fail('Espera a que salgan al menos cuatro números.');
      if (!room.data.bingoCallers.some(caller => caller.playerId === socket.data.playerId)) {
        room.data.bingoCallers.push({ playerId: socket.data.playerId, name: socket.data.playerName });
      }
      broadcast(room);
    });
    handle('resolveBingo', payload => {
      const room = getRoom(payload, true);
      if (!['binguito', 'carton', 'false'].includes(payload.type)) fail('Premio inválido.');
      const caller = room.data.bingoCallers.find(c => c.playerId === payload.playerId);
      if (!caller) fail('Este aviso ya fue revisado.');
      if (payload.type !== 'false') {
        const duplicate = room.data.winnersHistory.some(w => w.roundId === room.data.roundId && w.playerId === caller.playerId && w.type === payload.type);
        if (!duplicate) {
          room.data.winnersHistory.push({ ...caller, id: randomUUID(), date: Date.now(), type: payload.type, roundId: room.data.roundId, roundNumber: room.data.roundNumber });
          room.data.winnersHistory = room.data.winnersHistory.slice(-200);
        }
        if (payload.type === 'carton') {
          cancelDraw(room);
          room.data.phase = 'finished';
        }
      }
      room.data.bingoCallers = room.data.bingoCallers.filter(c => c.playerId !== caller.playerId);
      broadcast(room);
    });
    handle('clearHistory', payload => {
      const room = getRoom(payload, true);
      room.data.winnersHistory = [];
      broadcast(room);
    });
    handle('deleteRoom', payload => { destroyRoom(getRoom(payload, true)); });
    socket.on('disconnect', () => leaveRoom(socket));
  });
  const cleanup = setInterval(() => {
    for (const room of rooms.values()) {
      if (Date.now() - room.lastActivity > 24 * 60 * 60 * 1000) destroyRoom(room);
    }
  }, 60 * 60 * 1000);
  cleanup.unref();
  return {
    server, io,
    close: () => new Promise(resolve => {
      clearInterval(cleanup);
      for (const room of rooms.values()) cancelDraw(room);
      io.close(resolve);
    })
  };
}
if (require.main === module) {
  const { server } = createBingoServer();
  server.listen(process.env.PORT || 4001, () => console.log('Bingo listo en el puerto', process.env.PORT || 4001));
}
module.exports = { createBingoServer };
