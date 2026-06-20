import Swal from 'sweetalert2'
import type { GameRoom } from '../types/game'
import { socket } from '../services/socket'

export function renderBingoControls(room: GameRoom) {
  const leftControls = document.getElementById('controls-left')
  const rightControls = document.getElementById('controls-right')
  const currentMode = room.currentMode || 'manual'

  if (leftControls && (leftControls.children.length === 0 || leftControls.dataset.mode !== currentMode)) {
    leftControls.dataset.mode = currentMode
    if (currentMode === 'manual') {
      leftControls.innerHTML = `
        <div class="flex flex-row flex-wrap gap-2 items-center justify-center lg:justify-start animate-fade-in">
          <div class="relative group">
            <input type="number" id="inputNumber" min="1" max="${room.maxNumber}" placeholder="Nº" class="
              px-4 py-3 w-28 sm:w-32 rounded-lg text-white bg-gray-900/50 border-2 border-gray-700 
              focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-center font-black text-lg
              transition-all duration-300
            " />
          </div>
          <button id="enterNumberBtn" class="
            bg-neon-purple hover:bg-fuchsia-600 text-white font-bold py-3 px-6 rounded-lg 
            transition-all duration-200 ease-in-out transform hover:scale-105 shadow-[0_0_10px_rgba(176,38,255,0.4)]
            flex items-center justify-center text-base
          ">
            <i class="fas fa-plus mr-1 sm:mr-2"></i> <span class="hidden sm:inline">Añadir</span>
          </button>

          <div class="relative group ml-0 sm:ml-4">
            <input type="number" id="searchNumber" min="1" max="${room.maxNumber}" placeholder="Nº" class="
              px-4 py-3 w-28 sm:w-32 rounded-lg text-white bg-gray-900/50 border-2 border-gray-700 
              focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-center font-black text-lg
              transition-all duration-300
            " />
          </div>
          <button id="searchNumberBtn" class="
            bg-neon-blue hover:bg-cyan-500 text-gray-900 font-bold py-3 px-6 rounded-lg 
            transition-all duration-200 ease-in-out transform hover:scale-105 shadow-[0_0_10px_rgba(0,240,255,0.4)]
            flex items-center justify-center text-base
          ">
            <i class="fas fa-search mr-1 sm:mr-2"></i> <span class="hidden sm:inline">Buscar</span>
          </button>
        </div>
      `
    } else {
      leftControls.innerHTML = `
        <div class="flex flex-row flex-wrap gap-2 items-center justify-center lg:justify-start animate-fade-in w-full">
          <button id="drawTombolaModeBtn" class="
            bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 text-white font-black py-3 px-10 rounded-xl 
            transition-all duration-300 ease-in-out transform hover:scale-105 shadow-[0_0_20px_rgba(176,38,255,0.6)]
            flex items-center justify-center text-lg sm:text-xl uppercase tracking-widest w-full sm:w-auto
          ">
            <i class="fas fa-dice mr-3 text-2xl sm:text-3xl animate-bounce"></i> Girar Tómbola
          </button>
        </div>
      `
    }
  }

  if (rightControls) {
    if (rightControls.children.length === 0) {
      rightControls.dataset.mode = currentMode
      rightControls.innerHTML = `
        <div class="relative flex-shrink-0 z-20"> 
          <button id="dropdownToggleControls" class="
            text-white text-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 w-12 h-12 rounded-full 
            focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink
            transition-all duration-200 ease-in-out transform hover:rotate-90 hover:scale-110 shadow-[0_0_10px_rgba(255,0,85,0.3)]
            flex items-center justify-center
          ">
            <i class="fas fa-cog"></i> 
          </button>
          <div id="dropdownMenuControls" class="
            absolute right-0 mt-3 w-56 bg-[#111827] text-white rounded-xl shadow-2xl 
            overflow-hidden border border-gray-700
            transform origin-top-right transition-all duration-300 ease-out
            opacity-0 scale-95 pointer-events-none z-[100]
          ">
            <button id="toggleModeBtnControls" class="
              w-full text-left px-5 py-4 text-sm font-semibold
              hover:bg-gray-800 transition-colors duration-150 ease-in-out
              flex items-center border-b border-gray-800
            ">
              <div class="w-8 h-8 rounded-full bg-neon-blue/20 flex items-center justify-center mr-3">
                <i class="fas fa-exchange-alt text-neon-blue"></i>
              </div>
              ${currentMode === 'manual' ? 'Modo Tómbola' : 'Modo Manual'}
            </button>
            <button id="configMaxNumBtnControls" class="
              w-full text-left px-5 py-4 text-sm font-semibold
              hover:bg-gray-800 transition-colors duration-150 ease-in-out
              flex items-center border-b border-gray-800
            ">
              <div class="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center mr-3">
                 <i class="fas fa-cogs text-neon-purple"></i>
              </div>
              Rango Bingo
            </button>
            <button id="winnersHistoryBtnControls" class="
              w-full text-left px-5 py-4 text-sm font-semibold
              hover:bg-gray-800 transition-colors duration-150 ease-in-out
              flex items-center border-b border-gray-800
            ">
              <div class="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center mr-3">
                 <i class="fas fa-trophy text-neon-green"></i>
              </div>
              Historial Ganadores
            </button>
            <button id="resetGameBtnControls" class="
              w-full text-left px-5 py-4 text-sm font-semibold
              hover:bg-red-900/30 text-neon-pink transition-colors duration-150 ease-in-out
              flex items-center
            ">
              <div class="w-8 h-8 rounded-full bg-neon-pink/10 flex items-center justify-center mr-3">
                <i class="fas fa-trash-alt text-neon-pink"></i>
              </div>
              Reiniciar Juego
            </button>
          </div>
        </div>
      `
    } else if (rightControls.dataset.mode !== currentMode) {
      rightControls.dataset.mode = currentMode
      const toggleModeBtn = document.getElementById('toggleModeBtnControls')
      if (toggleModeBtn) {
        toggleModeBtn.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-neon-blue/20 flex items-center justify-center mr-3">
            <i class="fas fa-exchange-alt text-neon-blue"></i>
          </div>
          ${currentMode === 'manual' ? 'Modo Tómbola' : 'Modo Manual'}
        `
      }
    }
  }

  const inputNumber = document.getElementById('inputNumber') as HTMLInputElement
  const enterButton = document.getElementById('enterNumberBtn') as HTMLButtonElement
  const searchInput = document.getElementById('searchNumber') as HTMLInputElement
  const searchButton = document.getElementById('searchNumberBtn') as HTMLButtonElement
  const drawTombolaModeBtn = document.getElementById('drawTombolaModeBtn') as HTMLButtonElement

  async function ingresarNumero() {
    const number = parseInt(inputNumber.value)
    if (isNaN(number)) {
      Swal.fire({ title: 'Atención', text: 'Ingresa un número válido.', icon: 'warning', background: '#111827', color: '#fff', confirmButtonColor: '#b026ff' })
      return
    }

    const currentRoom = await new Promise<GameRoom>((resolve) => {
      socket.emit('joinRoomById', room.id, (response: any) => {
        resolve(response.room)
      })
    })
    const latestData = currentRoom || room

    if (number < 1 || number > latestData.maxNumber) {
      Swal.fire({ title: 'Fuera de rango', text: `Entre 1 y ${latestData.maxNumber}.`, icon: 'warning', background: '#111827', color: '#fff', confirmButtonColor: '#ff0055' })
      inputNumber.value = ''
      inputNumber.focus()
      return
    }

    if (latestData.drawnNumbers.includes(number)) {
      Swal.fire({ title: 'Ya ingresado', text: 'El número ya fue sorteado.', icon: 'info', background: '#111827', color: '#fff' })
      inputNumber.value = ''
      inputNumber.focus()
      return
    }

    const updatedNumbers = [...latestData.drawnNumbers, number]
    socket.emit('updateRoom', room.id, { drawnNumbers: updatedNumbers })

    inputNumber.value = ''
    inputNumber.focus()
  }

  async function buscarNumero() {
    const number = parseInt(searchInput.value)
    if (isNaN(number)) {
      Swal.fire({ title: 'Atención', text: 'Ingresa un número válido.', icon: 'warning', background: '#111827', color: '#fff' })
      return
    }

    const currentRoom = await new Promise<GameRoom>((resolve) => {
      socket.emit('joinRoomById', room.id, (response: any) => {
        resolve(response.room)
      })
    })
    const latestData = currentRoom || room

    if (number < 1 || number > latestData.maxNumber) {
      Swal.fire({ title: 'Fuera de rango', text: `Solo se permiten números entre 1 y ${latestData.maxNumber}.`, icon: 'warning', background: '#111827', color: '#fff', confirmButtonColor: '#ff0055' })
      searchInput.value = ''
      searchInput.focus()
      return
    }

    if (!latestData.drawnNumbers.includes(number)) {
      Swal.fire({ title: 'No ha salido', text: `El número ${number} todavía no ha sido cantado.`, icon: 'info', background: '#111827', color: '#fff' })
      searchInput.value = ''
      searchInput.focus()
      return
    }

    document.querySelectorAll('.highlight-search').forEach(el => {
      el.classList.remove('highlight-search', 'ring-4', 'ring-neon-blue', 'scale-125', 'z-30')
    })

    setTimeout(() => {
      const cells = Array.from(document.querySelectorAll<HTMLDivElement>('#bingoBoard .grid > div'));
      const cell = cells.find(c => parseInt(c.textContent || '0') === number);
      if (cell) {
        cell.classList.add('scale-110', 'shadow-[0_0_30px_rgba(0,240,255,0.8)]', 'z-40')

        const snakeContainer = document.createElement('div')
        snakeContainer.className = 'snake-container'
        snakeContainer.innerHTML = '<span></span><span></span><span></span><span></span>'
        cell.appendChild(snakeContainer)

        cell.scrollIntoView({ behavior: 'smooth', block: 'center' })

        setTimeout(() => {
          cell.classList.remove('scale-110', 'shadow-[0_0_30px_rgba(0,240,255,0.8)]', 'z-40')
          snakeContainer.remove()
        }, 3000)
      }
    }, 50)

    searchInput.value = ''
    searchInput.focus()
  }

  function restrictInputRealTime(e: Event) {
    const target = e.target as HTMLInputElement;

    if (/[^0-9]/.test(target.value)) {
      target.value = target.value.replace(/[^0-9]/g, '');
    }

    if (target.value !== '') {
      let val = parseInt(target.value);
      if (val > room.maxNumber) {
        target.value = target.value.slice(0, -1);
        if (parseInt(target.value) > room.maxNumber) {
          target.value = room.maxNumber.toString();
        }
      } else if (val < 1 && target.value.length > 1) {
        target.value = target.value.slice(0, -1);
      } else if (val === 0) {
        target.value = '';
      }
    }
  }

  function preventInvalidChars(e: KeyboardEvent) {
    if (e.key.length === 1 && !/^[0-9]$/.test(e.key)) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    }
  }

  if (inputNumber && searchInput && enterButton && searchButton && !inputNumber.dataset.listeners) {
    inputNumber.dataset.listeners = 'true'
    inputNumber.addEventListener('input', restrictInputRealTime)
    searchInput.addEventListener('input', restrictInputRealTime)

    inputNumber.addEventListener('keydown', preventInvalidChars)
    searchInput.addEventListener('keydown', preventInvalidChars)

    enterButton.addEventListener('click', ingresarNumero)
    inputNumber.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ingresarNumero() }
    })

    searchButton.addEventListener('click', buscarNumero)
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); buscarNumero() }
    })
  }

  if (drawTombolaModeBtn && !drawTombolaModeBtn.dataset.listeners) {
    drawTombolaModeBtn.dataset.listeners = 'true'
    drawTombolaModeBtn.addEventListener('click', async () => {
      if (drawTombolaModeBtn.disabled) return;
      drawTombolaModeBtn.disabled = true;

      const localRemaining = Array.from({ length: room.maxNumber }, (_, i) => i + 1)
        .filter(n => !room.drawnNumbers.includes(n));

      if (localRemaining.length === 0) {
        Swal.fire({ title: 'Bingo Completo', text: 'No quedan números por sacar.', icon: 'info', background: '#111827', color: '#fff' });
        drawTombolaModeBtn.disabled = false;
        return;
      }

      const latestData = room

      if (latestData.tombolaActive) {
        drawTombolaModeBtn.disabled = false;
        return;
      }

      const remaining = Array.from({ length: latestData.maxNumber }, (_, i) => i + 1)
        .filter(n => !latestData.drawnNumbers.includes(n))

      if (remaining.length === 0) {
        Swal.fire({ title: 'Bingo Completo', text: 'No quedan números por sacar.', icon: 'info', background: '#111827', color: '#fff' })
        drawTombolaModeBtn.disabled = false;
        return
      }

      const random = remaining[Math.floor(Math.random() * remaining.length)]

      socket.emit('updateRoom', room.id, { tombolaActive: true, tombolaTarget: random })

      setTimeout(() => {
        const updatedNumbers = [...latestData.drawnNumbers, random]
        socket.emit('updateRoom', room.id, {
          drawnNumbers: updatedNumbers,
          tombolaActive: false,
          tombolaTarget: null
        })
        drawTombolaModeBtn.disabled = false
      }, 3000)
    })
  }
}