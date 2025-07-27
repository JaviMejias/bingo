export function HomePage() {
  const root = document.querySelector('#app')!
  root.innerHTML = `
    <div class="
      min-h-screen flex flex-col items-center justify-center 
      bg-gradient-to-br from-purple-800 to-blue-900     
      text-white font-inter p-4 sm:p-6 lg:p-8
    ">
      <div class="
        flex flex-col items-center justify-center gap-8 
        bg-white/10 backdrop-blur-sm rounded-xl 
        shadow-2xl p-8 sm:p-10 lg:p-12 max-w-lg w-full text-center
        border border-white/20
      ">
        <h1 class="
          text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-4 
          drop-shadow-lg text-yellow-300
        ">
          🎉 Bingo 🎉
        </h1>
        <p class="text-xl sm:text-2xl font-semibold mb-6 opacity-90">
          ¡Tu diversión multijugador empieza aquí!
        </p>
        
        <button id="createBtn" class="
          w-full sm:w-auto bg-green-600 hover:bg-green-700 
          text-white font-bold py-3 px-8 rounded-full shadow-lg
          transition-all duration-300 ease-in-out transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-green-400 focus:ring-opacity-75
        ">
          Crear Nuevo Juego
        </button>
        
        <button id="joinBtn" class="
          w-full sm:w-auto bg-blue-600 hover:bg-blue-700 
          text-white font-bold py-3 px-8 rounded-full shadow-lg
          transition-all duration-300 ease-in-out transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-75
        ">
          Unirse a un Juego Existente
        </button>
      </div>
    </div>
  `
  document.getElementById('createBtn')?.addEventListener('click', () => {
    window.location.hash = '#/create'
  })
  document.getElementById('joinBtn')?.addEventListener('click', () => {
    window.location.hash = '#/join'
  })
}