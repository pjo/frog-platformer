<template>
  <div class="game-shell">
    <div class="sky-decor">
      <div class="cloud c1"></div>
      <div class="cloud c2"></div>
      <div class="cloud c3"></div>
    </div>

    <header class="topbar card">
      <div>
        <h1>Frog vs. Smurf Invaders</h1>
        <p>
          A polished side-scrolling platformer with sprite rendering, sound effects,
          collectibles, checkpoints, parallax, and a live scoreboard.
        </p>
      </div>
      <div class="actions">
        <button @click="togglePause">{{ paused ? 'Resume' : 'Pause' }}</button>
        <button @click="resetGame">Restart</button>
        <button @click="toggleMute">{{ muted ? 'Unmute' : 'Mute' }}</button>
      </div>
    </header>

    <section class="hud-grid">
      <div class="card stat">
        <span class="label">Score</span>
        <strong>{{ score.toString().padStart(5, '0') }}</strong>
      </div>
      <div class="card stat">
        <span class="label">Lives</span>
        <strong>{{ lives }}</strong>
      </div>
      <div class="card stat">
        <span class="label">Flies</span>
        <strong>{{ fliesCollected }}/{{ totalFlies }}</strong>
      </div>
      <div class="card stat">
        <span class="label">Time</span>
        <strong>{{ displayTime }}</strong>
      </div>
      <div class="card stat">
        <span class="label">Status</span>
        <strong>{{ won ? 'Victory' : gameOver ? 'Defeat' : paused ? 'Paused' : 'Running' }}</strong>
      </div>
    </section>

    <main class="stage card">
      <canvas ref="canvasRef" :width="viewport.width" :height="viewport.height"></canvas>
      <div class="controls-help">
        <span>Move: ← → or A D</span>
        <span>Jump: Space / W / ↑</span>
        <span>Down: S / ↓</span>
      </div>
    </main>

    <section class="bottom-grid">
      <div class="card panel">
        <h2>Scoreboard</h2>
        <div class="leaderboard">
          <div class="leader-row header">
            <span>#</span>
            <span>Name</span>
            <span>Score</span>
            <span>Flies</span>
            <span>Time</span>
          </div>
          <div
            v-for="(entry, index) in leaderboard"
            :key="`${entry.name}-${entry.score}-${index}`"
            class="leader-row"
            :class="{ active: entry.name === 'You' }"
          >
            <span>{{ index + 1 }}</span>
            <span>{{ entry.name }}</span>
            <span>{{ entry.score }}</span>
            <span>{{ entry.flies }}</span>
            <span>{{ formatTime(entry.time) }}</span>
          </div>
        </div>
      </div>

      <div class="card panel">
        <h2>Game Notes</h2>
        <ul>
          <li>Smurf aliens patrol platforms and can be stomped from above.</li>
          <li>Golden flies boost score. Some hover in risky positions.</li>
          <li>Checkpoint mushrooms save progress through the swamp.</li>
          <li>Parallax layers and a following camera give it a proper platform feel.</li>
          <li>Web Audio generates jump, stomp, pickup, hit, checkpoint, and win sounds.</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref(null)
const viewport = { width: 1280, height: 720 }

const score = ref(0)
const lives = ref(3)
const gameOver = ref(false)
const paused = ref(false)
const won = ref(false)
const muted = ref(false)
const fliesCollected = ref(0)
const elapsedMs = ref(0)

const totalFlies = 18
const PLAYER_NAME = 'You'

const leaderboard = computed(() => {
  const base = [
    { name: 'Lily Hopper', score: 9800, flies: 18, time: 91200 },
    { name: 'Bog Knight', score: 8650, flies: 17, time: 97300 },
    { name: 'Marsh Runner', score: 7420, flies: 14, time: 115400 },
    { name: 'Toad Prime', score: 6310, flies: 12, time: 132900 },
  ]

  const current = {
    name: PLAYER_NAME,
    score: score.value,
    flies: fliesCollected.value,
    time: elapsedMs.value,
  }

  return [...base, current].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.flies !== a.flies) return b.flies - a.flies
    return a.time - b.time
  })
})

const displayTime = computed(() => formatTime(elapsedMs.value))

let ctx
let raf = 0
let lastTime = 0
let audioCtx = null
let keys = new Set()

let spriteSheetCanvas = null
const spriteMeta = {
  frameWidth: 64,
  frameHeight: 64,
  rows: {
    frogIdle: 0,
    frogRun: 1,
    frogJump: 2,
    frogHurt: 3,
    frogVictory: 4,
    smurfWalk: 5,
    smurfAlert: 6,
    flySpin: 7,
  },
}

const world = {
  width: 5200,
  height: 720,
  gravity: 0.55,
  cameraX: 0,
  backgroundOffset: 0,
  foregroundOffset: 0,
}

const checkpoint = {
  x: 160,
  y: 0,
}

const player = {
  x: 160,
  y: 360,
  w: 54,
  h: 54,
  vx: 0,
  vy: 0,
  maxSpeed: 6.6,
  accel: 0.72,
  dragGround: 0.82,
  dragAir: 0.92,
  jumpForce: 14.5,
  coyoteFrames: 0,
  jumpBuffer: 0,
  onGround: false,
  facing: 1,
  invincible: 0,
  squish: 0,
  checkpointPulse: 0,
}

const finishGate = { x: 4890, y: 362, w: 60, h: 140 }

const platforms = [
  { x: 0, y: 560, w: 780, h: 160, type: 'ground' },
  { x: 860, y: 560, w: 880, h: 160, type: 'ground' },
  { x: 1800, y: 560, w: 620, h: 160, type: 'ground' },
  { x: 2490, y: 560, w: 760, h: 160, type: 'ground' },
  { x: 3350, y: 560, w: 650, h: 160, type: 'ground' },
  { x: 4080, y: 560, w: 1120, h: 160, type: 'ground' },
  { x: 250, y: 460, w: 140, h: 24, type: 'stone' },
  { x: 470, y: 392, w: 130, h: 22, type: 'stone' },
  { x: 690, y: 330, w: 130, h: 22, type: 'stone' },
  { x: 1040, y: 425, w: 180, h: 22, type: 'wood' },
  { x: 1310, y: 355, w: 160, h: 22, type: 'wood' },
  { x: 1570, y: 290, w: 160, h: 22, type: 'wood' },
  { x: 1930, y: 438, w: 160, h: 22, type: 'stone' },
  { x: 2180, y: 365, w: 140, h: 22, type: 'stone' },
  { x: 2570, y: 462, w: 130, h: 22, type: 'stone' },
  { x: 2780, y: 398, w: 150, h: 22, type: 'stone' },
  { x: 3000, y: 333, w: 170, h: 22, type: 'wood' },
  { x: 3440, y: 460, w: 150, h: 22, type: 'stone' },
  { x: 3660, y: 390, w: 150, h: 22, type: 'stone' },
  { x: 3890, y: 322, w: 150, h: 22, type: 'stone' },
  { x: 4290, y: 444, w: 150, h: 22, type: 'wood' },
  { x: 4510, y: 376, w: 150, h: 22, type: 'wood' },
  { x: 4700, y: 304, w: 130, h: 22, type: 'wood' },
]

const hazards = [
  { x: 780, y: 685, w: 80, h: 35, type: 'slime' },
  { x: 1740, y: 685, w: 60, h: 35, type: 'slime' },
  { x: 2420, y: 685, w: 70, h: 35, type: 'slime' },
  { x: 3250, y: 685, w: 100, h: 35, type: 'slime' },
  { x: 4000, y: 685, w: 80, h: 35, type: 'slime' },
]

const checkpoints = [
  { x: 1260, y: 500, w: 28, h: 60, active: false },
  { x: 2870, y: 498, w: 28, h: 62, active: false },
  { x: 4290, y: 498, w: 28, h: 62, active: false },
]

const flies = [
  { x: 308, y: 420, r: 10, taken: false },
  { x: 524, y: 352, r: 10, taken: false },
  { x: 744, y: 290, r: 10, taken: false },
  { x: 1080, y: 385, r: 10, taken: false },
  { x: 1180, y: 385, r: 10, taken: false },
  { x: 1370, y: 315, r: 10, taken: false },
  { x: 1630, y: 250, r: 10, taken: false },
  { x: 1985, y: 398, r: 10, taken: false },
  { x: 2232, y: 325, r: 10, taken: false },
  { x: 2610, y: 422, r: 10, taken: false },
  { x: 2850, y: 358, r: 10, taken: false },
  { x: 3076, y: 292, r: 10, taken: false },
  { x: 3494, y: 420, r: 10, taken: false },
  { x: 3714, y: 350, r: 10, taken: false },
  { x: 3942, y: 282, r: 10, taken: false },
  { x: 4338, y: 404, r: 10, taken: false },
  { x: 4558, y: 336, r: 10, taken: false },
  { x: 4748, y: 264, r: 10, taken: false },
]

const enemies = [
  { x: 960, y: 522, w: 44, h: 38, vx: 1.0, minX: 900, maxX: 1330, alive: true, bob: 0, hue: 0, mood: 'walk' },
  { x: 1430, y: 317, w: 44, h: 38, vx: -1.2, minX: 1320, maxX: 1510, alive: true, bob: 0.8, hue: 14, mood: 'walk' },
  { x: 1895, y: 522, w: 44, h: 38, vx: 1.4, minX: 1840, maxX: 2340, alive: true, bob: 1.4, hue: 4, mood: 'walk' },
  { x: 2830, y: 360, w: 44, h: 38, vx: -1.6, minX: 2790, maxX: 2940, alive: true, bob: 2.2, hue: 10, mood: 'walk' },
  { x: 3470, y: 422, w: 44, h: 38, vx: 1.3, minX: 3410, maxX: 3600, alive: true, bob: 0.3, hue: 6, mood: 'walk' },
  { x: 4140, y: 522, w: 44, h: 38, vx: -1.5, minX: 4110, maxX: 4660, alive: true, bob: 1.8, hue: 12, mood: 'walk' },
  { x: 4705, y: 266, w: 44, h: 38, vx: 1.1, minX: 4680, maxX: 4790, alive: true, bob: 0.5, hue: 18, mood: 'walk' },
]

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function resumeAudio() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioCtor) return
    audioCtx = new AudioCtor()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
}

function playTone(type, frequency, duration, volume = 0.04, frequency2 = null) {
  if (muted.value) return
  resumeAudio()
  if (!audioCtx) return

  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)
  if (frequency2 !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency2), now + duration)
  }
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

function sfxJump() { playTone('square', 420, 0.12, 0.03, 620) }
function sfxPickup() { playTone('triangle', 860, 0.12, 0.035, 1120) }
function sfxStomp() { playTone('square', 180, 0.15, 0.045, 90) }
function sfxHit() { playTone('sawtooth', 240, 0.2, 0.04, 120) }
function sfxCheckpoint() { playTone('triangle', 540, 0.26, 0.04, 920) }
function sfxWin() { playTone('triangle', 660, 0.18, 0.03, 990); setTimeout(() => playTone('triangle', 990, 0.22, 0.03, 1320), 120) }

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function circleIntersectsRect(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w))
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h))
  const dx = circle.x - nearestX
  const dy = circle.y - nearestY
  return dx * dx + dy * dy < circle.r * circle.r
}

function buildSpriteSheet() {
  const frameWidth = spriteMeta.frameWidth
  const frameHeight = spriteMeta.frameHeight
  const rows = Object.keys(spriteMeta.rows).length
  const cols = 6

  const sheet = document.createElement('canvas')
  sheet.width = frameWidth * cols
  sheet.height = frameHeight * rows
  const sctx = sheet.getContext('2d')
  sctx.imageSmoothingEnabled = false

  for (let i = 0; i < cols; i++) {
    drawFrogFrame(sctx, i * frameWidth, spriteMeta.rows.frogIdle * frameHeight, i, 'idle')
    drawFrogFrame(sctx, i * frameWidth, spriteMeta.rows.frogRun * frameHeight, i, 'run')
    drawFrogFrame(sctx, i * frameWidth, spriteMeta.rows.frogJump * frameHeight, i, 'jump')
    drawFrogFrame(sctx, i * frameWidth, spriteMeta.rows.frogHurt * frameHeight, i, 'hurt')
    drawFrogFrame(sctx, i * frameWidth, spriteMeta.rows.frogVictory * frameHeight, i, 'victory')
    drawSmurfFrame(sctx, i * frameWidth, spriteMeta.rows.smurfWalk * frameHeight, i, 'walk')
    drawSmurfFrame(sctx, i * frameWidth, spriteMeta.rows.smurfAlert * frameHeight, i, 'alert')
    drawFlyFrame(sctx, i * frameWidth, spriteMeta.rows.flySpin * frameHeight, i)
  }

  spriteSheetCanvas = sheet
}

function pxRect(sctx, x, y, w, h, color) {
  sctx.fillStyle = color
  sctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function drawFrogFrame(sctx, ox, oy, frame, state) {
  const phase = frame % 6
  const legShift = state === 'run' ? [0, 3, 5, 3, 0, -1][phase] : state === 'jump' ? -3 : 0
  const armShift = state === 'run' ? [2, 0, -2, -1, 1, 2][phase] : state === 'victory' ? -5 : 0
  const blink = state === 'idle' && phase === 4
  const mouthOpen = state === 'hurt' ? 1 : state === 'victory' ? 2 : 0
  const squat = state === 'jump' ? -4 : state === 'hurt' ? 2 : 0

  pxRect(sctx, ox + 20, oy + 22 + squat, 24, 22, '#22c55e')
  pxRect(sctx, ox + 18, oy + 18 + squat, 28, 12, '#16a34a')
  pxRect(sctx, ox + 16, oy + 12 + squat, 32, 16, '#22c55e')

  pxRect(sctx, ox + 18, oy + 6 + squat, 10, 10, '#4ade80')
  pxRect(sctx, ox + 36, oy + 6 + squat, 10, 10, '#4ade80')
  pxRect(sctx, ox + 20, oy + 8 + squat, 6, 6, '#ffffff')
  pxRect(sctx, ox + 38, oy + 8 + squat, 6, 6, '#ffffff')
  if (!blink) {
    pxRect(sctx, ox + 22, oy + 10 + squat, 2, 2, '#0f172a')
    pxRect(sctx, ox + 40, oy + 10 + squat, 2, 2, '#0f172a')
  } else {
    pxRect(sctx, ox + 20, oy + 11 + squat, 6, 1, '#0f172a')
    pxRect(sctx, ox + 38, oy + 11 + squat, 6, 1, '#0f172a')
  }

  pxRect(sctx, ox + 24, oy + 21 + squat, 16, mouthOpen === 2 ? 4 : 3, mouthOpen ? '#14532d' : '#166534')
  if (mouthOpen === 1) pxRect(sctx, ox + 27, oy + 23 + squat, 10, 3, '#ef4444')

  pxRect(sctx, ox + 12 - armShift, oy + 24 + squat, 8, 7, '#22c55e')
  pxRect(sctx, ox + 44 + armShift, oy + 24 + squat, 8, 7, '#22c55e')
  pxRect(sctx, ox + 10 - armShift, oy + 29 + squat, 6, 5, '#16a34a')
  pxRect(sctx, ox + 48 + armShift, oy + 29 + squat, 6, 5, '#16a34a')

  pxRect(sctx, ox + 22, oy + 42 + squat, 8, 10 + legShift, '#166534')
  pxRect(sctx, ox + 34, oy + 42 + squat, 8, 10 - legShift, '#166534')
  pxRect(sctx, ox + 20, oy + 52 + squat + legShift, 12, 4, '#14532d')
  pxRect(sctx, ox + 32, oy + 52 + squat - legShift, 12, 4, '#14532d')
}

function drawSmurfFrame(sctx, ox, oy, frame, state) {
  const phase = frame % 6
  const step = state === 'walk' ? [0, 2, 3, 2, 0, -1][phase] : 0
  const eyeWide = state === 'alert' && (phase === 2 || phase === 3)
  const mouth = state === 'alert' ? 4 : 2

  pxRect(sctx, ox + 18, oy + 22, 28, 22, '#60a5fa')
  pxRect(sctx, ox + 18, oy + 14, 28, 12, '#93c5fd')
  pxRect(sctx, ox + 16, oy + 10, 32, 10, '#ffffff')
  pxRect(sctx, ox + 22, oy + 6, 20, 6, '#ffffff')
  pxRect(sctx, ox + 20, oy + 4, 24, 4, '#e2e8f0')

  pxRect(sctx, ox + 22, oy + 20, 20, 12, '#f8fafc')
  pxRect(sctx, ox + 22, oy + 18, 6, eyeWide ? 6 : 4, '#ffffff')
  pxRect(sctx, ox + 36, oy + 18, 6, eyeWide ? 6 : 4, '#ffffff')
  pxRect(sctx, ox + 24, oy + 20, 2, 2, '#0f172a')
  pxRect(sctx, ox + 38, oy + 20, 2, 2, '#0f172a')
  pxRect(sctx, ox + 27, oy + 28, 10, mouth, '#1e293b')

  pxRect(sctx, ox + 20, oy + 44, 8, 9 + step, '#2563eb')
  pxRect(sctx, ox + 36, oy + 44, 8, 9 - step, '#2563eb')
  pxRect(sctx, ox + 18, oy + 52 + step, 10, 4, '#1d4ed8')
  pxRect(sctx, ox + 36, oy + 52 - step, 10, 4, '#1d4ed8')
}

function drawFlyFrame(sctx, ox, oy, frame) {
  const wings = [8, 10, 12, 10, 8, 6][frame % 6]
  pxRect(sctx, ox + 28, oy + 24, 8, 16, '#facc15')
  pxRect(sctx, ox + 24, oy + 28, 16, 8, '#eab308')
  pxRect(sctx, ox + 18, oy + 22, wings, 4, 'rgba(255,255,255,0.8)')
  pxRect(sctx, ox + 64 - 18 - wings, oy + 22, wings, 4, 'rgba(255,255,255,0.8)')
  pxRect(sctx, ox + 30, oy + 20, 4, 4, '#111827')
}

function drawSprite(row, frameIndex, dx, dy, dw, dh, options = {}) {
  if (!spriteSheetCanvas) return
  const fw = spriteMeta.frameWidth
  const fh = spriteMeta.frameHeight
  const sx = (frameIndex % 6) * fw
  const sy = row * fh

  ctx.save()
  ctx.translate(dx + dw / 2, dy + dh / 2)
  ctx.scale(options.flipX ? -1 : 1, 1)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(spriteSheetCanvas, sx, sy, fw, fh, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

function getAnimatedFrame(speed = 8, count = 6) {
  return Math.floor(performance.now() / (1000 / speed)) % count
}

function resetEntities(fullReset = true) {
  player.x = checkpoint.x
  player.y = 360
  player.vx = 0
  player.vy = 0
  player.onGround = false
  player.coyoteFrames = 0
  player.jumpBuffer = 0
  player.invincible = 0
  player.squish = 0
  player.checkpointPulse = 0
  world.cameraX = Math.max(0, Math.min(checkpoint.x - 220, world.width - viewport.width))

  enemies.forEach((enemy, index) => {
    enemy.alive = true
    enemy.x = [960, 1430, 1895, 2830, 3470, 4140, 4705][index]
    enemy.vx = Math.sign(enemy.vx || 1) * Math.abs([1.0, -1.2, 1.4, -1.6, 1.3, -1.5, 1.1][index])
    enemy.mood = 'walk'
  })

  if (fullReset) {
    checkpoint.x = 160
    checkpoints.forEach((c) => { c.active = false })
    flies.forEach((fly) => { fly.taken = false })
    fliesCollected.value = 0
  }
}

function resetGame() {
  score.value = 0
  lives.value = 3
  elapsedMs.value = 0
  won.value = false
  paused.value = false
  gameOver.value = false
  resetEntities(true)
}

function togglePause() {
  if (gameOver.value || won.value) return
  paused.value = !paused.value
}

function toggleMute() {
  muted.value = !muted.value
}

function loseLife() {
  if (player.invincible > 0 || gameOver.value || won.value) return
  lives.value -= 1
  sfxHit()
  if (lives.value <= 0) {
    gameOver.value = true
    paused.value = false
    return
  }
  player.invincible = 140
  player.x = checkpoint.x
  player.y = 300
  player.vx = 0
  player.vy = -7
  world.cameraX = Math.max(0, Math.min(player.x - viewport.width * 0.3, world.width - viewport.width))
}

function activateCheckpoint(cp) {
  if (cp.active) return
  checkpoints.forEach((c) => { c.active = false })
  cp.active = true
  checkpoint.x = cp.x - 20
  score.value += 250
  player.checkpointPulse = 40
  sfxCheckpoint()
}

function handleInput() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA')
  const right = keys.has('ArrowRight') || keys.has('KeyD')
  const wantsJump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')

  if (left && !right) {
    player.vx -= player.accel
    player.facing = -1
  } else if (right && !left) {
    player.vx += player.accel
    player.facing = 1
  }

  if (wantsJump) player.jumpBuffer = 8

  const canJump = player.onGround || player.coyoteFrames > 0
  if (player.jumpBuffer > 0 && canJump) {
    player.vy = -player.jumpForce
    player.onGround = false
    player.coyoteFrames = 0
    player.jumpBuffer = 0
    player.squish = 1
    sfxJump()
  }
}

function updatePlayerPhysics(dtScale) {
  handleInput()

  player.jumpBuffer = Math.max(0, player.jumpBuffer - 1)
  player.coyoteFrames = Math.max(0, player.coyoteFrames - 1)
  player.invincible = Math.max(0, player.invincible - 1)
  player.checkpointPulse = Math.max(0, player.checkpointPulse - 1)

  const drag = player.onGround ? player.dragGround : player.dragAir
  player.vx *= drag
  if (Math.abs(player.vx) < 0.04) player.vx = 0
  player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx))

  player.vy += world.gravity * dtScale
  if (player.vy > 18) player.vy = 18

  player.x += player.vx * dtScale
  resolveHorizontalCollisions()

  const previousOnGround = player.onGround
  player.y += player.vy * dtScale
  player.onGround = false
  resolveVerticalCollisions()

  if (!player.onGround && previousOnGround) player.coyoteFrames = 8

  if (player.y > world.height + 120) loseLife()
  if (player.x < 0) player.x = 0
  if (player.x + player.w > world.width) player.x = world.width - player.w

  player.squish += (0 - player.squish) * 0.18
}

function resolveHorizontalCollisions() {
  for (const platform of platforms) {
    if (!intersects(player, platform)) continue
    if (player.vx > 0) player.x = platform.x - player.w
    else if (player.vx < 0) player.x = platform.x + platform.w
    player.vx = 0
  }
}

function resolveVerticalCollisions() {
  for (const platform of platforms) {
    if (!intersects(player, platform)) continue
    if (player.vy > 0) {
      player.y = platform.y - player.h
      player.vy = 0
      player.onGround = true
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h
      player.vy = 0
    }
  }
}

function updateCamera(dtScale) {
  const target = Math.max(0, Math.min(player.x - viewport.width * 0.35, world.width - viewport.width))
  world.cameraX += (target - world.cameraX) * Math.min(1, 0.08 * dtScale)
  world.backgroundOffset += 0.1 * dtScale
  world.foregroundOffset += 0.4 * dtScale
}

function updateFlies() {
  for (const fly of flies) {
    if (fly.taken) continue
    if (circleIntersectsRect({ x: fly.x, y: fly.y, r: fly.r + 6 }, player)) {
      fly.taken = true
      fliesCollected.value += 1
      score.value += 100
      sfxPickup()
    }
  }
}

function updateCheckpoints() {
  for (const cp of checkpoints) {
    if (intersects(player, cp)) activateCheckpoint(cp)
  }
}

function updateHazards() {
  for (const hazard of hazards) {
    if (intersects(player, hazard)) {
      loseLife()
      break
    }
  }
}

function updateEnemies(dtScale) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    enemy.x += enemy.vx * dtScale
    enemy.bob += 0.04 * dtScale
    enemy.mood = Math.abs(player.x - enemy.x) < 120 ? 'alert' : 'walk'
    if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) enemy.vx *= -1

    if (!intersects(player, enemy)) continue

    const playerBottom = player.y + player.h
    const stomped = player.vy > 1 && playerBottom - enemy.y < 20

    if (stomped) {
      enemy.alive = false
      player.vy = -9.5
      player.squish = 1.3
      score.value += 220
      sfxStomp()
    } else {
      loseLife()
    }
  }
}

function updateWinCondition() {
  if (won.value || gameOver.value) return
  if (intersects(player, finishGate)) {
    won.value = true
    paused.value = false
    score.value += 1000 + lives.value * 300 + fliesCollected.value * 50
    sfxWin()
  }
}

function update(dt) {
  if (paused.value || gameOver.value || won.value) return
  const dtScale = Math.min(2, dt / 16.6667)
  elapsedMs.value += dt
  updatePlayerPhysics(dtScale)
  updateHazards()
  updateFlies()
  updateCheckpoints()
  updateEnemies(dtScale)
  updateCamera(dtScale)
  updateWinCondition()
}

function drawParallax() {
  const w = viewport.width
  const h = viewport.height

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(0.5, '#bae6fd')
  sky.addColorStop(1, '#dcfce7')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  drawSun(1050, 120, 54)

  for (let i = 0; i < 6; i++) {
    const mx = ((i * 260) - (world.cameraX * 0.15) + world.width) % (w + 260) - 130
    drawMountain(mx, 420, 250, 180, i % 2 === 0 ? '#94a3b8' : '#a8b4c5')
  }

  for (let i = 0; i < 7; i++) {
    const tx = ((i * 210) - (world.cameraX * 0.4) + world.width) % (w + 210) - 80
    drawTree(tx, 500 + ((i % 2) * 18))
  }
}

function drawSun(x, y, r) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(253, 224, 71, 0.25)'
  ctx.beginPath()
  ctx.arc(0, 0, r + 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawMountain(x, baseY, widthM, heightM, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.lineTo(x + widthM / 2, baseY - heightM)
  ctx.lineTo(x + widthM, baseY)
  ctx.closePath()
  ctx.fill()
}

function drawTree(x, y) {
  ctx.fillStyle = '#7c5a3a'
  ctx.fillRect(x + 24, y - 80, 16, 80)
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(x + 32, y - 98, 36, 0, Math.PI * 2)
  ctx.arc(x + 8, y - 68, 28, 0, Math.PI * 2)
  ctx.arc(x + 56, y - 66, 28, 0, Math.PI * 2)
  ctx.fill()
}

function drawWorld() {
  const offsetX = world.cameraX
  ctx.save()
  ctx.translate(-offsetX, 0)

  drawGroundDecor()
  drawPlatforms()
  drawCheckpoints()
  drawFlies()
  drawHazards()
  drawEnemies()
  drawFinishGate()
  drawPlayer()

  ctx.restore()
}

function drawGroundDecor() {
  ctx.fillStyle = '#65a30d'
  ctx.fillRect(0, 560, world.width, 160)

  for (let i = 0; i < 55; i++) {
    const x = i * 96 + ((Math.sin(i * 3.1 + world.foregroundOffset * 0.02) + 1) * 16)
    ctx.fillStyle = i % 3 === 0 ? '#84cc16' : '#4d7c0f'
    ctx.beginPath()
    ctx.moveTo(x, 560)
    ctx.lineTo(x + 10, 530)
    ctx.lineTo(x + 18, 560)
    ctx.closePath()
    ctx.fill()
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    if (p.type === 'ground') continue
    if (p.type === 'stone') {
      ctx.fillStyle = '#64748b'
      roundRect(ctx, p.x, p.y, p.w, p.h, 8, true)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      roundRect(ctx, p.x + 4, p.y + 4, p.w - 8, 6, 4, true)
    } else {
      ctx.fillStyle = '#8b5e34'
      roundRect(ctx, p.x, p.y, p.w, p.h, 10, true)
      ctx.fillStyle = '#a16207'
      for (let i = 0; i < p.w; i += 28) {
        ctx.fillRect(p.x + i, p.y + 4, 16, p.h - 8)
      }
    }
  }
}

function drawCheckpoints() {
  for (const cp of checkpoints) {
    ctx.fillStyle = '#78350f'
    ctx.fillRect(cp.x + 10, cp.y, 8, cp.h)

    const pulse = cp.active ? 1 + Math.sin(performance.now() * 0.008) * 0.06 : 1
    ctx.save()
    ctx.translate(cp.x + 18, cp.y + 10)
    ctx.scale(pulse, pulse)
    ctx.fillStyle = cp.active ? '#f97316' : '#cbd5e1'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(46, 14)
    ctx.lineTo(0, 28)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function drawFlies() {
  const frame = getAnimatedFrame(12)
  for (const fly of flies) {
    if (fly.taken) continue
    const bob = Math.sin(performance.now() * 0.008 + fly.x * 0.02) * 5
    drawSprite(spriteMeta.rows.flySpin, frame, fly.x - 22, fly.y - 22 + bob, 44, 44)
  }
}

function drawHazards() {
  for (const hazard of hazards) {
    const grad = ctx.createLinearGradient(hazard.x, hazard.y, hazard.x, hazard.y + hazard.h)
    grad.addColorStop(0, '#22c55e')
    grad.addColorStop(1, '#15803d')
    ctx.fillStyle = grad
    roundRect(ctx, hazard.x, hazard.y, hazard.w, hazard.h, 14, true)

    for (let i = 0; i < hazard.w; i += 18) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.arc(hazard.x + i + 8, hazard.y + 8 + Math.sin((i + performance.now() * 0.02) * 0.2) * 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const row = enemy.mood === 'alert' ? spriteMeta.rows.smurfAlert : spriteMeta.rows.smurfWalk
    const frame = enemy.mood === 'alert' ? getAnimatedFrame(7) : getAnimatedFrame(10)
    const yBob = Math.sin(performance.now() * 0.01 + enemy.bob) * 1.6
    drawSprite(row, frame, enemy.x - 10, enemy.y - 18 + yBob, 64, 64, { flipX: enemy.vx > 0 })
  }
}

function drawFinishGate() {
  ctx.fillStyle = '#4b5563'
  ctx.fillRect(finishGate.x, finishGate.y, 10, finishGate.h)
  ctx.fillRect(finishGate.x + finishGate.w - 10, finishGate.y, 10, finishGate.h)
  ctx.fillRect(finishGate.x, finishGate.y, finishGate.w, 10)

  const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.04
  ctx.save()
  ctx.translate(finishGate.x + finishGate.w / 2, finishGate.y + 18)
  ctx.scale(pulse, pulse)
  ctx.fillStyle = '#f43f5e'
  roundRect(ctx, -36, 0, 72, 34, 10, true)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('EXIT', 0, 24)
  ctx.restore()
}

function drawPlayer() {
  const blink = player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0
  if (blink) return

  let row = spriteMeta.rows.frogIdle
  let frame = getAnimatedFrame(6)

  if (won.value) {
    row = spriteMeta.rows.frogVictory
    frame = getAnimatedFrame(8)
  } else if (player.invincible > 100) {
    row = spriteMeta.rows.frogHurt
    frame = getAnimatedFrame(8)
  } else if (!player.onGround) {
    row = spriteMeta.rows.frogJump
    frame = Math.min(5, Math.floor(Math.max(-12, Math.min(12, player.vy + 12)) / 4))
  } else if (Math.abs(player.vx) > 1.1) {
    row = spriteMeta.rows.frogRun
    frame = getAnimatedFrame(12)
  }

  if (player.checkpointPulse > 0) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.22)'
    ctx.beginPath()
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 48 + player.checkpointPulse * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  drawSprite(row, frame, player.x - 10, player.y - 14, 74, 74, { flipX: player.facing < 0 })
}

function drawScreenOverlay() {
  if (!(paused.value || gameOver.value || won.value)) return

  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
  ctx.fillRect(0, 0, viewport.width, viewport.height)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px sans-serif'
  if (won.value) ctx.fillText('Swamp Saved!', viewport.width / 2, viewport.height / 2 - 20)
  else if (gameOver.value) ctx.fillText('Game Over', viewport.width / 2, viewport.height / 2 - 20)
  else ctx.fillText('Paused', viewport.width / 2, viewport.height / 2 - 20)

  ctx.font = '24px sans-serif'
  const subtitle = won.value
    ? `Final score ${score.value} · ${fliesCollected.value}/${totalFlies} flies`
    : gameOver.value
      ? 'Restart and reclaim the marsh.'
      : 'Tap resume to hop back in.'
  ctx.fillText(subtitle, viewport.width / 2, viewport.height / 2 + 28)
}

function roundRect(context, x, y, w, h, r, fill = true) {
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + w - r, y)
  context.quadraticCurveTo(x + w, y, x + w, y + r)
  context.lineTo(x + w, y + h - r)
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  context.lineTo(x + r, y + h)
  context.quadraticCurveTo(x, y + h, x, y + h - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
  if (fill) context.fill()
}

function render() {
  drawParallax()
  drawWorld()
  drawScreenOverlay()
}

function frame(ts) {
  if (!lastTime) lastTime = ts
  const dt = Math.min(40, ts - lastTime)
  lastTime = ts
  update(dt)
  render()
  raf = requestAnimationFrame(frame)
}

function handleKeyDown(event) {
  const relevant = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyP', 'KeyM', 'KeyR']
  if (!relevant.includes(event.code)) return
  event.preventDefault()
  resumeAudio()
  if (event.code === 'KeyP') {
    togglePause()
    return
  }
  if (event.code === 'KeyM') {
    toggleMute()
    return
  }
  if (event.code === 'KeyR') {
    resetGame()
    return
  }
  keys.add(event.code)
}

function handleKeyUp(event) {
  keys.delete(event.code)
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  ctx.imageSmoothingEnabled = false
  buildSpriteSheet()
  resetGame()
  window.addEventListener('keydown', handleKeyDown, { passive: false })
  window.addEventListener('keyup', handleKeyUp, { passive: false })
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  cancelAnimationFrame(raf)
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close()
})
</script>

<style scoped>
:global(body) {
  margin: 0;
  background: #0f172a;
}

.game-shell {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(125, 211, 252, 0.18), transparent 30%),
    linear-gradient(180deg, #0b1120 0%, #0f172a 100%);
  color: #e5eefb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  position: relative;
  overflow: hidden;
}

.sky-decor {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.15;
}

.cloud {
  position: absolute;
  width: 220px;
  height: 80px;
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.25) 60%, transparent 70%);
  filter: blur(8px);
}

.c1 { top: 70px; left: 5%; }
.c2 { top: 140px; right: 12%; }
.c3 { top: 220px; left: 40%; }

.topbar,
.stage,
.panel,
.stat {
  position: relative;
  z-index: 1;
}

.card {
  background: rgba(15, 23, 42, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(14px);
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 22px 24px;
  border-radius: 28px;
  margin: 0 auto 18px;
  max-width: 1440px;
}

.topbar h1 {
  margin: 0 0 8px;
  font-size: clamp(1.8rem, 2.5vw, 3rem);
}

.topbar p {
  margin: 0;
  color: #cbd5e1;
  max-width: 760px;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  font-weight: 800;
  color: #0f172a;
  background: linear-gradient(180deg, #f8fafc 0%, #cbd5e1 100%);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
}

button:hover {
  transform: translateY(-1px);
}

.hud-grid {
  max-width: 1440px;
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  border-radius: 22px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat .label {
  color: #94a3b8;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat strong {
  font-size: clamp(1.1rem, 1.5vw, 1.5rem);
}

.stage {
  max-width: 1440px;
  margin: 0 auto;
  padding: 14px;
  border-radius: 30px;
}

canvas {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 22px;
  background: #7dd3fc;
}

.controls-help {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  color: #cbd5e1;
  font-size: 0.95rem;
  padding: 12px 8px 2px;
}

.bottom-grid {
  max-width: 1440px;
  margin: 18px auto 0;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 18px;
}

.panel {
  border-radius: 28px;
  padding: 20px;
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 1.2rem;
}

.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leader-row {
  display: grid;
  grid-template-columns: 40px 1.3fr 0.9fr 0.7fr 0.8fr;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(148, 163, 184, 0.08);
}

.leader-row.header {
  background: transparent;
  color: #94a3b8;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.leader-row.active {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18), rgba(59, 130, 246, 0.14));
  border: 1px solid rgba(74, 222, 128, 0.3);
}

ul {
  margin: 0;
  padding-left: 20px;
  color: #dbe4f1;
  line-height: 1.7;
}

@media (max-width: 1100px) {
  .hud-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .game-shell {
    padding: 14px;
  }

  .hud-grid {
    grid-template-columns: 1fr;
  }

  .leader-row {
    grid-template-columns: 34px 1fr 0.8fr 0.65fr 0.75fr;
    font-size: 0.9rem;
  }

  .controls-help {
    font-size: 0.85rem;
  }
}
</style>

