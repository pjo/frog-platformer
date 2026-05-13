<template>
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
    <div class="card stat" :class="{ 'power-active': activePower }">
      <span class="label">Power</span>
      <strong>{{ activePower || '—' }}</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  score: number
  lives: number
  fliesCollected: number
  totalFlies: number
  displayTime: string
  activePower: string
}>()
</script>

<style scoped>
.hud-grid {
  max-width: 1440px; margin: 0 auto 18px;
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px;
}
.stat { border-radius: 22px; padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.stat .label { color: #94a3b8; font-size: 0.88rem; text-transform: uppercase; letter-spacing: 0.08em; }
.stat strong  { font-size: clamp(1.1rem, 1.5vw, 1.5rem); }
.power-active { border-color: rgba(250,204,21,0.5) !important; }
.power-active strong { color: #fde047; }

@media (max-width: 1100px) {
  .hud-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
}
@media (max-width: 720px) {
  .hud-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
</style>
