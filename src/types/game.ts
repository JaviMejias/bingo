export interface BingoCaller {
  playerId: string
  name: string
}

export interface Winner extends BingoCaller {
  id: string
  date: number
  type: 'binguito' | 'carton'
  roundId: string
  roundNumber: number
}

export interface GameRoom {
  id: string
  code: string
  createdAt: number
  maxNumber: number
  drawnNumbers: number[]
  currentMode: 'manual' | 'tombola'
  tombolaActive: boolean
  tombolaEndsAt: number | null
  bingoCallers: BingoCaller[]
  winnersHistory: Winner[]
  phase: 'playing' | 'finished'
  roundId: string
  roundNumber: number
  playerCount: number
  maxPlayers: number
}
