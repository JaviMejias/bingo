import { socket, joinGameRoom, playerId, request } from '../services/socket'
import { dialog, escapeHtml, showError } from '../services/dialog'
import type { GameRoom, Winner } from '../types/game'
import { renderBingoControls } from '../components/BingoControls'
import { renderBingoBoard } from '../components/BingoBoard'
import confetti from 'canvas-confetti'

let activeCleanup: (() => void) | undefined
export function cleanupGameRoom() { activeCleanup?.(); activeCleanup = undefined }
const prizeName = (type: Winner['type']) => type === 'binguito' ? 'Binguito' : 'Cartón lleno'

export function renderGameRoom(code: string, role: 'host' | 'player') {
  cleanupGameRoom()
  const app = document.querySelector<HTMLDivElement>('#app')!
  const controller = new AbortController()
  const { signal } = controller
  let disposed = false
  let room: GameRoom | undefined
  let ready = false
  let name = sessionStorage.getItem(`bingo_player_name_${code}`) || ''
  let overlayTimer: ReturnType<typeof setInterval> | undefined
  let overlayHideTimer: ReturnType<typeof setTimeout> | undefined
  let celebrationTimer: ReturnType<typeof setInterval> | undefined
  let lastRoundId = ''
  let lastDrawnCount = 0
  let wasDrawing = false
  let knownWinners = new Set<string>()
  let pendingReview = ''
  let reviewResult = ''
  let joining = false

  app.innerHTML = '<div class="room-loading" role="status">Preparando tu sala…</div>'
  const stopOverlay = () => {
    clearInterval(overlayTimer)
    clearTimeout(overlayHideTimer)
    document.getElementById('tombola-overlay')?.remove()
  }
  const cleanup = () => {
    disposed = true
    ready = false
    controller.abort()
    stopOverlay()
    clearInterval(celebrationTimer)
    socket.off('connect', reconnect)
    socket.off('disconnect', disconnected)
    socket.off('roomUpdated', updated)
    socket.off('roomDeleted', deleted)
    dialog.close()
    if (socket.connected) socket.emit('leaveRoom', {})
  }
  activeCleanup = cleanup

  async function action(event: string, extra: object = {}, expectedRound = room?.roundId) {
    if (!room || !ready) throw new Error('Espera a que la sala termine de conectarse.')
    await request(event, { roomId: room.id, roundId: expectedRound, ...extra })
  }
  async function run(event: string, extra: object = {}, expectedRound = room?.roundId) {
    try { await action(event, extra, expectedRound) } catch (error) { if (!disposed) await showError(error) }
  }
  function setConnection(connected: boolean) {
    ready = connected
    const status = document.getElementById('connectionStatus')
    if (status) {
      status.textContent = connected ? 'Conectado' : 'Reconectando… espera un momento'
      status.classList.toggle('is-offline', !connected)
    }
    app.classList.toggle('room-offline', !connected)
    const offline = document.getElementById('offlineMessage')
    if (offline) offline.hidden = connected
    if (room) render(room, false)
  }
  function disconnected() { if (!disposed) setConnection(false) }
  async function reconnect() {
    if (disposed || joining || !room) return
    joining = true
    try {
      const response = await joinGameRoom(code, role, name, signal)
      if (disposed) return
      ready = true
      render(response.room, false)
      setConnection(true)
    } catch (error) { if (!disposed) { setConnection(false); await showError(error) } }
    finally { joining = false }
  }
  function deleted(payload: { roomId: string }) {
    if (payload.roomId !== room?.id || disposed) return
    if (localStorage.getItem('bingo_last_host_code') === code) localStorage.removeItem('bingo_last_host_code')
    cleanup()
    activeCleanup = undefined
    window.location.hash = '#/'
    void dialog.fire({ title: 'La sala se cerró', text: 'Pide un nuevo código al anfitrión para volver a jugar.', icon: 'info' })
  }
  function updated(next: GameRoom) {
    if (!disposed && ready && next.id === room?.id) render(next, true)
  }
  socket.on('disconnect', disconnected)
  socket.on('connect', reconnect)
  socket.on('roomUpdated', updated)
  socket.on('roomDeleted', deleted)

  function mount() {
    app.classList.remove('room-offline')
    app.innerHTML = `
      <main class="game-shell ${role === 'host' ? 'host-room' : 'player-room'}">
        <div class="neon-orb orb-purple" aria-hidden="true"></div><div class="neon-orb orb-blue" aria-hidden="true"></div>
        <header class="room-header glass-card animate-slide-up">
          <div class="primary-controls">
            ${role === 'host' ? '<div id="controls-left"></div>' : '<div class="player-actions"><button id="playerBingoBtn" class="action-button bingo-button" type="button"><span>¡Tengo Bingo!</span></button><p id="playerStatus" class="control-hint" role="status"></p></div>'}
            <form id="searchForm" class="board-search quick-search"><label for="searchNumber">Buscar número</label><div class="input-action"><input id="searchNumber" type="text" inputmode="numeric" pattern="[0-9]+" autocomplete="off" aria-describedby="searchResult" required placeholder="Ej. 7"><button class="action-button secondary-action" type="submit">Buscar</button></div><span id="searchResult" class="control-hint search-feedback" role="status"></span></form><button id="toggleSearchBtn" class="action-button secondary-action mobile-search-toggle" type="button" aria-controls="searchForm" aria-expanded="false"><i class="fas fa-search" aria-hidden="true"></i> Buscar</button>
          </div>
          <div class="latest-numbers" aria-label="Últimos números">
            <div class="previous-number"><span>Anterior</span><strong id="previousLastNumber">—</strong></div>
            <div class="last-number"><span><i class="fas fa-bolt" aria-hidden="true"></i> Último</span><strong id="currentLastNumber" aria-live="polite">—</strong></div>
          </div>
          <div class="room-access">
            <button id="roomCodeDisplay" class="room-code" aria-label="Copiar código de sala"><span>Código sala</span><strong></strong></button>
            <details id="roomOptions" class="room-options">
              <summary aria-label="Opciones de sala" title="Abrir opciones de sala"><i class="fas fa-cog" aria-hidden="true"></i><span>Opciones</span></summary>
              <div class="options-panel glass-card">
                <div class="options-heading"><h2>Opciones de sala</h2><button id="closeOptionsBtn" type="button" aria-label="Cerrar opciones">×</button></div>
                <span id="connectionStatus" class="connection-status" role="status">Conectado</span>
                <div class="room-meta"><span id="roundLabel"></span><span id="drawnCount"></span><span id="playerCount"></span></div>
                ${role === 'host' ? '<div class="mode-picker" role="group" aria-label="Cómo sacar los números"><button id="tombolaModeBtn" type="button">Tómbola</button><button id="manualModeBtn" type="button">Manual</button></div>' : '<p class="player-identity">Jugando como <strong id="playerNameDisplay"></strong></p><p id="playerInstructions" class="panel-copy"></p>'}
                ${role === 'host' ? '<div class="room-tools"><button id="winnersHistoryBtnControls" class="text-action" type="button"><i class="fas fa-trophy" aria-hidden="true"></i> Historial de premios</button><button id="configMaxNumBtnControls" class="text-action" type="button"><i class="fas fa-sliders-h" aria-hidden="true"></i> Cantidad de números</button><button id="resetGameBtnControls" class="text-action" type="button"><i class="fas fa-redo" aria-hidden="true"></i> Empezar otra partida</button></div>' : '<p class="small-note">El anfitrión revisa tu cartón y confirma el premio.</p>'}
                <a href="#/" class="text-action room-brand">Volver al inicio</a>
              </div>
            </details>
          </div>
        </header>
        <div id="offlineMessage" class="offline-message" role="alert" hidden>Se perdió la conexión. Estamos recuperando tu partida; espera antes de continuar.</div>
        <div class="room-layout">
          <section class="board-panel glass-card" aria-label="Tablero de números"><h1 class="sr-only">Tablero de Bingo</h1><span id="boardHint" class="sr-only"></span><div id="bingoBoard" class="bingo-grid" aria-label="Números del bingo"></div></section>
          <aside class="game-panel" aria-label="${role === 'host' ? 'Revisión de Bingo y ganadores' : 'Ganadores de la partida'}" hidden>
            ${role === 'host' ? '<section id="hostBingoSidebar" class="panel-card caller-panel glass-card" hidden><h2 id="callersTitle">Avisos de Bingo</h2><p id="callersHint" class="panel-copy"></p><div id="hostBingoCallersList"></div></section>' : ''}
            <section id="roundResults" class="panel-card round-results glass-card" hidden><h2 id="roundResultsTitle"></h2><div id="roundWinners"></div><p id="roundResultsHint" class="panel-copy"></p>${role === 'host' ? '<button id="newGameBtn" class="action-button primary-action" type="button">Iniciar un nuevo juego</button>' : ''}</section>
          </aside>
        </div>
      </main>`
    document.querySelector('#roomCodeDisplay strong')!.textContent = code
    if (role === 'player') document.getElementById('playerNameDisplay')!.textContent = name
    app.addEventListener('click', onClick, { signal })
    app.addEventListener('submit', onSubmit, { signal })
    app.addEventListener('beforeinput', onBeforeNumberInput, { signal })
    app.addEventListener('input', onNumberInput, { signal })
    document.addEventListener('click', event => {
      const options = document.getElementById('roomOptions') as HTMLDetailsElement | null
      if (options?.open && !options.contains(event.target as Node)) options.open = false
      const search = document.getElementById('searchForm')
      const toggle = document.getElementById('toggleSearchBtn')
      if (search?.classList.contains('is-open') && !search.contains(event.target as Node) && !toggle?.contains(event.target as Node) && !(event.target as HTMLElement).closest('.swal2-container')) closeMobileSearch()
    }, { signal })
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return
      if (document.getElementById('searchForm')?.classList.contains('is-open')) {
        closeMobileSearch()
        document.getElementById('toggleSearchBtn')?.focus()
      }
      const options = document.getElementById('roomOptions') as HTMLDetailsElement | null
      if (options?.open) { options.open = false; options.querySelector('summary')?.focus() }
    }, { signal })
  }

  function render(next: GameRoom, notify: boolean) {
    if (disposed) return
    const previous = room
    const sameRound = lastRoundId === next.roundId
    const myPending = next.bingoCallers.some(c => c.playerId === playerId)
    const oldPending = previous?.bingoCallers.some(c => c.playerId === playerId)
    const newWinners = next.winnersHistory.filter(w => !knownWinners.has(w.id))
    const myWins = newWinners.filter(w => w.playerId === playerId && w.roundId === next.roundId)
    if (sameRound && oldPending && !myPending) reviewResult = myWins.length ? '¡Tu premio fue confirmado!' : 'Tu aviso fue revisado. Si corresponde, puedes volver a cantar Bingo.'
    if (!sameRound) {
      reviewResult = ''
      document.getElementById('searchResult')!.textContent = ''
      document.querySelectorAll('.search-match').forEach(el => el.classList.remove('search-match'))
      document.querySelectorAll('.snake-container').forEach(el => el.remove())
    }
    app.querySelectorAll<HTMLButtonElement | HTMLInputElement>('.room-tools button, #searchForm button, #searchNumber').forEach(el => { el.disabled = !ready })
    room = next
    document.getElementById('roundLabel')!.textContent = `Partida ${next.roundNumber}`
    document.getElementById('currentLastNumber')!.textContent = String(next.drawnNumbers.at(-1) ?? '—')
    document.getElementById('previousLastNumber')!.textContent = String(next.drawnNumbers.at(-2) ?? '—')
    document.getElementById('drawnCount')!.textContent = `${next.drawnNumbers.length} de ${next.maxNumber} números`
    document.getElementById('playerCount')!.textContent = `${next.playerCount} ${next.playerCount === 1 ? 'jugador conectado' : 'jugadores conectados'}`
    document.getElementById('boardHint')!.textContent = role === 'host' && next.currentMode === 'manual' ? 'Toca un número para marcarlo' : 'Los números se actualizan solos'
    renderBingoBoard(next, role === 'host' && ready && next.currentMode === 'manual', number => {
      if (!room) return
      const drawn = !room.drawnNumbers.includes(number)
      if (!drawn) {
        const roundId = room.roundId
        void dialog.fire({ title: `¿Desmarcar el ${number}?`, text: 'Se quitará del tablero de todos los jugadores.', showCancelButton: true, confirmButtonText: 'Sí, desmarcar' }).then(result => { if (result.isConfirmed && !disposed) void run('setNumber', { number, drawn }, roundId) })
      } else void run('setNumber', { number, drawn })
    })
    if (role === 'host') {
      renderBingoControls(next)
      for (const mode of ['tombola', 'manual']) {
        const button = document.getElementById(`${mode}ModeBtn`) as HTMLButtonElement
        button.setAttribute('aria-pressed', String(next.currentMode === mode))
        button.disabled = !ready || next.tombolaActive || next.phase === 'finished'
      }
      document.getElementById('callersTitle')!.textContent = next.bingoCallers.length ? `¡Bingo! ${next.bingoCallers.length} por revisar` : 'Avisos de Bingo'
      document.getElementById('callersHint')!.textContent = next.bingoCallers.length ? 'Comprueba cada cartón antes de confirmar el premio. Puedes reconocer a varios ganadores.' : 'Cuando alguien cante Bingo, su nombre aparecerá aquí.'
      const list = document.getElementById('hostBingoCallersList')!
      list.replaceChildren()
      for (const caller of next.bingoCallers) {
        const card = document.createElement('article')
        card.className = 'caller-card'
        const title = document.createElement('h3')
        title.textContent = caller.name
        card.appendChild(title)
        for (const [type, label] of [['binguito', 'Premiar Binguito'], ['carton', 'Premiar cartón lleno'], ['false', 'No corresponde']]) {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = `action-button ${type === 'false' ? 'secondary-action' : 'prize-action'}`
          button.textContent = label
          button.dataset.playerId = caller.playerId
          button.dataset.prize = type
          button.disabled = !ready
          card.appendChild(button)
        }
        list.appendChild(card)
      }
      document.getElementById('hostBingoSidebar')!.classList.toggle('has-callers', next.bingoCallers.length > 0)
      document.getElementById('hostBingoSidebar')!.hidden = next.bingoCallers.length === 0
    } else {
      const button = document.getElementById('playerBingoBtn') as HTMLButtonElement
      const canCall = ready && next.drawnNumbers.length >= 4 && !myPending
      button.disabled = !canCall
      button.textContent = myPending ? 'Bingo enviado ✓' : '¡Tengo Bingo!'
      document.getElementById('playerInstructions')!.textContent = 'Sigue los números en tu cartón. Cuando completes el premio que están jugando, pulsa el botón de abajo.'
      document.getElementById('playerStatus')!.textContent = myPending ? 'El anfitrión recibió tu aviso. Espera mientras revisa tu cartón.' : next.drawnNumbers.length < 4 ? '' : reviewResult || 'Puedes avisar cuando tengas Binguito o cartón lleno.'
    }
    const winners = next.winnersHistory.filter(w => w.roundId === next.roundId)
    const results = document.getElementById('roundResults')!
    results.hidden = next.phase !== 'finished' && next.drawnNumbers.length < next.maxNumber
    const showPanel = !results.hidden || (role === 'host' && next.bingoCallers.length > 0)
    document.querySelector<HTMLElement>('.game-panel')!.hidden = !showPanel
    document.querySelector('.room-layout')!.classList.toggle('has-game-panel', showPanel)
    document.getElementById('roundResultsTitle')!.textContent = next.phase === 'finished' ? (winners.length > 1 ? '¡Tenemos ganadores!' : '¡Tenemos ganador!') : winners.length ? 'Premios de esta partida' : 'Salieron todos los números'
    const winnerList = document.getElementById('roundWinners')!
    winnerList.replaceChildren()
    for (const winner of winners) {
      const item = document.createElement('p')
      item.className = 'winner-line'
      item.textContent = `${winner.name} · ${prizeName(winner.type)}`
      winnerList.appendChild(item)
    }
    document.getElementById('roundResultsHint')!.textContent = next.bingoCallers.length ? 'Todavía hay avisos por revisar. Confirma a los demás ganadores antes de empezar otra partida.' : next.phase === 'finished' ? role === 'host' ? 'Cuando todos estén listos, puedes empezar de nuevo con el mismo código.' : 'El anfitrión avisará cuando comience la siguiente partida. Quédate en esta sala.' : 'El Binguito no termina la partida. Pueden seguir jugando hasta completar el cartón.'
    const newGame = document.getElementById('newGameBtn') as HTMLButtonElement | null
    if (newGame) { newGame.hidden = next.phase !== 'finished' && next.drawnNumbers.length < next.maxNumber; newGame.disabled = !ready }
    const searchInput = document.getElementById('searchNumber') as HTMLInputElement
    searchInput.max = String(next.maxNumber)
    for (const input of app.querySelectorAll<HTMLInputElement>('#inputNumber, #searchNumber')) {
      if (!sameRound) {
        input.value = ''
        input.dataset.validValue = ''
        input.setCustomValidity('')
        input.removeAttribute('aria-invalid')
      }
    }
    if (!sameRound) {
      document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'))
      const manualHint = document.getElementById('manualNumberHint')
      if (manualHint) manualHint.textContent = ''
    }
    if (next.tombolaActive) showOverlay(next.maxNumber)
    else if (wasDrawing && sameRound) finishOverlay(next.drawnNumbers.at(-1))
    else if (!sameRound) stopOverlay()
    if (notify && sameRound && next.drawnNumbers.length > lastDrawnCount) {
      const number = document.getElementById('currentLastNumber')!
      number.getAnimations().forEach(animation => animation.cancel())
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        number.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)', filter: 'drop-shadow(0 0 20px #00f0ff)' }, { transform: 'scale(1)' }], { duration: 500 })
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.3 }, colors: ['#b026ff', '#00f0ff', '#ff0055', '#39ff14'], disableForReducedMotion: true })
      }
    }
    if (notify && role === 'player' && myWins.length) {
      const winner = myWins.at(-1)!
      void dialog.fire({ icon: 'success', title: '¡Felicitaciones!', text: `El anfitrión confirmó tu ${prizeName(winner.type)}.`, confirmButtonText: '¡Qué alegría!' })
      celebrate()
    } else if (notify && role === 'host' && newWinners.some(w => w.roundId === next.roundId)) {
      celebrate()
    } else if (notify && previous && !sameRound && role === 'player') {
      void dialog.fire({ title: `¡Comienza la partida ${next.roundNumber}!`, text: 'Prepara tu cartón. El tablero vuelve a empezar y sigues en la misma sala.', confirmButtonText: 'Estoy listo' })
    }
    if (notify && previous && !sameRound && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.getElementById('bingoBoard')!.animate([
        { opacity: 0, transform: 'scale(.92)', filter: 'blur(12px)' },
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }
      ], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)' })
    }
    knownWinners = new Set(next.winnersHistory.map(w => w.id))
    lastRoundId = next.roundId
    lastDrawnCount = next.drawnNumbers.length
    wasDrawing = next.tombolaActive
    if (!ready) app.querySelectorAll<HTMLButtonElement | HTMLInputElement>('.primary-controls button, .primary-controls input, .game-panel button, .options-panel button:not(#closeOptionsBtn), .options-panel input').forEach(el => { el.disabled = true })
  }

  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    clearInterval(celebrationTimer)
    const end = Date.now() + 3000
    const burst = () => {
      confetti({ particleCount: 35, spread: 90, startVelocity: 35, origin: { x: .15, y: .35 }, colors: ['#b026ff', '#00f0ff', '#39ff14'], disableForReducedMotion: true })
      confetti({ particleCount: 35, spread: 90, startVelocity: 35, origin: { x: .85, y: .35 }, colors: ['#ff0055', '#ffffff', '#00f0ff'], disableForReducedMotion: true })
    }
    burst()
    celebrationTimer = setInterval(() => { if (Date.now() >= end) clearInterval(celebrationTimer); else burst() }, 300)
  }

  function showOverlay(maxNumber: number) {
    clearTimeout(overlayHideTimer)
    if (document.getElementById('tombola-overlay')) {
      if (overlayTimer) return
      document.getElementById('tombola-overlay')!.remove()
    }
    const overlay = document.createElement('div')
    overlay.id = 'tombola-overlay'
    overlay.className = 'tombola-overlay'
    overlay.setAttribute('role', 'status')
    overlay.innerHTML = '<span class="tombola-label">La tómbola está girando</span><div class="tombola-ball"><strong id="tombola-number-display">•</strong></div><p>El número aparecerá en tu tablero</p>'
    document.body.appendChild(overlay)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) overlayTimer = setInterval(() => {
      const display = document.getElementById('tombola-number-display')
      if (display) display.textContent = String(Math.floor(Math.random() * maxNumber) + 1)
    }, 50)
  }
  function finishOverlay(number: number | undefined) {
    clearInterval(overlayTimer)
    overlayTimer = undefined
    const overlay = document.getElementById('tombola-overlay')
    if (!overlay) return
    overlay.classList.add('draw-complete')
    overlay.querySelector('.tombola-label')!.textContent = '¡Salió el número!'
    document.getElementById('tombola-number-display')!.textContent = String(number ?? '—')
    overlay.querySelector('p')!.textContent = 'Revisa tu cartón'
    overlayHideTimer = setTimeout(stopOverlay, 1500)
  }

  async function startNewRound() {
    if (!room) return
    const roundId = room.roundId
    const pending = room.bingoCallers.length
    const result = await dialog.fire({
      icon: 'question', title: '¿Iniciar un nuevo juego?',
      text: `${pending ? `Quedan ${pending} avisos de Bingo por revisar. ` : ''}Se limpiarán los números y los avisos de esta partida. Los jugadores seguirán en la sala y los premios quedarán en el historial.`,
      showCancelButton: true, confirmButtonText: 'Sí, iniciar nuevo juego', cancelButtonText: 'Seguir en esta partida', focusCancel: true
    })
    if (result.isConfirmed && !disposed) await run('newRound', {}, roundId)
  }
  function closeMobileSearch() {
    document.getElementById('searchForm')?.classList.remove('is-open')
    document.getElementById('toggleSearchBtn')?.setAttribute('aria-expanded', 'false')
  }
  async function onClick(event: Event) {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button')
    if (!target || target.disabled || disposed) return
    const id = target.id
    if (id === 'roomCodeDisplay') {
      try { await navigator.clipboard.writeText(code); await dialog.fire({ title: 'Código copiado', text: 'Compártelo con tu familia para que entre a esta sala.', icon: 'success' }) }
      catch { await dialog.fire({ title: 'Comparte este código', text: code }) }
      return
    }
    if (id === 'toggleSearchBtn') {
      const search = document.getElementById('searchForm')!
      const open = !search.classList.contains('is-open')
      search.classList.toggle('is-open', open)
      target.setAttribute('aria-expanded', String(open))
      if (open) {
        (document.getElementById('roomOptions') as HTMLDetailsElement).open = false
        document.getElementById('searchNumber')?.focus()
      }
      return
    }
    if (id === 'closeOptionsBtn') { (document.getElementById('roomOptions') as HTMLDetailsElement).open = false; return }
    if (!ready) return
    if (id === 'drawTombolaModeBtn') {
      target.disabled = true
      await run('drawNumber')
      if (room && !disposed) render(room, false)
    } else if (id === 'tombolaModeBtn' || id === 'manualModeBtn') {
      await run('setMode', { mode: id === 'tombolaModeBtn' ? 'tombola' : 'manual' })
      if (!disposed) (document.getElementById('roomOptions') as HTMLDetailsElement).open = false
    } else if (id === 'newGameBtn' || id === 'resetGameBtnControls') await startNewRound()
    else if (id === 'playerBingoBtn') {
      const roundId = room!.roundId
      const answer = await dialog.fire({ title: '¿Tienes Bingo?', text: 'Comprueba tu cartón. Avisaremos al anfitrión para que revise tu premio.', icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, avisar al anfitrión', cancelButtonText: 'Volver a mi cartón' })
      if (answer.isConfirmed && !disposed) await run('addBingoCaller', {}, roundId)
    } else if (target.dataset.prize && room) {
      if (pendingReview) return
      const caller = room.bingoCallers.find(c => c.playerId === target.dataset.playerId)
      if (!caller) return
      const type = target.dataset.prize
      const roundId = room.roundId
      pendingReview = caller.playerId
      try {
        const answer = await dialog.fire({ title: type === 'false' ? '¿Descartar este aviso?' : `¿Confirmar ${type === 'carton' ? 'cartón lleno' : 'Binguito'}?`, text: type === 'false' ? `El aviso de ${caller.name} se quitará de la lista. Podrá avisar otra vez si corresponde.` : `Confirma que revisaste el cartón de ${caller.name}.${type === 'carton' ? ' Se detendrán los números y podrás revisar a los otros ganadores.' : ' La partida continuará.'}`, showCancelButton: true, confirmButtonText: type === 'false' ? 'Sí, descartar aviso' : 'Confirmar premio', focusCancel: true })
        if (answer.isConfirmed && !disposed) await run('resolveBingo', { playerId: caller.playerId, type }, roundId)
      } finally { pendingReview = '' }
    } else if (id === 'configMaxNumBtnControls' && room) {
      const roundId = room.roundId
      const answer = await dialog.fire({ title: 'Cantidad de números', text: 'Elige entre 10 y 150. Al cambiar el rango empezará otra partida; conservarás la sala y los premios anteriores.', input: 'number', inputValue: room.maxNumber, inputAttributes: { min: '10', max: '150', step: '1', inputmode: 'numeric' }, showCancelButton: true, confirmButtonText: 'Cambiar e iniciar partida', focusCancel: true, inputValidator: value => Number.isInteger(Number(value)) && Number(value) >= 10 && Number(value) <= 150 ? undefined : 'Escribe un número entero entre 10 y 150.' })
      if (answer.isConfirmed && Number(answer.value) !== room?.maxNumber && !disposed) await run('configureRoom', { maxNumber: Number(answer.value) }, roundId)
    } else if (id === 'winnersHistoryBtnControls' && room) {
      const history = [...room.winnersHistory].reverse()
      await dialog.fire({ title: 'Premios de la sala', html: history.length ? `<div class="prize-history">${history.map(w => `<article><strong>${escapeHtml(w.name)}</strong><span>${prizeName(w.type)} · Partida ${w.roundNumber}</span></article>`).join('')}</div>` : '<p>Aún no hay premios confirmados. Los próximos aparecerán aquí.</p>', confirmButtonText: 'Volver al tablero' })
    }
  }
  function isValidNumberValue(value: string) {
    return value === '' || (/^[1-9][0-9]*$/.test(value) && Number(value) <= (room?.maxNumber ?? 0))
  }
  function setNumberValidity(input: HTMLInputElement, valid: boolean) {
    const message = `Solo números enteros del 1 al ${room?.maxNumber}.`
    input.setCustomValidity(valid ? '' : message)
    input.setAttribute('aria-invalid', String(!valid))
    const feedback = document.getElementById(input.id === 'searchNumber' ? 'searchResult' : 'manualNumberHint')
    if (!feedback) return
    const wasInvalid = feedback.classList.contains('input-error')
    feedback.classList.toggle('input-error', !valid)
    if (!valid) feedback.textContent = message
    else if (wasInvalid) feedback.textContent = ''
  }
  function onBeforeNumberInput(event: Event) {
    const input = event.target as HTMLInputElement
    if (!['inputNumber', 'searchNumber'].includes(input.id) || !room) return
    const change = event as InputEvent
    if (!change.inputType?.startsWith('insert') || change.data === null || change.isComposing) return
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    const candidate = input.value.slice(0, start) + change.data + input.value.slice(end)
    if (!isValidNumberValue(candidate)) {
      event.preventDefault()
      setNumberValidity(input, false)
    }
  }
  function onNumberInput(event: Event) {
    const input = event.target as HTMLInputElement
    if (!['inputNumber', 'searchNumber'].includes(input.id) || !room) return
    const valid = isValidNumberValue(input.value)
    if (valid) input.dataset.validValue = input.value
    else input.value = input.dataset.validValue || ''
    setNumberValidity(input, valid)
  }
  async function onSubmit(event: Event) {
    const form = event.target as HTMLFormElement
    if (!['manualNumberForm', 'searchForm'].includes(form.id)) return
    event.preventDefault()
    if (!room || !ready || !form.reportValidity()) return
    const input = form.querySelector('input')!
    const number = Number(input.value)
    if (!/^[1-9][0-9]*$/.test(input.value) || !Number.isInteger(number) || number > room.maxNumber) {
      setNumberValidity(input, false)
      input.reportValidity()
      return
    }
    if (form.id === 'searchForm') {
      const drawn = room.drawnNumbers.includes(number)
      const feedback = document.getElementById('searchResult')!
      feedback.textContent = drawn ? `${number}: ya salió ✓` : `${number}: no ha salido.`
      feedback.classList.toggle('input-error', !drawn)
      document.querySelectorAll('.search-match').forEach(el => el.classList.remove('search-match'))
      document.querySelectorAll('.snake-container').forEach(el => el.remove())
      input.value = ''
      input.dataset.validValue = ''
      if (drawn) {
        const cell = document.querySelector(`[data-number="${number}"]`)
        cell?.classList.add('search-match')
        if (cell) {
          const border = document.createElement('span')
          border.className = 'snake-container'
          border.setAttribute('aria-hidden', 'true')
          border.innerHTML = '<span></span><span></span><span></span><span></span>'
          cell.appendChild(border)
        }
        input.focus()
      } else {
        await dialog.fire({
          icon: 'warning', title: `El ${number} no ha salido`,
          text: 'Este número no está marcado en el tablero. Revisa el cartón antes de confirmar el Bingo.',
          confirmButtonText: 'Seguir revisando', returnFocus: false,
          didClose: () => { if (!disposed && input.isConnected && !input.disabled) input.focus() }
        })
      }
    } else {
      if (room.drawnNumbers.includes(number)) { await dialog.fire({ title: 'Ese número ya está marcado', text: `El ${number} ya salió. Puedes ingresar el siguiente.` }); return }
      await run('setNumber', { number, drawn: true })
      input.value = ''
      input.dataset.validValue = ''
      input.focus()
    }
  }
  async function initialize() {
    try {
      if (role === 'player' && !name) {
        const answer = await dialog.fire({ title: '¿Cómo te llamas?', text: 'Ingresa tu nombre real para que el anfitrión te reconozca cuando cantes Bingo.', input: 'text', inputPlaceholder: 'Ej. Pedro Pérez', inputAttributes: { maxlength: '40', autocomplete: 'name' }, showCancelButton: true, confirmButtonText: 'Entrar a la sala', inputValidator: value => value.trim() && value.trim().length <= 40 ? undefined : 'Escribe un nombre de hasta 40 caracteres.' })
        if (disposed) return
        if (!answer.isConfirmed) { window.location.hash = '#/join'; return }
        name = String(answer.value).trim()
        sessionStorage.setItem(`bingo_player_name_${code}`, name)
      }
      const response = await joinGameRoom(code, role, name, signal)
      if (disposed) return
      mount()
      ready = socket.connected
      render(response.room, false)
      setConnection(ready)
    } catch (error) {
      if (disposed) return
      app.innerHTML = '<div class="room-loading"><h1>No pudimos abrir la sala</h1><p>Revisa la conexión o pide el código al anfitrión.</p><button id="retryJoin" class="action-button primary-action">Volver a intentar</button><a href="#/" class="text-action">Volver al inicio</a></div>'
      document.getElementById('retryJoin')!.onclick = () => { if (!disposed) void initialize() }
      await showError(error)
    }
  }
  void initialize()
}
