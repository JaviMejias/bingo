import type { GameRoom } from '../types/game'

export function renderBingoControls(room: GameRoom) {
  const container = document.getElementById('controls-left')
  if (!container) return
  if (container.dataset.mode !== room.currentMode) {
    container.dataset.mode = room.currentMode
    container.innerHTML = room.currentMode === 'tombola' ? `
      <button id="drawTombolaModeBtn" class="action-button draw-button" type="button">Sacar primer número</button>
      <p id="drawHint" class="control-hint" aria-live="polite"></p>
    ` : `
      <form id="manualNumberForm" class="number-form">
        <label for="inputNumber">Número que salió</label>
        <div class="input-action"><input id="inputNumber" type="text" inputmode="numeric" pattern="[0-9]+" autocomplete="off" required placeholder="Ej. 25"><button id="enterNumberBtn" class="action-button primary-action" type="submit">Marcar</button></div>
      </form>
      <p id="manualNumberHint" class="control-hint" role="status"></p>
    `
  }
  const input = document.querySelector<HTMLInputElement>('#inputNumber')
  if (input) {
    input.max = String(room.maxNumber)
    input.disabled = room.phase === 'finished' || room.tombolaActive
  }
  const enter = document.querySelector<HTMLButtonElement>('#enterNumberBtn')
  if (enter) enter.disabled = room.phase === 'finished' || room.tombolaActive
  const button = document.querySelector<HTMLButtonElement>('#drawTombolaModeBtn')
  if (!button) return
  const complete = room.drawnNumbers.length >= room.maxNumber
  const paused = room.bingoCallers.length > 0
  button.disabled = room.tombolaActive || room.phase === 'finished' || complete || paused
  button.classList.toggle('ready-to-draw', !button.disabled)
  button.textContent = room.tombolaActive ? 'La tómbola está girando…' : room.phase === 'finished' ? 'Partida terminada' : complete ? 'Ya salieron todos los números' : paused ? 'Hay un Bingo por revisar' : room.drawnNumbers.length ? 'Sacar siguiente número' : 'Sacar primer número'
  const hint = document.getElementById('drawHint')!
  hint.textContent = room.phase === 'finished' ? 'Revisa los premios y, cuando estén listos, inicia otra partida.' : paused ? 'Revisa los avisos del panel antes de sacar otro número.' : room.tombolaActive ? 'El resultado aparecerá automáticamente para todos.' : complete ? 'Puedes iniciar otra partida manteniendo el código de sala.' : 'Cuando todos estén listos, pulsa este botón para sacar un número.'
}
