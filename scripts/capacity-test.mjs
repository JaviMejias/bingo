import { parseArgs } from 'node:util'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { io } from 'socket.io-client'

const { values } = parseArgs({ options: {
  url: { type: 'string' }, players: { type: 'string', default: '50' },
  seconds: { type: 'string', default: '180' }, 'interval-ms': { type: 'string', default: '5000' }
} })
const playerLimit = Number(values.players)
const duration = Number(values.seconds)
const interval = Number(values['interval-ms'])
if (!values.url || !Number.isInteger(playerLimit) || playerLimit < 1 || playerLimit > 50 || !Number.isInteger(duration) || duration < 3 || duration > 3600 || !Number.isInteger(interval) || interval < 1000 || interval > 30000) {
  console.error('Uso: npm run test:capacity -- --url http://127.0.0.1:4401 --players 50 --seconds 180 --interval-ms 5000')
  console.error('La URL debe corresponder al backend temporal de prueba. No se inicia ni se detiene ningún servicio.')
  process.exit(1)
}
const target = new URL(values.url)
if (!['http:', 'https:'].includes(target.protocol)) throw new Error('La URL debe usar HTTP o HTTPS.')
const clients = []
const players = []
const latencies = []
let host
let room
let pending
let stopping = false
let cleanup = false
let wake
let updates = 0
let deliveries = 0
let expectedDeliveries = 0
let disconnects = 0
let bingoCalls = 0
let drawnNumbers = []
const reports = []
const request = async (socket, event, payload) => {
  const response = await socket.timeout(5000).emitWithAck(event, payload)
  if (!response.success) throw new Error(`${event}: ${response.error || 'Solicitud rechazada'}`)
  return response
}
const command = extra => ({ roomId: room.id, roundId: room.roundId, ...extra })
const percentile = (values, fraction) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)])
}
const pause = ms => new Promise(resolve => {
  const timer = setTimeout(() => { wake = undefined; resolve() }, ms)
  wake = () => { clearTimeout(timer); wake = undefined; resolve() }
})
process.once('SIGINT', () => { stopping = true; wake?.() })
process.once('SIGTERM', () => { stopping = true; wake?.() })

async function connect() {
  const socket = io(target.origin, { autoConnect: false, reconnection: false, timeout: 5000 })
  clients.push(socket)
  socket.on('disconnect', () => { if (!cleanup) disconnects++ })
  await new Promise((resolve, reject) => {
    const failed = error => { socket.off('connect', connected); reject(error) }
    const connected = () => { socket.off('connect_error', failed); resolve() }
    socket.once('connect', connected)
    socket.once('connect_error', failed)
    socket.connect()
  })
  return socket
}
async function addPlayer(index) {
  const socket = await connect()
  const playerId = randomUUID()
  socket.on('roomUpdated', state => {
    if (!pending || state.id !== room.id || state.roundId !== room.roundId || JSON.stringify(state.drawnNumbers) !== pending.expected || pending.received.has(socket.id)) return
    pending.received.add(socket.id)
    latencies.push(performance.now() - pending.started)
    deliveries++
    if (pending.received.size === pending.total) pending.finish()
  })
  await request(socket, 'joinRoom', { code: room.code, role: 'player', playerId, playerName: `Load test ${index}` })
  players.push({ socket, playerId })
}
async function updateBoard(number) {
  const drawn = !drawnNumbers.includes(number)
  const expected = drawn ? [...drawnNumbers, number] : drawnNumbers.filter(value => value !== number)
  expectedDeliveries += players.length
  let timer
  const delivered = new Promise((resolve, reject) => {
    pending = { expected: JSON.stringify(expected), received: new Set(), total: players.length, started: performance.now(), finish: resolve }
    timer = setTimeout(() => reject(new Error(`Solo ${pending.received.size}/${players.length} jugadores recibieron el número ${number} en 5 segundos.`)), 5000)
  })
  try {
    await Promise.all([request(host, 'setNumber', command({ number, drawn })), delivered])
    drawnNumbers = expected
    updates++
  } finally { clearTimeout(timer); pending = undefined }
}
async function simulateBingo() {
  const callers = players.slice(0, Math.min(players.length, 5))
  await Promise.all(callers.map(player => request(player.socket, 'addBingoCaller', command({}))))
  bingoCalls += callers.length
  for (const player of callers) await request(host, 'resolveBingo', command({ playerId: player.playerId, type: 'false' }))
}

try {
  const health = await fetch(new URL('/health', target), { signal: AbortSignal.timeout(5000) })
  if (!health.ok || (await health.json()).status !== 'ok') throw new Error('El destino no es el backend de prueba esperado.')
  host = await connect()
  const probe = await host.timeout(5000).emitWithAck('getRoomInfo', { code: randomUUID() })
  if (typeof probe?.success !== 'boolean') throw new Error('El destino no usa el contrato actual de eventos.')
  room = (await request(host, 'createRoom', { maxNumber: 150 })).room
  if (room.currentMode !== 'manual' || !room.roundId) throw new Error('Se necesita la versión actual de Bingo.')
  console.log(`Sala temporal ${room.code}. Prueba gradual: ${playerLimit} jugadores, ${duration}s. Ctrl+C limpia la sala y termina.`)
  const stages = [...new Set([Math.min(10, playerLimit), Math.min(25, playerLimit), playerLimit])]
  for (const count of stages) {
    if (stopping) break
    while (players.length < count && !stopping) await addPlayer(players.length + 1)
    if (stopping) break
    const stageStart = latencies.length
    const stageEnd = performance.now() + duration * 1000 / stages.length
    console.log(`${count} jugadores conectados; midiendo actualizaciones…`)
    while (performance.now() < stageEnd && !stopping) {
      const started = performance.now()
      await updateBoard(updates % 150 + 1)
      if (drawnNumbers.length >= 4 && updates % 4 === 0) await simulateBingo()
      await pause(Math.max(0, Math.min(interval - (performance.now() - started), stageEnd - performance.now())))
    }
    const samples = latencies.slice(stageStart)
    reports.push({ players: count, deliveries: samples.length, p50Ms: percentile(samples, .5), p95Ms: percentile(samples, .95), maxMs: samples.length ? Math.round(Math.max(...samples)) : null })
  }
  if (disconnects) throw new Error(`${disconnects} conexiones se cortaron durante la prueba.`)
} catch (error) {
  process.exitCode = 1
  console.error(`La prueba se detuvo: ${error.message}`)
} finally {
  cleanup = true
  if (room && host?.connected) {
    try { await request(host, 'deleteRoom', command({})); console.log('Sala temporal eliminada.') }
    catch (error) { console.error(`No se pudo eliminar la sala temporal: ${error.message}`); process.exitCode = 1 }
  }
  clients.forEach(socket => socket.disconnect())
  console.log(JSON.stringify({ target: target.origin, interrupted: stopping, playersCreated: players.length, boardUpdates: updates, deliveries, expectedDeliveries, missingDeliveries: expectedDeliveries - deliveries, unexpectedDisconnects: disconnects, bingoCalls, stages: reports }, null, 2))
}
