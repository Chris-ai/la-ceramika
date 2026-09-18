export type Hex = {
  id?: string
  q: number
  r: number
  ownerTeamIndex: number | null
  isBase: boolean
  status?: string
  availableChallenges?: string[]
}

export type GameTeam = {
  id?: string
  name: string
  color: string
  avatar: string
  turnOrder: number
  status?: string
  streak?: number
  bonusMoves?: number
}

export type Game = {
  gameId?: string
  status?: string
  currentTeamId?: string
  currentRound?: number
  baseMoveUsed?: boolean
  hexes: Hex[]
  teams: GameTeam[]
  hexCount: number
}
