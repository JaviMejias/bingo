import { authReady, socket } from './socket'
import type { GameRoom } from '../types/game'

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
}

export async function createGameRoom(maxNumber = 75, mode: 'manual' | 'tombola' = 'manual'): Promise<GameRoom> {
  const user = await authReady

  if (!user) {
    console.error('No authenticated user found. Cannot create game room.')
    throw new Error('Authentication required to create a game room.');
  }

  const code = generateCode()
  const roomId = Math.random().toString(36).substring(2, 15)
  const roomData: GameRoom = {
    id: roomId,
    code,
    hostId: user.uid,
    createdAt: Date.now(),
    maxNumber,
    drawnNumbers: [],
    currentMode: mode,
    tombolaActive: false,
    tombolaTarget: null,
    bingoCallers: [],
    winnersHistory: []
  }

  return new Promise((resolve, reject) => {
    socket.emit('createRoom', roomData, (response: any) => {
      if (response && response.success) {
        resolve(response.room)
      } else {
        reject(new Error(response?.error || 'Failed to create room'))
      }
    })
  })
}