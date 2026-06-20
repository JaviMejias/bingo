import { socket } from '../services/socket'
import Swal from 'sweetalert2'

async function findRoomByCode(code: string): Promise<any> {
  return new Promise((resolve) => {
    socket.emit('joinRoom', code, (response: any) => {
      if (response && response.success) {
        resolve(response.room)
      } else {
        resolve(null)
      }
    })
  })
}

export function renderJoinGame() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div class="absolute top-[-10%] right-[-10%] w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] animate-pulse-glow"></div>
      <div class="absolute bottom-[10%] left-[-10%] w-96 h-96 bg-neon-green/10 rounded-full blur-[120px] animate-pulse-glow" style="animation-delay: 2s"></div>

      <div class="glass-card rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center relative z-10 animate-slide-up">
        
        <div class="mb-6 relative inline-block">
          <i class="fa-solid fa-users text-5xl text-neon-blue absolute -top-5 -right-10 animate-float" style="animation-delay: 0s"></i>
          <h1 class="text-4xl sm:text-5xl font-outfit font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-green drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]">
            Acceso a Sala
          </h1>
        </div>
        
        <p class="text-lg font-inter text-gray-300 mb-8 opacity-90">
          Ingresa el código para unirte.
        </p>

        <div class="relative mb-8">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <i class="fa-solid fa-key text-gray-500"></i>
          </div>
          <input
            type="text"
            id="gameCodeInput"
            placeholder="EJ: ABC123DEF"
            maxlength="10"
            class="
              w-full bg-gray-900/50 border-2 border-gray-700 text-white text-center text-2xl font-black tracking-widest
              rounded-xl px-10 py-4 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue
              transition-all duration-300 placeholder-gray-600 uppercase
            "
          />
        </div>
        
        <button id="joinRoomBtn" class="
          group relative w-full bg-gradient-to-r from-neon-blue to-neon-green text-gray-900 font-bold py-4 px-8 rounded-xl
          transition-all duration-300 ease-in-out hover:shadow-[0_0_20px_rgba(0,240,255,0.6)]
          focus:outline-none focus:ring-4 focus:ring-neon-blue/50 overflow-hidden transform hover:scale-105
        ">
          <div class="flex items-center justify-center gap-3 relative z-10">
            <span class="text-lg tracking-wide">Ingresar</span>
            <i class="fa-solid fa-rocket group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
          </div>
        </button>
      </div>
      
      <button onclick="window.location.hash='#/'" class="mt-8 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        <i class="fa-solid fa-arrow-left"></i> Volver al inicio
      </button>
    </div>
  `

  const joinBtn = document.getElementById('joinRoomBtn') as HTMLButtonElement
  const input = document.getElementById('gameCodeInput') as HTMLInputElement

  joinBtn.addEventListener('click', async () => {
    const code = input.value.trim().toUpperCase()

    if (!code) {
      Swal.fire({
        title: 'Código Requerido',
        text: 'Por favor, ingresa el código de la sala.',
        icon: 'warning',
        background: '#111827',
        color: '#fff',
        confirmButtonColor: '#b026ff',
      })
      return
    }

    const room = await findRoomByCode(code)

    if (!room) {
      Swal.fire({
        title: 'Sala No Encontrada',
        text: 'No se encontró ninguna sala con ese código.',
        icon: 'error',
        background: '#111827',
        color: '#fff',
        confirmButtonColor: '#ff0055',
      })
      return
    }

    window.location.hash = `#/room/${code}?role=player`
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      joinBtn.click();
    }
  });
}