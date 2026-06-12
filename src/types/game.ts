export interface Winner {
  id: string
  name: string
  date: number
  type: string
}

export interface GameRoom {
  id: string
  code: string
  hostId: string
  createdAt: number
  maxNumber: number
  drawnNumbers: number[]
  currentMode: 'manual' | 'tombola'
  tombolaActive?: boolean
  tombolaTarget?: number | null
  bingoCallers?: string[]
  winnersHistory?: Winner[]
}
