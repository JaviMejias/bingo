const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { io } = require('../node_modules/socket.io-client');
const { createBingoServer } = require('./server');

async function setup(t, options) {
  const game = createBingoServer(options);
  await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${game.server.address().port}`;
  const clients = [];
  t.after(async () => { clients.forEach(client => client.disconnect()); await game.close(); });
  const connect = async () => {
    const client = io(url, { transports: ['websocket'], reconnection: false });
    clients.push(client);
    await once(client, 'connect');
    return client;
  };
  const host = await connect();
  const created = await send(host, 'createRoom', {});
  return { host, connect, ...created };
}
const send = (socket, event, payload) => socket.timeout(2000).emitWithAck(event, payload);
const payload = (room, extra = {}) => ({ roomId: room.id, roundId: room.roundId, ...extra });
const join = (socket, room, id, name = 'Jugador') => send(socket, 'joinRoom', { code: room.code, playerId: id, playerName: name, role: 'player' });
const snapshot = (host, room, token) => send(host, 'joinRoom', { code: room.code, role: 'host', hostToken: token });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('new rooms start in manual mode and require selecting the tombola before drawing', async t => {
  const { host, room } = await setup(t);
  assert.equal(room.currentMode, 'manual');
  assert.equal((await send(host, 'drawNumber', payload(room))).success, false);
  assert.equal((await send(host, 'setNumber', payload(room, { number: 7, drawn: true }))).success, true);
});

test('invalid input is rejected without terminating the server', async t => {
  const { host } = await setup(t);
  for (const value of [null, 'bad', [], { maxNumber: 100000 }, { maxNumber: 10.5 }]) {
    assert.equal((await send(host, 'createRoom', value)).success, false);
  }
  assert.equal((await send(host, 'createRoom', {})).success, true);
});

test('only authenticated hosts can change numbers, resolve prizes, reset or delete a room', async t => {
  const { connect, room } = await setup(t);
  const guest = await connect();
  await join(guest, room, 'guest-id-123');
  const outsider = await connect();
  for (const client of [guest, outsider]) {
    for (const event of ['setNumber', 'drawNumber', 'resolveBingo', 'newRound', 'configureRoom', 'deleteRoom']) {
      const response = await send(client, event, payload(room, { number: 1, drawn: true, maxNumber: 90, playerId: 'guest-id-123', type: 'carton' }));
      assert.equal(response.success, false, event);
    }
  }
  assert.equal((await send(guest, 'joinRoom', { code: room.code, role: 'host', hostToken: 'forged' })).success, false);
});

test('concurrent number commands preserve all numbers and duplicate commands are idempotent', async t => {
  const { host, room, hostToken } = await setup(t);
  await Promise.all(Array.from({ length: 20 }, (_, i) => send(host, 'setNumber', payload(room, { number: i + 1, drawn: true }))));
  await send(host, 'setNumber', payload(room, { number: 1, drawn: true }));
  const state = await snapshot(host, room, hostToken);
  assert.equal(state.room.drawnNumbers.length, 20);
  assert.deepEqual([...state.room.drawnNumbers].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('the server finishes draws when the host disconnects and authorizes the returning host', async t => {
  const { host, connect, room, hostToken } = await setup(t, { drawDuration: 40 });
  assert.equal((await send(host, 'setMode', payload(room, { mode: 'tombola' }))).success, true);
  await send(host, 'drawNumber', payload(room));
  host.disconnect();
  await pause(80);
  const returningHost = await connect();
  const response = await snapshot(returningHost, room, hostToken);
  assert.equal(response.success, true);
  assert.equal(response.room.tombolaActive, false);
  assert.equal(response.room.drawnNumbers.length, 1);
  assert.equal((await send(returningHost, 'setNumber', payload(response.room, { number: 75, drawn: true }))).success, true);
});

test('new rounds cancel a pending draw, retain players and history, and reject stale actions', async t => {
  const { host, connect, room, hostToken } = await setup(t, { drawDuration: 60 });
  const guest = await connect();
  await join(guest, room, 'guest-id-123');
  for (let number = 1; number <= 4; number++) await send(host, 'setNumber', payload(room, { number, drawn: true }));
  await send(guest, 'addBingoCaller', payload(room));
  await send(host, 'resolveBingo', payload(room, { playerId: 'guest-id-123', type: 'binguito' }));
  assert.equal((await send(host, 'setMode', payload(room, { mode: 'tombola' }))).success, true);
  await send(host, 'drawNumber', payload(room));
  await send(host, 'newRound', payload(room));
  await pause(100);
  const state = (await snapshot(host, room, hostToken)).room;
  assert.equal(state.roundNumber, 2);
  assert.equal(state.playerCount, 1);
  assert.equal(state.winnersHistory.length, 1);
  assert.equal(state.bingoCallers.length, 0);
  assert.equal(state.drawnNumbers.length, 0);
  assert.equal(state.tombolaActive, false);
  assert.equal((await send(guest, 'addBingoCaller', payload(room))).success, false);
});

test('players with identical names keep separate calls; several full-card winners can be confirmed', async t => {
  const { host, connect, room, hostToken } = await setup(t);
  const first = await connect();
  const second = await connect();
  await join(first, room, 'first-player', 'María');
  await join(second, room, 'second-player', 'María');
  for (let number = 1; number <= 4; number++) await send(host, 'setNumber', payload(room, { number, drawn: true }));
  await send(first, 'addBingoCaller', payload(room));
  await send(second, 'addBingoCaller', payload(room));
  await send(host, 'resolveBingo', payload(room, { playerId: 'first-player', type: 'carton' }));
  let state = (await snapshot(host, room, hostToken)).room;
  assert.equal(state.phase, 'finished');
  assert.deepEqual(state.bingoCallers.map(c => c.playerId), ['second-player']);
  assert.equal((await send(host, 'drawNumber', payload(room))).success, false);
  await send(host, 'resolveBingo', payload(room, { playerId: 'second-player', type: 'carton' }));
  state = (await snapshot(host, room, hostToken)).room;
  assert.equal(state.winnersHistory.length, 2);
  assert.equal(state.bingoCallers.length, 0);
});

test('50 concurrent players receive the same draw; capacity is available after a player leaves', async t => {
  const started = performance.now();
  const { host, connect, room, hostToken } = await setup(t, { drawDuration: 20 });
  const players = await Promise.all(Array.from({ length: 50 }, async (_, i) => {
    const client = await connect();
    const response = await join(client, room, `player-id-${i}`, `Jugador ${i}`);
    assert.equal(response.success, true);
    return client;
  }));
  const extra = await connect();
  assert.equal((await join(extra, room, 'extra-player')).success, false);
  const received = players.map(client => new Promise(resolve => {
    const listener = state => {
      if (state.drawnNumbers.length === 1) { client.off('roomUpdated', listener); resolve(state.drawnNumbers[0]); }
    };
    client.on('roomUpdated', listener);
  }));
  assert.equal((await send(host, 'setMode', payload(room, { mode: 'tombola' }))).success, true);
  await send(host, 'drawNumber', payload(room));
  const numbers = await Promise.race([Promise.all(received), pause(2000).then(() => { throw new Error('Not all players received the draw'); })]);
  assert.equal(new Set(numbers).size, 1);
  assert.equal((await snapshot(host, room, hostToken)).room.playerCount, 50);
  await send(players[0], 'leaveRoom', {});
  assert.equal((await join(extra, room, 'extra-player')).success, true);
  t.diagnostic(`50 players connected and synchronized locally in ${Math.round(performance.now() - started)} ms`);
});
