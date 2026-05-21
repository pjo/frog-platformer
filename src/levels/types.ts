export interface Rect { x: number; y: number; w: number; h: number }

export interface Platform extends Rect {
  type: 'ground' | 'stone' | 'wood'
  vx?: number
  minPX?: number
  maxPX?: number
}

export type EnemyType = 'basic' | 'jumper' | 'shooter' | 'shield'

export const PHASE_AGGRESSIVE = 0.66  // hp ratio below which boss enters phase 2
export const PHASE_BERSERK    = 0.33  // hp ratio below which boss enters phase 3
export const SHOOTER_RANGE    = 400   // px — shooter fires when player is within this

export interface Enemy extends Rect {
  vx: number; vy: number; patrolVx: number; minX: number; maxX: number
  alive: boolean; dying: boolean; deathTimer: number
  bob: number; hue: number; mood: string
  hp: number; maxHp: number; isBoss: boolean
  type: EnemyType
  jumpCooldown: number
  shootCooldown: number
  shieldUp: boolean
  shieldCooldown: number
  onGround: boolean
  spawnY: number
}

export interface Fly { x: number; y: number; r: number; taken: boolean }
export interface Hazard extends Rect { type: string; vx?: number; active?: boolean }
export interface CP extends Rect { active: boolean }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; r: number }
export interface PowerUp { x: number; y: number; r: number; taken: boolean; type: 'speed' | 'star' }
export interface LeaderEntry { name: string; score: number; flies: number; time: number; isCurrent?: boolean }

export interface EnemyDef { x: number; y: number; w: number; h: number; vx: number; minX: number; maxX: number; bob: number; hue: number; hp?: number; isBoss?: boolean; type?: EnemyType }
export interface LevelDef {
  worldWidth: number
  theme: string
  platforms: Platform[]
  enemies: EnemyDef[]
  flies: Array<{ x: number; y: number; r: number }>
  hazards: Hazard[]
  checkpoints: Array<{ x: number; y: number; w: number; h: number }>
  powerUps: Array<{ x: number; y: number; r: number; type: 'speed' | 'star' }>
  finishGate: Rect
}
