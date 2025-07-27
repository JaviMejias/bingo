// En tu archivo: GameRoom.ts

import { doc, onSnapshot, collection, query, where, getDocs, getDoc, updateDoc } from 'firebase/firestore'
import { db, authReady } from '../services/firebase' // Asegúrate de que la ruta a firebase.ts es correcta
import Swal from 'sweetalert2' // Asegúrate de tener SweetAlert2 instalado y configurado
import type { GameRoom } from '../types/game' // Asegúrate de que la ruta a types/game.ts y el tipo GameRoom son correctos
import { renderBingoControls } from '../components/BingoControls' // Asegúrate de que la ruta a BingoControls.ts es correcta
import { renderBingoBoard } from '../components/BingoBoard' // Asegúrate de que la ruta a BingoBoard.ts es correcta
import { renderLastNumbers } from '../components/LastNumbers' // Asegúrate de que la ruta a LastNumbers.ts es correcta

/**
 * Busca una sala de juego por su código en Firestore.
 * @param code El código de la sala a buscar.
 * @returns Un objeto que contiene el ID del documento y los datos de la sala, o null si no se encuentra.
 */
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

/**
 * Renderiza la sala de juego para el host o el jugador.
 * @param code El código de la sala.
 * @param role El rol del usuario en la sala ('host' o 'player').
 */
export async function renderGameRoom(code: string, role: 'host' | 'player') {
  const app = document.querySelector<HTMLDivElement>('#app')!
  const user = await authReady // user es de tipo User | null

  const roomResult = await findRoomByCode(code)
  if (!roomResult) {
    Swal.fire('Sala no encontrada', 'Esta sala ya no existe.', 'error')
    window.location.hash = '#/'
    return
  }

  const roomData = roomResult.data

  // --- CORRECCIÓN AQUÍ para el error TS18047 en GameRoom.ts ---
  // Antes de acceder a user.uid, asegúrate de que user no es null.
  if (role === 'host') {
    if (!user) { // Si el usuario es null, no puede ser host.
      Swal.fire('Acceso denegado', 'Necesitas iniciar sesión para ser host.', 'error')
      window.location.hash = '#/'
      return
    }
    // Ahora, dentro de este bloque, TypeScript sabe que 'user' no es null.
    if (user.uid !== roomData.hostId) {
      Swal.fire('Acceso denegado', 'Solo el creador de la sala puede ser el host.', 'error')
      window.location.hash = '#/'
      return
    }
  }
  // --- FIN CORRECCIÓN ---


  app.innerHTML = `
    <div class="
      min-h-screen w-full flex flex-col items-center
      bg-gradient-to-br from-blue-700 to-indigo-900
      text-white font-inter p-4 sm:p-6 lg:p-8 overflow-y-auto
    ">
      <div class="
        w-full max-w-7xl mx-auto flex flex-col items-center gap-4 mb-4
      ">
        ${role === 'host' ? `
          <div class="
            w-full flex flex-col sm:flex-row justify-between items-center
            gap-4 py-3 px-4 bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-xl
            border border-gray-700
          ">
            <h1 class="
              text-3xl sm:text-4xl font-extrabold drop-shadow-md
              text-left truncate text-yellow-400
            ">
              Sala: <span class="text-white">${code}</span>
            </h1>
            <div id="controls" class="flex-grow flex flex-col sm:flex-row justify-end items-center gap-2 w-full sm:w-auto">
              </div>
          </div>
        ` : `
          <h1 class="
            text-4xl sm:text-5xl lg:text-6xl font-extrabold drop-shadow-lg
            text-center text-yellow-400 mb-4
          ">
            Sala: <span class="text-white">${code}</span>
          </h1>
          <p class="text-xl sm:text-2xl text-center mt-4 mb-6 opacity-90">
            Esperando que el host inicie el juego... ¡Prepárate para marcar!
          </p>
        `}
      </div>

      <div id="lastNumberDisplayContainer" class="w-full max-w-5xl mx-auto mb-4">
        <div class="flex flex-col sm:flex-row justify-center items-center gap-4 p-4 rounded-lg shadow-2xl bg-gray-800/80 border border-gray-700 animate-fade-in">
          <div class="text-center transform hover:scale-105 transition-transform duration-300">
            <h3 class="text-lg sm:text-xl font-bold text-gray-300">Último Número:</h3>
            <div id="currentLastNumber" class="
              text-yellow-400 text-5xl sm:text-6xl lg:text-7xl font-extrabold
              drop-shadow-lg transition-all duration-300 ease-in-out
            ">--</div>
          </div>
          <div class="text-center transform hover:scale-105 transition-transform duration-300">
            <h3 class="text-lg sm:text-xl font-bold text-gray-300">Anterior:</h3>
            <div id="previousLastNumber" class="
              text-blue-400 text-3xl sm:text-4xl lg:text-5xl font-bold
              opacity-80 drop-shadow transition-all duration-300 ease-in-out
            ">--</div>
          </div>
        </div>
      </div>

      <div id="bingoBoard" class="w-full max-w-5xl mx-auto flex-grow mb-4"></div>

    </div>
  `

  const roomDocRef = doc(db, 'gameRooms', roomResult.id)

  // Escucha cambios en tiempo real en el documento de la sala
  onSnapshot(roomDocRef, (docSnap) => {
    // Si la sala ya no existe (ej. el host la cerró o fue eliminada)
    if (!docSnap.exists()) {
      Swal.fire('Sala eliminada', 'El host ha cerrado la sala.', 'info')
      window.location.hash = '#/' // Redirige a la página principal
      return
    }

    const updatedRoom = docSnap.data() as GameRoom
    
    // Renderiza o actualiza el tablero de bingo para todos los usuarios
    renderBingoBoard(updatedRoom)
    // Renderiza o actualiza solo los dos últimos números sorteados
    renderLastNumbers(
      updatedRoom, 
      document.getElementById('currentLastNumber') as HTMLDivElement, 
      document.getElementById('previousLastNumber') as HTMLDivElement
    )

    // Si el rol es 'host', renderiza y configura los controles específicos del host
    if (role === 'host') {
      // Renderiza el HTML de los controles (ingresar/buscar número, y el dropdown)
      renderBingoControls(updatedRoom)
      
      // Adjunta los listeners para los botones de control del host (Reiniciar, Opciones, etc.)
      // Esto se hace solo una vez para evitar duplicados, usando un dataset en el 'app' div.
      if (!app.dataset.hostControlsListenersSetup) {
        setupHostControlsListeners(roomResult.id);
        app.dataset.hostControlsListenersSetup = 'true'; // Marca como configurado
      }
    }
  })
}

/**
 * Configura los listeners para los botones de control del host (Reiniciar, Configurar, Tómbola, y dropdown).
 * Estos listeners se adjuntan una vez y persisten, manejando las interacciones.
 * @param roomId El ID de la sala actual.
 */
async function setupHostControlsListeners(roomId: string) {
  const roomRef = doc(db, 'gameRooms', roomId);

  const dropdownToggle = document.getElementById('dropdownToggleControls') as HTMLButtonElement;
  const dropdownMenu = document.getElementById('dropdownMenuControls') as HTMLDivElement;
  const resetButton = document.getElementById('resetGameBtnControls') as HTMLButtonElement; 
  const configButton = document.getElementById('configMaxNumBtnControls') as HTMLButtonElement;
  const tombolaButton = document.getElementById('drawTombolaBtnControls') as HTMLButtonElement;

  // Lógica de apertura/cierre y animación del dropdown
  if (dropdownToggle && dropdownMenu) {
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation(); 
      // Si el menú está oculto, lo mostramos con animación 'scale-in'
      if (dropdownMenu.classList.contains('hidden')) {
        dropdownMenu.classList.remove('hidden');
        // Asegurarse de que las clases de estado inicial estén removidas antes de aplicar las finales
        dropdownMenu.classList.remove('opacity-0', 'scale-95'); 
        // Aplicar el estado final de la animación de entrada
        dropdownMenu.classList.add('opacity-100', 'scale-100', 'animate-scale-in'); 
        dropdownMenu.classList.remove('animate-scale-out'); // Remover la animación de salida si estaba presente
      } else {
        // Si el menú está visible, lo ocultamos con animación 'scale-out'
        dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in'); // Remover el estado final y animación de entrada
        dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out'); // Aplicar el estado inicial para la animación de salida
        // Retrasar la adición de 'hidden' para que la animación se complete
        setTimeout(() => {
            dropdownMenu.classList.add('hidden');
            dropdownMenu.classList.remove('animate-scale-out'); // Limpiar la animación después de completarse
        }, 300); // Duración de la animación en milisegundos (debe coincidir con la transición de Tailwind)
      }
    });

    // Cierra el menú si se hace clic fuera de él
    document.addEventListener('click', (e) => {
      // Solo si el clic no fue dentro del menú o en el botón que lo abre
      if (!dropdownMenu.contains(e.target as Node) && !dropdownToggle.contains(e.target as Node)) {
        // Si el menú está visible, lo ocultamos con animación
        if (!dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in');
            dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out');
            setTimeout(() => {
                dropdownMenu.classList.add('hidden');
                dropdownMenu.classList.remove('animate-scale-out'); // Limpiar la animación
            }, 300); 
        }
      }
    });
  }

  // Listener para el botón "Reiniciar Juego"
  if (resetButton) {
    resetButton.addEventListener('click', async () => {
      // Ocultar el dropdown con animación antes de la acción
      if (!dropdownMenu.classList.contains('hidden')) {
          dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in');
          dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out');
          setTimeout(() => dropdownMenu.classList.add('hidden'), 300);
      }
      
      const snapshot = await getDoc(roomRef);
      const room = snapshot.data() as GameRoom;

      if (room.drawnNumbers.length === 0) {
        Swal.fire('Nada que reiniciar', 'Aún no se ha ingresado ningún número.', 'info');
        return;
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
      });

      if (confirmed.isConfirmed) {
        await updateDoc(roomRef, {
          drawnNumbers: []
        });
        Swal.fire('Juego Reiniciado', 'Todos los números han sido eliminados.', 'success');
      }
    });
  }

  // Listener para el botón "Configurar Rango de Números"
  if (configButton) {
    configButton.addEventListener('click', async () => {
      // Ocultar el dropdown con animación antes de la acción
      if (!dropdownMenu.classList.contains('hidden')) {
          dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in');
          dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out');
          setTimeout(() => dropdownMenu.classList.add('hidden'), 300);
      }
      
      const snapshot = await getDoc(roomRef);
      const room = snapshot.data() as GameRoom;

      const { value } = await Swal.fire({
        title: 'Configurar Rango de Números',
        html: `
          <p class="text-gray-700 mb-4">Define el número máximo de tu tablero de bingo.</p>
          <input id="swal-input1" class="swal2-input px-4 py-2 rounded-lg text-gray-900 bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Número máximo" type="number" min="10" max="150" value="${room.maxNumber}">
        `,
        focusConfirm: false,
        preConfirm: () => {
            const input = Swal.getPopup()?.querySelector('#swal-input1') as HTMLInputElement;
            const val = parseInt(input.value);
            if (isNaN(val) || val < 10 || val > 150) {
                Swal.showValidationMessage('Por favor, ingresa un número entre 10 y 150.');
                return false;
            }
            return val;
        },
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        customClass: {
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md',
          cancelButton: 'bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md'
        },
        buttonsStyling: false
      });

      const max = value; 
      if (max && max !== room.maxNumber) {
        await updateDoc(roomRef, {
          maxNumber: max,
          drawnNumbers: [] // Reinicia el juego al cambiar el número máximo
        });
        Swal.fire('Rango Actualizado', `El número máximo es ahora ${max}. El juego ha sido reiniciado.', 'success`);
      }
    });
  }

  // Listener para el botón "Sacar Número (Tómbola)"
  if (tombolaButton) {
    tombolaButton.addEventListener('click', async () => {
      // Ocultar el dropdown con animación antes de la acción
      if (!dropdownMenu.classList.contains('hidden')) {
          dropdownMenu.classList.remove('opacity-100', 'scale-100', 'animate-scale-in');
          dropdownMenu.classList.add('opacity-0', 'scale-95', 'animate-scale-out');
          setTimeout(() => dropdownMenu.classList.add('hidden'), 300);
      }

      const snapshot = await getDoc(roomRef);
      const room = snapshot.data() as GameRoom;

      const remaining = Array.from({ length: room.maxNumber }, (_, i) => i + 1)
        .filter(n => !room.drawnNumbers.includes(n));

      if (remaining.length === 0) {
        Swal.fire('¡Juego Terminado!', 'No quedan números por sortear. ¡Felicidades a los ganadores!', 'info');
        return;
      }

      const random = remaining[Math.floor(Math.random() * remaining.length)];
      await updateDoc(roomRef, {
        drawnNumbers: [...room.drawnNumbers, random]
      });
      
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
          Swal.getPopup()?.querySelector('.swal2-icon')?.classList.add('hidden');
        }
      });
    });
  }
}