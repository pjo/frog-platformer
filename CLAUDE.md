# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

The actual project lives in the `frog-game/` subdirectory:

```
frog-game/          ← repo root
└── frog-game/      ← Vite + Vue 3 project (work here)
    ├── api/        ← Vercel serverless functions (leaderboard)
    ├── src/
    │   ├── main.ts
    │   ├── App.vue          ← renders <FrogGame /> only
    │   ├── style.css
    │   ├── components/
    │   │   ├── FrogGame.vue        ← orchestrator (~500 lines): game loop, physics, state
    │   │   ├── GameTopbar.vue      ← header: title, buttons, name input
    │   │   ├── GameHud.vue         ← score/lives/flies/time/power stat cards
    │   │   ├── GameLeaderboard.vue ← scoreboard + game notes panels
    │   │   └── StartScreen.vue     ← pre-game start overlay
    │   ├── levels/
    │   │   ├── types.ts    ← all shared interfaces (LevelDef, Platform, Enemy, etc.)
    │   │   ├── themes.ts   ← per-theme parallax/ground renderers + THEMES map
    │   │   ├── level1.ts … level5.ts
    │   │   └── index.ts    ← export const LEVELS = [level1..level5]
    │   ├── composables/
    │   │   ├── useAudio.ts       ← Web Audio synthesis, sfx, bg music
    │   │   └── useSpriteSheet.ts ← sprite sheet builder, blit, aframe
    │   └── utils/
    │       └── physics.ts  ← intersects(), circleHitsRect()
    └── public/
        ├── favicon.svg
        └── icons.svg
```

All development commands must be run from `frog-game/frog-game/`.

## Commands

```bash
cd frog-game/frog-game

npm run dev          # start dev server (Vite HMR)
npm run build        # type-check + production build (vue-tsc && vite build)
npm run preview      # preview production build
npm run gen-sprites  # regenerate public/sprites.png from scripts/gen-sprites.mjs
```

There are no tests and no linter configured.

## Architecture

### State split
Vue `ref`s in `FrogGame.vue` hold reactive UI state (`score`, `lives`, `paused`, `won`, `gameOver`, `fliesCollected`, `elapsedMs`, `currentLevel`, `activePower`, `gameStarted`). All game-world entities (`player`, `enemies`, `platforms`, `flies`, `checkpoints`, `hazards`, `finishGate`, `world` camera) are plain mutable JS objects — not reactive — mutated directly in the game loop.

### Game loop
`requestAnimationFrame` drives `gameLoop(ts)` → `update(dt)` + `render()`. `dt` is capped at 40ms; physics uses a `dtScale` factor (`dt / 16.667`) so movement is frame-rate independent. `update()` is gated on `gameStarted` — nothing moves until the player clicks Start.

### Level system
Each level is a typed `LevelDef` exported from `src/levels/levelN.ts`. `LEVELS.length` drives `LEVEL_COUNT`; `LEVELS[n-1].flies.length` drives the fly counter — no magic constants. To add a level: create `levelN.ts`, add it to `src/levels/index.ts`.

### Themes
Each `LevelDef` carries a `theme` string (e.g. `'swamp'`, `'lava'`). `src/levels/themes.ts` maps theme names to `ThemeRenderer` objects that contain the parallax draw function and ground colours. Adding a new visual theme does not touch the renderer code in `FrogGame.vue`.

### Sprite system
`public/sprites.png` is a 384×512px sprite sheet (6 cols × 8 rows of 64×64px frames). It is a **committed static asset** — do not generate it at runtime. Layout:

| Row | Name |
|-----|------|
| 0 | frogIdle |
| 1 | frogRun |
| 2 | frogJump |
| 3 | frogHurt |
| 4 | frogVictory |
| 5 | smurfWalk |
| 6 | smurfAlert |
| 7 | flySpin |

To modify sprites, edit `scripts/gen-sprites.mjs` (plain JS, uses `@napi-rs/canvas`) then run `npm run gen-sprites` to regenerate the PNG. The drawing functions in that script are the source of truth for all sprite art.

`useSpriteSheet.ts` loads the PNG asynchronously on mount (`buildSpriteSheet()` returns a `Promise<HTMLImageElement>`). `blit()` copies frames to the main canvas; `aframe()` computes the current animation frame index.

### Physics
Manual AABB collision in `FrogGame.vue` with two-pass resolution — horizontal first (`resolveH`), then vertical (`resolveV`). Pure helper functions live in `utils/physics.ts`. Includes coyote time (8 frames) and jump buffering (8 frames). No physics library.

### Audio
`useAudio.ts` owns the Web Audio API context, background music interval, and all `sfx*` functions. The audio context is lazily created on first key press to satisfy browser autoplay policy. No audio files — all sound is synthesised via oscillator + gain nodes.

### Rendering pipeline
`render()` → `drawParallax()` (delegates to `THEMES[theme].drawParallax`) → `drawWorld()` (translates canvas by `-cameraX`, draws all entities) → `drawOverlay()` (pause/game-over/win) → `drawLevelBanner()`.

### World dimensions
Each level defines its own `worldWidth` (5200–7500px); height is always 720px. The camera follows the player with lerp smoothing. Each level has three checkpoints; dying respawns at the last active one.
