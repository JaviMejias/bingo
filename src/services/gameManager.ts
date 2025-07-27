import { db, authReady } from './firebase'
import { collection, doc, setDoc } from 'firebase/firestore'
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
  const roomRef = doc(collection(db, 'gameRooms'))
  const roomData: GameRoom = {
    id: roomRef.id,
    code,
    hostId: user.uid,
    createdAt: Date.now(),
    maxNumber,
    drawnNumbers: [],
    currentMode: mode,
  }

  await setDoc(roomRef, roomData)
  return roomData
}