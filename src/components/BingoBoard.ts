// En tu archivo: BingoBoard.ts

import type { GameRoom } from '../types/game';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import Swal from 'sweetalert2';

export function renderBingoBoard(room: GameRoom) {
  const bingoBoardContainer = document.getElementById('bingoBoard');
  if (!bingoBoardContainer) {
    console.warn('Contenedor del tablero de bingo no encontrado. Asegúrate de que existe un div con id="bingoBoard" en tu HTML.');
    return;
  }

  const isHost = document.getElementById('controls') !== null;

  if (bingoBoardContainer.dataset.rendered === 'true') {
    updateBoardNumbers(bingoBoardContainer, room.drawnNumbers, isHost);
    return;
  }

  // Clases para el contenedor general de la CUADRÍCULA (el div que tiene los números)
  // Este div es el que usará 'grid-cols-X' y ocupará todo el ancho disponible.
  const gridWrapperClasses = `
    grid gap-0.5 sm:gap-1 p-1 rounded-lg shadow-xl overflow-hidden // Margen y padding entre celdas
    ${isHost ? 'bg-gray-800' : 'bg-gray-700'}
    w-full max-w-full // ¡CLAVE! Este contenedor debe expandirse al 100% del ancho disponible
  `;

  let cols = 10;
  if (room.maxNumber > 100) {
    cols = 15; // Define 15 columnas si hay más de 100 números
  }

  let numberTextSize = ''; // Clases para el tamaño del texto de los números dentro de las celdas

  if (isHost) {
    // Para el host: queremos un tablero denso y de cuadritos.
    // 'grid-cols-${cols}' se añade directamente a 'gridWrapperClasses' arriba.
    // El tamaño de texto debe ser pequeño para que quepa en los cuadritos.
    numberTextSize = `
      text-xs sm:text-sm lg:text-base font-bold // Ajustado para ser pequeño y legible
    `;
  } else {
    // Para el jugador: el tablero es responsivo y se mantiene más genérico.
    // Aquí podrías usar un 'grid-cols-10' fijo para dispositivos pequeños si quieres.
    numberTextSize = `
      text-sm sm:text-base md:text-lg lg:text-xl font-semibold
    `;
  }

  // Generamos el HTML del contenedor del grid, aplicando las clases de columna aquí.
  let boardHtml = `<div class="${gridWrapperClasses} grid-cols-${cols} sm:grid-cols-${cols} md:grid-cols-${cols} lg:grid-cols-${cols} xl:grid-cols-${cols}">`;

  // Genera las celdas de números individuales
  for (let i = 1; i <= room.maxNumber; i++) {
    const isDrawn = room.drawnNumbers.includes(i);
    const lastDrawn = room.drawnNumbers[room.drawnNumbers.length - 1];

    let cellClasses = `
      flex items-center justify-center
      p-0.5 // ¡CLAVE! Mínimo padding para cada celda
      rounded-md transition-all duration-300 ease-in-out border border-gray-600 cursor-pointer
      ${numberTextSize}
      aspect-square   // ¡CLAVE! Fuerza a cada celda a ser cuadrada, basándose en el ancho que le dé el grid.
      // *** MUY IMPORTANTE: NO AGREGAR 'w-full' NI 'max-w-X' AQUÍ ***
      // Esto es porque queremos que la celda se adapte al ancho que le asigne el grid (1fr).
    `;

    if (isDrawn) {
      cellClasses += ` bg-emerald-600 text-white shadow-md transform scale-105 `; // Efectos para números sorteados
      if (i === lastDrawn && isHost) {
        cellClasses += ` animate-pulse ring-4 ring-yellow-400 border-yellow-400 `;
      }
    } else {
      cellClasses += ` bg-gray-600 text-gray-200 hover:bg-gray-500 `; // Efectos para números no sorteados
    }

    boardHtml += `<div class="${cellClasses}">${i}</div>`;
  }

  boardHtml += `</div>`; // Cierra el contenedor de la cuadrícula
  bingoBoardContainer.innerHTML = boardHtml;
  bingoBoardContainer.dataset.rendered = 'true';

  // Adjunta listeners de clic a los números del tablero SOLO para el host.
  if (isHost) {
    bingoBoardContainer.querySelectorAll('.grid > div').forEach(cell => {
      cell.addEventListener('click', async (e) => {
        const clickedNumber = parseInt((e.target as HTMLDivElement).textContent || '0');
        if (clickedNumber > 0 && clickedNumber <= room.maxNumber) {
          const roomRef = doc(db, 'gameRooms', room.id);
          const snapshot = await getDoc(roomRef);
          const latestData = snapshot.data() as GameRoom;

          let updatedNumbers = [...latestData.drawnNumbers];
          const index = updatedNumbers.indexOf(clickedNumber);

          let confirmed: { isConfirmed: boolean } = { isConfirmed: false };

          if (index > -1) {
            confirmed = await Swal.fire({
                title: 'Desmarcar número',
                text: `¿Quieres desmarcar el número ${clickedNumber}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, desmarcar',
                cancelButtonText: 'Cancelar'
            });
            if (confirmed.isConfirmed) {
                updatedNumbers.splice(index, 1);
            }
          } else {
            confirmed = await Swal.fire({
                title: 'Marcar número',
                text: `¿Quieres marcar el número ${clickedNumber}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, marcar',
                cancelButtonText: 'Cancelar'
            });
            if (confirmed.isConfirmed) {
                updatedNumbers.push(clickedNumber);
                updatedNumbers.sort((a, b) => a - b);
            }
          }

          if (confirmed.isConfirmed) {
              await updateDoc(roomRef, { drawnNumbers: updatedNumbers });
          }
        }
      });
    });
  }
}

function updateBoardNumbers(container: HTMLElement, drawnNumbers: number[], isHost: boolean) {
  const cells = container.querySelectorAll('.grid > div');
  const lastDrawn = drawnNumbers[drawnNumbers.length - 1];

  cells.forEach(cell => {
    const number = parseInt(cell.textContent || '0');
    const isDrawn = drawnNumbers.includes(number);

    // Limpia todas las clases de estado antes de aplicar las nuevas
    cell.classList.remove(
      'bg-emerald-600', 'text-white', 'shadow-md', 'transform', 'scale-105',
      'bg-gray-600', 'text-gray-200', 'hover:bg-gray-500',
      'animate-pulse', 'ring-4', 'ring-yellow-400', 'border-yellow-400'
    );

    if (isDrawn) {
      cell.classList.add('bg-emerald-600', 'text-white', 'shadow-md', 'transform', 'scale-105');
      if (number === lastDrawn && isHost) {
        cell.classList.add('animate-pulse', 'ring-4', 'ring-yellow-400', 'border-yellow-400');
      }
    } else {
      cell.classList.add('bg-gray-600', 'text-gray-200', 'hover:bg-gray-500');
    }
  });
}