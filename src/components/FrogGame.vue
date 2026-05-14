<template>
  <div class="game-shell" :class="{ 'high-contrast': highContrast }" :style="{ '--ui-scale': uiScale }">
    <div class="sky-decor">
      <div class="cloud c1"></div>
      <div class="cloud c2"></div>
      <div class="cloud c3"></div>
    </div>

    <GameTopbar
      :currentLevel="currentLevel"
      :levelCount="LEVEL_COUNT"
      :playerName="playerName"
      :isOnline="isOnline"
      :paused="paused"
      :muted="muted"
      :isFullscreen="isFullscreen"
      @update:playerName="playerName = $event"
      @pause="togglePause"
      @restart="resetGame"
      @mute="toggleMute"
      @fullscreen="toggleFullscreen"
    />

    <GameHud
      :score="score"
      :lives="lives"
      :fliesCollected="fliesCollected"
      :totalFlies="totalFlies"
      :displayTime="displayTime"
      :activePower="activePower"
    />

    <main class="stage card" ref="stageRef">
      <canvas ref="canvasRef" :width="VIEWPORT_W" :height="VIEWPORT_H"></canvas>

      <StartScreen v-if="!gameStarted" :playerName="playerName" :playerEmail="playerEmail" @update:playerName="playerName = $event" @update:playerEmail="playerEmail = $event" @start="startGame" />

      <div v-if="scorePending && (gameOver || won)" class="score-status pending">
        📧 Check your email — click the link to publish your score!
      </div>
      <div v-if="nameTaken && (gameOver || won)" class="score-status taken">
        ⚠ This name is registered to a different email. Use a different name next time.
      </div>

      <div v-if="gameStarted" class="mobile-controls">
        <div class="mobile-left">
          <button
            class="mobile-btn"
            @touchstart.prevent="mobileKey('ArrowLeft', true)"
            @touchend.prevent="mobileKey('ArrowLeft', false)"
            @touchcancel.prevent="mobileKey('ArrowLeft', false)"
            @mousedown.prevent="mobileKey('ArrowLeft', true)"
            @mouseup.prevent="mobileKey('ArrowLeft', false)"
            @mouseleave.prevent="mobileKey('ArrowLeft', false)"
          >&#9664;</button>
          <button
            class="mobile-btn"
            @touchstart.prevent="mobileKey('ArrowRight', true)"
            @touchend.prevent="mobileKey('ArrowRight', false)"
            @touchcancel.prevent="mobileKey('ArrowRight', false)"
            @mousedown.prevent="mobileKey('ArrowRight', true)"
            @mouseup.prevent="mobileKey('ArrowRight', false)"
            @mouseleave.prevent="mobileKey('ArrowRight', false)"
          >&#9654;</button>
        </div>
        <div class="mobile-right">
          <button
            class="mobile-btn jump-btn"
            @touchstart.prevent="mobileKey('Space', true)"
            @touchend.prevent="mobileKey('Space', false)"
            @touchcancel.prevent="mobileKey('Space', false)"
            @mousedown.prevent="mobileKey('Space', true)"
            @mouseup.prevent="mobileKey('Space', false)"
            @mouseleave.prevent="mobileKey('Space', false)"
          >JUMP</button>
        </div>
      </div>

      <div class="controls-help">
        <span>Move: &#8592; &#8594; / A D</span>
        <span>Jump: Space / W / &#8593;</span>
        <span>P: Pause &nbsp; M: Mute &nbsp; R: Restart &nbsp; F: Fullscreen</span>
      </div>
    </main>

    <GameLeaderboard
      :leaderboard="leaderboard"
      :highContrast="highContrast"
      :reduceMotion="reduceMotion"
      :uiScale="uiScale"
      @update:highContrast="highContrast = $event"
      @update:reduceMotion="reduceMotion = $event"
      @update:uiScale="uiScale = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import GameTopbar from './GameTopbar.vue'
import GameHud from './GameHud.vue'
import GameLeaderboard from './GameLeaderboard.vue'
import StartScreen from './StartScreen.vue'
import { LEVELS } from '../levels/index'
import type { Platform, Enemy, Fly, Hazard, CP, Particle, PowerUp, LeaderEntry } from '../levels/types'
import { useAudio } from '../composables/useAudio'
import { buildSpriteSheet } from '../composables/useSpriteSheet'
import { Engine } from '../engine/Engine'
import { Renderer, type UIState } from '../engine/Renderer'
import { Physics } from '../engine/Physics'
import type { GameState } from '../engine/GameState'
import { ENGINE, PLAYER_CFG, TIMERS, SCORING, COLORS } from '../utils/constants'

// ── Constants ─────────────────────────────────────────────────────────────────
const VIEWPORT_W = ENGINE.VIEWPORT_W
const VIEWPORT_H = ENGINE.VIEWPORT_H
const LEVEL_COUNT = LEVELS.length
const STORAGE_KEY = 'frog-lb-v2'

// ── Vue state ─────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const gameStarted = ref(false)
const playerName = ref(localStorage.getItem('frog-player-name') ?? 'Player')
const playerEmail = ref(localStorage.getItem('frog-player-email') ?? '')
const remoteScores = ref<LeaderEntry[]>([])
const isOnline = ref(false)
const scoreSubmitted = ref(false)
const scorePending = ref(false)
const nameTaken = ref(false)
watch(playerName, name => localStorage.setItem('frog-player-name', name.trim() || 'Player'))
watch(playerEmail, email => localStorage.setItem('frog-player-email', email))
const score = ref(0)
const lives = ref(3)
const gameOver = ref(false)
const paused = ref(false)
const won = ref(false)
const muted = ref(false)
const fliesCollected = ref(0)
const elapsedMs = ref(0)
const currentLevel = ref(1)
const activePower = ref('')
const difficulty = ref<'easy' | 'normal' | 'hard'>('normal')
const highContrast = ref(false)
const reduceMotion = ref(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
const uiScale = ref(1)

const totalFlies = computed(() => LEVELS[currentLevel.value - 1].flies.length)

// Apply uiScale to HUD
watch(uiScale, s => document.documentElement.style.setProperty('--ui-scale', String(s)), { immediate: true })

// ── Audio ──────────────────────────────────────────────────────────────────────
const { resumeAudio, sfxJump, sfxFly, sfxStomp, sfxHit, sfxCheckpoint, sfxPowerUp, sfxWin, startBgMusic, stopBgMusic, closeAudioCtx } = useAudio(muted, paused, gameOver, won)

// ── Leaderboard (localStorage) ────────────────────────────────────────────────
function loadSavedScores(): LeaderEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function persistScore(entry: LeaderEntry) {
  try {
    const saved = loadSavedScores()
    saved.push({ ...entry })
    saved.sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, 8)))
  } catch { /* storage unavailable */ }
}

const BASE_SCORES: LeaderEntry[] = [
  { name: 'Lily Hopper', score: 9800, flies: 18, time: 91200  },
  { name: 'Bog Knight',  score: 8650, flies: 17, time: 97300  },
  { name: 'Marsh Runner',score: 7420, flies: 14, time: 115400 },
  { name: 'Toad Prime',  score: 6310, flies: 12, time: 132900 },
]

const leaderboard = computed<LeaderEntry[]>(() => {
  const local = loadSavedScores()
  const base = isOnline.value
    ? [...remoteScores.value, ...local].sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time)
    : [...BASE_SCORES, ...local].sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time)
  if (score.value <= 0 || scoreSubmitted.value) {
    return base.slice(0, 8)
  }
  const current: LeaderEntry = {
    name: playerName.value || 'Player',
    score: score.value,
    flies: fliesCollected.value,
    time: elapsedMs.value,
    isCurrent: true,
  }
  return [...base, current]
    .sort((a, b) => b.score - a.score || b.flies - a.flies || a.time - b.time)
    .slice(0, 8)
})

async function fetchScores() {
  try {
    const res = await fetch('/api/scores')
    if (!res.ok) throw new Error()
    const data: LeaderEntry[] = await res.json()
    remoteScores.value = data
    isOnline.value = true
  } catch {
    isOnline.value = false
  }
}

async function submitScore() {
  if (score.value <= 0) return
  const name = playerName.value.trim() || 'Player'
  const email = playerEmail.value.trim()
  if (!email || !email.includes('@')) return
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, score: score.value, flies: fliesCollected.value, time: elapsedMs.value }),
    })
    if (res.status === 403) { nameTaken.value = true; return }
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (data.status === 'pending') {
      scorePending.value = true
      scoreSubmitted.value = true
    } else if (data.status === 'updated') {
      remoteScores.value = data.scores
      isOnline.value = true
      scoreSubmitted.value = true
    }
  } catch {
    isOnline.value = false
  }
}

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}
const displayTime = computed(() => formatTime(elapsedMs.value))

// ── Engine variables ──────────────────────────────────────────────────────────
let engine: Engine | null = null
let renderer: Renderer | null = null
let screenShake = 0
let levelBannerTimer = 0
let particles: Particle[] = []

let spriteSheet: HTMLImageElement | null = null

// ── Mutable world ─────────────────────────────────────────────────────────────
const world = { width: 5200, height: ENGINE.VIEWPORT_H, gravity: ENGINE.GRAVITY, cameraX: 0, bgOffset: 0, fgOffset: 0 }
const checkpoint = { x: PLAYER_CFG.START_X }
const player = {
  x: PLAYER_CFG.START_X, y: PLAYER_CFG.START_Y, w: PLAYER_CFG.WIDTH, h: PLAYER_CFG.HEIGHT,
  vx: 0, vy: 0, maxSpeed: PLAYER_CFG.MAX_SPEED, accel: PLAYER_CFG.ACCEL,
  dragGround: PLAYER_CFG.DRAG_GROUND, dragAir: PLAYER_CFG.DRAG_AIR, jumpForce: PLAYER_CFG.JUMP_FORCE,
  coyoteFrames: 0, jumpBuffer: 0, onGround: false, facing: 1,
  invincible: 0, squish: 0, checkpointPulse: 0,
  speedTimer: 0, starTimer: 0,
}

let platforms: Platform[] = []
let enemies: Enemy[] = []
let flies: Fly[] = []
let hazards: Hazard[] = []
let checkpoints: CP[] = []
let powerUps: PowerUp[] = []
let finishGate = { x: 4890, y: 362, w: 60, h: 140 }
let enemyInitData: Array<{ x: number; vx: number; hp: number }> = []

// ── State Bridge (Phase Migration) ────────────────────────────────────────────
const stateBridge = {
  get world() { return world },
  get checkpoint() { return checkpoint },
  get player() { return player },
  get platforms() { return platforms }, set platforms(v) { platforms = v },
  get enemies() { return enemies }, set enemies(v) { enemies = v },
  get flies() { return flies }, set flies(v) { flies = v },
  get hazards() { return hazards }, set hazards(v) { hazards = v },
  get checkpoints() { return checkpoints }, set checkpoints(v) { checkpoints = v },
  get powerUps() { return powerUps }, set powerUps(v) { powerUps = v },
  get finishGate() { return finishGate }, set finishGate(v) { finishGate = v },
  get enemyInitData() { return enemyInitData }, set enemyInitData(v) { enemyInitData = v },
  get particles() { return particles }, set particles(v) { particles = v },
  get screenShake() { return screenShake }, set screenShake(v) { screenShake = v },
  get levelBannerTimer() { return levelBannerTimer }, set levelBannerTimer(v) { levelBannerTimer = v },
  get currentLevel() { return currentLevel.value }, set currentLevel(v) { currentLevel.value = v },
  get score() { return score.value }, set score(v) { score.value = v },
  get fliesCollected() { return fliesCollected.value }, set fliesCollected(v) { fliesCollected.value = v },
  get lives() { return lives.value }, set lives(v) { lives.value = v },
} as unknown as GameState

// ── Level management ───────────────────────────────────────────────────────────
function loadLevel(n: number) {
  const def = LEVELS[n - 1]
  world.width = def.worldWidth
  platforms  = def.platforms.map(p => ({ ...p }))
  const speedMult = difficulty.value === 'easy' ? 0.65 : difficulty.value === 'hard' ? 1.4 : 1.0
  const hpMult   = difficulty.value === 'easy' ? 0.5  : difficulty.value === 'hard' ? 1.5 : 1.0
  enemies    = def.enemies.map(e => ({
    x: e.x, y: e.y, w: e.w, h: e.h,
    vx: e.vx * speedMult, minX: e.minX, maxX: e.maxX,
    alive: true, dying: false, deathTimer: 0,
    bob: e.bob, hue: e.hue, mood: 'walk',
    hp:    Math.max(1, Math.round((e.hp ?? 1) * hpMult)),
    maxHp: Math.max(1, Math.round((e.hp ?? 1) * hpMult)),
    isBoss: e.isBoss ?? false,
  }))
  enemyInitData = enemies.map(e => ({ x: e.x, vx: e.vx, hp: e.maxHp }))
  flies      = def.flies.map(f => ({ ...f, taken: false }))
  hazards    = def.hazards.map(h => ({ ...h }))
  checkpoints= def.checkpoints.map(c => ({ ...c, active: false }))
  powerUps   = def.powerUps.map(p => ({ ...p, taken: false }))
  finishGate = { ...def.finishGate }
  checkpoint.x = 160
}

function resetEntities(full: boolean) {
  player.x = checkpoint.x; player.y = PLAYER_CFG.START_Y
  player.vx = 0; player.vy = 0
  player.onGround = false; player.coyoteFrames = 0; player.jumpBuffer = 0
  player.invincible = 0; player.squish = 0; player.checkpointPulse = 0
  player.speedTimer = 0; player.starTimer = 0
  activePower.value = ''
  world.cameraX = Math.max(0, Math.min(checkpoint.x - 220, world.width - VIEWPORT_W))

  enemies.forEach((e, i) => {
    const init = enemyInitData[i]
    e.alive = true; e.dying = false; e.deathTimer = 0; e.mood = 'walk'
    if (init) { e.x = init.x; e.vx = init.vx; e.hp = init.hp }
  })

  if (full) {
    checkpoint.x = PLAYER_CFG.START_X
    checkpoints.forEach(c => { c.active = false })
    flies.forEach(f => { f.taken = false })
    powerUps.forEach(p => { p.taken = false })
    fliesCollected.value = 0
  }
}

function resetGame() {
  score.value = 0; elapsedMs.value = 0; scoreSubmitted.value = false; scorePending.value = false; nameTaken.value = false
  lives.value = difficulty.value === 'easy' ? 5 : difficulty.value === 'hard' ? 2 : 3
  won.value = false; paused.value = false; gameOver.value = false
  currentLevel.value = 1; particles = []; screenShake = 0
  loadLevel(1); resetEntities(true)
  levelBannerTimer = TIMERS.LEVEL_BANNER
  startBgMusic()
}

function advanceLevel() {
  score.value += SCORING.LEVEL_CLEAR_BASE + lives.value * SCORING.LEVEL_CLEAR_LIFE_BONUS + fliesCollected.value * SCORING.LEVEL_CLEAR_FLY_BONUS
  sfxWin()
  if (currentLevel.value >= LEVEL_COUNT) {
    score.value += SCORING.GAME_WIN_BONUS
    won.value = true
    persistScore({ name: playerName.value || 'Player', score: score.value, flies: fliesCollected.value, time: elapsedMs.value })
    submitScore()
    stopBgMusic()
    return
  }
  currentLevel.value++
  particles = []; screenShake = 0
  loadLevel(currentLevel.value); resetEntities(true)
  levelBannerTimer = TIMERS.LEVEL_BANNER
}

// ── Particles ──────────────────────────────────────────────────────────────────
function burst(x: number, y: number, color: string, count: number, speed: number) {
  if (reduceMotion.value) return
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const s = speed * (0.4 + Math.random() * 0.9)
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1, life: 30 + Math.random()*20, maxLife: 50, color, r: 3 + Math.random()*4 })
  }
}

// ── Game logic ─────────────────────────────────────────────────────────────────
let clearInputFrames = 0
function startGame(d: 'easy' | 'normal' | 'hard') { engine?.input.clear(); clearInputFrames = 10; difficulty.value = d; gameStarted.value = true; resetGame() }
function togglePause() { if (!gameOver.value && !won.value) paused.value = !paused.value }
function toggleMute()  { muted.value = !muted.value }
function onFullscreenChange() { isFullscreen.value = !!document.fullscreenElement }
function toggleFullscreen() {
  if (!document.fullscreenElement) stageRef.value?.requestFullscreen()
  else document.exitFullscreen()
}

function loseLife() {
  if (player.invincible > 0 || gameOver.value || won.value) return
  lives.value--
  sfxHit()
  screenShake = 10
  burst(player.x + player.w/2, player.y + player.h/2, COLORS.PARTICLE_DAMAGE, 14, 5)
  if (lives.value <= 0) { 
    gameOver.value = true
    stopBgMusic()
    persistScore({ name: playerName.value || 'Player', score: score.value, flies: fliesCollected.value, time: elapsedMs.value })
    submitScore()
    return 
  }
  player.invincible = TIMERS.INVINCIBLE_HIT
  player.x = checkpoint.x; player.y = PLAYER_CFG.RESPAWN_Y
  player.vx = 0; player.vy = PLAYER_CFG.RESPAWN_VY
  player.speedTimer = 0; player.starTimer = 0; activePower.value = ''
  world.cameraX = Math.max(0, Math.min(player.x - VIEWPORT_W * ENGINE.CAMERA_OFFSET_RATIO, world.width - VIEWPORT_W))
}

// ── Input ──────────────────────────────────────────────────────────────────────
function mobileKey(code: string, down: boolean) {
  if (engine) engine.input.setKey(code, down)
  if (down) resumeAudio()
}

function update(dt: number) {
  if (!gameStarted.value || paused.value || gameOver.value || won.value || !engine) return
  if (clearInputFrames > 0) { engine.input.clear(); clearInputFrames-- }
  elapsedMs.value += dt

  Physics.update(stateBridge, engine.input, dt, {
    onScore: (pts) => { score.value += pts },
    onFlyCollected: () => { fliesCollected.value++ },
    onLifeLost: loseLife,
    onAdvanceLevel: advanceLevel,
    sfx: (name) => {
      if (name === 'jump') sfxJump()
      if (name === 'fly') sfxFly()
      if (name === 'powerup') sfxPowerUp()
      if (name === 'stomp') sfxStomp()
      if (name === 'hit') sfxHit()
      if (name === 'checkpoint') sfxCheckpoint()
    },
    burst: burst
  }, reduceMotion.value)

  if (player.starTimer > 0) activePower.value = 'Star!'
  else if (player.speedTimer > 0) activePower.value = 'Speed!'
  else activePower.value = ''
}

// ── Render ─────────────────────────────────────────────────────────────────────
// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
  if (!renderer || !engine) return
  
  const ui: UIState = {
    won: won.value,
    gameOver: gameOver.value,
    paused: paused.value,
    fliesCollected: fliesCollected.value,
    totalFlies: totalFlies.value,
    score: score.value,
    reduceMotion: reduceMotion.value
  }

  renderer.render(stateBridge, ui)
}

// ── Keyboard (Meta Keys) ───────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
  
  const codes = ['KeyP','KeyM','KeyR','KeyF']
  if (!codes.includes(e.code)) return
  e.preventDefault(); resumeAudio()
  if (e.code === 'KeyP') { togglePause();      return }
  if (e.code === 'KeyM') { toggleMute();       return }
  if (e.code === 'KeyR') { resetGame();        return }
  if (e.code === 'KeyF') { toggleFullscreen(); return }
}

onMounted(async () => {
  engine = new Engine(canvasRef.value!)
  renderer = new Renderer(engine.ctx)
  
  engine.onUpdate = update
  engine.onRender = render
  
  spriteSheet = await buildSpriteSheet()
  renderer.spriteSheet = spriteSheet
  
  loadLevel(1); resetEntities(true)
  engine.start()
  fetchScores()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (engine) engine.stop()
  stopBgMusic()
  closeAudioCtx()
})
// register after resetGame so audio is lazily created
onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<style scoped>
:global(body) { margin: 0; background: #0f172a; }

.game-shell {
  min-height: 100vh;
  padding: 24px;
  background: radial-gradient(circle at top, rgba(125,211,252,0.18), transparent 30%),
              linear-gradient(180deg, #0b1120 0%, #0f172a 100%);
  color: #e5eefb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  position: relative; overflow: hidden;
}

.sky-decor { position: fixed; inset: 0; pointer-events: none; opacity: 0.15; }
.cloud { position: absolute; width: 220px; height: 80px; background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.25) 60%, transparent 70%); filter: blur(8px); }
.c1 { top: 70px;  left: 5%; }
.c2 { top: 140px; right: 12%; }
.c3 { top: 220px; left: 40%; }

.topbar, .stage, .panel, .stat { position: relative; z-index: 1; }
.card {
  background: rgba(15,23,42,0.74);
  border: 1px solid rgba(148,163,184,0.18);
  box-shadow: 0 22px 60px rgba(0,0,0,0.26);
  backdrop-filter: blur(14px);
}

button {
  border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 800;
  color: #0f172a; background: linear-gradient(180deg, #f8fafc 0%, #cbd5e1 100%);
  cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 10px 24px rgba(15,23,42,0.2);
}
button:hover { transform: translateY(-1px); }

.stage { max-width: 1440px; margin: 0 auto; padding: 14px; border-radius: 30px; position: relative; }
canvas { width: 100%; height: auto; display: block; border-radius: 22px; background: #7dd3fc; }

.stage:fullscreen {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  background: #0b1120; border-radius: 0; padding: 0; max-width: 100%;
}
.stage:fullscreen canvas { width: auto; height: 100vh; max-width: 100vw; border-radius: 0; }
.stage:fullscreen .mobile-controls { width: 100%; }
.stage:fullscreen .controls-help { position: absolute; bottom: 8px; }

/* Mobile controls */
.mobile-controls {
  display: flex; justify-content: space-between; padding: 14px 16px 4px; gap: 12px;
}
.mobile-left  { display: flex; gap: 14px; }
.mobile-btn {
  width: 72px; height: 72px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.12); color: #fff; font-size: 1.4rem;
  cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: none;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
.mobile-btn:active { background: rgba(255,255,255,0.28); }
.jump-btn { width: 84px; height: 84px; background: rgba(34,197,94,0.25); border-color: rgba(74,222,128,0.5); font-size: 0.9rem; font-weight: 800; }

.controls-help {
  display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
  color: #cbd5e1; font-size: 0.95rem; padding: 10px 8px 2px;
}

.score-status {
  margin: 10px 8px 0;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}
.score-status.pending {
  background: rgba(34,197,94,0.12);
  border: 1px solid rgba(74,222,128,0.3);
  color: #86efac;
}
.score-status.taken {
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
}

@media (max-width: 720px) {
  .game-shell { padding: 14px; }
  .controls-help { font-size: 0.85rem; }
}

/* ── High contrast mode ────────────────────────────── */
.game-shell.high-contrast .card {
  border-color: rgba(226,232,240,0.35);
  background: rgba(15,23,42,0.88);
}
.game-shell.high-contrast button {
  border: 1px solid rgba(226,232,240,0.4);
}
.game-shell.high-contrast .controls-help {
  color: #f1f5f9;
}
</style>
