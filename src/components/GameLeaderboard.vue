<template>
  <section class="bottom-grid">
    <!-- ── Scoreboard ──────────────────────────────────── -->
    <div class="card panel scoreboard-panel">
      <h2>
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="panel-icon"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.45.91-5.33L2.27 6.62l5.34-.78z"/></svg>
        Scoreboard
      </h2>
      <div class="leaderboard" role="table" aria-label="Leaderboard">
        <div class="leader-row header" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">Name</span>
          <span role="columnheader" class="num">Score</span>
          <span role="columnheader" class="num">Flies</span>
          <span role="columnheader" class="num">Time</span>
        </div>
        <div
          v-for="(entry, index) in leaderboard"
          :key="`${entry.name}-${entry.score}-${index}`"
          class="leader-row"
          :class="{ active: entry.isCurrent, top: index === 0 }"
          role="row"
        >
          <span class="rank" role="cell">{{ index + 1 }}</span>
          <span class="name" role="cell">{{ entry.name }}</span>
          <span class="num" role="cell">{{ entry.score.toLocaleString() }}</span>
          <span class="num" role="cell">{{ entry.flies }}</span>
          <span class="num" role="cell">{{ formatTime(entry.time) }}</span>
        </div>
      </div>
    </div>

    <!-- ── Game Notes ──────────────────────────────────── -->
    <div class="card panel notes-panel">
      <h2>
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="panel-icon"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm1 3h10v1H5V6zm0 3h10v1H5V9zm0 3h6v1H5v-1z"/></svg>
        How to Play
      </h2>
      <dl class="notes-list">
        <div class="note-item">
          <dt>🐸</dt>
          <dd>Stomp Smurfs from above. Bosses (level 3+) take 3–6 hits.</dd>
        </div>
        <div class="note-item">
          <dt>✨</dt>
          <dd>Collect golden flies for 100 pts each.</dd>
        </div>
        <div class="note-item">
          <dt>⚡</dt>
          <dd>Green orb = speed boost. Star = invincibility.</dd>
        </div>
        <div class="note-item">
          <dt>🚩</dt>
          <dd>Checkpoint flags save your progress mid-level.</dd>
        </div>
        <div class="note-item">
          <dt>🌍</dt>
          <dd>10 worlds: Swamp, Cave, Sky, Lava, Fortress, Ice, Desert, Jungle, Underwater, Void.</dd>
        </div>
        <div class="note-item">
          <dt>👑</dt>
          <dd>Defeat the final boss on level 10 to win!</dd>
        </div>
      </dl>
    </div>

    <!-- ── Accessibility ───────────────────────────────── -->
    <div class="card panel a11y-panel">
      <h2>
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="panel-icon"><path d="M10 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM10 6c-1.3 0-4 .5-4 .5L5 8.5l1.5.5L7 12l1.5 5h1L10 12l.5 5h1L13 12l.5-3 1.5-.5-1-2S11.3 6 10 6z"/></svg>
        Accessibility
      </h2>
      <div class="a11y-controls">
        <label class="a11y-row" for="a11y-contrast">
          <span class="a11y-label">
            <span class="a11y-title">High contrast</span>
            <span class="a11y-desc">Sharper borders &amp; brighter colours</span>
          </span>
          <input
            type="checkbox"
            id="a11y-contrast"
            class="toggle"
            :checked="highContrast"
            @change="$emit('update:highContrast', ($event.target as HTMLInputElement).checked)"
          />
        </label>

        <label class="a11y-row" for="a11y-motion">
          <span class="a11y-label">
            <span class="a11y-title">Reduce motion</span>
            <span class="a11y-desc">Disables particles &amp; screen shake</span>
          </span>
          <input
            type="checkbox"
            id="a11y-motion"
            class="toggle"
            :checked="reduceMotion"
            @change="$emit('update:reduceMotion', ($event.target as HTMLInputElement).checked)"
          />
        </label>

        <div class="a11y-row">
          <span class="a11y-label">
            <span class="a11y-title">UI scale</span>
            <span class="a11y-desc">Adjust HUD text size</span>
          </span>
          <div class="scale-btns">
            <button
              class="scale-btn"
              :class="{ active: uiScale === 1 }"
              @click="$emit('update:uiScale', 1)"
              aria-label="Normal UI scale"
            >A</button>
            <button
              class="scale-btn mid"
              :class="{ active: uiScale === 1.15 }"
              @click="$emit('update:uiScale', 1.15)"
              aria-label="Large UI scale"
            >A</button>
            <button
              class="scale-btn big"
              :class="{ active: uiScale === 1.3 }"
              @click="$emit('update:uiScale', 1.3)"
              aria-label="Extra large UI scale"
            >A</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LeaderEntry } from '../levels/types'

defineProps<{
  leaderboard: LeaderEntry[]
  highContrast: boolean
  reduceMotion: boolean
  uiScale: number
}>()

defineEmits<{
  'update:highContrast': [value: boolean]
  'update:reduceMotion': [value: boolean]
  'update:uiScale': [value: number]
}>()

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}
</script>

<style scoped>
.bottom-grid {
  max-width: 1440px;
  margin: 14px auto 0;
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.8fr;
  gap: 14px;
  align-items: start;
  text-align: left;
}

/* ── Panel base ─────────────────────────────────────── */
.panel {
  border-radius: 20px;
  padding: 18px 20px;
}
.panel h2 {
  margin: 0 0 14px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.01em;
}
.panel-icon {
  color: #64748b;
  flex-shrink: 0;
}

/* ── Scoreboard ─────────────────────────────────────── */
.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.leader-row {
  display: grid;
  grid-template-columns: 32px 1.4fr 0.9fr 0.55fr 0.65fr;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(148,163,184,0.06);
  font-size: 0.88rem;
  color: #cbd5e1;
  align-items: center;
  transition: background 0.15s;
}
.leader-row.header {
  background: transparent;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-bottom: 4px;
}
.leader-row:not(.header):hover {
  background: rgba(148,163,184,0.1);
}
.leader-row .rank {
  font-weight: 700;
  color: #64748b;
}
.leader-row.top .rank {
  color: #fbbf24;
}
.leader-row .name {
  font-weight: 600;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.leader-row .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.leader-row.active {
  background: linear-gradient(90deg, rgba(34,197,94,0.14), rgba(59,130,246,0.1));
  border: 1px solid rgba(74,222,128,0.25);
}
.leader-row.active .name {
  color: #4ade80;
}

/* ── Game Notes ─────────────────────────────────────── */
.notes-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.note-item dt {
  flex-shrink: 0;
  width: 22px;
  text-align: center;
  font-size: 0.95rem;
  line-height: 1.5;
}
.note-item dd {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.55;
}

/* ── Accessibility ──────────────────────────────────── */
.a11y-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.a11y-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}
.a11y-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.a11y-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #e2e8f0;
}
.a11y-desc {
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.3;
}

/* Toggle switch */
.toggle {
  appearance: none;
  -webkit-appearance: none;
  width: 38px;
  height: 20px;
  background: rgba(148,163,184,0.2);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
  border: 1px solid rgba(148,163,184,0.15);
}
.toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #94a3b8;
  transition: transform 0.2s, background 0.2s;
}
.toggle:checked {
  background: rgba(34,197,94,0.3);
  border-color: rgba(74,222,128,0.4);
}
.toggle:checked::after {
  transform: translateX(18px);
  background: #4ade80;
}
.toggle:focus-visible {
  outline: 2px solid #4ade80;
  outline-offset: 2px;
}

/* Scale buttons */
.scale-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.scale-btn {
  width: 30px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(148,163,184,0.15);
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  padding: 0;
  box-shadow: none;
}
.scale-btn.mid { font-size: 0.85rem; }
.scale-btn.big { font-size: 1rem; }
.scale-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #e2e8f0;
}
.scale-btn.active {
  background: rgba(34,197,94,0.2);
  color: #4ade80;
  border-color: rgba(74,222,128,0.4);
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1100px) {
  .bottom-grid { grid-template-columns: 1fr 1fr; }
  .a11y-panel { grid-column: 1 / -1; }
}
@media (max-width: 720px) {
  .bottom-grid { grid-template-columns: 1fr; }
  .leader-row { grid-template-columns: 28px 1fr 0.8fr 0.55fr 0.65fr; font-size: 0.82rem; }
}
</style>
