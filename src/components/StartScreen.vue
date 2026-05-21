<template>
  <div class="start-overlay">
    <div class="start-card">
      <div class="start-frog">🐸</div>
      <h1>Frog vs. Smurf Invaders</h1>
      <p>10 levels of platforming mayhem — stomp Smurfs, collect flies, survive the bosses</p>

      <div class="name-row">
        <label class="name-label" for="start-name">Name</label>
        <input
          id="start-name"
          class="name-input"
          :value="playerName"
          @input="$emit('update:playerName', ($event.target as HTMLInputElement).value)"
          maxlength="20"
          placeholder="Player"
          spellcheck="false"
          autocomplete="off"
        />
      </div>
      <div class="name-row">
        <label class="name-label" for="start-email">Email</label>
        <input
          id="start-email"
          class="name-input email-input"
          :value="playerEmail"
          @input="$emit('update:playerEmail', ($event.target as HTMLInputElement).value)"
          type="email"
          placeholder="for leaderboard"
          spellcheck="false"
          autocomplete="email"
        />
      </div>

      <div class="difficulty-row">
        <button
          v-for="d in difficulties"
          :key="d.value"
          class="diff-btn"
          :class="[d.value, { active: difficulty === d.value }]"
          @click="difficulty = d.value"
        >{{ d.label }}</button>
      </div>

      <button class="start-btn" @click="$emit('start', difficulty)">&#9654; Start Game</button>
      <div class="start-keys">
        <span>&#8592; &#8594; / A D &mdash; Move</span>
        <span>Space / W &mdash; Jump</span>
        <span>P: Pause &nbsp; M: Mute &nbsp; F: Fullscreen</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Difficulty = 'easy' | 'normal' | 'hard'
defineProps<{ playerName: string; playerEmail: string }>()
defineEmits<{ start: [difficulty: Difficulty]; 'update:playerName': [value: string]; 'update:playerEmail': [value: string] }>()

const difficulty = ref<Difficulty>('normal')
const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy',   label: 'Easy'   },
  { value: 'normal', label: 'Normal' },
  { value: 'hard',   label: 'Hard'   },
]
</script>

<style scoped>
.start-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(10,18,38,0.78); border-radius: 22px; z-index: 10;
}
.start-card {
  text-align: center; padding: 40px 48px; max-width: 560px;
  background: rgba(15,23,42,0.92); border: 1px solid rgba(148,163,184,0.2);
  border-radius: 28px; box-shadow: 0 32px 80px rgba(0,0,0,0.5);
}
.start-frog { font-size: 4rem; line-height: 1; margin-bottom: 12px; }
.start-card h1 { margin: 0 0 10px; font-size: 1.9rem; font-weight: 800; color: #f1f5f9; }
.start-card p  { margin: 0 0 22px; color: #94a3b8; line-height: 1.5; }

.name-row {
  display: flex; align-items: center; gap: 10px; justify-content: center; margin-bottom: 20px;
}
.name-label {
  font-size: 0.85rem; color: #64748b; font-weight: 600; white-space: nowrap;
}
.name-input {
  background: rgba(255,255,255,0.07); border: 1px solid rgba(148,163,184,0.2);
  border-radius: 10px; color: #f1f5f9; font-size: 0.95rem; font-weight: 600;
  padding: 11px 14px; width: 160px; text-align: center; outline: none;
}
.email-input { width: 200px; font-weight: 400; font-size: 0.88rem; }
.name-input::placeholder { color: rgba(148,163,184,0.4); }
.name-input:focus { border-color: rgba(74,222,128,0.5); box-shadow: 0 0 0 2px rgba(74,222,128,0.15); }

.difficulty-row {
  display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;
}
.diff-btn {
  font-size: 0.9rem; padding: 11px 22px; border-radius: 999px; font-weight: 700;
  background: rgba(255,255,255,0.07); color: #94a3b8;
  border: 2px solid transparent; cursor: pointer;
  transition: all 0.12s;
}
.diff-btn:hover { color: #f1f5f9; background: rgba(255,255,255,0.12); }
.diff-btn:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }
.diff-btn.easy.active  { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.12); }
.diff-btn.normal.active{ border-color: #eab308; color: #eab308; background: rgba(234,179,8,0.12); }
.diff-btn.hard.active  { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.12); }

.start-btn {
  font-size: 1.15rem; padding: 16px 44px; border-radius: 999px; font-weight: 800;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff; border: 0; cursor: pointer; box-shadow: 0 8px 28px rgba(34,197,94,0.35);
  transition: transform 0.12s, box-shadow 0.12s;
}
.start-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(34,197,94,0.45); }
.start-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.start-keys {
  margin-top: 24px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
  color: #64748b; font-size: 0.82rem;
}
.start-keys span { background: rgba(255,255,255,0.06); padding: 5px 12px; border-radius: 999px; }
</style>
