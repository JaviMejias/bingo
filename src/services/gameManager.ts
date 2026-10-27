import { request, waitForConnection } from './socket'
import type { GameRoom } from '../types/game'

export async function createGameRoom(maxNumber = 75): Promise<GameRoom> {
  await waitForConnection()
  const response = await request<{ success: boolean, room: GameRoom, hostToken: string }>('createRoom', { maxNumber })
  localStorage.setItem(`bingo_host_${response.room.code}`, response.hostToken)
  localStorage.setItem('bingo_last_host_code', response.room.code)
  return response.room
}
