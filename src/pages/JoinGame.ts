import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import Swal from 'sweetalert2'

async function findRoomByCode(code: string) {
  const roomsRef = collection(db, 'gameRooms')
  const q = query(roomsRef, where('code', '==', code))
  const snapshot = await getDocs(q)

  if (!snapshot.empty) {
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  return null
}

export function renderJoinGame() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div class="
      min-h-screen flex flex-col items-center justify-center 
      bg-gradient-to-br from-indigo-700 to-purple-900 
      text-white font-inter p-4 sm:p-6 lg:p-8
    ">
      <div class="
        flex flex-col items-center justify-center gap-8 
        bg-white/10 backdrop-blur-sm rounded-xl 
        shadow-2xl p-8 sm:p-10 lg:p-12 max-w-lg w-full text-center
        border border-white/20
      ">
        <h1 class="
          text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 
          drop-shadow-lg text-teal-300
        ">
          ¡Únete a la Diversión!
        </h1>
        
        <p class="text-lg sm:text-xl font-medium mb-4 opacity-90">
          Ingresa el código de la sala para empezar a jugar.
        </p>

        <input
          type="text"
          id="gameCodeInput"
          placeholder="Ej: ABC123DEF"
          maxlength="10"
          class="
            text-gray-900 px-6 py-3 rounded-lg mb-4 
            w-full max-w-xs text-center text-xl font-semibold uppercase 
            bg-gray-100 border border-gray-300
            focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-75
            transition duration-200 ease-in-out
          "
        />
        <button id="joinRoomBtn" class="
          bg-blue-600 hover:bg-blue-700 
          text-white font-bold py-3 px-8 rounded-full shadow-lg
          transition-all duration-300 ease-in-out transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-75
        ">
          Unirse a la Sala
        </button>
      </div>
    </div>
  `

  const joinBtn = document.getElementById('joinRoomBtn') as HTMLButtonElement
  const input = document.getElementById('gameCodeInput') as HTMLInputElement

  joinBtn.addEventListener('click', async () => {
    const code = input.value.trim().toUpperCase()

    if (!code) {
      Swal.fire({
        title: 'Código Requerido',
        text: 'Por favor, ingresa el código de la sala para unirte.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md',
        },
        buttonsStyling: false
      })
      return
    }

    const room = await findRoomByCode(code)

    if (!room) {
      Swal.fire({
        title: 'Sala No Encontrada',
        text: 'No se encontró ninguna sala activa con ese código. Verifica el código e inténtalo de nuevo.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
        customClass: {
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md',
        },
        buttonsStyling: false
      })
      return
    }

    window.location.hash = `#/room/${code}?role=player`
  })

  // Optional: Allow pressing Enter to join
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      joinBtn.click();
    }
  });
}