export function HomePage() {
  const root = document.querySelector('#app')!
  root.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      <!-- Neon Background Effects -->
      <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-glow"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] animate-pulse-glow" style="animation-delay: 1s"></div>

      <div class="glass-card rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center relative z-10 animate-slide-up">
        
        <div class="mb-8 relative inline-block">
          <i class="fa-solid fa-dice text-6xl text-neon-blue absolute -top-6 -left-8 animate-float" style="animation-delay: 0s"></i>
          <h1 class="text-6xl sm:text-7xl font-outfit font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue drop-shadow-[0_0_15px_rgba(255,0,85,0.5)]">
            BINGO
          </h1>
          <i class="fa-solid fa-gem text-5xl text-neon-pink absolute -bottom-4 -right-8 animate-float" style="animation-delay: 1.5s"></i>
        </div>

        <p class="text-lg sm:text-xl font-inter text-gray-300 mb-10 opacity-90">
          ¡Tu experiencia multijugador premium!
        </p>
        
        <div class="flex flex-col gap-5">
          <button id="createBtn" class="
            group relative w-full bg-transparent border-2 border-neon-purple text-white font-bold py-4 px-8 rounded-xl
            transition-all duration-300 ease-in-out hover:bg-neon-purple/20 hover:shadow-[0_0_20px_rgba(176,38,255,0.6)]
            focus:outline-none focus:ring-4 focus:ring-neon-purple/50 overflow-hidden
          ">
            <div class="flex items-center justify-center gap-3">
              <i class="fa-solid fa-plus-circle text-xl text-neon-purple group-hover:text-white transition-colors"></i>
              <span class="text-lg tracking-wide">Crear Sala</span>
            </div>
          </button>
          
          <button id="joinBtn" class="
            group relative w-full bg-transparent border-2 border-neon-blue text-white font-bold py-4 px-8 rounded-xl
            transition-all duration-300 ease-in-out hover:bg-neon-blue/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.6)]
            focus:outline-none focus:ring-4 focus:ring-neon-blue/50 overflow-hidden
          ">
            <div class="flex items-center justify-center gap-3">
              <i class="fa-solid fa-sign-in-alt text-xl text-neon-blue group-hover:text-white transition-colors"></i>
              <span class="text-lg tracking-wide">Unirse a Sala</span>
            </div>
          </button>
        </div>
      </div>
      
      <div class="mt-8 text-gray-500 font-inter text-sm flex items-center gap-2 animate-slide-up" style="animation-delay: 0.2s">
        <i class="fa-solid fa-shield-halved"></i>
        <span>Conexión Segura</span>
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