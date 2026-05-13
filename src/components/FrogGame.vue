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

      <StartScreen v-if="!gameStarted" @start="startGame" />

      <div class="mobile-controls">
        <div class="mobile-left">
          <button
            class="mobile-btn"
            @touchstart.prevent="mobileKey('ArrowLeft', true)"
            @touchend.prevent="mobileKey('ArrowLeft', false)"
            @touchcancel.prevent="mobileKey('ArrowLeft', false)"
          >&#9664;</button>
          <button
            class="mobile-btn"
            @touchstart.prevent="mobileKey('ArrowRight', true)"
            @touchend.prevent="mobileKey('ArrowRight', false)"
            @touchcancel.prevent="mobileKey('ArrowRight', false)"
          >&#9654;</button>
        </div>
        <div class="mobile-right">
          <button
            class="mobile-btn jump-btn"
            @touchstart.prevent="mobileKey('Space', true)"
            @touchend.prevent="mobileKey('Space', false)"
            @touchcancel.prevent="mobileKey('Space', false)"
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
import { THEMES } from '../levels/themes'
import type { Platform, Enemy, Fly, Hazard, CP, Particle, PowerUp, LeaderEntry } from '../levels/types'
import { useAudio } from '../composables/useAudio'
import { buildSpriteSheet, blit, aframe, SPRITE } from '../composables/useSpriteSheet'
import { intersects, circleHitsRect } from '../utils/physics'

// ── Constants ─────────────────────────────────────────────────────────────────
const VIEWPORT_W = 1280
const VIEWPORT_H = 720
const LEVEL_COUNT = LEVELS.length
const STORAGE_KEY = 'frog-lb-v2'

// ── Vue state ─────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const gameStarted = ref(false)
const playerName = ref(localStorage.getItem('frog-player-name') ?? 'Player')
const remoteScores = ref<LeaderEntry[]>([])
const isOnline = ref(false)
watch(playerName, name => localStorage.setItem('frog-player-name', name.trim() || 'Player'))
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
  const current: LeaderEntry = {
    name: playerName.value || 'Player',
    score: score.value,
    flies: fliesCollected.value,
    time: elapsedMs.value,
    isCurrent: true,
  }
  const base = isOnline.value ? remoteScores.value : [...BASE_SCORES, ...loadSavedScores()]
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
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: score.value, flies: fliesCollected.value, time: elapsedMs.value }),
    })
    if (!res.ok) throw new Error()
    const updated: LeaderEntry[] = await res.json()
    remoteScores.value = updated
    isOnline.value = true
  } catch {
    // API unavailable — fall back to localStorage already saved by persistScore()
    isOnline.value = false
  }
}

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}
const displayTime = computed(() => formatTime(elapsedMs.value))

// ── Engine variables ──────────────────────────────────────────────────────────
let ctx!: CanvasRenderingContext2D
let raf = 0
let lastTime = 0
const keys = new Set<string>()
let screenShake = 0
let levelBannerTimer = 0
let particles: Particle[] = []

let spriteSheet: HTMLImageElement | null = null

// ── Mutable world ─────────────────────────────────────────────────────────────
const world = { width: 5200, height: 720, gravity: 0.55, cameraX: 0, bgOffset: 0, fgOffset: 0 }
const checkpoint = { x: 160 }
const player = {
  x: 160, y: 360, w: 54, h: 54,
  vx: 0, vy: 0, maxSpeed: 6.6, accel: 0.72,
  dragGround: 0.82, dragAir: 0.92, jumpForce: 14.5,
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
  player.x = checkpoint.x; player.y = 360
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
    checkpoint.x = 160
    checkpoints.forEach(c => { c.active = false })
    flies.forEach(f => { f.taken = false })
    powerUps.forEach(p => { p.taken = false })
    fliesCollected.value = 0
  }
}

function resetGame() {
  score.value = 0; elapsedMs.value = 0
  lives.value = difficulty.value === 'easy' ? 5 : difficulty.value === 'hard' ? 2 : 3
  won.value = false; paused.value = false; gameOver.value = false
  currentLevel.value = 1; particles = []; screenShake = 0
  loadLevel(1); resetEntities(true)
  levelBannerTimer = 90
  startBgMusic()
}

function advanceLevel() {
  score.value += 1000 + lives.value * 300 + fliesCollected.value * 50
  sfxWin()
  if (currentLevel.value >= LEVEL_COUNT) {
    score.value += 2000
    won.value = true
    persistScore({ name: playerName.value || 'Player', score: score.value, flies: fliesCollected.value, time: elapsedMs.value })
    submitScore()
    stopBgMusic()
    return
  }
  currentLevel.value++
  particles = []; screenShake = 0
  loadLevel(currentLevel.value); resetEntities(true)
  levelBannerTimer = 90
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
function startGame(d: 'easy' | 'normal' | 'hard') { difficulty.value = d; gameStarted.value = true; resetGame() }
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
  burst(player.x + player.w/2, player.y + player.h/2, '#ef4444', 14, 5)
  if (lives.value <= 0) { gameOver.value = true; stopBgMusic(); return }
  player.invincible = 140
  player.x = checkpoint.x; player.y = 300
  player.vx = 0; player.vy = -7
  player.speedTimer = 0; player.starTimer = 0; activePower.value = ''
  world.cameraX = Math.max(0, Math.min(player.x - VIEWPORT_W * 0.3, world.width - VIEWPORT_W))
}

function activateCP(cp: CP) {
  if (cp.active) return
  checkpoints.forEach(c => { c.active = false })
  cp.active = true; checkpoint.x = cp.x - 20
  score.value += 250; player.checkpointPulse = 40
  sfxCheckpoint()
  burst(cp.x + cp.w/2, cp.y, '#f97316', 8, 4)
}

// ── Input ──────────────────────────────────────────────────────────────────────
function mobileKey(code: string, down: boolean) {
  down ? keys.add(code) : keys.delete(code)
  if (down) resumeAudio()
}

function handleInput() {
  const left  = keys.has('ArrowLeft')  || keys.has('KeyA')
  const right = keys.has('ArrowRight') || keys.has('KeyD')
  const jump  = keys.has('Space')      || keys.has('ArrowUp') || keys.has('KeyW')
  const boost = player.speedTimer > 0 ? 1.45 : 1

  if (left  && !right) { player.vx -= player.accel * boost; player.facing = -1 }
  if (right && !left)  { player.vx += player.accel * boost; player.facing =  1 }
  if (jump) player.jumpBuffer = 8

  if (player.jumpBuffer > 0 && (player.onGround || player.coyoteFrames > 0)) {
    player.vy = -player.jumpForce
    player.onGround = false; player.coyoteFrames = 0; player.jumpBuffer = 0; player.squish = 1
    sfxJump()
  }
}

// ── Physics ────────────────────────────────────────────────────────────────────
function updatePlayer(dts: number) {
  handleInput()
  player.jumpBuffer    = Math.max(0, player.jumpBuffer - 1)
  player.coyoteFrames  = Math.max(0, player.coyoteFrames - 1)
  player.invincible    = Math.max(0, player.invincible - 1)
  player.checkpointPulse = Math.max(0, player.checkpointPulse - 1)
  player.speedTimer    = Math.max(0, player.speedTimer - 1)
  player.starTimer     = Math.max(0, player.starTimer - 1)

  if      (player.starTimer > 0)  activePower.value = 'Star!'
  else if (player.speedTimer > 0) activePower.value = 'Speed!'
  else                            activePower.value = ''

  const maxSpd = player.speedTimer > 0 ? player.maxSpeed * 1.45 : player.maxSpeed
  player.vx *= (player.onGround ? player.dragGround : player.dragAir)
  if (Math.abs(player.vx) < 0.04) player.vx = 0
  player.vx = Math.max(-maxSpd, Math.min(maxSpd, player.vx))

  player.vy = Math.min(18, player.vy + world.gravity * dts)
  player.x += player.vx * dts; resolveH()
  const wasGround = player.onGround
  player.y += player.vy * dts; player.onGround = false; resolveV()
  if (!player.onGround && wasGround) player.coyoteFrames = 8
  if (player.y > world.height + 120) loseLife()
  player.x = Math.max(0, Math.min(player.x, world.width - player.w))
  player.squish += (0 - player.squish) * 0.18
}

function resolveH() {
  for (const p of platforms) {
    if (!intersects(player, p)) continue
    player.x = player.vx > 0 ? p.x - player.w : p.x + p.w
    player.vx = 0
  }
}
function resolveV() {
  for (const p of platforms) {
    if (!intersects(player, p)) continue
    if (player.vy > 0) { player.y = p.y - player.h; player.vy = 0; player.onGround = true }
    else               { player.y = p.y + p.h; player.vy = 0 }
  }
}

function updateMovingPlatforms(dts: number) {
  for (const p of platforms) {
    if (!p.vx) continue
    p.x += p.vx * dts
    if (p.minPX !== undefined && p.maxPX !== undefined &&
        (p.x <= p.minPX || p.x + p.w >= p.maxPX)) p.vx! *= -1
  }
}

function updateCamera(dts: number) {
  const target = Math.max(0, Math.min(player.x - VIEWPORT_W * 0.35, world.width - VIEWPORT_W))
  world.cameraX += (target - world.cameraX) * Math.min(1, 0.08 * dts)
  world.bgOffset += 0.1 * dts
  world.fgOffset += 0.4 * dts
}

function updateFlies() {
  for (const f of flies) {
    if (f.taken || !circleHitsRect(f.x, f.y, f.r + 6, player)) continue
    f.taken = true; fliesCollected.value++; score.value += 100
    sfxFly(); burst(f.x, f.y, '#facc15', 8, 4)
  }
}

function updatePowerUps() {
  for (const pu of powerUps) {
    if (pu.taken || !circleHitsRect(pu.x, pu.y, pu.r + 8, player)) continue
    pu.taken = true; sfxPowerUp()
    if (pu.type === 'speed') {
      player.speedTimer = 300
      burst(pu.x, pu.y, '#86efac', 12, 5)
    } else {
      player.starTimer = 180; player.invincible = 180
      burst(pu.x, pu.y, '#fde68a', 16, 6)
    }
  }
}

function updateEnemies(dts: number) {
  for (const e of enemies) {
    if (e.dying) { e.deathTimer = Math.max(0, e.deathTimer - dts); continue }
    if (!e.alive) continue

    e.x += e.vx * dts; e.bob += 0.04 * dts
    e.mood = Math.abs(player.x - e.x) < 160 ? 'alert' : 'walk'
    if (e.x <= e.minX || e.x + e.w >= e.maxX) e.vx *= -1
    if (e.isBoss && Math.abs(player.x - e.x) < 320) e.vx = Math.sign(e.vx) * 3.8

    if (!intersects(player, e)) continue

    const stomped = player.vy > 1 && (player.y + player.h - e.y) < (e.isBoss ? 32 : 22)
    if (stomped || player.starTimer > 0) {
      e.hp--
      const killed = e.hp <= 0
      if (killed) {
        e.alive = false; e.dying = true; e.deathTimer = 20
        burst(e.x + e.w/2, e.y + e.h/2, e.isBoss ? '#f43f5e' : '#93c5fd', e.isBoss ? 26 : 10, e.isBoss ? 9 : 4)
        score.value += e.isBoss ? 1500 : 220
      } else {
        burst(e.x + e.w/2, e.y, '#f97316', 8, 4)
        score.value += 100
      }
      player.vy = e.isBoss ? -12 : -9.5; player.squish = 1.3
      sfxStomp(); screenShake = e.isBoss ? 9 : 4
    } else if (player.starTimer === 0) {
      loseLife()
    }
  }
}

function updateHazards() {
  for (const h of hazards) { if (intersects(player, h)) { loseLife(); break } }
}
function updateCheckpoints() {
  for (const cp of checkpoints) { if (intersects(player, cp)) activateCP(cp) }
}
function updateParticles(dts: number) {
  for (const p of particles) { p.x += p.vx*dts; p.y += p.vy*dts; p.vy += 0.2*dts; p.life -= dts }
  particles = particles.filter(p => p.life > 0)
}
function updateWin() {
  if (won.value || gameOver.value) return
  if (currentLevel.value === LEVEL_COUNT) {
    if (enemies.some(e => e.isBoss && e.alive)) return
  }
  if (intersects(player, finishGate)) advanceLevel()
}

function update(dt: number) {
  if (!gameStarted.value || paused.value || gameOver.value || won.value) return
  const dts = Math.min(2, dt / 16.6667)
  elapsedMs.value += dt
  updateMovingPlatforms(dts)
  updatePlayer(dts)
  updateHazards(); updateFlies(); updatePowerUps(); updateCheckpoints()
  updateEnemies(dts); updateParticles(dts); updateCamera(dts); updateWin()
  if (screenShake > 0) screenShake = reduceMotion.value ? 0 : Math.max(0, screenShake - 0.7)
}

// ── Render ─────────────────────────────────────────────────────────────────────
function rr(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  cx.beginPath()
  cx.moveTo(x+r, y); cx.lineTo(x+w-r, y); cx.quadraticCurveTo(x+w, y, x+w, y+r)
  cx.lineTo(x+w, y+h-r); cx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
  cx.lineTo(x+r, y+h); cx.quadraticCurveTo(x, y+h, x, y+h-r)
  cx.lineTo(x, y+r); cx.quadraticCurveTo(x, y, x+r, y); cx.closePath(); cx.fill()
}

function drawParallax() {
  const theme = THEMES[LEVELS[currentLevel.value - 1].theme]
  theme.drawParallax(ctx, world.cameraX, world.width, VIEWPORT_W, VIEWPORT_H)
}

function drawWorld() {
  ctx.save(); ctx.translate(-world.cameraX, 0)
  drawGround(); drawPlatforms(); drawCheckpoints(); drawFlies()
  drawPowerUps(); drawHazards(); drawEnemies(); drawFinishGate()
  drawPlayer(); drawParticlesInWorld()
  ctx.restore()
}

function drawGround() {
  const theme = THEMES[LEVELS[currentLevel.value - 1].theme]
  ctx.fillStyle = theme.groundColor; ctx.fillRect(0, 560, world.width, 160)
  for (let i = 0; i < 62; i++) {
    const x = i*96 + (Math.sin(i*3.1 + world.fgOffset*0.02)+1)*16
    ctx.fillStyle = i%3===0 ? theme.groundAccentA : theme.groundAccentB
    ctx.beginPath(); ctx.moveTo(x,560); ctx.lineTo(x+10,530); ctx.lineTo(x+18,560); ctx.closePath(); ctx.fill()
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    if (p.type === 'ground') continue
    if (p.type === 'stone') {
      ctx.fillStyle = '#64748b'; rr(ctx, p.x, p.y, p.w, p.h, 8)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, p.x+4, p.y+4, p.w-8, 6, 4)
    } else {
      ctx.fillStyle = '#8b5e34'; rr(ctx, p.x, p.y, p.w, p.h, 10)
      ctx.fillStyle = '#a16207'
      for (let i = 0; i < p.w; i+=28) ctx.fillRect(p.x+i, p.y+4, 16, p.h-8)
    }
    if (p.vx) {
      ctx.fillStyle = 'rgba(250,204,21,0.28)'; rr(ctx, p.x, p.y, p.w, p.h, 10)
    }
  }
}

function drawCheckpoints() {
  for (const cp of checkpoints) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(cp.x+10, cp.y, 8, cp.h)
    const pulse = cp.active ? 1 + Math.sin(performance.now()*0.008)*0.06 : 1
    ctx.save(); ctx.translate(cp.x+18, cp.y+10); ctx.scale(pulse, pulse)
    ctx.fillStyle = cp.active ? '#f97316' : '#cbd5e1'
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(46,14); ctx.lineTo(0,28); ctx.closePath(); ctx.fill()
    ctx.restore()
  }
}

function drawFlies() {
  const frame = aframe(12)
  for (const f of flies) {
    if (f.taken) continue
    const bob = Math.sin(performance.now()*0.008 + f.x*0.02)*5
    blit(ctx, spriteSheet!, SPRITE.rows.flySpin, frame, f.x-22, f.y-22+bob, 44, 44)
  }
}

function drawPowerUps() {
  for (const pu of powerUps) {
    if (pu.taken) continue
    const bob = Math.sin(performance.now()*0.005 + pu.x*0.01)*4
    const pulse = 1 + Math.sin(performance.now()*0.006)*0.1
    ctx.save(); ctx.translate(pu.x, pu.y+bob); ctx.scale(pulse, pulse)
    if (pu.type === 'speed') {
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(0,0,pu.r,0,Math.PI*2); ctx.fill()
      ctx.fillStyle = '#bbf7d0'; ctx.beginPath(); ctx.arc(-4,-4,5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4,-2,4,0,Math.PI*2); ctx.fill()
      ctx.fillStyle = '#052e16'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('S', 0, 4)
    } else {
      ctx.fillStyle = '#fde047'; drawStarShape(0, 0, pu.r, pu.r*0.45, 5)
      ctx.fillStyle = '#78350f'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('\u2605', 0, 3)
    }
    ctx.restore()
  }
}

function drawStarShape(cx: number, cy: number, or: number, ir: number, pts: number) {
  ctx.beginPath()
  for (let i = 0; i < pts*2; i++) {
    const a = (i*Math.PI/pts) - Math.PI/2
    const r = i%2===0 ? or : ir
    i===0 ? ctx.moveTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r) : ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r)
  }
  ctx.closePath(); ctx.fill()
}

function drawHazards() {
  for (const h of hazards) {
    const g = ctx.createLinearGradient(h.x, h.y, h.x, h.y+h.h)
    g.addColorStop(0,'#22c55e'); g.addColorStop(1,'#15803d'); ctx.fillStyle = g
    rr(ctx, h.x, h.y, h.w, h.h, 14)
    for (let i = 0; i < h.w; i+=18) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath(); ctx.arc(h.x+i+8, h.y+8+Math.sin((i+performance.now()*0.02)*0.2)*2, 4, 0, Math.PI*2); ctx.fill()
    }
  }
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.dying) {
      if (e.deathTimer <= 0) continue
      const t = 1 - e.deathTimer/20
      ctx.save(); ctx.globalAlpha = Math.max(0, 1-t)
      ctx.translate(e.x + e.w/2, e.y + e.h); ctx.scale(1 + t*1.4, Math.max(0.05, 1 - t*0.95))
      if (e.isBoss) {
        ctx.fillStyle = '#f43f5e'; rr(ctx, -e.w/2, -12, e.w, 12, 4)
      } else if (spriteSheet) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(spriteSheet, 0, SPRITE.rows.smurfWalk*SPRITE.fh, SPRITE.fw, SPRITE.fh, -22, -38, 44, 38)
      }
      ctx.restore(); continue
    }
    if (!e.alive) continue
    const yb = Math.sin(performance.now()*0.01 + e.bob)*1.6
    if (e.isBoss) { drawBoss(e, yb); continue }
    const row = e.mood==='alert' ? SPRITE.rows.smurfAlert : SPRITE.rows.smurfWalk
    const fr  = e.mood==='alert' ? aframe(7) : aframe(10)
    blit(ctx, spriteSheet!, row, fr, e.x-10, e.y-18+yb, 64, 64, e.vx > 0)
  }
}

function drawBoss(e: Enemy, yb: number) {
  const pulse = 1 + Math.sin(performance.now()*0.005)*0.04
  ctx.save()
  ctx.translate(e.x + e.w/2, e.y + e.h/2 + yb)
  ctx.scale(e.vx > 0 ? -pulse : pulse, pulse)
  ctx.fillStyle = '#1e3a8a'; rr(ctx, -44, -34, 88, 68, 14)
  ctx.fillStyle = '#fde047'
  ctx.beginPath(); ctx.moveTo(-30,-34); ctx.lineTo(-22,-56); ctx.lineTo(-8,-38); ctx.lineTo(0,-58); ctx.lineTo(8,-38); ctx.lineTo(22,-56); ctx.lineTo(30,-34); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-15,-10,10,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15,-10,10,0,Math.PI*2); ctx.fill()
  ctx.fillStyle = '#ef4444';  ctx.beginPath(); ctx.arc(-15,-10, 6,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15,-10, 6,0,Math.PI*2); ctx.fill()
  ctx.fillStyle = '#ffffff';  ctx.beginPath(); ctx.arc(-13,-12, 2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(17,-12, 2,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 10, 20, 0, Math.PI); ctx.stroke()
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-36,-52,72,9)
  ctx.fillStyle = e.hp===3 ? '#22c55e' : e.hp===2 ? '#fbbf24' : '#ef4444'
  ctx.fillRect(-36,-52, 72*(e.hp/e.maxHp), 9)
  ctx.restore()
}

function drawFinishGate() {
  const bossLocked = currentLevel.value === LEVEL_COUNT && enemies.some(e => e.isBoss && e.alive)
  ctx.fillStyle = bossLocked ? '#7f1d1d' : '#4b5563'
  ctx.fillRect(finishGate.x, finishGate.y, 10, finishGate.h)
  ctx.fillRect(finishGate.x+finishGate.w-10, finishGate.y, 10, finishGate.h)
  ctx.fillRect(finishGate.x, finishGate.y, finishGate.w, 10)
  const pulse = 1 + Math.sin(performance.now()*0.006)*0.04
  ctx.save(); ctx.translate(finishGate.x+finishGate.w/2, finishGate.y+18); ctx.scale(pulse, pulse)
  ctx.fillStyle = bossLocked ? '#dc2626' : '#f43f5e'
  rr(ctx, -36, 0, 72, 34, 10)
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(bossLocked ? 'BOSS!' : currentLevel.value < LEVEL_COUNT ? `LVL ${currentLevel.value+1}` : 'EXIT', 0, 24)
  ctx.restore()
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible/6)%2===0) return
  if (player.starTimer > 0) {
    ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#fde047'
    ctx.beginPath(); ctx.arc(player.x+player.w/2, player.y+player.h/2, 46, 0, Math.PI*2); ctx.fill(); ctx.restore()
  }
  let row = SPRITE.rows.frogIdle, frame = aframe(6)
  if      (won.value)                row = SPRITE.rows.frogVictory, frame = aframe(8)
  else if (player.invincible > 100)  row = SPRITE.rows.frogHurt,   frame = aframe(8)
  else if (!player.onGround)         row = SPRITE.rows.frogJump,   frame = Math.min(5, Math.floor(Math.max(-12, Math.min(12, player.vy+12))/4))
  else if (Math.abs(player.vx) > 1.1) row = SPRITE.rows.frogRun,  frame = aframe(12)

  if (player.checkpointPulse > 0) {
    ctx.fillStyle = 'rgba(250,204,21,0.22)'
    ctx.beginPath(); ctx.arc(player.x+player.w/2, player.y+player.h/2, 48+player.checkpointPulse*0.5, 0, Math.PI*2); ctx.fill()
  }
  blit(ctx, spriteSheet!, row, frame, player.x-10, player.y-14, 74, 74, player.facing < 0)
}

function drawParticlesInWorld() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life/p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawOverlay() {
  if (!paused.value && !gameOver.value && !won.value) return
  ctx.fillStyle = 'rgba(15,23,42,0.48)'; ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H)
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 54px sans-serif'
  if      (won.value)      ctx.fillText('Victory!',  VIEWPORT_W/2, VIEWPORT_H/2-20)
  else if (gameOver.value) ctx.fillText('Game Over', VIEWPORT_W/2, VIEWPORT_H/2-20)
  else                     ctx.fillText('Paused',    VIEWPORT_W/2, VIEWPORT_H/2-20)
  ctx.font = '24px sans-serif'
  const sub = won.value      ? `Final score ${score.value} \u00B7 ${fliesCollected.value}/${totalFlies.value} flies \u00B7 All levels cleared!`
            : gameOver.value ? 'Press R to try again.'
            : 'Press P or tap Resume.'
  ctx.fillText(sub, VIEWPORT_W/2, VIEWPORT_H/2+28)
}

function drawLevelBanner() {
  if (levelBannerTimer <= 0) return
  const alpha = Math.min(1, levelBannerTimer/40)
  ctx.save(); ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(15,23,42,0.72)'; ctx.fillRect(0, VIEWPORT_H/2-52, VIEWPORT_W, 104)
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'
  const names = ['Swamp Forest','Crystal Cave','Sky Kingdom','Lava Fields','Dark Fortress','Frozen Peaks','Scorched Sands','Jungle Depths','Sunken Reef','The Void']
  ctx.fillText(`Level ${currentLevel.value}: ${names[currentLevel.value-1]}`, VIEWPORT_W/2, VIEWPORT_H/2+14)
  ctx.restore()
  levelBannerTimer--
}

function render() {
  const sx = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0
  const sy = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0
  ctx.save(); ctx.translate(sx, sy)
  drawParallax(); drawWorld(); drawOverlay(); drawLevelBanner()
  ctx.restore()
}

function gameLoop(ts: number) {
  if (!lastTime) lastTime = ts
  const dt = Math.min(40, ts - lastTime); lastTime = ts
  update(dt); render()
  raf = requestAnimationFrame(gameLoop)
}

// ── Keyboard ───────────────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  const codes = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','KeyP','KeyM','KeyR','KeyF']
  if (!codes.includes(e.code)) return
  e.preventDefault(); resumeAudio()
  if (e.code === 'KeyP') { togglePause();      return }
  if (e.code === 'KeyM') { toggleMute();       return }
  if (e.code === 'KeyR') { resetGame();        return }
  if (e.code === 'KeyF') { toggleFullscreen(); return }
  keys.add(e.code)
}
function onKeyUp(e: KeyboardEvent) { keys.delete(e.code) }

onMounted(async () => {
  ctx = canvasRef.value!.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  spriteSheet = await buildSpriteSheet()
  loadLevel(1); resetEntities(true)
  raf = requestAnimationFrame(gameLoop)
  fetchScores()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  cancelAnimationFrame(raf); stopBgMusic()
  closeAudioCtx()
})
// register after resetGame so audio is lazily created
onMounted(() => {
  window.addEventListener('keydown', onKeyDown, { passive: false })
  window.addEventListener('keyup', onKeyUp)
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
