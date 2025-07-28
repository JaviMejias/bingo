import type { GameRoom } from '../types/game'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import Swal from 'sweetalert2'

export function renderBingoBoard(room: GameRoom) {
  const bingoBoardContainer = document.getElementById('bingoBoard')
  if (!bingoBoardContainer) {
    console.warn('Contenedor del tablero de bingo no encontrado. Asegúrate de que existe un div con id="bingoBoard" en tu HTML.');
    return;
  }

  const isHost = document.getElementById('controls') !== null;

  if (bingoBoardContainer.dataset.rendered === 'true') {
    updateBoardNumbers(bingoBoardContainer, room.drawnNumbers, isHost);
    return;
  }

  const gridWrapperClasses = `
    grid gap-0.5 sm:gap-1 p-1 rounded-lg shadow-xl overflow-hidden
    ${isHost ? 'bg-gray-800' : 'bg-gray-700'}
    w-full max-w-full
  `

  let cols = 10
  if (room.maxNumber > 100) {
    cols = 15
  }

  let numberTextSize = ''

  if (isHost) {
    numberTextSize = `
      text-xs sm:text-sm lg:text-base font-bold // Ajustado para ser pequeño y legible
    `
  } else {
    numberTextSize = `
      text-sm sm:text-base md:text-lg lg:text-xl font-semibold
    `
  }

  let boardHtml = `<div class="${gridWrapperClasses} grid-cols-${cols} sm:grid-cols-${cols} md:grid-cols-${cols} lg:grid-cols-${cols} xl:grid-cols-${cols}">`;

  for (let i = 1; i <= room.maxNumber; i++) {
    const isDrawn = room.drawnNumbers.includes(i);
    const lastDrawn = room.drawnNumbers[room.drawnNumbers.length - 1];

    let cellClasses = `
      flex items-center justify-center p-0.5
      rounded-md transition-all duration-300 ease-in-out border border-gray-600 cursor-pointer
      ${numberTextSize} aspect-square
    `

    if (isDrawn) {
      cellClasses += ` bg-emerald-600 text-white shadow-md transform scale-105 `
      if (i === lastDrawn && isHost) {
        cellClasses += ` animate-pulse ring-4 ring-yellow-400 border-yellow-400 `
      }
    } else {
      cellClasses += ` bg-gray-600 text-gray-200 hover:bg-gray-500 `
    }

    boardHtml += `<div class="${cellClasses}">${i}</div>`
  }

  boardHtml += `</div>`
  bingoBoardContainer.innerHTML = boardHtml
  bingoBoardContainer.dataset.rendered = 'true'

  if (isHost) {
    bingoBoardContainer.querySelectorAll('.grid > div').forEach(cell => {
      cell.addEventListener('click', async (e) => {
        const clickedNumber = parseInt((e.target as HTMLDivElement).textContent || '0')
        if (clickedNumber > 0 && clickedNumber <= room.maxNumber) {
          const roomRef = doc(db, 'gameRooms', room.id)
          const snapshot = await getDoc(roomRef)
          const latestData = snapshot.data() as GameRoom

          let updatedNumbers = [...latestData.drawnNumbers]
          const index = updatedNumbers.indexOf(clickedNumber)

          let confirmed: { isConfirmed: boolean } = { isConfirmed: false }

          if (index > -1) {
            confirmed = await Swal.fire({
              title: 'Desmarcar número',
              text: `¿Quieres desmarcar el número ${clickedNumber}?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, desmarcar',
              cancelButtonText: 'Cancelar'
            })
            if (confirmed.isConfirmed) {
              updatedNumbers.splice(index, 1)
            }
          } else {
            confirmed = await Swal.fire({
              title: 'Marcar número',
              text: `¿Quieres marcar el número ${clickedNumber}?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, marcar',
              cancelButtonText: 'Cancelar'
            })
            if (confirmed.isConfirmed) {
              updatedNumbers.push(clickedNumber)
              updatedNumbers.sort((a, b) => a - b)
            }
          }

          if (confirmed.isConfirmed) {
            await updateDoc(roomRef, { drawnNumbers: updatedNumbers })
          }
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

    cell.classList.remove(
      'bg-emerald-600', 'text-white', 'shadow-md', 'transform', 'scale-105',
      'bg-gray-600', 'text-gray-200', 'hover:bg-gray-500',
      'animate-pulse', 'ring-4', 'ring-yellow-400', 'border-yellow-400'
    )

    if (isDrawn) {
      cell.classList.add('bg-emerald-600', 'text-white', 'shadow-md', 'transform', 'scale-105')
      if (number === lastDrawn && isHost) {
        cell.classList.add('animate-pulse', 'ring-4', 'ring-yellow-400', 'border-yellow-400')
      }
    } else {
      cell.classList.add('bg-gray-600', 'text-gray-200', 'hover:bg-gray-500')
    }
  })
}