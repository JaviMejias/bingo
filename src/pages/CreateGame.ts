import { createGameRoom } from '../services/gameManager'

export async function renderCreateGame() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      <!-- Neon Background Effects -->
      <div class="absolute top-[-10%] left-[20%] w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-glow"></div>
      <div class="absolute bottom-[-10%] right-[20%] w-96 h-96 bg-neon-pink/20 rounded-full blur-[120px] animate-pulse-glow" style="animation-delay: 1.5s"></div>

      <div class="glass-card rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center relative z-10 animate-slide-up">
        
        <div class="mb-6 relative inline-block">
          <i class="fa-solid fa-crown text-5xl text-neon-pink absolute -top-5 -left-8 animate-float" style="animation-delay: 0s"></i>
          <h1 class="text-4xl sm:text-5xl font-outfit font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-pink drop-shadow-[0_0_10px_rgba(255,0,85,0.3)]">
            Sala
          </h1>
        </div>
        
        <p class="text-lg font-inter text-gray-300 mb-8 opacity-90">
          Generando acceso exclusivo...
        </p>
        
        <div class="relative group mx-auto max-w-[250px] mb-10">
          <div class="absolute -inset-1 bg-gradient-to-r from-neon-purple to-neon-blue rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse-glow"></div>
          <div id="roomCode" class="relative text-5xl sm:text-6xl font-black bg-gray-900 text-white border border-gray-700 rounded-2xl px-6 py-5 shadow-2xl tracking-widest min-w-[200px] flex items-center justify-center animate-pulse">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-neon-blue"></i>
          </div>
        </div>
        
        <button id="goToRoomBtn" class="
          group relative w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold py-4 px-8 rounded-xl
          transition-all duration-300 ease-in-out hover:shadow-[0_0_20px_rgba(176,38,255,0.6)]
          focus:outline-none focus:ring-4 focus:ring-neon-purple/50 overflow-hidden
          hidden transform hover:scale-105
        ">
          <div class="flex items-center justify-center gap-3 relative z-10">
            <span class="text-lg tracking-wide">¡Entrar a la Sala!</span>
            <i class="fa-solid fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
          </div>
        </button>
      </div>
      
      <button onclick="window.location.hash='#/'" class="mt-8 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        <i class="fa-solid fa-arrow-left"></i> Volver al inicio
      </button>
    </div>
  `

  const codeElement = document.getElementById('roomCode') as HTMLDivElement
  const goToRoomBtn = document.getElementById('goToRoomBtn') as HTMLButtonElement

  try {
    const room = await createGameRoom()

    codeElement.classList.remove('animate-pulse')
    codeElement.innerHTML = `<span class="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">${room.code}</span>`
    goToRoomBtn.classList.remove('hidden')

    goToRoomBtn.addEventListener('click', () => {
      window.location.hash = `#/room/${room.code}?role=host`
    })
  } catch (error) {
    codeElement.innerHTML = '<span class="text-3xl text-neon-pink">Error</span>'
    codeElement.classList.remove('animate-pulse')
    console.error('Error creando la sala:', error)
  }
}