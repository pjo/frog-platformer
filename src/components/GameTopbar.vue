<script setup lang="ts">
import frogLogo from '../assets/frog-logo.svg'

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

<template>
  <header class="topbar card">
    <div class="brand">
      <img :src="frogLogo" class="logo" aria-hidden="true" />
      <div class="title-group">
        <div class="brand-title">Frog<span class="vs"> vs. </span>Smurf Invaders</div>
      </div>
    </div>

    <div class="center-strip">
      <span class="level-badge">
        <span class="level-num">{{ currentLevel }}</span>
        <span class="level-sep">/</span>
        <span class="level-total">{{ levelCount }}</span>
      </span>
      <label class="name-field">
        <input
          :value="playerName"
          @input="$emit('update:playerName', ($event.target as HTMLInputElement).value)"
          maxlength="20"
          class="name-input"
          placeholder="Player"
          spellcheck="false"
        />
      </label>
      <span class="online-dot" :class="isOnline ? 'live' : 'local'" :title="isOnline ? 'Live scores' : 'Offline'">
        <span class="dot"></span>
        {{ isOnline ? 'Live' : 'Offline' }}
      </span>
    </div>

    <nav class="actions">
      <button class="icon-btn" @click="$emit('pause')" :title="paused ? 'Resume' : 'Pause'" :aria-label="paused ? 'Resume' : 'Pause'">
        <svg v-if="!paused" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><rect x="5" y="3" width="3.5" height="14" rx="1"/><rect x="11.5" y="3" width="3.5" height="14" rx="1"/></svg>
        <svg v-else viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M6 3.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 006 3.5z"/></svg>
      </button>
      <button class="icon-btn" @click="$emit('restart')" title="Restart" aria-label="Restart">
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M4 10a6 6 0 0110.61-3.85L12 9h6V3l-2.35 2.35A8 8 0 102 10h2z"/></svg>
      </button>
      <button class="icon-btn" @click="$emit('mute')" :title="muted ? 'Unmute' : 'Mute'" :aria-label="muted ? 'Unmute' : 'Mute'">
        <svg v-if="!muted" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 3a1 1 0 00-1.6-.8L4.27 5.5H2a1 1 0 00-1 1v7a1 1 0 001 1h2.27l4.13 3.3A1 1 0 0010 17V3z"/><path d="M13.5 7.1a4.5 4.5 0 010 5.8M15.4 5.2a7 7 0 010 9.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <svg v-else viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 3a1 1 0 00-1.6-.8L4.27 5.5H2a1 1 0 00-1 1v7a1 1 0 001 1h2.27l4.13 3.3A1 1 0 0010 17V3z"/><path d="M14 8l4 4M18 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <button class="icon-btn" @click="$emit('fullscreen')" :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" :aria-label="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'">
        <svg v-if="!isFullscreen" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M3 3h5v2H5v3H3V3zM12 3h5v5h-2V5h-3V3zM3 12h2v3h3v2H3v-5zM15 15h-3v2h5v-5h-2v3z"/></svg>
        <svg v-else viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M8 3v5H3V6h3V3h2zM17 8h-5V3h2v3h3v2zM8 17H3v-5h2v3h3v2zM12 17v-5h5v2h-3v3h-2z"/></svg>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-radius: 20px;
  margin: 0 auto 14px;
  max-width: 1440px;
}

/* ── Brand ─────────────────────────────────────────── */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.logo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 6px rgba(34,197,94,0.35));
}

.brand-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  white-space: nowrap;
  color: #e2e8f0;
}
.vs {
  font-weight: 500;
  color: #64748b;
  font-style: italic;
  font-size: 0.82em;
}

/* ── Center strip ──────────────────────────────────── */
.center-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  justify-content: center;
}

.level-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(34,197,94,0.3);
}
.level-num { font-size: 1.1em; }
.level-sep { opacity: 0.5; margin: 0 1px; }
.level-total { opacity: 0.7; font-size: 0.9em; }

.name-field {
  position: relative;
}
.name-input {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(148,163,184,0.2);
  border-radius: 10px;
  padding: 6px 12px;
  color: #f1f5f9;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 600;
  outline: none;
  width: 110px;
  transition: border-color 0.2s, background 0.2s;
}
.name-input::placeholder { color: rgba(148,163,184,0.4); }
.name-input:focus {
  border-color: rgba(74,222,128,0.5);
  background: rgba(255,255,255,0.09);
}

.online-dot {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.online-dot.live { color: #4ade80; }
.online-dot.live .dot { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
.online-dot.local { color: #64748b; }
.online-dot.local .dot { background: #64748b; }

/* ── Action buttons ────────────────────────────────── */
.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(148,163,184,0.15);
  background: rgba(255,255,255,0.06);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
  padding: 0;
  box-shadow: none;
}
.icon-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #e2e8f0;
  border-color: rgba(148,163,184,0.3);
  transform: translateY(-1px);
}
.icon-btn:active {
  transform: translateY(0);
}
.icon-btn:focus-visible {
  outline: 2px solid #4ade80;
  outline-offset: 2px;
}
.icon-btn svg {
  display: block;
}

/* ── Responsive ────────────────────────────────────── */
@media (max-width: 1100px) {
  .topbar {
    flex-wrap: wrap;
    gap: 12px;
  }
  .brand { flex: 1 1 auto; }
  .center-strip { order: 3; flex-basis: 100%; justify-content: flex-start; }
}

@media (max-width: 600px) {
  .topbar { padding: 10px 14px; gap: 10px; }
  .brand-title { font-size: 1.05rem; }
  .logo { width: 34px; height: 34px; }
  .name-input { width: 80px; }
}
</style>
