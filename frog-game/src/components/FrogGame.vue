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
        <p>A side-scrolling platformer — stomp Smurfs, collect flies, reach the exit.</p>
      </div>
      <div class="actions">
        <span class="level-badge">Level {{ currentLevel }} / {{ LEVEL_COUNT }}</span>
        <label class="name-label">
          Name
          <input v-model="playerName" maxlength="20" class="name-input" placeholder="Player" />
        </label>
        <span class="online-badge" :class="isOnline ? 'live' : 'local'">
          {{ isOnline ? 'Live scores' : 'Offline' }}
        </span>
        <button @click="togglePause">{{ paused ? 'Resume' : 'Pause' }}</button>
        <button @click="resetGame">Restart</button>
        <button @click="toggleMute">{{ muted ? 'Unmute' : 'Mute' }}</button>
        <button @click="toggleFullscreen">{{ isFullscreen ? 'Exit Full' : 'Fullscreen' }}</button>
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
        <strong>{{ fliesCollected }}/{{ TOTAL_FLIES }}</strong>
      </div>
      <div class="card stat">
        <span class="label">Time</span>
        <strong>{{ displayTime }}</strong>
      </div>
      <div class="card stat" :class="{ 'power-active': activePower }">
        <span class="label">Power</span>
        <strong>{{ activePower || '—' }}</strong>
      </div>
    </section>

    <main class="stage card" ref="stageRef">
      <canvas ref="canvasRef" :width="VIEWPORT_W" :height="VIEWPORT_H"></canvas>

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

    <section class="bottom-grid">
      <div class="card panel">
        <h2>Scoreboard</h2>
        <div class="leaderboard">
          <div class="leader-row header">
            <span>#</span><span>Name</span><span>Score</span><span>Flies</span><span>Time</span>
          </div>
          <div
            v-for="(entry, index) in leaderboard"
            :key="`${entry.name}-${entry.score}-${index}`"
            class="leader-row"
            :class="{ active: entry.name === 'You' && entry.isCurrent }"
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
          <li>Stomp Smurfs from above. The boss needs 3 stomps.</li>
          <li>Golden flies give 100 pts each.</li>
          <li>Green mushroom = speed boost. Star = brief invincibility.</li>
          <li>Checkpoint mushrooms save progress.</li>
          <li>3 levels — Swamp, Cave, Sky. Defeat the boss to clear level 3.</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// ── Constants ─────────────────────────────────────────────────────────────────
const VIEWPORT_W = 1280
const VIEWPORT_H = 720
const TOTAL_FLIES = 18
const LEVEL_COUNT = 3
const STORAGE_KEY = 'frog-lb-v2'
const BG_MELODY = [261, 329, 392, 523, 392, 329, 440, 349, 392, 261, 329, 294]

// ── Types ─────────────────────────────────────────────────────────────────────
interface Rect { x: number; y: number; w: number; h: number }

interface Platform extends Rect {
  type: 'ground' | 'stone' | 'wood'
  vx?: number
  minPX?: number
  maxPX?: number
}

interface Enemy extends Rect {
  vx: number; minX: number; maxX: number
  alive: boolean; dying: boolean; deathTimer: number
  bob: number; hue: number; mood: string
  hp: number; maxHp: number; isBoss: boolean
}

interface Fly { x: number; y: number; r: number; taken: boolean }
interface Hazard extends Rect { type: string }
interface CP extends Rect { active: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; r: number }
interface PowerUp { x: number; y: number; r: number; taken: boolean; type: 'speed' | 'star' }
interface LeaderEntry { name: string; score: number; flies: number; time: number; isCurrent?: boolean }

interface EnemyDef { x: number; y: number; w: number; h: number; vx: number; minX: number; maxX: number; bob: number; hue: number; hp?: number; isBoss?: boolean }
interface LevelDef {
  worldWidth: number
  platforms: Platform[]
  enemies: EnemyDef[]
  flies: Array<{ x: number; y: number; r: number }>
  hazards: Hazard[]
  checkpoints: Array<{ x: number; y: number; w: number; h: number }>
  powerUps: Array<{ x: number; y: number; r: number; type: 'speed' | 'star' }>
  finishGate: Rect
}

// ── Vue state ─────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
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

// ── Level data ────────────────────────────────────────────────────────────────
const LEVELS: LevelDef[] = [
  {
    worldWidth: 5200,
    platforms: [
      { x: 0,    y: 560, w: 780,  h: 160, type: 'ground' },
      { x: 860,  y: 560, w: 880,  h: 160, type: 'ground' },
      { x: 1800, y: 560, w: 620,  h: 160, type: 'ground' },
      { x: 2490, y: 560, w: 760,  h: 160, type: 'ground' },
      { x: 3350, y: 560, w: 650,  h: 160, type: 'ground' },
      { x: 4080, y: 560, w: 1120, h: 160, type: 'ground' },
      { x: 250,  y: 460, w: 140, h: 24, type: 'stone' },
      { x: 470,  y: 392, w: 130, h: 22, type: 'stone' },
      { x: 690,  y: 330, w: 130, h: 22, type: 'stone' },
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
    ],
    enemies: [
      { x: 960,  y: 522, w: 44, h: 38, vx:  1.0, minX: 900,  maxX: 1330, bob: 0.0, hue:  0 },
      { x: 1430, y: 317, w: 44, h: 38, vx: -1.2, minX: 1320, maxX: 1510, bob: 0.8, hue: 14 },
      { x: 1895, y: 522, w: 44, h: 38, vx:  1.4, minX: 1840, maxX: 2340, bob: 1.4, hue:  4 },
      { x: 2830, y: 360, w: 44, h: 38, vx: -1.6, minX: 2790, maxX: 2940, bob: 2.2, hue: 10 },
      { x: 3470, y: 422, w: 44, h: 38, vx:  1.3, minX: 3410, maxX: 3600, bob: 0.3, hue:  6 },
      { x: 4140, y: 522, w: 44, h: 38, vx: -1.5, minX: 4110, maxX: 4660, bob: 1.8, hue: 12 },
      { x: 4705, y: 266, w: 44, h: 38, vx:  1.1, minX: 4680, maxX: 4790, bob: 0.5, hue: 18 },
    ],
    flies: [
      { x: 308,  y: 420, r: 10 }, { x: 524,  y: 352, r: 10 }, { x: 744,  y: 290, r: 10 },
      { x: 1080, y: 385, r: 10 }, { x: 1180, y: 385, r: 10 }, { x: 1370, y: 315, r: 10 },
      { x: 1630, y: 250, r: 10 }, { x: 1985, y: 398, r: 10 }, { x: 2232, y: 325, r: 10 },
      { x: 2610, y: 422, r: 10 }, { x: 2850, y: 358, r: 10 }, { x: 3076, y: 292, r: 10 },
      { x: 3494, y: 420, r: 10 }, { x: 3714, y: 350, r: 10 }, { x: 3942, y: 282, r: 10 },
      { x: 4338, y: 404, r: 10 }, { x: 4558, y: 336, r: 10 }, { x: 4748, y: 264, r: 10 },
    ],
    hazards: [
      { x: 780,  y: 685, w: 80,  h: 35, type: 'slime' },
      { x: 1740, y: 685, w: 60,  h: 35, type: 'slime' },
      { x: 2420, y: 685, w: 70,  h: 35, type: 'slime' },
      { x: 3250, y: 685, w: 100, h: 35, type: 'slime' },
      { x: 4000, y: 685, w: 80,  h: 35, type: 'slime' },
    ],
    checkpoints: [
      { x: 1260, y: 500, w: 28, h: 60 },
      { x: 2870, y: 498, w: 28, h: 62 },
      { x: 4290, y: 498, w: 28, h: 62 },
    ],
    powerUps: [
      { x: 640,  y: 300, r: 14, type: 'speed' },
      { x: 2200, y: 335, r: 14, type: 'star'  },
      { x: 3900, y: 292, r: 14, type: 'speed' },
    ],
    finishGate: { x: 4890, y: 362, w: 60, h: 140 },
  },

  // Level 2 – Crystal Cave
  {
    worldWidth: 5600,
    platforms: [
      { x: 0,    y: 560, w: 700, h: 160, type: 'ground' },
      { x: 800,  y: 560, w: 600, h: 160, type: 'ground' },
      { x: 1520, y: 560, w: 700, h: 160, type: 'ground' },
      { x: 2360, y: 560, w: 600, h: 160, type: 'ground' },
      { x: 3100, y: 560, w: 700, h: 160, type: 'ground' },
      { x: 3940, y: 560, w: 600, h: 160, type: 'ground' },
      { x: 4680, y: 560, w: 920, h: 160, type: 'ground' },
      { x: 240,  y: 445, w: 120, h: 22, type: 'stone' },
      { x: 450,  y: 378, w: 130, h: 22, type: 'stone' },
      { x: 660,  y: 310, w: 120, h: 22, type: 'stone' },
      { x: 920,  y: 430, w: 140, h: 22, type: 'wood',  vx:  1.2, minPX: 820,  maxPX: 1100 },
      { x: 1200, y: 360, w: 130, h: 22, type: 'stone' },
      { x: 1640, y: 440, w: 150, h: 22, type: 'stone' },
      { x: 1880, y: 370, w: 140, h: 22, type: 'wood',  vx: -1.4, minPX: 1780, maxPX: 2060 },
      { x: 2100, y: 300, w: 140, h: 22, type: 'stone' },
      { x: 2480, y: 462, w: 130, h: 22, type: 'stone' },
      { x: 2680, y: 395, w: 140, h: 22, type: 'wood' },
      { x: 2900, y: 328, w: 150, h: 22, type: 'stone', vx:  1.6, minPX: 2820, maxPX: 3090 },
      { x: 3200, y: 460, w: 130, h: 22, type: 'stone' },
      { x: 3420, y: 388, w: 130, h: 22, type: 'wood' },
      { x: 3640, y: 318, w: 140, h: 22, type: 'stone' },
      { x: 4060, y: 448, w: 140, h: 22, type: 'wood',  vx: -1.8, minPX: 3960, maxPX: 4250 },
      { x: 4280, y: 376, w: 130, h: 22, type: 'stone' },
      { x: 4500, y: 306, w: 130, h: 22, type: 'wood' },
      { x: 4800, y: 430, w: 150, h: 22, type: 'stone' },
      { x: 5020, y: 358, w: 150, h: 22, type: 'wood' },
      { x: 5240, y: 286, w: 130, h: 22, type: 'stone' },
    ],
    enemies: [
      { x: 860,  y: 522, w: 44, h: 38, vx:  1.5, minX: 820,  maxX: 1380, bob: 0.0, hue: 22 },
      { x: 1600, y: 522, w: 44, h: 38, vx: -1.7, minX: 1540, maxX: 2110, bob: 1.0, hue:  8 },
      { x: 1260, y: 322, w: 44, h: 38, vx:  1.3, minX: 1200, maxX: 1410, bob: 0.5, hue: 16 },
      { x: 2440, y: 522, w: 44, h: 38, vx:  2.0, minX: 2380, maxX: 2910, bob: 2.0, hue:  4 },
      { x: 2700, y: 358, w: 44, h: 38, vx: -1.8, minX: 2620, maxX: 2870, bob: 0.3, hue: 12 },
      { x: 3160, y: 522, w: 44, h: 38, vx:  1.6, minX: 3120, maxX: 3710, bob: 1.5, hue:  6 },
      { x: 4000, y: 522, w: 44, h: 38, vx: -2.2, minX: 3960, maxX: 4610, bob: 0.8, hue: 20 },
      { x: 4740, y: 522, w: 44, h: 38, vx:  1.9, minX: 4700, maxX: 5410, bob: 1.2, hue:  2 },
    ],
    flies: [
      { x: 290,  y: 410, r: 10 }, { x: 500,  y: 342, r: 10 }, { x: 710,  y: 274, r: 10 },
      { x: 970,  y: 394, r: 10 }, { x: 1240, y: 324, r: 10 }, { x: 1700, y: 404, r: 10 },
      { x: 1930, y: 334, r: 10 }, { x: 2140, y: 264, r: 10 }, { x: 2530, y: 426, r: 10 },
      { x: 2730, y: 359, r: 10 }, { x: 2950, y: 292, r: 10 }, { x: 3250, y: 424, r: 10 },
      { x: 3470, y: 352, r: 10 }, { x: 3690, y: 282, r: 10 }, { x: 4110, y: 412, r: 10 },
      { x: 4330, y: 340, r: 10 }, { x: 4550, y: 270, r: 10 }, { x: 5070, y: 322, r: 10 },
    ],
    hazards: [
      { x: 700,  y: 685, w: 100, h: 35, type: 'slime' },
      { x: 1400, y: 685, w: 120, h: 35, type: 'slime' },
      { x: 2240, y: 685, w: 120, h: 35, type: 'slime' },
      { x: 2960, y: 685, w: 140, h: 35, type: 'slime' },
      { x: 3800, y: 685, w: 140, h: 35, type: 'slime' },
      { x: 4540, y: 685, w: 140, h: 35, type: 'slime' },
    ],
    checkpoints: [
      { x: 1180, y: 498, w: 28, h: 62 },
      { x: 2860, y: 498, w: 28, h: 62 },
      { x: 4440, y: 498, w: 28, h: 62 },
    ],
    powerUps: [
      { x: 700,  y: 280, r: 14, type: 'speed' },
      { x: 2100, y: 270, r: 14, type: 'star'  },
      { x: 3640, y: 288, r: 14, type: 'speed' },
      { x: 5240, y: 256, r: 14, type: 'star'  },
    ],
    finishGate: { x: 5380, y: 362, w: 60, h: 140 },
  },

  // Level 3 – Sky Kingdom (boss level)
  {
    worldWidth: 6000,
    platforms: [
      { x: 0,    y: 560, w: 600,  h: 160, type: 'ground' },
      { x: 700,  y: 560, w: 500,  h: 160, type: 'ground' },
      { x: 1320, y: 560, w: 600,  h: 160, type: 'ground' },
      { x: 2060, y: 560, w: 500,  h: 160, type: 'ground' },
      { x: 2720, y: 560, w: 600,  h: 160, type: 'ground' },
      { x: 3480, y: 560, w: 500,  h: 160, type: 'ground' },
      { x: 4140, y: 560, w: 600,  h: 160, type: 'ground' },
      { x: 4900, y: 560, w: 1100, h: 160, type: 'ground' },
      { x: 200,  y: 450, w: 130, h: 22, type: 'wood',  vx:  1.0, minPX: 120,  maxPX: 560  },
      { x: 430,  y: 380, w: 120, h: 22, type: 'stone' },
      { x: 760,  y: 445, w: 140, h: 22, type: 'stone', vx: -1.4, minPX: 700,  maxPX: 950  },
      { x: 1000, y: 375, w: 130, h: 22, type: 'wood' },
      { x: 1200, y: 305, w: 120, h: 22, type: 'stone' },
      { x: 1440, y: 445, w: 140, h: 22, type: 'wood',  vx:  1.8, minPX: 1380, maxPX: 1690 },
      { x: 1700, y: 373, w: 130, h: 22, type: 'stone' },
      { x: 1920, y: 302, w: 120, h: 22, type: 'wood' },
      { x: 2170, y: 445, w: 140, h: 22, type: 'stone' },
      { x: 2380, y: 375, w: 130, h: 22, type: 'wood',  vx: -2.0, minPX: 2300, maxPX: 2570 },
      { x: 2600, y: 305, w: 120, h: 22, type: 'stone' },
      { x: 2820, y: 445, w: 140, h: 22, type: 'wood' },
      { x: 3040, y: 375, w: 130, h: 22, type: 'stone', vx:  2.2, minPX: 2980, maxPX: 3290 },
      { x: 3260, y: 305, w: 120, h: 22, type: 'wood' },
      { x: 3590, y: 445, w: 140, h: 22, type: 'stone' },
      { x: 3800, y: 373, w: 130, h: 22, type: 'wood',  vx: -1.6, minPX: 3740, maxPX: 4030 },
      { x: 4020, y: 302, w: 120, h: 22, type: 'stone' },
      { x: 4240, y: 445, w: 140, h: 22, type: 'wood' },
      { x: 4460, y: 373, w: 130, h: 22, type: 'stone', vx:  1.9, minPX: 4400, maxPX: 4710 },
      { x: 4700, y: 302, w: 120, h: 22, type: 'wood' },
    ],
    enemies: [
      { x: 760,  y: 522, w: 44, h: 38, vx:  2.0, minX: 720,  maxX: 1150, bob: 0.0, hue:  0 },
      { x: 1400, y: 522, w: 44, h: 38, vx: -2.2, minX: 1340, maxX: 1830, bob: 1.0, hue:  8 },
      { x: 2120, y: 522, w: 44, h: 38, vx:  2.4, minX: 2080, maxX: 2570, bob: 0.5, hue: 16 },
      { x: 2780, y: 522, w: 44, h: 38, vx: -2.6, minX: 2740, maxX: 3200, bob: 2.0, hue:  4 },
      { x: 3540, y: 522, w: 44, h: 38, vx:  2.8, minX: 3500, maxX: 3930, bob: 1.5, hue: 12 },
      { x: 4200, y: 522, w: 44, h: 38, vx: -3.0, minX: 4160, maxX: 4650, bob: 0.8, hue: 20 },
      { x: 5300, y: 480, w: 90, h: 80, vx:  2.0, minX: 4980, maxX: 5790, bob: 0.0, hue:  0, hp: 3, isBoss: true },
    ],
    flies: [
      { x: 260,  y: 414, r: 10 }, { x: 480,  y: 344, r: 10 }, { x: 810,  y: 409, r: 10 },
      { x: 1050, y: 339, r: 10 }, { x: 1250, y: 269, r: 10 }, { x: 1490, y: 409, r: 10 },
      { x: 1750, y: 337, r: 10 }, { x: 1970, y: 266, r: 10 }, { x: 2220, y: 409, r: 10 },
      { x: 2430, y: 339, r: 10 }, { x: 2650, y: 269, r: 10 }, { x: 2870, y: 409, r: 10 },
      { x: 3090, y: 339, r: 10 }, { x: 3310, y: 269, r: 10 }, { x: 3640, y: 409, r: 10 },
      { x: 3850, y: 337, r: 10 }, { x: 4070, y: 266, r: 10 }, { x: 4750, y: 266, r: 10 },
    ],
    hazards: [
      { x: 600,  y: 685, w: 100, h: 35, type: 'slime' },
      { x: 1200, y: 685, w: 140, h: 35, type: 'slime' },
      { x: 1920, y: 685, w: 140, h: 35, type: 'slime' },
      { x: 2600, y: 685, w: 120, h: 35, type: 'slime' },
      { x: 3360, y: 685, w: 120, h: 35, type: 'slime' },
      { x: 4040, y: 685, w: 120, h: 35, type: 'slime' },
      { x: 4780, y: 685, w: 120, h: 35, type: 'slime' },
    ],
    checkpoints: [
      { x: 1300, y: 498, w: 28, h: 62 },
      { x: 3000, y: 498, w: 28, h: 62 },
      { x: 4600, y: 498, w: 28, h: 62 },
    ],
    powerUps: [
      { x: 480,  y: 350, r: 14, type: 'speed' },
      { x: 1970, y: 272, r: 14, type: 'star'  },
      { x: 3310, y: 275, r: 14, type: 'speed' },
      { x: 4700, y: 272, r: 14, type: 'star'  },
    ],
    finishGate: { x: 5820, y: 362, w: 60, h: 140 },
  },
]

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
let audioCtx: AudioContext | null = null
let bgMusicInterval: ReturnType<typeof setInterval> | null = null
let bgStep = 0
const keys = new Set<string>()
let screenShake = 0
let levelBannerTimer = 0
let particles: Particle[] = []

let spriteSheet: HTMLCanvasElement | null = null
const SPRITE = { fw: 64, fh: 64, rows: { frogIdle: 0, frogRun: 1, frogJump: 2, frogHurt: 3, frogVictory: 4, smurfWalk: 5, smurfAlert: 6, flySpin: 7 } }

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
let finishGate: Rect = { x: 4890, y: 362, w: 60, h: 140 }
let enemyInitData: Array<{ x: number; vx: number; hp: number }> = []

// ── Audio ──────────────────────────────────────────────────────────────────────
function resumeAudio() {
  if (!audioCtx) {
    const C = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return
    audioCtx = new C()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
}

function playTone(type: OscillatorType, freq: number, dur: number, vol = 0.04, freq2: number | null = null) {
  if (muted.value || !audioCtx) return
  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (freq2 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), now + dur)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(vol, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(gain); gain.connect(audioCtx.destination)
  osc.start(now); osc.stop(now + dur + 0.02)
}

const sfxJump       = () => playTone('square',   420, 0.12, 0.030, 620)
const sfxPickup     = () => playTone('triangle', 860, 0.12, 0.035, 1120)
const sfxStomp      = () => playTone('square',   180, 0.15, 0.045, 90)
const sfxHit        = () => playTone('sawtooth', 240, 0.20, 0.040, 120)
const sfxCheckpoint = () => playTone('triangle', 540, 0.26, 0.040, 920)
const sfxPowerUp    = () => playTone('triangle', 700, 0.08, 0.035, 1400)
const sfxWin        = () => {
  playTone('triangle', 660, 0.18, 0.030, 990)
  setTimeout(() => playTone('triangle', 990, 0.22, 0.030, 1320), 120)
}

function startBgMusic() {
  if (bgMusicInterval) return
  bgStep = 0
  bgMusicInterval = setInterval(() => {
    if (muted.value || paused.value || gameOver.value || won.value) return
    resumeAudio()
    playTone('triangle', BG_MELODY[bgStep % BG_MELODY.length], 0.28, 0.018)
    bgStep++
  }, 350)
}
function stopBgMusic() {
  if (bgMusicInterval) { clearInterval(bgMusicInterval); bgMusicInterval = null }
}

// ── Collision ──────────────────────────────────────────────────────────────────
function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
function circleHitsRect(cx: number, cy: number, cr: number, b: Rect) {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w))
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h))
  return (cx - nx) ** 2 + (cy - ny) ** 2 < cr * cr
}

// ── Sprite building ────────────────────────────────────────────────────────────
function px(sctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  sctx.fillStyle = c
  sctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function drawFrogFrame(sctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number, state: string) {
  const ph = frame % 6
  const legShift = state === 'run' ? [0, 3, 5, 3, 0, -1][ph] : state === 'jump' ? -3 : 0
  const armShift = state === 'run' ? [2, 0, -2, -1, 1, 2][ph] : state === 'victory' ? -5 : 0
  const blink = state === 'idle' && ph === 4
  const mo = state === 'hurt' ? 1 : state === 'victory' ? 2 : 0
  const sq = state === 'jump' ? -4 : state === 'hurt' ? 2 : 0
  px(sctx, ox+20, oy+22+sq, 24, 22, '#22c55e')
  px(sctx, ox+18, oy+18+sq, 28, 12, '#16a34a')
  px(sctx, ox+16, oy+12+sq, 32, 16, '#22c55e')
  px(sctx, ox+18, oy+ 6+sq, 10, 10, '#4ade80')
  px(sctx, ox+36, oy+ 6+sq, 10, 10, '#4ade80')
  px(sctx, ox+20, oy+ 8+sq,  6,  6, '#ffffff')
  px(sctx, ox+38, oy+ 8+sq,  6,  6, '#ffffff')
  if (!blink) {
    px(sctx, ox+22, oy+10+sq, 2, 2, '#0f172a')
    px(sctx, ox+40, oy+10+sq, 2, 2, '#0f172a')
  } else {
    px(sctx, ox+20, oy+11+sq, 6, 1, '#0f172a')
    px(sctx, ox+38, oy+11+sq, 6, 1, '#0f172a')
  }
  px(sctx, ox+24, oy+21+sq, 16, mo===2?4:3, mo?'#14532d':'#166534')
  if (mo===1) px(sctx, ox+27, oy+23+sq, 10, 3, '#ef4444')
  px(sctx, ox+12-armShift, oy+24+sq, 8, 7, '#22c55e')
  px(sctx, ox+44+armShift, oy+24+sq, 8, 7, '#22c55e')
  px(sctx, ox+10-armShift, oy+29+sq, 6, 5, '#16a34a')
  px(sctx, ox+48+armShift, oy+29+sq, 6, 5, '#16a34a')
  px(sctx, ox+22, oy+42+sq, 8, 10+legShift, '#166534')
  px(sctx, ox+34, oy+42+sq, 8, 10-legShift, '#166534')
  px(sctx, ox+20, oy+52+sq+legShift, 12, 4, '#14532d')
  px(sctx, ox+32, oy+52+sq-legShift, 12, 4, '#14532d')
}

function drawSmurfFrame(sctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number, state: string) {
  const ph = frame % 6
  const step = state === 'walk' ? [0,2,3,2,0,-1][ph] : 0
  const ew = state === 'alert' && (ph===2||ph===3)
  const mouth = state === 'alert' ? 4 : 2
  px(sctx, ox+18, oy+22, 28, 22, '#60a5fa')
  px(sctx, ox+18, oy+14, 28, 12, '#93c5fd')
  px(sctx, ox+16, oy+10, 32, 10, '#ffffff')
  px(sctx, ox+22, oy+ 6, 20,  6, '#ffffff')
  px(sctx, ox+20, oy+ 4, 24,  4, '#e2e8f0')
  px(sctx, ox+22, oy+20, 20, 12, '#f8fafc')
  px(sctx, ox+22, oy+18,  6, ew?6:4, '#ffffff')
  px(sctx, ox+36, oy+18,  6, ew?6:4, '#ffffff')
  px(sctx, ox+24, oy+20,  2,  2, '#0f172a')
  px(sctx, ox+38, oy+20,  2,  2, '#0f172a')
  px(sctx, ox+27, oy+28, 10, mouth, '#1e293b')
  px(sctx, ox+20, oy+44,  8, 9+step, '#2563eb')
  px(sctx, ox+36, oy+44,  8, 9-step, '#2563eb')
  px(sctx, ox+18, oy+52+step, 10, 4, '#1d4ed8')
  px(sctx, ox+36, oy+52-step, 10, 4, '#1d4ed8')
}

function drawFlyFrame(sctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number) {
  const wings = [8,10,12,10,8,6][frame%6]
  px(sctx, ox+28, oy+24, 8, 16, '#facc15')
  px(sctx, ox+24, oy+28, 16, 8, '#eab308')
  px(sctx, ox+18, oy+22, wings, 4, 'rgba(255,255,255,0.8)')
  px(sctx, ox+64-18-wings, oy+22, wings, 4, 'rgba(255,255,255,0.8)')
  px(sctx, ox+30, oy+20, 4, 4, '#111827')
}

function buildSpriteSheet() {
  const { fw, fh, rows } = SPRITE
  const cols = 6
  const sheet = document.createElement('canvas')
  sheet.width = fw * cols
  sheet.height = fh * Object.keys(rows).length
  const sc = sheet.getContext('2d')!
  sc.imageSmoothingEnabled = false
  for (let i = 0; i < cols; i++) {
    drawFrogFrame(sc, i*fw, rows.frogIdle*fh,   i, 'idle')
    drawFrogFrame(sc, i*fw, rows.frogRun*fh,    i, 'run')
    drawFrogFrame(sc, i*fw, rows.frogJump*fh,   i, 'jump')
    drawFrogFrame(sc, i*fw, rows.frogHurt*fh,   i, 'hurt')
    drawFrogFrame(sc, i*fw, rows.frogVictory*fh,i, 'victory')
    drawSmurfFrame(sc,i*fw, rows.smurfWalk*fh,  i, 'walk')
    drawSmurfFrame(sc,i*fw, rows.smurfAlert*fh, i, 'alert')
    drawFlyFrame(sc,  i*fw, rows.flySpin*fh,    i)
  }
  spriteSheet = sheet
}

function blit(row: number, frame: number, dx: number, dy: number, dw: number, dh: number, flipX = false) {
  if (!spriteSheet) return
  const sx = (frame % 6) * SPRITE.fw
  const sy = row * SPRITE.fh
  ctx.save()
  ctx.translate(dx + dw/2, dy + dh/2)
  ctx.scale(flipX ? -1 : 1, 1)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(spriteSheet, sx, sy, SPRITE.fw, SPRITE.fh, -dw/2, -dh/2, dw, dh)
  ctx.restore()
}

function aframe(speed = 8, count = 6) {
  return Math.floor(performance.now() / (1000 / speed)) % count
}

// ── Level management ───────────────────────────────────────────────────────────
function loadLevel(n: number) {
  const def = LEVELS[n - 1]
  world.width = def.worldWidth
  platforms  = def.platforms.map(p => ({ ...p }))
  enemies    = def.enemies.map(e => ({
    x: e.x, y: e.y, w: e.w, h: e.h,
    vx: e.vx, minX: e.minX, maxX: e.maxX,
    alive: true, dying: false, deathTimer: 0,
    bob: e.bob, hue: e.hue, mood: 'walk',
    hp: e.hp ?? 1, maxHp: e.hp ?? 1, isBoss: e.isBoss ?? false,
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
  score.value = 0; lives.value = 3; elapsedMs.value = 0
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
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const s = speed * (0.4 + Math.random() * 0.9)
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1, life: 30 + Math.random()*20, maxLife: 50, color, r: 3 + Math.random()*4 })
  }
}

// ── Game logic ─────────────────────────────────────────────────────────────────
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
    sfxPickup(); burst(f.x, f.y, '#facc15', 8, 4)
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
  if (paused.value || gameOver.value || won.value) return
  const dts = Math.min(2, dt / 16.6667)
  elapsedMs.value += dt
  updateMovingPlatforms(dts)
  updatePlayer(dts)
  updateHazards(); updateFlies(); updatePowerUps(); updateCheckpoints()
  updateEnemies(dts); updateParticles(dts); updateCamera(dts); updateWin()
  if (screenShake > 0) screenShake = Math.max(0, screenShake - 0.7)
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
  const W = VIEWPORT_W, H = VIEWPORT_H, lvl = currentLevel.value
  let sky: CanvasGradient
  if (lvl === 1) {
    sky = ctx.createLinearGradient(0,0,0,H)
    sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(0.5, '#bae6fd'); sky.addColorStop(1, '#dcfce7')
  } else if (lvl === 2) {
    sky = ctx.createLinearGradient(0,0,0,H)
    sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(0.5, '#312e81'); sky.addColorStop(1, '#1e3a5f')
  } else {
    sky = ctx.createLinearGradient(0,0,0,H)
    sky.addColorStop(0, '#f0abfc'); sky.addColorStop(0.5, '#c4b5fd'); sky.addColorStop(1, '#bae6fd')
  }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)

  if (lvl === 1) {
    // Sun
    ctx.save(); ctx.translate(1050, 120)
    ctx.fillStyle = 'rgba(253,224,71,0.25)'; ctx.beginPath(); ctx.arc(0,0,80,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0,0,54,0,Math.PI*2); ctx.fill()
    ctx.restore()
    // Mountains
    for (let i = 0; i < 6; i++) {
      const mx = ((i*260) - world.cameraX*0.15 + world.width) % (W+260) - 130
      ctx.fillStyle = i%2===0 ? '#94a3b8' : '#a8b4c5'
      ctx.beginPath(); ctx.moveTo(mx,420); ctx.lineTo(mx+125,240); ctx.lineTo(mx+250,420); ctx.closePath(); ctx.fill()
    }
    // Trees
    for (let i = 0; i < 7; i++) {
      const tx = ((i*210) - world.cameraX*0.4 + world.width) % (W+210) - 80
      const ty = 500 + (i%2)*18
      ctx.fillStyle = '#7c5a3a'; ctx.fillRect(tx+24, ty-80, 16, 80)
      ctx.fillStyle = '#22c55e'
      ctx.beginPath(); ctx.arc(tx+32, ty-98, 36, 0, Math.PI*2); ctx.arc(tx+8, ty-68, 28, 0, Math.PI*2); ctx.arc(tx+56, ty-66, 28, 0, Math.PI*2); ctx.fill()
    }
  } else if (lvl === 2) {
    // Stalactites
    for (let i = 0; i < 14; i++) {
      const sx = ((i*140) - world.cameraX*0.1 + world.width) % (W+140) - 70
      ctx.fillStyle = '#312e81'
      ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx+30,0); ctx.lineTo(sx+15, 80+(i%3)*40); ctx.closePath(); ctx.fill()
    }
    // Crystals
    for (let i = 0; i < 9; i++) {
      const cx2 = ((i*190) - world.cameraX*0.3 + world.width) % (W+190) - 80
      ctx.fillStyle = `hsla(${220+i*18}, 80%, 65%, 0.35)`
      ctx.beginPath(); ctx.arc(cx2, 490+(i%3)*20, 20, 0, Math.PI*2); ctx.fill()
    }
  } else {
    // Rainbow
    ctx.save(); ctx.globalAlpha = 0.22
    for (let r = 0; r < 7; r++) {
      ctx.strokeStyle = `hsl(${r*42},90%,60%)`; ctx.lineWidth = 14
      ctx.beginPath(); ctx.arc(VIEWPORT_W/2, 620, 340+r*16, Math.PI, 0); ctx.stroke()
    }
    ctx.restore()
    // Clouds
    for (let i = 0; i < 9; i++) {
      const cx2 = ((i*210) - world.cameraX*0.12 + world.width) % (W+210) - 80
      const cy2 = 120 + (i%3)*80
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath(); ctx.arc(cx2, cy2, 60, 0, Math.PI*2); ctx.arc(cx2+50, cy2+10, 45, 0, Math.PI*2); ctx.arc(cx2-40, cy2+12, 40, 0, Math.PI*2); ctx.fill()
    }
  }
}

function drawWorld() {
  ctx.save(); ctx.translate(-world.cameraX, 0)
  drawGround(); drawPlatforms(); drawCheckpoints(); drawFlies()
  drawPowerUps(); drawHazards(); drawEnemies(); drawFinishGate()
  drawPlayer(); drawParticlesInWorld()
  ctx.restore()
}

function drawGround() {
  const lvl = currentLevel.value
  const gc = lvl===1 ? '#65a30d' : lvl===2 ? '#3b0764' : '#6366f1'
  ctx.fillStyle = gc; ctx.fillRect(0, 560, world.width, 160)
  for (let i = 0; i < 62; i++) {
    const x = i*96 + (Math.sin(i*3.1 + world.fgOffset*0.02)+1)*16
    ctx.fillStyle = i%3===0 ? (lvl===1?'#84cc16':lvl===2?'#4c1d95':'#a5b4fc') : (lvl===1?'#4d7c0f':lvl===2?'#2e1065':'#4338ca')
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
    blit(SPRITE.rows.flySpin, frame, f.x-22, f.y-22+bob, 44, 44)
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
    blit(row, fr, e.x-10, e.y-18+yb, 64, 64, e.vx > 0)
  }
}

function drawBoss(e: Enemy, yb: number) {
  const pulse = 1 + Math.sin(performance.now()*0.005)*0.04
  ctx.save()
  ctx.translate(e.x + e.w/2, e.y + e.h/2 + yb)
  ctx.scale(e.vx > 0 ? -pulse : pulse, pulse)
  // Body
  ctx.fillStyle = '#1e3a8a'; rr(ctx, -44, -34, 88, 68, 14)
  // Crown
  ctx.fillStyle = '#fde047'
  ctx.beginPath(); ctx.moveTo(-30,-34); ctx.lineTo(-22,-56); ctx.lineTo(-8,-38); ctx.lineTo(0,-58); ctx.lineTo(8,-38); ctx.lineTo(22,-56); ctx.lineTo(30,-34); ctx.closePath(); ctx.fill()
  // Eyes
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-15,-10,10,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15,-10,10,0,Math.PI*2); ctx.fill()
  ctx.fillStyle = '#ef4444';  ctx.beginPath(); ctx.arc(-15,-10, 6,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(15,-10, 6,0,Math.PI*2); ctx.fill()
  ctx.fillStyle = '#ffffff';  ctx.beginPath(); ctx.arc(-13,-12, 2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(17,-12, 2,0,Math.PI*2); ctx.fill()
  // Mouth
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 10, 20, 0, Math.PI); ctx.stroke()
  // HP bar
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
  blit(row, frame, player.x-10, player.y-14, 74, 74, player.facing < 0)
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
  const sub = won.value      ? `Final score ${score.value} \u00B7 ${fliesCollected.value}/${TOTAL_FLIES} flies \u00B7 All levels cleared!`
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
  const names = ['Swamp Forest','Crystal Cave','Sky Kingdom']
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

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  buildSpriteSheet()
  loadLevel(1); resetGame()
  raf = requestAnimationFrame(gameLoop)
  fetchScores()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  cancelAnimationFrame(raf); stopBgMusic()
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close()
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

.topbar {
  display: flex; justify-content: space-between; gap: 20px; align-items: center;
  padding: 22px 24px; border-radius: 28px; margin: 0 auto 18px; max-width: 1440px;
}
.topbar h1 { margin: 0 0 8px; font-size: clamp(1.8rem, 2.5vw, 3rem); }
.topbar p  { margin: 0; color: #cbd5e1; max-width: 760px; line-height: 1.5; }

.actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }

.level-badge {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff; font-weight: 800; padding: 8px 16px; border-radius: 999px;
  font-size: 0.9rem; white-space: nowrap;
}

.name-label {
  display: flex; flex-direction: column; gap: 3px;
  font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em;
}
.name-input {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(148,163,184,0.3);
  border-radius: 8px; padding: 7px 12px; color: #f1f5f9; font-size: 0.95rem;
  font-family: inherit; outline: none; width: 130px;
}
.name-input:focus { border-color: rgba(74,222,128,0.5); }

.online-badge {
  font-size: 0.75rem; font-weight: 700; padding: 5px 12px;
  border-radius: 999px; white-space: nowrap;
}
.online-badge.live  { background: rgba(34,197,94,0.2); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
.online-badge.local { background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2); }

button {
  border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 800;
  color: #0f172a; background: linear-gradient(180deg, #f8fafc 0%, #cbd5e1 100%);
  cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 10px 24px rgba(15,23,42,0.2);
}
button:hover { transform: translateY(-1px); }

.hud-grid {
  max-width: 1440px; margin: 0 auto 18px;
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px;
}
.stat { border-radius: 22px; padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.stat .label { color: #94a3b8; font-size: 0.88rem; text-transform: uppercase; letter-spacing: 0.08em; }
.stat strong  { font-size: clamp(1.1rem, 1.5vw, 1.5rem); }
.power-active { border-color: rgba(250,204,21,0.5) !important; }
.power-active strong { color: #fde047; }

.stage { max-width: 1440px; margin: 0 auto; padding: 14px; border-radius: 30px; }

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

.bottom-grid {
  max-width: 1440px; margin: 18px auto 0;
  display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 18px;
}
.panel { border-radius: 28px; padding: 20px; }
.panel h2 { margin: 0 0 14px; font-size: 1.2rem; }

.leaderboard { display: flex; flex-direction: column; gap: 8px; }
.leader-row {
  display: grid; grid-template-columns: 40px 1.3fr 0.9fr 0.7fr 0.8fr;
  gap: 12px; padding: 12px 14px; border-radius: 18px; background: rgba(148,163,184,0.08);
}
.leader-row.header { background: transparent; color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; }
.leader-row.active { background: linear-gradient(90deg, rgba(34,197,94,0.18), rgba(59,130,246,0.14)); border: 1px solid rgba(74,222,128,0.3); }

ul { margin: 0; padding-left: 20px; color: #dbe4f1; line-height: 1.7; }

@media (max-width: 1100px) {
  .hud-grid  { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .bottom-grid { grid-template-columns: 1fr; }
  .topbar { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 720px) {
  .game-shell { padding: 14px; }
  .hud-grid   { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .leader-row { grid-template-columns: 34px 1fr 0.8fr 0.65fr 0.75fr; font-size: 0.9rem; }
  .controls-help { font-size: 0.85rem; }
}
</style>
