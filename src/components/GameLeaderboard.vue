<template>
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
</template>

<script setup lang="ts">
import type { LeaderEntry } from '../levels/types'

defineProps<{
  leaderboard: LeaderEntry[]
}>()

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}
</script>

<style scoped>
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
  .bottom-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .leader-row { grid-template-columns: 34px 1fr 0.8fr 0.65fr 0.75fr; font-size: 0.9rem; }
}
</style>
