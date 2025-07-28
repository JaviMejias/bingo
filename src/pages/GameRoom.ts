import { doc, onSnapshot, collection, query, where, getDocs, getDoc, updateDoc } from 'firebase/firestore'
import { db, authReady } from '../services/firebase'
import Swal from 'sweetalert2'
import type { GameRoom } from '../types/game'
import { renderBingoControls } from '../components/BingoControls'
import { renderBingoBoard } from '../components/BingoBoard'
import { renderLastNumbers } from '../components/LastNumbers'

async function findRoomByCode(code: string): Promise<{ id: string, data: GameRoom } | null> {
  const q = query(collection(db, 'gameRooms'), where('code', '==', code))
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) return null
  const docSnap = querySnapshot.docs[0]
  return {
    id: docSnap.id,
    data: docSnap.data() as GameRoom
  }
}

export async function renderGameRoom(code: string, role: 'host' | 'player') {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  const user = await authReady

  const roomResult = await findRoomByCode(code)
  if (!roomResult) {
    Swal.fire('Sala no encontrada', 'Esta sala ya no existe.', 'error')
    window.location.hash = '#/'
    return
  }

  const roomData = roomResult.data

  if (role === 'host') {
    if (!user) {
      Swal.fire('Acceso denegado', 'Necesitas iniciar sesión para ser host.', 'error')
      window.location.hash = '#/'
      return
    }
    if (user.uid !== roomData.hostId) {
      Swal.fire('Acceso denegado', 'Solo el creador de la sala puede ser el host.', 'error')
      window.location.hash = '#/'
      return
    }
  }

  app.innerHTML = `
    <div class="
      min-h-screen w-full flex flex-col items-center
      bg-gradient-to-br from-blue-700 to-indigo-900
      text-white font-inter
      p-2 sm:p-3 lg:p-4
    ">
      <div class="
        w-full mx-auto flex flex-col items-center gap-2 mb-2
        flex-shrink-0
      ">
        ${role === 'host' ? `
          <div class="
            w-full flex flex-col sm:flex-row justify-between items-center
            gap-2 py-2 px-3 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-xl
            border border-gray-700
          ">
            <h1 id="hostRoomCode" class="
              text-2xl sm:text-3xl font-extrabold drop-shadow-md
              text-left truncate
              bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500
              cursor-pointer
            ">
              Sala: <span class="text-white">${code}</span>
            </h1>
            <div id="controls" class="flex-grow flex flex-col sm:flex-row justify-end items-center gap-2 w-full sm:w-auto">
              </div>
          </div>
        ` : `
          <h1 id="playerRoomCode" class="
            text-3xl sm:text-4xl lg:text-5xl font-extrabold drop-shadow-lg
            text-center
            bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500
            mb-2 cursor-pointer
          ">
            Sala: <span class="text-white">${code}</span>
          </h1>
          `}
      </div>

      <div id="lastNumberDisplayContainer" class="w-full mx-auto mb-2 flex-shrink-0">
        <div class="flex flex-col sm:flex-row justify-center items-center gap-2 p-3 rounded-lg shadow-2xl bg-gray-800/80 border border-gray-700 animate-fade-in">
          <div class="text-center transform hover:scale-105 transition-transform duration-300">
            <h3 class="text-base sm:text-lg font-bold text-gray-300">Último Número:</h3>
            <div id="currentLastNumber" class="
              text-yellow-400 text-4xl sm:text-5xl lg:text-6xl font-extrabold
              drop-shadow-lg transition-all duration-300 ease-in-out
            ">--</div>
          </div>
          <div class="text-center transform hover:scale-105 transition-transform duration-300">
            <h3 class="text-base sm:text-lg font-bold text-gray-300">Anterior:</h3>
            <div id="previousLastNumber" class="
              text-blue-400 text-2xl sm:text-3xl lg:text-4xl font-bold
              opacity-80 drop-shadow transition-all duration-300 ease-in-out
            ">--</div>
          </div>
        </div>
      </div>

      <div id="bingoBoard" class="w-full mx-auto flex-grow min-h-0 mb-1"></div>

    </div>
  `

  const roomCodeElementId = role === 'host' ? 'hostRoomCode' : 'playerRoomCode'
  const roomCodeElement = document.getElementById(roomCodeElementId)

  if (roomCodeElement) {
    roomCodeElement.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code)
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Código copiado al portapapeles',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        })
      } catch (err) {
        console.error('Error al copiar el texto: ', err)
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: 'No se pudo copiar el código',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        })
      }
    })
  }

  const roomDocRef = doc(db, 'gameRooms', roomResult.id)

  onSnapshot(roomDocRef, (docSnap) => {
    if (!docSnap.exists()) {
      Swal.fire('Sala eliminada', 'El host ha cerrado la sala.', 'info')
      window.location.hash = '#/'
      return
    }

    const updatedRoom = docSnap.data() as GameRoom

    renderBingoBoard(updatedRoom)
    renderLastNumbers(
      updatedRoom,
      document.getElementById('currentLastNumber') as HTMLDivElement,
      document.getElementById('previousLastNumber') as HTMLDivElement
    )

    if (role === 'host') {
      renderBingoControls(updatedRoom)

      if (!app.dataset.hostControlsListenersSetup) {
        setupHostControlsListeners(roomResult.id)
        app.dataset.hostControlsListenersSetup = 'true'
      }
    }
  })
}

async function setupHostControlsListeners(roomId: string) {
  const roomRef = doc(db, 'gameRooms', roomId)
  const dropdownToggle = document.getElementById('dropdownToggleControls') as HTMLButtonElement
  const dropdownMenu = document.getElementById('dropdownMenuControls') as HTMLDivElement
  const resetButton = document.getElementById('resetGameBtnControls') as HTMLButtonElement
  const configButton = document.getElementById('configMaxNumBtnControls') as HTMLButtonElement
  const tombolaButton = document.getElementById('drawTombolaBtnControls') as HTMLButtonElement


  if (!dropdownToggle || !dropdownMenu || !resetButton || !configButton || !tombolaButton) {
    return
  }


  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    if (dropdownMenu.classList.contains('hidden')) {
      dropdownMenu.classList.remove('hidden')
      dropdownMenu.classList.remove('opacity-0', 'scale-95')
      dropdownMenu.classList.add('opacity-100', 'scale-100', 'animate-scale-in')
      dropdownMenu.classList.remove('animate-scale-out')
    } else {
      dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in')
      dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out')
      setTimeout(() => {
          dropdownMenu.classList.add('hidden')
          dropdownMenu.classList.remove('animate-scale-out')
      }, 300)
    }
  })

  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target as Node) && !dropdownToggle.contains(e.target as Node)) {
      if (!dropdownMenu.classList.contains('hidden')) {
        dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in')
        dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out')
        setTimeout(() => {
          dropdownMenu.classList.add('hidden')
          dropdownMenu.classList.remove('animate-scale-out')
        }, 300)
      }
    }
  })

  resetButton.addEventListener('click', async () => {
    if (!dropdownMenu.classList.contains('hidden')) {
      dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in')
      dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out')
      setTimeout(() => dropdownMenu.classList.add('hidden'), 300)
    }

    const snapshot = await getDoc(roomRef)
    const room = snapshot.data() as GameRoom

    if (room.drawnNumbers.length === 0) {
      Swal.fire('Nada que reiniciar', 'Aún no se ha ingresado ningún número.', 'info')
      return
    }

    const confirmed = await Swal.fire({
      title: '¿Reiniciar el juego?',
      text: 'Se eliminarán todos los números sorteados y el juego se reestablecerá.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, reiniciar',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md',
        cancelButton: 'bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md'
      },
      buttonsStyling: false
    })

    if (confirmed.isConfirmed) {
      await updateDoc(roomRef, {
        drawnNumbers: []
      })
      Swal.fire('Juego Reiniciado', 'Todos los números han sido eliminados.', 'success')
    }
  })

  configButton.addEventListener('click', async () => {
    if (!dropdownMenu.classList.contains('hidden')) {
      dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in')
      dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out')
      setTimeout(() => dropdownMenu.classList.add('hidden'), 300)
    }

    const snapshot = await getDoc(roomRef)
    const room = snapshot.data() as GameRoom

    const { value } = await Swal.fire({
      title: 'Configurar Rango de Números',
      html: `
        <p class="text-gray-700 mb-4">Define el número máximo de tu tablero de bingo.</p>
        <input id="swal-input1" class="swal2-input px-4 py-2 rounded-lg text-gray-900 bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Número máximo" type="number" min="10" max="150" value="${room.maxNumber}">
      `,
      focusConfirm: false,
      preConfirm: () => {
        const input = Swal.getPopup()?.querySelector('#swal-input1') as HTMLInputElement
        const val = parseInt(input.value)
        if (isNaN(val) || val < 10 || val > 150) {
          Swal.showValidationMessage('Por favor, ingresa un número entre 10 y 150.')
          return false
        }
        return val
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md',
        cancelButton: 'bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md'
      },
      buttonsStyling: false
    })

    const max = value
    if (max && max !== room.maxNumber) {
      await updateDoc(roomRef, {
        maxNumber: max,
        drawnNumbers: []
      })
      Swal.fire('Rango Actualizado', `El número máximo es ahora ${max}. El juego ha sido reiniciado.`, 'success')
    }
  })

  tombolaButton.addEventListener('click', async () => {
    if (!dropdownMenu.classList.contains('hidden')) {
      dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in')
      dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out')
      setTimeout(() => dropdownMenu.classList.add('hidden'), 300)
    }

    const snapshot = await getDoc(roomRef)
    const room = snapshot.data() as GameRoom

    const remaining = Array.from({ length: room.maxNumber }, (_, i) => i + 1)
      .filter(n => !room.drawnNumbers.includes(n))

    if (remaining.length === 0) {
      Swal.fire('¡Juego Terminado!', 'No quedan números por sortear. ¡Felicidades a los ganadores!', 'info')
      return
    }

    const random = remaining[Math.floor(Math.random() * remaining.length)]
    await updateDoc(roomRef, {
      drawnNumbers: [...room.drawnNumbers, random]
    })

    Swal.fire({
      title: `¡Número Sorteado!`,
      text: `El número ${random} ha sido sorteado.`,
      icon: 'success',
      showConfirmButton: false,
      timer: 1500,
      customClass: {
        popup: 'bg-gradient-to-br from-green-400 to-green-600 text-white animate-fade-in-up',
        title: 'text-white text-3xl font-bold',
        htmlContainer: 'text-white text-2xl'
      },
      didOpen: () => {
        Swal.getPopup()?.querySelector('.swal2-icon')?.classList.add('hidden')
      }
    })
  })
}