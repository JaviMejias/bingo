import Swal from 'sweetalert2'
import type { GameRoom } from '../types/game'
import { updateDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

export function renderBingoControls(room: GameRoom) {
  const controls = document.getElementById('controls')
  if (!controls) {
    console.warn('No se encontró el contenedor de controles (#controls).')
    return
  }

  if (controls.children.length > 0) {
    return
  }

  controls.innerHTML = `
    <div class="
      w-full flex flex-col sm:flex-row justify-between items-center 
      gap-3
    ">
      <div class="flex flex-col sm:flex-row flex-wrap gap-2 items-center justify-center sm:justify-start w-full sm:w-auto">
        <input type="number" id="inputNumber" placeholder="Ingresar #" class="
          px-3 py-1.5 rounded-lg text-gray-900 bg-gray-100 border border-gray-400 
          focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-32
          transition-all duration-300 ease-in-out shadow-inner hover:shadow-md
        " />
        <button id="enterNumberBtn" class="
          bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg 
          transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md w-full sm:w-auto
          flex items-center justify-center text-sm
        ">
          <i class="fas fa-plus-circle mr-1.5 text-base"></i> Ingresar
        </button>
        <input type="number" id="searchNumber" placeholder="Buscar #" class="
          px-3 py-1.5 rounded-lg text-gray-900 bg-gray-100 border border-gray-400 
          focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-32
          transition-all duration-300 ease-in-out shadow-inner hover:shadow-md
        " />
        <button id="searchNumberBtn" class="
          bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-4 rounded-lg 
          transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md w-full sm:w-auto
          flex items-center justify-center text-sm
        ">
          <i class="fas fa-search mr-1.5 text-base"></i> Buscar
        </button>
      </div>

      <div class="relative flex-shrink-0 z-10"> <button id="dropdownToggleControls" class="
          text-white text-2xl bg-indigo-600 hover:bg-indigo-700 p-2.5 rounded-full 
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 
          transition-all duration-200 ease-in-out transform hover:rotate-90 hover:scale-110 shadow-lg
          flex items-center justify-center
        ">
          <i class="fas fa-cog"></i> </button>
        <div id="dropdownMenuControls" class="
          absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-lg shadow-xl 
          hidden overflow-hidden border border-gray-200
          transform origin-top-right transition-all duration-300 ease-out
          opacity-0 scale-95
        ">
          <button id="drawTombolaBtnControls" class="
            w-full text-left px-4 py-3 text-base 
            hover:bg-gray-100 transition-colors duration-150 ease-in-out
            flex items-center
          ">
            <i class="fas fa-dice mr-3 text-blue-500"></i> Sacar Número (Tómbola)
          </button>
          <button id="configMaxNumBtnControls" class="
            w-full text-left px-4 py-3 text-base 
            hover:bg-gray-100 transition-colors duration-150 ease-in-out
            flex items-center
          ">
            <i class="fas fa-cogs mr-3 text-yellow-500"></i> Configurar Rango
          </button>
          <hr class="border-gray-200 my-1">
          <button id="resetGameBtnControls" class="
            w-full text-left px-4 py-3 text-base 
            hover:bg-red-50 text-red-700 font-semibold transition-colors duration-150 ease-in-out
            flex items-center
          ">
            <i class="fas fa-redo-alt mr-3"></i> Reiniciar Juego
          </button>
        </div>
      </div>
    </div>
  `

  const roomRef = doc(db, 'gameRooms', room.id) 
  const inputNumber = document.getElementById('inputNumber') as HTMLInputElement
  const enterButton = document.getElementById('enterNumberBtn') as HTMLButtonElement
  const searchInput = document.getElementById('searchNumber') as HTMLInputElement
  const searchButton = document.getElementById('searchNumberBtn') as HTMLButtonElement

  async function ingresarNumero() {
    const number = parseInt(inputNumber.value)
    if (isNaN(number)) {
      Swal.fire('Atención', 'Por favor, ingresa un número válido.', 'warning')
      return
    }

    const snapshot = await getDoc(roomRef)
    const latestData = snapshot.data() as GameRoom

    if (number < 1 || number > latestData.maxNumber) {
      Swal.fire('Número fuera de rango', `El número debe estar entre 1 y ${latestData.maxNumber}.`, 'warning')
      inputNumber.value = ''
      inputNumber.focus()
      return
    }

    if (latestData.drawnNumbers.includes(number)) {
      Swal.fire('Número ya ingresado', 'Este número ya ha sido sorteado.', 'info')
      inputNumber.value = ''
      inputNumber.focus()
      return
    }

    const updatedNumbers = [...latestData.drawnNumbers, number]
    await updateDoc(roomRef, {
      drawnNumbers: updatedNumbers
    })

    inputNumber.value = ''
    inputNumber.focus()
  }

  function buscarNumero() {
    const number = parseInt(searchInput.value)
    if (isNaN(number)) {
        Swal.fire('Atención', 'Por favor, ingresa un número válido para buscar.', 'warning')
        return
    }

    document.querySelectorAll('.highlight-search').forEach(el => {
      el.classList.remove('highlight-search', 'ring', 'ring-yellow-300', 'scale-110')
    })

    setTimeout(() => {
      const cell = document.querySelector<HTMLDivElement>(`#bingoBoard .grid > div:nth-child(${number})`)
      if (cell) {
        cell.classList.add('highlight-search', 'ring', 'ring-yellow-300', 'ring-offset-2', 'ring-offset-gray-900', 'scale-110', 'z-20')
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' })

        setTimeout(() => {
          cell.classList.remove('highlight-search', 'ring', 'ring-yellow-300', 'ring-offset-2', 'ring-offset-gray-900', 'scale-110', 'z-20')
        }, 2000)
      } else {
        Swal.fire('Número no encontrado', `El número ${number} no existe en el tablero.`, 'info')
      }
    }, 50)

    searchInput.value = ''
    searchInput.focus()
  }

  enterButton.addEventListener('click', ingresarNumero)
  inputNumber.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ingresarNumero()
    }
  })

  searchButton.addEventListener('click', buscarNumero)
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarNumero()
    }
  })
}