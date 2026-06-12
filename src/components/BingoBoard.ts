import type { GameRoom } from '../types/game'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

export function renderBingoBoard(room: GameRoom, isHost: boolean) {
  const bingoBoardContainer = document.getElementById('bingoBoard')
  if (!bingoBoardContainer) {
    return;
  }

  const currentCellsCount = bingoBoardContainer.querySelectorAll('.grid > div').length;

  if (bingoBoardContainer.dataset.rendered === 'true' && currentCellsCount === room.maxNumber) {
    updateBoardNumbers(bingoBoardContainer, room.drawnNumbers, isHost);
    return;
  }

  let cols = Math.floor(room.maxNumber / 10) + 1;

  let boardHtml = `<div class="w-full h-full grid gap-1 sm:gap-2 p-1" style="container-type: size; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-template-rows: repeat(10, minmax(0, 1fr));">`;

  for (let i = 1; i <= room.maxNumber; i++) {
    const isDrawn = room.drawnNumbers.includes(i);
    const lastDrawn = room.drawnNumbers[room.drawnNumbers.length - 1];
    const col = Math.floor(i / 10) + 1;
    const row = (i % 10 === 0) ? 1 : (i % 10) + 1;

    let cellClasses = `
      relative flex items-center justify-center rounded-lg transition-all duration-300 ease-out cursor-pointer font-black border-2
    `

    if (isDrawn) {
      cellClasses += ` bg-gradient-to-br from-neon-purple to-neon-pink border-transparent text-white shadow-[0_0_10px_rgba(176,38,255,0.6)] transform scale-[1.03] z-10 `
      if (i === lastDrawn && isHost) {
        cellClasses += ` ring-4 ring-neon-blue animate-pulse `
      }
    } else {
      cellClasses += ` bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white `
    }

    boardHtml += `
      <div class="${cellClasses} group overflow-hidden" style="grid-column: ${col}; grid-row: ${row}; font-size: clamp(10px, 5cqmin, 3.5rem);">
        <span class="relative z-10 drop-shadow-md">${i}</span>
        ${isDrawn ? '<div class="absolute inset-0 bg-white/20 blur-sm pointer-events-none"></div>' : ''}
      </div>
    `
  }

  boardHtml += `</div>`
  bingoBoardContainer.innerHTML = boardHtml
  bingoBoardContainer.dataset.rendered = 'true'

  if (isHost) {
    bingoBoardContainer.querySelectorAll('.grid > div').forEach(cell => {
      cell.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLDivElement
        const clickedNumber = parseInt(target.textContent || '0')
        if (clickedNumber > 0 && clickedNumber <= room.maxNumber) {

          target.classList.add('animate-pop')
          setTimeout(() => target.classList.remove('animate-pop'), 300)

          const roomRef = doc(db, 'gameRooms', room.id)
          const snapshot = await getDoc(roomRef)
          const latestData = snapshot.data() as GameRoom

          let updatedNumbers = [...latestData.drawnNumbers]
          const index = updatedNumbers.indexOf(clickedNumber)

          if (index > -1) {
            updatedNumbers.splice(index, 1)
          } else {
            updatedNumbers.push(clickedNumber)
          }

          await updateDoc(roomRef, { drawnNumbers: updatedNumbers })
        }
      })
    })
  }
}

function updateBoardNumbers(container: HTMLElement, drawnNumbers: number[], isHost: boolean) {
  const cells = container.querySelectorAll('.grid > div')
  const lastDrawn = drawnNumbers[drawnNumbers.length - 1]

  cells.forEach(cell => {
    const number = parseInt(cell.textContent || '0')
    const isDrawn = drawnNumbers.includes(number)

    cell.className = cell.className.replace(/bg-gradient-to-br.*z-10|bg-gray-800\/50.*text-white|ring-4 ring-neon-blue animate-pulse/g, '').trim()

    if (isDrawn) {
      cell.classList.add('bg-gradient-to-br', 'from-neon-purple', 'to-neon-pink', 'border-transparent', 'text-white', 'shadow-[0_0_10px_rgba(176,38,255,0.6)]', 'transform', 'scale-[1.03]', 'z-10')
      if (number === lastDrawn && isHost) {
        cell.classList.add('ring-4', 'ring-neon-blue', 'animate-pulse')
      }

      const span = cell.querySelector('span')
      if (span && !cell.querySelector('.bg-white\\/20')) {
        const overlay = document.createElement('div')
        overlay.className = 'absolute inset-0 bg-white/20 blur-sm pointer-events-none'
        cell.appendChild(overlay)
      }
    } else {
      cell.classList.add('bg-gray-800/50', 'border-gray-700', 'text-gray-400', 'hover:bg-gray-700', 'hover:border-gray-500', 'hover:text-white')
      cell.classList.remove('transform', 'scale-[1.03]', 'z-10')
      const overlay = cell.querySelector('.bg-white\\/20')
      if (overlay) overlay.remove()
    }
  })
}