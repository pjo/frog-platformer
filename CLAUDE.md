# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

The actual project lives in the `frog-game/` subdirectory:

```
frog-game/          ← repo root
└── frog-game/      ← Vite project (work here)
    ├── src/
    │   ├── main.ts
    │   ├── App.vue
    │   ├── style.css
    │   └── components/
    │       └── FrogGame.vue   ← entire game (1200+ lines)
    └── public/
        ├── favicon.svg
        └── icons.svg
```

All development commands must be run from `frog-game/frog-game/`.

## Commands

```bash
cd frog-game/frog-game

npm run dev       # start dev server (Vite HMR)
npm run build     # type-check + production build (vue-tsc && vite build)
npm run preview   # preview production build
```

There are no tests and no linter configured.

## Architecture

The entire game is a single Vue 3 `<script setup>` component: `src/components/FrogGame.vue`. `App.vue` only renders `<FrogGame />`.

**State split:** Vue `ref`s hold reactive UI state (score, lives, paused, won, gameOver, fliesCollected, elapsedMs). All game-world entities (player, enemies, platforms, flies, checkpoints, hazards, finishGate, world camera) are plain mutable JS objects — not reactive — mutated directly in the game loop.

**Game loop:** `requestAnimationFrame` drives `frame(ts)` → `update(dt)` + `render()`. `dt` is capped at 40ms; physics uses a `dtScale` factor (dt / 16.667) so movement is frame-rate independent.

**Sprite system:** All sprites are procedurally generated at startup by `buildSpriteSheet()`, which draws pixel-art frames onto an offscreen `<canvas>` using `pxRect()`. The sheet has 8 rows (frogIdle, frogRun, frogJump, frogHurt, frogVictory, smurfWalk, smurfAlert, flySpin) × 6 columns. `drawSprite()` blits frames from this sheet onto the main canvas.

**Physics:** Manual AABB collision with two-pass resolution — horizontal first (`resolveHorizontalCollisions`), then vertical (`resolveVerticalCollisions`). Includes coyote time (8 frames) and jump buffering (8 frames). No physics library.

**Audio:** Web Audio API synthesis only — no audio files. `playTone()` creates oscillator + gain nodes. Audio context is lazily created on first key press to satisfy browser autoplay policy.

**Rendering pipeline:** `render()` calls `drawParallax()` (sky gradient, mountains, trees at different scroll speeds) then `drawWorld()` (translates canvas by `-cameraX`, draws all entities) then `drawScreenOverlay()` (pause/game-over/win overlay).

**World:** 5200px wide, 720px tall. The camera follows the player with lerp smoothing. Three checkpoints save progress; dying respawns at the last active checkpoint.
