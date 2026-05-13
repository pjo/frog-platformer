<template>
  <header class="topbar card">
    <div>
      <h1>Frog vs. Smurf Invaders</h1>
      <p>A side-scrolling platformer — stomp Smurfs, collect flies, reach the exit.</p>
    </div>
    <div class="actions">
      <span class="level-badge">Level {{ currentLevel }} / {{ levelCount }}</span>
      <label class="name-label">
        Name
        <input :value="playerName" @input="$emit('update:playerName', ($event.target as HTMLInputElement).value)" maxlength="20" class="name-input" placeholder="Player" />
      </label>
      <span class="online-badge" :class="isOnline ? 'live' : 'local'">
        {{ isOnline ? 'Live scores' : 'Offline' }}
      </span>
      <button @click="$emit('pause')">{{ paused ? 'Resume' : 'Pause' }}</button>
      <button @click="$emit('restart')">Restart</button>
      <button @click="$emit('mute')">{{ muted ? 'Unmute' : 'Mute' }}</button>
      <button @click="$emit('fullscreen')">{{ isFullscreen ? 'Exit Full' : 'Fullscreen' }}</button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  currentLevel: number
  levelCount: number
  playerName: string
  isOnline: boolean
  paused: boolean
  muted: boolean
  isFullscreen: boolean
}>()

defineEmits<{
  'update:playerName': [value: string]
  pause: []
  restart: []
  mute: []
  fullscreen: []
}>()
</script>

<style scoped>
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

@media (max-width: 1100px) {
  .topbar { flex-direction: column; align-items: flex-start; }
}
</style>
