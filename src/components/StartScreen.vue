<template>
  <div class="start-overlay">
    <div class="start-card">
      <div class="start-frog">🐸</div>
      <h2>Frog vs. Smurf Invaders</h2>
      <p>5 levels of platforming mayhem — stomp Smurfs, collect flies, survive the boss</p>
      <button class="start-btn" @click="$emit('start')">&#9654; Start Game</button>
      <div class="start-keys">
        <span>&#8592; &#8594; / A D &mdash; Move</span>
        <span>Space / W &mdash; Jump</span>
        <span>P: Pause &nbsp; M: Mute &nbsp; F: Fullscreen</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ start: [] }>()
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
.start-card h2 { margin: 0 0 10px; font-size: 1.9rem; color: #f1f5f9; }
.start-card p  { margin: 0 0 28px; color: #94a3b8; line-height: 1.5; }
.start-btn {
  font-size: 1.15rem; padding: 16px 44px; border-radius: 999px; font-weight: 800;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff; border: 0; cursor: pointer; box-shadow: 0 8px 28px rgba(34,197,94,0.35);
  transition: transform 0.12s, box-shadow 0.12s;
}
.start-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(34,197,94,0.45); }
.start-keys {
  margin-top: 24px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
  color: #64748b; font-size: 0.82rem;
}
.start-keys span { background: rgba(255,255,255,0.06); padding: 5px 12px; border-radius: 999px; }
</style>
