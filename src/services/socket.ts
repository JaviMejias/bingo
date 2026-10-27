import { io } from 'socket.io-client'
import type { GameRoom } from '../types/game'

export const socket = io('/', { autoConnect: true })
const savedId = sessionStorage.getItem('bingo_participant_id')
export const playerId = savedId || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
sessionStorage.setItem('bingo_participant_id', playerId)

interface Response {
  success: boolean
  error?: string
}

export async function waitForConnection(): Promise<void> {
  if (socket.connected) return
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer)
      socket.off('connect', connected)
    }
    const connected = () => { finish(); resolve() }
    const timer = setTimeout(() => { finish(); reject(new Error('No hay conexión con la sala. Revisa tu internet e inténtalo otra vez.')) }, 8000)
    socket.on('connect', connected)
  })
}

export async function request<T extends Response = Response>(event: string, payload: object): Promise<T> {
  if (!socket.connected) throw new Error('Se perdió la conexión. Espera a que se restablezca antes de continuar.')
  let response: T
  try {
    response = await socket.timeout(5000).emitWithAck(event, payload)
  } catch {
    throw new Error('No recibimos respuesta. Revisa el tablero antes de volver a intentarlo.')
  }
  if (!response.success) throw new Error(response.error || 'No se pudo completar la acción.')
  return response
}

export async function joinGameRoom(code: string, role: 'host' | 'player', playerName = '', signal?: AbortSignal) {
  await waitForConnection()
  if (signal?.aborted) throw new Error('Se canceló la entrada a la sala.')
  return request<Response & { room: GameRoom, role: 'host' | 'player' }>('joinRoom', {
    code, role, playerId, playerName,
    hostToken: localStorage.getItem(`bingo_host_${code}`)
  })
}
