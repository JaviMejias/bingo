import { createGameRoom } from '../services/gameManager'

export async function renderCreateGame() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div class="
      flex flex-col items-center justify-center min-h-screen 
      bg-gradient-to-br from-purple-600 to-indigo-800 text-white font-inter p-4 sm:p-6 lg:p-8 text-center">
      <h1 class="
        text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 sm:mb-8 drop-shadow-lg">
        Crear Nueva Sala de Bingo
      </h1>
      
      <p class="
        text-lg sm:text-xl mb-6 opacity-90">
        Estamos preparando tu sala de juego, ¡un momento por favor!
      </p>
      
      <div id="roomCode" class="
        text-5xl sm:text-6xl lg:text-7xl font-black bg-white text-indigo-700 rounded-2xl px-8 py-4 shadow-2xl mb-8 animate-pulse                                     tracking-wide                                     min-w-[200px] flex items-center justify-center    ">
        ---
      </div>
      
      <button id="goToRoomBtn" class="
        bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-xl hover:scale-105 transition duration-300 ease-in-out hidden focus:outline-none focus:ring-4 focus:ring-green-300 ">
        ¡Entrar a la Sala!
      </button>
    </div>
  `

  const codeElement = document.getElementById('roomCode') as HTMLDivElement
  const goToRoomBtn = document.getElementById('goToRoomBtn') as HTMLButtonElement

  try {
    const room = await createGameRoom()

    codeElement.textContent = room.code
    goToRoomBtn.classList.remove('hidden')

    goToRoomBtn.addEventListener('click', () => {
      window.location.hash = `#/room/${room.code}?role=host`
    })
  } catch (error) {
    codeElement.textContent = 'Error al crear sala'
    codeElement.classList.remove('animate-pulse', 'text-indigo-700')
    codeElement.classList.add('bg-red-500', 'text-white')
    goToRoomBtn.classList.add('hidden')
    console.error('Error creando la sala:', error)
  }
}