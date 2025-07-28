import type { GameRoom } from '../types/game'

export function renderLastNumbers(
  room: GameRoom, 
  currentLastNumberElement: HTMLDivElement, 
  previousLastNumberElement: HTMLDivElement
) {
  const drawnNumbers = room.drawnNumbers

  if (drawnNumbers.length > 0) {
    const lastNumber = drawnNumbers[drawnNumbers.length - 1]
    currentLastNumberElement.textContent = lastNumber.toString()
  } else {
    currentLastNumberElement.textContent = '--'
  }

  if (drawnNumbers.length > 1) {
    const previousNumber = drawnNumbers[drawnNumbers.length - 2]
    previousLastNumberElement.textContent = previousNumber.toString()
  } else {
    previousLastNumberElement.textContent = '--'
  }
}