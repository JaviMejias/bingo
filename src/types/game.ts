export interface GameRoom {
  id: string
  code: string
  hostId: string
  createdAt: number
  maxNumber: number
  drawnNumbers: number[]
  currentMode: 'manual' | 'tombola'
}
