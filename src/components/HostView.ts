import bingoAppHtml from '../bingo-app.html?raw'
import type { GameRoom } from '../types/game'
import { renderBingoBoard } from './BingoBoard'
import { renderLastNumbers } from './LastNumbers'
import { renderBingoControls } from './BingoControls'

export function renderHostView(room: GameRoom) {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  app.innerHTML = `
    <div class="
      min-h-screen
      bg-gradient-to-br from-blue-700 to-purple-900
      flex flex-col items-center justify-start
      p-4 sm:p-6 lg:p-8
      font-inter text-white
      overflow-auto
    ">
      <div class="
        w-full max-w-6xl mx-auto
        py-8 sm:py-12
        space-y-10
      ">
        <h1 class="
          text-5xl sm:text-6xl lg:text-7xl
          font-extrabold text-center
          drop-shadow-lg
          mb-8
        ">
          Panel de Control de Bingo
        </h1>

        <div class="flex flex-col gap-8">
          ${bingoAppHtml}
        </div>
      </div>
    </div>
  `

  const currentLastNumberEl = document.getElementById('currentLastNumber') as HTMLDivElement;
  const previousLastNumberEl = document.getElementById('previousLastNumber') as HTMLDivElement;
  const bingoBoardEl = document.getElementById('bingoBoard') as HTMLDivElement;
  const controlsEl = document.getElementById('controls') as HTMLDivElement;

  if (controlsEl) {
    renderBingoControls(room);
  } else {
    console.warn('Contenedor #controls no encontrado en bingo-app.html.');
  }

  if (bingoBoardEl) {
    renderBingoBoard(room);
  } else {
    console.warn('Contenedor #bingoBoard no encontrado en bingo-app.html.');
  }

  if (currentLastNumberEl && previousLastNumberEl) {
    renderLastNumbers(room, currentLastNumberEl, previousLastNumberEl);
  } else {
    console.warn('Contenedores de últimos números (currentLastNumber, previousLastNumber) no encontrados en bingo-app.html.');
  }
}