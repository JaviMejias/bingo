import './style.css'
import bingoAppHtml from './bingo-app.html?raw'

import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'

library.add(fas)

import Swal from 'sweetalert2'

function initializeBingoApp() {
  const appContainer = document.querySelector<HTMLDivElement>('#app')

  if (appContainer) {
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-inter">
        ${bingoAppHtml}
      </div>
    `
    dom.i2svg()

    const inputNumber = document.getElementById('inputNumber') as HTMLInputElement
    const enterNumberBtn = document.getElementById('enterNumberBtn') as HTMLButtonElement
    const searchNumber = document.getElementById('searchNumber') as HTMLInputElement
    const searchNumberBtn = document.getElementById('searchNumberBtn') as HTMLButtonElement
    const resetButton = document.getElementById('resetButton') as HTMLButtonElement
    const tombolaButton = document.getElementById('tombolaButton') as HTMLButtonElement
    const configButton = document.getElementById('configButton') as HTMLButtonElement
    const bingoBoard = document.getElementById('bingoBoard') as HTMLDivElement
    const lastNumberDisplay = document.getElementById('lastNumberDisplay') as HTMLDivElement
    const previousLastNumberDisplay = document.getElementById('previousLastNumberDisplay') as HTMLDivElement
    const tombolaModal = document.getElementById('tombolaModal') as HTMLDivElement
    const tombolaNumberDisplay = document.getElementById('tombolaNumberDisplay') as HTMLSpanElement
    const gameModeDropdownButton = document.getElementById('gameModeDropdownButton') as HTMLButtonElement
    const gameModeDropdownContent = document.getElementById('gameModeDropdownContent') as HTMLDivElement
    const dropdownArrow = document.getElementById('dropdownArrow') as HTMLElement
    const modeManualButton = document.getElementById('modeManualButton') as HTMLButtonElement
    const modeTombolaButton = document.getElementById('modeTombolaButton') as HTMLButtonElement
    const manualInputSection = document.getElementById('manualInputSection') as HTMLDivElement
    const tombolaButtonSection = document.getElementById('tombolaButtonSection') as HTMLDivElement

    // Nuevos elementos para desmarcar
    const correctNumberInput = document.getElementById('correctNumberInput') as HTMLInputElement
    const correctNumberBtn = document.getElementById('correctNumberBtn') as HTMLButtonElement


    let maxNumber: number = 75
    let remainingNumbers: number[] = [] // Números que aún no han sido llamados
    let drawnNumbers: number[] = []    // Números que ya han sido llamados (en orden)
    let currentMode: 'manual' | 'tombola' = 'manual'

    function initializeGame() {
      remainingNumbers = Array.from({ length: maxNumber }, (_, i) => i + 1)
      drawnNumbers = [] // Reiniciar los números sorteados
      lastNumberDisplay.textContent = '--'
      previousLastNumberDisplay.textContent = '--'
      inputNumber.value = ''
      searchNumber.value = ''
      correctNumberInput.value = '' // Limpiar el input de corregir
      inputNumber.min = '1'
      inputNumber.max = maxNumber.toString()
      searchNumber.min = '1'
      searchNumber.max = maxNumber.toString()
      correctNumberInput.min = '1' // Establecer min/max para el nuevo input
      correctNumberInput.max = maxNumber.toString()
      inputNumber.placeholder = `Ej: ${Math.floor(maxNumber / 3)}`
      searchNumber.placeholder = `Ej: ${Math.floor(maxNumber * 2 / 3)}`
      correctNumberInput.placeholder = `Ej: ${Math.floor(maxNumber / 2)}` // Placeholder para corregir

      renderBingoBoard()
      updateButtonStates()
      setGameMode(currentMode, false)
      gameModeDropdownContent.classList.add('scale-y-0', 'max-h-0', 'opacity-0')
      dropdownArrow.classList.remove('rotate-180')
    }

    function showToast(title: string, icon: 'success' | 'error' | 'warning' | 'info' | 'question') {
      Swal.fire({
        title: title,
        icon: icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false, // Mantener en false si el click en el toast lo cierra
        timer: 3000,
        timerProgressBar: true,
        showCloseButton: true, // Añadir botón de cerrar 'X'
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
          // Opcional: Si quieres que el toast se cierre al hacer click en cualquier parte de él
          // toast.addEventListener('click', () => Swal.close())
        }
      })
    }

    function renderBingoBoard() {
      bingoBoard.innerHTML = ''
      let gridColsClass = 'grid-cols-8'
      if (maxNumber <= 75) {
        gridColsClass = 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-18'
      } else if (maxNumber <= 100) {
        gridColsClass = 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20'
      } else {
        gridColsClass = 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 xl:grid-cols-25'
      }

      bingoBoard.className = `grid ${gridColsClass} grid-flow-row gap-0.5 p-0.5 bg-gray-50 rounded-lg shadow-inner border border-gray-200 mx-auto`

      for (let i = 1; i <= maxNumber; i++) {
        const cell = document.createElement('div')
        cell.id = `number-${i}`
        cell.textContent = i.toString()

        const isDrawn = drawnNumbers.includes(i)

        cell.className = `
          flex items-center justify-center
          w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl lg:w-24 lg:h-24 lg:text-5xl
          rounded-md font-bold
          border border-gray-300 transition-all duration-200
          ${isDrawn ? 'bg-green-500 text-white shadow-lg transform scale-105' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer'}
        `
        bingoBoard.appendChild(cell)
      }
    }

    function updateLastDrawnNumbersDisplay() {
      if (drawnNumbers.length > 0) {
        lastNumberDisplay.textContent = drawnNumbers[drawnNumbers.length - 1].toString()
        if (drawnNumbers.length > 1) {
          previousLastNumberDisplay.textContent = drawnNumbers[drawnNumbers.length - 2].toString()
        } else {
          previousLastNumberDisplay.textContent = '--'
        }
      } else {
        lastNumberDisplay.textContent = '--'
        previousLastNumberDisplay.textContent = '--'
      }
    }

    function updateButtonStates() {
      const hasAnyNumberBeenDrawn = drawnNumbers.length > 0

      if (hasAnyNumberBeenDrawn) {
        resetButton.disabled = false
        resetButton.classList.remove('opacity-50', 'cursor-not-allowed')
        resetButton.classList.add('hover:bg-red-50')
      } else {
        resetButton.disabled = true
        resetButton.classList.add('opacity-50', 'cursor-not-allowed')
        resetButton.classList.remove('hover:bg-red-50')
      }

      if (hasAnyNumberBeenDrawn) {
        modeManualButton.disabled = true
        modeTombolaButton.disabled = true
        configButton.disabled = true
        modeManualButton.classList.add('opacity-50', 'cursor-not-allowed')
        modeTombolaButton.classList.add('opacity-50', 'cursor-not-allowed')
        configButton.classList.add('opacity-50', 'cursor-not-allowed')
      } else {
        modeManualButton.disabled = false
        modeTombolaButton.disabled = false
        configButton.disabled = false
        modeManualButton.classList.remove('opacity-50', 'cursor-not-allowed')
        modeTombolaButton.classList.remove('opacity-50', 'cursor-not-allowed')
        configButton.classList.remove('opacity-50', 'cursor-not-allowed')
      }

      if (currentMode === 'manual') {
        enterNumberBtn.disabled = false
        correctNumberBtn.disabled = false
        tombolaButton.disabled = true
        tombolaButton.classList.add('opacity-50', 'cursor-not-allowed')
        tombolaButton.classList.remove('hover:bg-green-600')
      } else {
        enterNumberBtn.disabled = true
        correctNumberBtn.disabled = true
        if (remainingNumbers.length > 0) {
          tombolaButton.disabled = false
          tombolaButton.classList.remove('opacity-50', 'cursor-not-allowed')
          tombolaButton.classList.add('hover:bg-green-600')
        } else {
          tombolaButton.disabled = true
          tombolaButton.classList.add('opacity-50', 'cursor-not-allowed')
          tombolaButton.classList.remove('hover:bg-green-600')
        }
      }
    }

    function processDrawnNumber(number: number) {
      remainingNumbers = remainingNumbers.filter(n => n !== number)
      drawnNumbers.push(number)

      updateLastDrawnNumbersDisplay()
      renderBingoBoard()
      updateButtonStates()
    }

    function unmarkNumber(numberToUnmark: number) {
      if (!drawnNumbers.includes(numberToUnmark)) {
        showToast(`El número ${numberToUnmark} no ha sido ingresado.`, 'warning')
        return
      }

      drawnNumbers = drawnNumbers.filter(n => n !== numberToUnmark)
      remainingNumbers.push(numberToUnmark)
      remainingNumbers.sort((a, b) => a - b)

      updateLastDrawnNumbersDisplay()
      renderBingoBoard()
      updateButtonStates()
      showToast(`Número ${numberToUnmark} desmarcado.`, 'success')
      correctNumberInput.value = ''
    }

    function toggleDropdown() {
      const isOpen = gameModeDropdownContent.classList.contains('scale-y-100')
      if (isOpen) {
        gameModeDropdownContent.classList.remove('scale-y-100', 'max-h-96', 'opacity-100')
        gameModeDropdownContent.classList.add('scale-y-0', 'max-h-0', 'opacity-0')
        dropdownArrow.classList.remove('rotate-180')
      } else {
        gameModeDropdownContent.classList.remove('scale-y-0', 'max-h-0', 'opacity-0')
        gameModeDropdownContent.classList.add('scale-y-100', 'max-h-96', 'opacity-100')
        dropdownArrow.classList.add('rotate-180')
      }
    }

    function setGameMode(mode: 'manual' | 'tombola', showToastMessage: boolean = true) {
      if (drawnNumbers.length > 0 && showToastMessage) {
        showToast('No se puede cambiar el modo con números ya ingresados. Reinicia el juego para cambiar de modo.', 'warning')
        toggleDropdown()
        return
      }

      currentMode = mode
      if (mode === 'manual') {
        manualInputSection.classList.remove('hidden')
        tombolaButtonSection.classList.add('hidden')
        modeManualButton.classList.add('hidden')
        modeTombolaButton.classList.remove('hidden')
        if (showToastMessage) showToast('Modo Manual Activado', 'info')
      } else {
        manualInputSection.classList.add('hidden')
        tombolaButtonSection.classList.remove('hidden')
        modeTombolaButton.classList.add('hidden')
        modeManualButton.classList.remove('hidden')
        if (showToastMessage) showToast('Modo Tómbola Activado', 'info')
      }
      updateButtonStates()
      if (gameModeDropdownContent.classList.contains('scale-y-100')) {
        toggleDropdown()
      }
    }

    gameModeDropdownButton.addEventListener('click', toggleDropdown)
    modeManualButton.addEventListener('click', () => setGameMode('manual'))
    modeTombolaButton.addEventListener('click', () => setGameMode('tombola'))

    // Event listener para cerrar el dropdown al hacer clic fuera
    document.addEventListener('click', (event) => {
      const isClickInsideDropdownButton = gameModeDropdownButton.contains(event.target as Node)
      const isClickInsideDropdownContent = gameModeDropdownContent.contains(event.target as Node)

      if (!isClickInsideDropdownButton && !isClickInsideDropdownContent && gameModeDropdownContent.classList.contains('scale-y-100')) {
        toggleDropdown()
      }
    })


    enterNumberBtn.addEventListener('click', () => {
      const number = parseInt(inputNumber.value)

      if (isNaN(number) || number < 1 || number > maxNumber) {
        showToast(`Por favor, ingresa un número válido entre 1 y ${maxNumber}.`, 'error')
        inputNumber.value = ''
        return
      }

      if (drawnNumbers.includes(number)) {
        showToast(`El número ${number} ya ha sido ingresado.`, 'warning')
        inputNumber.value = ''
        return
      }
      
      processDrawnNumber(number)
      inputNumber.value = ''
    })

    correctNumberBtn.addEventListener('click', () => {
      const numberToCorrect = parseInt(correctNumberInput.value)

      if (isNaN(numberToCorrect) || numberToCorrect < 1 || numberToCorrect > maxNumber) {
        showToast(`Por favor, ingresa un número válido entre 1 y ${maxNumber} para desmarcar.`, 'error')
        correctNumberInput.value = ''
        return
      }
      unmarkNumber(numberToCorrect)
    })

    tombolaButton.addEventListener('click', () => {
      if (remainingNumbers.length === 0) {
        showToast('¡Todos los números han sido sorteados!', 'info')
        return
      }

      tombolaModal.classList.remove('hidden')
      
      let interval: number
      let counter = 0
      const animationDuration = 2500
      const numberChangeSpeed = 50

      tombolaButton.disabled = true
      enterNumberBtn.disabled = true
      searchNumberBtn.disabled = true
      correctNumberBtn.disabled = true
      resetButton.disabled = true
      gameModeDropdownButton.disabled = true

      interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * remainingNumbers.length)
        tombolaNumberDisplay.textContent = remainingNumbers[randomIndex].toString()
        counter += numberChangeSpeed

        if (counter >= animationDuration) {
          clearInterval(interval)

          const finalRandomIndex = Math.floor(Math.random() * remainingNumbers.length)
          const drawnNumber = remainingNumbers[finalRandomIndex]
          
          tombolaNumberDisplay.textContent = drawnNumber.toString()

          setTimeout(() => {
            tombolaModal.classList.add('hidden')
            processDrawnNumber(drawnNumber)
            showToast(`¡Número sorteado: ${drawnNumber}!`, 'success')

            enterNumberBtn.disabled = false
            searchNumberBtn.disabled = false
            gameModeDropdownButton.disabled = false
            updateButtonStates()
          }, 700)
        }
      }, numberChangeSpeed)
    })

    searchNumberBtn.addEventListener('click', () => {
      const number = parseInt(searchNumber.value)

      if (isNaN(number) || number < 1 || number > maxNumber) {
        showToast(`Por favor, ingresa un número válido entre 1 y ${maxNumber} para buscar.`, 'error')
        searchNumber.value = ''
        return
      }

      const cell = document.getElementById(`number-${number}`)

      if (drawnNumbers.includes(number)) {
        if (cell) {
          cell.classList.add('bg-yellow-300', 'scale-110', 'ring-4', 'ring-yellow-500')
          cell.scrollIntoView({ behavior: 'smooth', block: 'center' })
          showToast(`Número ${number} encontrado y marcado.`, 'success')
          setTimeout(() => {
            cell.classList.remove('bg-yellow-300', 'scale-110', 'ring-4', 'ring-yellow-500')
          }, 1500)
        }
      } else {
        showToast(`El número ${number} no se ha ingresado/sorteado aún.`, 'error')
      }
      searchNumber.value = ''
    })

    inputNumber.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        enterNumberBtn.click()
      }
    })

    searchNumber.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        searchNumberBtn.click()
      }
    })

    correctNumberInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        correctNumberBtn.click()
      }
    })

    configButton.addEventListener('click', async () => {
      if (drawnNumbers.length > 0) {
        showToast('No se puede configurar la tabla con números ya ingresados. Reinicia el juego para cambiar la configuración.', 'warning')
        toggleDropdown()
        return
      }

      const { value: newMaxNumber } = await Swal.fire({
        title: 'Configurar Tabla',
        input: 'number',
        inputValue: maxNumber,
        inputLabel: 'Ingresa el número máximo para la tabla (ej. 75):',
        inputPlaceholder: 'Número entre 1 y 150',
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value || isNaN(parseInt(value)) || parseInt(value) < 1 || parseInt(value) > 150) {
            return 'Por favor, ingresa un número válido entre 1 y 150.'
          }
        }
      })

      if (newMaxNumber) {
        const parsedNewMaxNumber = parseInt(newMaxNumber)
        if (parsedNewMaxNumber !== maxNumber) {
          maxNumber = parsedNewMaxNumber
          showToast(`Tabla configurada hasta ${maxNumber}. Reiniciando juego...`, 'info')
          initializeGame()
        } else {
          showToast('El número máximo es el mismo. No se realizaron cambios.', 'info')
        }
      }
    })

    resetButton.addEventListener('click', () => {
      Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esto reiniciará el juego y borrará todos los números marcados.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, reiniciar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          initializeGame()
          showToast('Juego reiniciado correctamente.', 'success')
        }
      })
    })

    initializeGame()

  } else {
    console.error('El elemento con ID "app" no fue encontrado en el DOM. Asegúrate de que tu index.html tiene <div id="app"></div>')
  }
}

document.addEventListener('DOMContentLoaded', initializeBingoApp)
