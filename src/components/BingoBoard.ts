import type { GameRoom } from '../types/game'

export function renderBingoBoard(room: GameRoom, isHost: boolean, onToggle?: (number: number) => void) {
  const container = document.getElementById('bingoBoard')
  if (!container) return
  if (container.children.length !== room.maxNumber) {
    container.replaceChildren()
    for (let number = 1; number <= room.maxNumber; number++) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'board-cell'
      const label = document.createElement('span')
      label.textContent = String(number)
      cell.appendChild(label)
      cell.style.gridColumn = String(Math.floor(number / 10) + 1)
      cell.style.gridRow = String(number % 10 + 1)
      cell.dataset.number = String(number)
      container.appendChild(cell)
    }
  }
  container.style.setProperty('--board-columns', String(Math.floor(room.maxNumber / 10) + 1))
  container.style.setProperty('--mobile-rows', String(Math.ceil(room.maxNumber / 10)))
  container.classList.toggle('large-board', room.maxNumber > 99)
  const last = room.drawnNumbers.at(-1)
  const drawn = new Set(room.drawnNumbers)
  container.querySelectorAll<HTMLButtonElement>('.board-cell').forEach(cell => {
    const number = Number(cell.dataset.number)
    const selected = drawn.has(number)
    const newlyDrawn = selected && !cell.classList.contains('is-drawn')
    if (newlyDrawn && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cell.animate([{ transform: 'scale(.85)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1.02)' }], { duration: 350 })
    }
    cell.classList.toggle('is-drawn', selected)
    cell.classList.toggle('is-last', number === last)
    cell.setAttribute('aria-pressed', String(selected))
    cell.setAttribute('aria-label', `${number}${selected ? ', ya salió' : ', no ha salido'}`)
    cell.disabled = !isHost || room.tombolaActive || room.phase === 'finished'
    cell.onclick = isHost && onToggle ? () => onToggle(number) : null
  })
}
