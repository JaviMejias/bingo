import { socket, authReady } from '../services/socket'
import Swal from 'sweetalert2'
import type { GameRoom } from '../types/game'
import { renderBingoControls } from '../components/BingoControls'
import { renderBingoBoard } from '../components/BingoBoard'
import { renderLastNumbers } from '../components/LastNumbers'
import confetti from 'canvas-confetti'

async function findRoomByCode(code: string): Promise<{ id: string, data: GameRoom } | null> {
  return new Promise((resolve) => {
    socket.emit('joinRoom', code, (response: any) => {
      if (response && response.success) {
        resolve({ id: response.room.id, data: response.room })
      } else {
        resolve(null)
      }
    })
  })
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

  let playerName = ''
  if (role === 'player') {
    playerName = sessionStorage.getItem(`bingo_player_name_${roomData.id}`) || ''
    if (!playerName) {
      const { value: name } = await Swal.fire({
        title: 'Ingresa tu nombre',
        input: 'text',
        inputPlaceholder: 'Ej. Tía Marta',
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: '#111827',
        color: '#fff',
        confirmButtonColor: '#b026ff',
        inputValidator: (val) => {
          if (!val) return '¡Necesitas un nombre para jugar!'
          return null
        }
      })
      if (name) {
        playerName = name
        sessionStorage.setItem(`bingo_player_name_${roomData.id}`, name)
      } else {
        window.location.hash = '#/'
        return
      }
    }
  }

  app.innerHTML = `
    <div class="h-screen max-h-screen w-full flex flex-col bg-[#050510] text-white font-inter p-2 relative overflow-hidden">
      
      <!-- Neon Orbs -->
      <div class="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div class="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      <!-- Header Mejorado -->
      <div class="w-full mx-auto flex-shrink-0 z-50 animate-slide-up mb-2 relative">
        <div class="glass-card rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-6 border-l-4 border-l-neon-purple shadow-xl relative">
          
          <!-- Izquierda: Controles (Inputs y Buscar) -->
          <div id="controls-left" class="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-start z-10">
            ${role === 'player' ? `
              <button id="playerBingoBtn" class="hidden bg-red-600 hover:bg-red-500 text-white font-black text-xl sm:text-2xl py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.8)] border-4 border-red-400 animate-pulse transform hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-2">
                <i class="fas fa-bullhorn animate-bounce"></i> ¡BINGO!
              </button>
            ` : ''}
          </div>

          <!-- Centro: Últimos Números -->
          <div class="w-full lg:w-auto flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 z-10">
            <div class="flex items-center gap-4 bg-gray-900/60 rounded-xl px-5 sm:px-6 py-2 border border-gray-700 shadow-inner">
              <div class="flex items-center gap-2">
                <span class="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Ant:</span>
                <span id="previousLastNumber" class="text-xl sm:text-2xl font-outfit font-bold text-gray-400 w-8 text-center">--</span>
              </div>
              <div class="w-px h-6 sm:h-8 bg-gray-700"></div>
              <div class="flex items-center gap-3 group relative">
                <div class="absolute inset-0 bg-neon-blue/10 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span class="text-[10px] sm:text-xs font-bold text-neon-blue uppercase tracking-widest flex items-center">
                  <i class="fa-solid fa-bolt mr-1"></i>Último:
                </span>
                <span id="currentLastNumber" class="text-3xl sm:text-5xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neon-blue drop-shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all duration-300 transform scale-100 relative z-10 w-12 sm:w-16 text-center">
                  --
                </span>
              </div>
            </div>
          </div>
          
          <!-- Derecha: Código y Dropdown -->
          <div class="flex items-center justify-center lg:justify-end gap-4 flex-shrink-0 w-full lg:w-auto z-10">
            <div class="text-center lg:text-right">
              <p class="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-bold">Código Sala</p>
              <h1 id="roomCodeDisplay" class="text-2xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 cursor-pointer hover:from-neon-blue hover:to-neon-purple transition-all" title="Copiar código">
                ${code}
              </h1>
            </div>
            <div id="controls-right" class="relative z-50"></div>
          </div>
        </div>
      </div>

      <!-- Main Content: Board & Sidebar -->
      <div class="flex-grow min-h-0 w-full relative z-10 flex gap-4 transition-all duration-500">
        <div id="bingoBoard" class="glass-card rounded-xl w-full h-full p-2 border border-gray-800 flex flex-col justify-center flex-grow transition-all duration-500"></div>

        <!-- Host Validation Sidebar -->
        ${role === 'host' ? `
          <div id="hostBingoSidebar" class="w-0 flex-shrink-0 transition-all duration-500 overflow-hidden flex flex-col gap-2 rounded-xl border-none">
            <div class="glass-card bg-gray-900 border border-neon-green rounded-xl flex-grow flex flex-col w-72 sm:w-80 shadow-[0_0_30px_rgba(57,255,20,0.2)] overflow-hidden">
              <div class="bg-neon-green/20 p-3 border-b border-neon-green flex items-center justify-center flex-shrink-0">
                <h3 class="text-neon-green font-black tracking-widest flex items-center gap-2 text-sm sm:text-base animate-pulse">
                  <i class="fas fa-exclamation-triangle"></i> ¡BINGO CANTADO!
                </h3>
              </div>
              <div id="hostBingoCallersList" class="flex-grow overflow-y-auto space-y-3 p-3 scrollbar-thin scrollbar-thumb-neon-green scrollbar-track-transparent">
              </div>
            </div>
          </div>
        ` : ''}
    </div>
  `

  const roomCodeElement = document.getElementById('roomCodeDisplay')
  if (roomCodeElement) {
    roomCodeElement.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code)
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = code;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success', title: 'Código copiado',
          showConfirmButton: false, timer: 1500, background: '#111827', color: '#fff'
        })
      } catch (err) {
        console.error('Failed to copy', err)
      }
    })
  }

  const playerBingoBtn = document.getElementById('playerBingoBtn')
  if (playerBingoBtn) {
    playerBingoBtn.addEventListener('click', async () => {
      const result = await Swal.fire({
        title: '¿Cantar BINGO?',
        text: '¡Asegúrate de que tus números coincidan!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '¡Sí, BINGO!',
        cancelButtonText: 'Cancelar',
        background: '#111827',
        color: '#fff'
      })

      if (result.isConfirmed) {
        socket.emit('addBingoCaller', roomData.id, playerName)
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          title: '¡Bingo Enviado!',
          text: 'Esperando que el anfitrión lo valide...',
          icon: 'success',
          showConfirmButton: false,
          background: '#111827',
          color: '#fff'
        })
      }
    })
  }

  let localInRevision = new Set<string>();
  let localValidated = new Map<string, string>(); // name -> 'binguito' | 'carton'
  let currentBingoCallers: string[] = [];
  let renderCallersList: () => void = () => {};

  if (role === 'host') {
    const callersListDiv = document.getElementById('hostBingoCallersList');

    renderCallersList = () => {
      if (!callersListDiv) return;
      callersListDiv.innerHTML = currentBingoCallers.map(name => {
        const inRevision = localInRevision.has(name);
        const validatedType = localValidated.get(name);
        
        const isBinguitoVal = validatedType === 'binguito';
        const isCartonVal = validatedType === 'carton';
        
        let borderClass = 'border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.2)]';
        let iconClass = 'fa-bullhorn text-neon-green';
        let bgClass = 'bg-gray-800/50';
        
        if (isBinguitoVal) {
          borderClass = 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]';
          iconClass = 'fa-check-double text-emerald-400';
          bgClass = 'bg-emerald-900/40';
        } else if (isCartonVal) {
          borderClass = 'border-neon-blue shadow-[0_0_15px_rgba(0,240,255,0.6)]';
          iconClass = 'fa-trophy text-neon-blue';
          bgClass = 'bg-blue-900/40';
        }

        return `
        <div id="caller-card-${name}" data-card-name="${name}" class="glass-card ${bgClass} rounded-xl p-3 border-l-4 ${borderClass} flex flex-col gap-2 relative overflow-hidden transition-all duration-500 transform scale-100 cursor-pointer hover:brightness-125">
          ${inRevision ? `
          <div class="snake-container rounded-xl">
            <span></span><span></span><span></span><span></span>
          </div>
          ` : ''}
          <div class="font-bold text-white text-base sm:text-lg flex items-center justify-between pointer-events-none">
            <div class="flex items-center gap-2">
              <i class="fas ${iconClass} animate-pulse"></i> ${name}
            </div>
            ${!validatedType ? `
            <span class="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full transition-colors ${inRevision ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800 text-gray-400'}">
              <i class="fas ${inRevision ? 'fa-eye' : 'fa-search'}"></i> ${inRevision ? 'Revisando' : 'Revisar'}
            </span>
            ` : ''}
          </div>
          <div class="flex flex-col gap-2 mt-2 relative z-10">
            <button data-type="binguito" data-name="${name}" class="flex items-center justify-between w-full ${isBinguitoVal ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40'} border border-emerald-500/50 py-1.5 px-3 rounded-lg transition-colors group">
              <span class="text-sm font-bold pointer-events-none">${isBinguitoVal ? 'Confirmar Premio' : 'Binguito'}</span>
              <i class="fas fa-check-double group-hover:scale-125 transition-transform pointer-events-none"></i>
            </button>
            <button data-type="carton" data-name="${name}" class="flex items-center justify-between w-full ${isCartonVal ? 'bg-neon-blue text-white shadow-[0_0_10px_rgba(0,240,255,0.8)]' : 'bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/40'} border border-neon-blue/50 py-1.5 px-3 rounded-lg transition-colors group">
              <span class="text-sm font-bold pointer-events-none">${isCartonVal ? 'Confirmar Premio' : 'Cartón Lleno'}</span>
              <i class="fas fa-trophy group-hover:scale-125 transition-transform pointer-events-none"></i>
            </button>
            <button data-type="falsa" data-name="${name}" class="flex items-center justify-between w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 py-1.5 px-3 rounded-lg transition-colors group">
              <span class="text-sm font-bold pointer-events-none">Falsa Alarma</span>
              <i class="fas fa-times group-hover:scale-125 transition-transform pointer-events-none"></i>
            </button>
          </div>
        </div>
        `
      }).join('');
    };

    callersListDiv?.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest('button');
      
      // Card click (Revision Toggle)
      if (!btn) {
        const cardElem = (e.target as HTMLElement).closest('[data-card-name]');
        if (cardElem) {
          const name = (cardElem as HTMLElement).dataset.cardName;
          if (name) {
            if (localInRevision.has(name)) localInRevision.delete(name);
            else localInRevision.add(name);
            renderCallersList();
          }
        }
        return;
      }

      const type = btn.dataset.type;
      const name = btn.dataset.name;
      if (!type || !name) return;

      const card = document.getElementById(`caller-card-${name}`);

      if (type === 'falsa') {
        if (card) card.classList.add('animate-lose');
        setTimeout(() => {
          localInRevision.delete(name);
          localValidated.delete(name);
          socket.emit('removeBingoCaller', roomData.id, name);
        }, 500);
        return;
      }

      if (type === 'binguito' || type === 'carton') {
        const currentValidated = localValidated.get(name);
        if (currentValidated !== type) {
          // First click: Validate
          localValidated.set(name, type);
          localInRevision.delete(name);
          renderCallersList();
        } else {
          // Second click: Confirm and Save
          if (card) card.classList.add('animate-win');
          setTimeout(() => {
            const winType = type === 'binguito' ? 'Binguito' : 'Cartón Lleno';
            const newWinner = {
              id: Math.random().toString(36).substr(2, 9),
              name,
              date: Date.now(),
              type: winType
            };
            
            localInRevision.clear();
            localValidated.clear();
            
            socket.emit('addWinner', roomData.id, newWinner);
            Swal.fire({ toast: true, position: 'top-end', title: `${name} guardado en historial`, icon: 'success', background: '#111827', color: '#fff', showConfirmButton: false, timer: 3000 });
          }, 500);
        }
      }
    });
  }

  let previousDrawnCount = -1;
  let previousMaxNumber = -1;
  let wasTombolaActive = false;
  let initialLoad = true;
  let processedWinners = new Set<string>();

  // Initial render
  renderBingoBoard(roomData, role === 'host');
  renderLastNumbers(
    roomData,
    document.getElementById('currentLastNumber') as HTMLDivElement,
    document.getElementById('previousLastNumber') as HTMLDivElement
  );
  if (role === 'host') {
    renderBingoControls(roomData);
    if (!app.dataset.hostControlsListenersSetup) {
      setupHostControlsListeners(roomData);
      app.dataset.hostControlsListenersSetup = 'true';
    }
  }

  socket.on('roomDeleted', () => {
    Swal.fire({ title: 'Sala eliminada', text: 'El host ha cerrado la sala.', icon: 'info', background: '#111827', color: '#fff' })
    window.location.hash = '#/'
  });

  socket.on('roomUpdated', (updatedRoom: GameRoom) => {
    
    if (updatedRoom.winnersHistory && updatedRoom.winnersHistory.length > 0) {
      updatedRoom.winnersHistory.forEach(w => {
        if (!processedWinners.has(w.id)) {
          processedWinners.add(w.id);
          if (!initialLoad && role === 'player' && w.name === playerName) {
            Swal.fire({
              title: '¡FELICIDADES!',
              html: `<p class="text-xl">¡Tu cartón fue validado y ganaste el premio de <strong>${w.type}</strong>!</p>`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/5434/5434449.png',
              imageWidth: 100,
              background: '#111827',
              color: '#fff',
              confirmButtonColor: '#b026ff',
              confirmButtonText: '¡Increíble!',
              backdrop: `rgba(0,0,0,0.8)`
            });
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
            function randomInRange(min: number, max: number) { return Math.random() * (max - min) + min; }
            const interval: any = setInterval(function() {
              const timeLeft = animationEnd - Date.now();
              if (timeLeft <= 0) return clearInterval(interval);
              const particleCount = 50 * (timeLeft / duration);
              confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
              confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
          }
        }
      });
    }
    
    initialLoad = false;

    if (updatedRoom.bingoCallers && updatedRoom.bingoCallers.length > 0) {
      if (role === 'host') {
        const sidebar = document.getElementById('hostBingoSidebar');
        if (sidebar) {
          sidebar.classList.remove('w-0');
          sidebar.classList.add('w-72', 'sm:w-80');
          
          // Re-render callers list using the new data
          const callersListDiv = document.getElementById('hostBingoCallersList');
          if (callersListDiv) {
            // @ts-ignore
            currentBingoCallers = updatedRoom.bingoCallers;
            // @ts-ignore
            renderCallersList();
          }
        }
      } else {
        if (!updatedRoom.bingoCallers.includes(playerName)) {
          const currentSwalTitle = Swal.getTitle()?.textContent;
          if (currentSwalTitle !== '¿Cantar BINGO?' && currentSwalTitle !== '¡Bingo Enviado!') {
            Swal.fire({
              toast: true,
              position: 'bottom-end',
              title: '¡Alguien cantó Bingo!',
              text: 'Esperando validación del anfitrión...',
              icon: 'info',
              showConfirmButton: false,
              background: '#111827',
              color: '#fff'
            });
          }
        }
      }
    } else {
      if (role === 'host') {
        const sidebar = document.getElementById('hostBingoSidebar');
        if (sidebar) {
          sidebar.classList.remove('w-72', 'sm:w-80');
          sidebar.classList.add('w-0');
        }
      } else if (role === 'player') {
        const title = Swal.getTitle()?.textContent;
        if (title === '¡Bingo Enviado!' || title === '¡Alguien cantó Bingo!') {
          Swal.close()
        }
      }
    }

    if (playerBingoBtn) {
      if (updatedRoom.drawnNumbers.length >= 4) {
        playerBingoBtn.classList.remove('hidden');
      } else {
        playerBingoBtn.classList.add('hidden');
      }
    }

    if (updatedRoom.tombolaActive && updatedRoom.tombolaTarget) {
      renderTombolaOverlay(updatedRoom.maxNumber);
      wasTombolaActive = true;
    } else if (wasTombolaActive && !updatedRoom.tombolaActive) {
      wasTombolaActive = false;
      const winningNumber = updatedRoom.drawnNumbers[updatedRoom.drawnNumbers.length - 1];
      stopTombolaAndShowWinner(winningNumber);
    }

    if (previousDrawnCount !== -1 && updatedRoom.drawnNumbers.length > previousDrawnCount && !wasTombolaActive) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.3 },
        colors: ['#b026ff', '#00f0ff', '#ff0055', '#39ff14'],
        zIndex: 9999
      });

      const currNumEl = document.getElementById('currentLastNumber');
      if (currNumEl) {
        currNumEl.classList.remove('scale-100');
        currNumEl.classList.add('scale-125', 'text-white');
        setTimeout(() => {
          currNumEl.classList.remove('scale-125', 'text-white');
          currNumEl.classList.add('scale-100');
        }, 300);
      }
    }

    const isReset = (previousMaxNumber !== -1 && updatedRoom.maxNumber !== previousMaxNumber) ||
      (previousDrawnCount > 0 && updatedRoom.drawnNumbers.length === 0);

    previousDrawnCount = updatedRoom.drawnNumbers.length;
    previousMaxNumber = updatedRoom.maxNumber;

    if (isReset) {
      const boardContainer = document.getElementById('bingoBoard');
      if (boardContainer) {
        boardContainer.classList.add('animate-shatter');

        setTimeout(() => {
          renderBingoBoard(updatedRoom, role === 'host');
          renderLastNumbers(
            updatedRoom,
            document.getElementById('currentLastNumber') as HTMLDivElement,
            document.getElementById('previousLastNumber') as HTMLDivElement
          );
          boardContainer.classList.remove('animate-shatter');

          const boardGrid = document.querySelector('#bingoBoard .grid');
          if (boardGrid) {
            boardGrid.classList.add('animate-rebuild');
          }

          if (role === 'host') {
            renderBingoControls(updatedRoom);
            if (!app.dataset.hostControlsListenersSetup) {
              setupHostControlsListeners(roomData);
              app.dataset.hostControlsListenersSetup = 'true';
            }
          }
        }, 500);
        return;
      }
    }

    renderBingoBoard(updatedRoom, role === 'host')
    renderLastNumbers(
      updatedRoom,
      document.getElementById('currentLastNumber') as HTMLDivElement,
      document.getElementById('previousLastNumber') as HTMLDivElement
    )

    if (role === 'host') {
      renderBingoControls(updatedRoom)

      if (!app.dataset.hostControlsListenersSetup) {
        setupHostControlsListeners(roomData)
        app.dataset.hostControlsListenersSetup = 'true'
      }
    }
  })
}

function renderTombolaOverlay(maxNumber: number) {
  let overlay = document.getElementById('tombola-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tombola-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center opacity-0 transition-opacity duration-300';

    const container = document.createElement('div');
    container.className = 'relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-neon-purple shadow-[0_0_50px_rgba(176,38,255,0.8)] flex items-center justify-center bg-gray-900 overflow-hidden';

    const numberDisplay = document.createElement('div');
    numberDisplay.id = 'tombola-number-display';
    numberDisplay.className = 'text-7xl sm:text-9xl font-black font-outfit text-transparent bg-clip-text bg-gradient-to-b from-white to-neon-blue drop-shadow-md';
    numberDisplay.innerText = '0';

    container.appendChild(numberDisplay);
    overlay.appendChild(container);

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay!.style.opacity = '1';
    });

    const interval = setInterval(() => {
      const display = document.getElementById('tombola-number-display');
      if (display) {
        display.innerText = Math.floor(Math.random() * maxNumber + 1).toString();
      }
    }, 50);

    overlay.dataset.intervalId = interval.toString();
  }
}

function stopTombolaAndShowWinner(winner: number) {
  const overlay = document.getElementById('tombola-overlay');
  if (overlay) {
    if (overlay.dataset.intervalId) clearInterval(parseInt(overlay.dataset.intervalId));

    const display = document.getElementById('tombola-number-display');
    if (display) {
      display.innerText = winner.toString();
      display.className = 'text-[8rem] sm:text-[11rem] font-black font-outfit text-white drop-shadow-[0_0_30px_rgba(57,255,20,1)] scale-125 transition-all duration-300';
    }

    const container = display?.parentElement;
    if (container) {
      container.className = 'relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-neon-green shadow-[0_0_80px_rgba(57,255,20,1)] flex items-center justify-center bg-gray-900 overflow-hidden transition-all duration-300 scale-110';
    }

    confetti({
      particleCount: 200, spread: 120, origin: { y: 0.4 }, colors: ['#39ff14', '#ffffff', '#00f0ff'], zIndex: 10000
    });

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }, 3000);
  }
}

function closeDropdownMenu() {
  const dropdownMenu = document.getElementById('dropdownMenuControls')
  if (dropdownMenu && !dropdownMenu.classList.contains('pointer-events-none')) {
    dropdownMenu.classList.remove('opacity-100', 'scale-100')
    dropdownMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none')
  }
}

async function setupHostControlsListeners(roomData: GameRoom) {
  
  const dropdownToggle = document.getElementById('dropdownToggleControls') as HTMLButtonElement
  const dropdownMenu = document.getElementById('dropdownMenuControls') as HTMLDivElement
  const resetButton = document.getElementById('resetGameBtnControls') as HTMLButtonElement
  const configButton = document.getElementById('configMaxNumBtnControls') as HTMLButtonElement
  const toggleModeBtnControls = document.getElementById('toggleModeBtnControls') as HTMLButtonElement
  const winnersHistoryBtn = document.getElementById('winnersHistoryBtnControls') as HTMLButtonElement

  const getLatestRoom = async () => {
    return new Promise<GameRoom>((resolve) => {
      socket.emit('joinRoomById', roomData.id, (response: any) => {
        resolve(response.room || roomData)
      })
    })
  }

  if (!dropdownToggle || !dropdownMenu || !resetButton || !configButton) return

  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    const isClosed = dropdownMenu.classList.contains('pointer-events-none')
    if (isClosed) {
      dropdownMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none')
      dropdownMenu.classList.add('opacity-100', 'scale-100')
    } else {
      closeDropdownMenu()
    }
  })

  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target as Node) && !dropdownToggle.contains(e.target as Node)) {
      closeDropdownMenu()
    }
  })

  resetButton.addEventListener('click', async () => {
    closeDropdownMenu()
    const room = await getLatestRoom()
    if (room.drawnNumbers.length === 0) return

    const confirmed = await Swal.fire({
      title: '¿Reiniciar el juego?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, reiniciar',
      background: '#111827', color: '#fff', confirmButtonColor: '#ff0055'
    })

    if (confirmed.isConfirmed) {
      socket.emit('updateRoom', roomData.id, { drawnNumbers: [] })
    }
  })

  configButton.addEventListener('click', async () => {
    closeDropdownMenu()
    const room = await getLatestRoom()

    const { isConfirmed } = await Swal.fire({
      title: '¿Cambiar rango de Bingo?',
      text: 'Al cambiar el rango, el juego actual se borrará por completo y se creará un nuevo tablero. ¿Deseas continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      background: '#111827', color: '#fff', confirmButtonColor: '#ff0055'
    })

    if (!isConfirmed) return

    const { value } = await Swal.fire({
      title: 'Configurar Rango',
      input: 'number',
      inputValue: room.maxNumber,
      showCancelButton: true,
      background: '#111827', color: '#fff', confirmButtonColor: '#b026ff',
      inputValidator: (value) => {
        if (!value || parseInt(value) < 10 || parseInt(value) > 150) {
          return 'Ingresa un número entre 10 y 150'
        }
        return null;
      }
    })

    if (value && parseInt(value) !== room.maxNumber) {
      socket.emit('updateRoom', roomData.id, { maxNumber: parseInt(value), drawnNumbers: [], currentMode: 'manual', tombolaActive: false, tombolaTarget: null })
    }
  })

  if (winnersHistoryBtn) {
    winnersHistoryBtn.addEventListener('click', async () => {
      closeDropdownMenu()
      const room = await getLatestRoom()

      const winners = room.winnersHistory || []
      if (winners.length === 0) {
        Swal.fire({ title: 'Historial Vacío', text: 'Aún no hay ganadores en esta sala.', icon: 'info', background: '#111827', color: '#fff' })
        return
      }

      const winnersHtml = winners.map(w => {
        const isBinguito = w.type.toLowerCase().includes('binguito');
        const theme = isBinguito ? {
          text: 'text-emerald-400',
          bg: 'bg-emerald-900/30',
          border: 'border-emerald-500',
          shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          icon: 'fa-check-double'
        } : {
          text: 'text-neon-blue',
          bg: 'bg-blue-900/30',
          border: 'border-neon-blue',
          shadow: 'shadow-[0_0_15px_rgba(0,240,255,0.3)]',
          icon: 'fa-trophy'
        };
        
        return `
        <div class="${theme.bg} rounded-xl p-4 mb-3 text-left border border-gray-700/50 border-l-4 ${theme.border} ${theme.shadow} relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-default">
          <div class="absolute -right-2 -top-2 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 group-hover:rotate-12 duration-500">
            <i class="fas ${theme.icon} text-7xl ${theme.text}"></i>
          </div>
          <p class="font-black ${theme.text} text-xl flex items-center gap-2 relative z-10">
            <i class="fas ${theme.icon}"></i> ${w.name}
          </p>
          <div class="flex justify-between items-center text-xs text-gray-300 mt-3 relative z-10">
            <span class="uppercase tracking-widest font-bold bg-black/40 px-2.5 py-1 rounded-md ${theme.text}">${w.type}</span>
            <span class="flex items-center gap-1.5 opacity-80"><i class="far fa-clock"></i> ${new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        `
      }).reverse().join('');

      Swal.fire({
        title: '🏆 Historial de Ganadores',
        html: `<div class="max-h-60 overflow-y-auto mt-4 pr-2 font-inter">${winnersHtml}</div>`,
        background: '#111827',
        color: '#fff',
        showCancelButton: true,
        cancelButtonText: '🗑️ Vaciar Historial',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#b026ff'
      }).then(async (result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
          const confirm = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Se borrarán todos los registros de esta sala.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, borrar todo',
            cancelButtonText: 'Cancelar',
            background: '#111827',
            color: '#fff'
          });
          if (confirm.isConfirmed) {
            socket.emit('updateRoom', roomData.id, { winnersHistory: [] });
            Swal.fire({ title: '¡Borrado!', text: 'El historial está limpio.', icon: 'success', background: '#111827', color: '#fff', timer: 2000, showConfirmButton: false });
          }
        }
      })
    })
  }

  if (toggleModeBtnControls) {
    toggleModeBtnControls.addEventListener('click', async () => {
      closeDropdownMenu()
      const room = await getLatestRoom()
      const newMode = room.currentMode === 'manual' ? 'tombola' : 'manual'
      socket.emit('updateRoom', room.id, { currentMode: newMode })
    })
  }
}