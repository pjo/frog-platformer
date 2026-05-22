# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project layout

The repo root is also the Vite + Vue 3 project:

```
frog-game/              ← repo root = project root
├── api/                ← Vercel serverless functions (leaderboard)
│   ├── scores.ts       ← GET/POST leaderboard scores, email verification flow
│   └── verify.ts       ← GET handler for email verification links
├── src/
│   ├── main.ts
│   ├── App.vue          ← renders <FrogGame /> only
│   ├── style.css        ← minimal global reset + color-scheme: dark
│   ├── api/
│   │   └── scores.ts   ← typed fetch wrappers for leaderboard API (getScores, postScore)
│   ├── assets/
│   │   └── frog-logo.svg ← frog logo used in GameTopbar
│   ├── components/
│   │   ├── FrogGame.vue        ← Vue orchestrator: owns reactive UI refs, wires Engine to DOM
│   │   ├── GameTopbar.vue      ← header: brand, level badge, name input, action buttons
│   │   ├── GameHud.vue         ← score/lives/flies/time/power stat cards
│   │   ├── GameLeaderboard.vue ← scoreboard + game notes + accessibility panels
│   │   └── StartScreen.vue     ← pre-game overlay: name/email input, difficulty, start button
│   ├── engine/
│   │   ├── Engine.ts     ← rAF game loop, canvas context, InputManager wiring
│   │   ├── GameState.ts  ← all mutable game-world state (player, enemies, platforms, etc.)
│   │   ├── Input.ts      ← keyboard input: keys/held/blocked sets, blockCurrentKeys()
│   │   ├── Physics.ts    ← static Physics class: movement, collision, enemies, scoring events
│   │   └── Renderer.ts   ← all canvas draw calls; receives GameState + UIState
│   ├── levels/
│   │   ├── types.ts    ← all shared interfaces (LevelDef, Platform, Enemy, etc.)
│   │   ├── themes.ts   ← per-theme parallax/ground renderers + THEMES map
│   │   ├── level1.ts … level10.ts
│   │   └── index.ts    ← export const LEVELS = [level1..level10]
│   ├── composables/
│   │   ├── useAudio.ts       ← Web Audio synthesis, sfx, bg music
│   │   └── useSpriteSheet.ts ← sprite sheet builder, blit, aframe
│   └── utils/
│       ├── constants.ts  ← ENGINE, PLAYER_CFG, TIMERS, SCORING, POWERS, COLORS
│       └── physics.ts    ← intersects(), circleHitsRect()
├── public/
│   ├── favicon.svg
│   └── sprites.png     ← committed static asset, regenerate with npm run gen-sprites
└── scripts/
    └── gen-sprites.mjs ← source of truth for all sprite art
```

## Coding style

### Vue

- Use Vue's [recommended style guide](https://vuejs.org/guide/style-guide/)

### TypeScript

- Strict mode is on. No `any`. Prefer `interface` over `type` for object shapes.
- Use `readonly` on arrays/objects that shouldn't be mutated after creation.
- Prefer explicit return types on public functions in engine files.

### Styling

- Avoid inline styles if possible, use classes, and if reused across components, try to share.
- Avoid inline graphics like svg:s etc. and create separate assets instead.

## Commands

```bash
npm run dev          # start dev server (Vite HMR)
npm run build        # type-check + production build (vue-tsc && vite build)
npm run preview      # preview production build
npm run gen-sprites  # regenerate public/sprites.png from scripts/gen-sprites.mjs
npm run lint         # ESLint (Vue 3 + TypeScript rules)
npm run format       # Prettier (single quotes, semicolons, 100 char width)
npm run test         # vitest unit tests
```

## Architecture

### State split

Vue `ref`s in `FrogGame.vue` hold reactive UI state (`score`, `lives`, `paused`, `won`, `gameOver`, `fliesCollected`, `elapsedMs`, `currentLevel`, `activePower`, `gameStarted`, `difficulty`). All game-world entities (`player`, `enemies`, `platforms`, `flies`, `checkpoints`, `hazards`, `finishGate`, `world` camera) are plain mutable JS objects — not reactive — mutated directly in the game loop.

### Game loop

`requestAnimationFrame` drives `gameLoop(ts)` → `update(dt)` + `render()`. `dt` is capped at 40ms; physics uses a `dtScale` factor (`dt / 16.667`) so movement is frame-rate independent. `update()` is gated on `gameStarted` — nothing moves until the player clicks Start.

### Level system

Each level is a typed `LevelDef` exported from `src/levels/levelN.ts`. `LEVELS.length` drives `LEVEL_COUNT`; `LEVELS[n-1].flies.length` drives the fly counter — no magic constants. To add a level: create `levelN.ts`, add it to `src/levels/index.ts`. There are 10 levels across 10 themes.

### Difficulty

`difficulty` ref (`'easy' | 'normal' | 'hard'`) is set from `StartScreen` on game start. `loadLevel()` applies a `speedMult` (0.65/1.0/1.4) and `hpMult` (0.5/1.0/1.5) to enemies. `resetGame()` sets lives to 5/3/2 accordingly.

### Themes

Each `LevelDef` carries a `theme` string. `src/levels/themes.ts` maps theme names to `ThemeRenderer` objects with `drawParallax` and ground colours. 10 themes: swamp, cave, sky, lava, fortress, ice, desert, jungle, underwater, void.

### Sprite system

`public/sprites.png` is a 384×512px sprite sheet (6 cols × 8 rows of 64×64px frames). It is a **committed static asset** — do not generate it at runtime. Layout:

| Row | Name        |
| --- | ----------- |
| 0   | frogIdle    |
| 1   | frogRun     |
| 2   | frogJump    |
| 3   | frogHurt    |
| 4   | frogVictory |
| 5   | smurfWalk   |
| 6   | smurfAlert  |
| 7   | flySpin     |

To modify sprites, edit `scripts/gen-sprites.mjs` (plain JS, uses `@napi-rs/canvas`) then run `npm run gen-sprites` to regenerate the PNG. The drawing functions in that script are the source of truth for all sprite art.

`useSpriteSheet.ts` loads the PNG asynchronously on mount (`buildSpriteSheet()` returns a `Promise<HTMLImageElement>`). `blit()` copies frames to the main canvas; `aframe()` computes the current animation frame index.

### Physics

Manual AABB collision in `FrogGame.vue` with two-pass resolution — horizontal first (`resolveH`), then vertical (`resolveV`). Pure helper functions live in `utils/physics.ts`. Includes coyote time (8 frames) and jump buffering (8 frames). No physics library.

### Audio

`useAudio.ts` owns the Web Audio API context, background music interval, and all `sfx*` functions. The audio context is lazily created on first key press to satisfy browser autoplay policy. No audio files — all sound is synthesised via oscillator + gain nodes.

### Rendering pipeline

`render()` → `drawParallax()` (delegates to `THEMES[theme].drawParallax`) → `drawWorld()` (translates canvas by `-cameraX`, draws all entities) → `drawOverlay()` (pause/game-over/win) → `drawLevelBanner()`.

### World dimensions

Each level defines its own `worldWidth` (5200–8200px); height is always 720px. The camera follows the player with lerp smoothing. Each level has three checkpoints; dying respawns at the last active one.

## Update documentation

Always keep CLAUDE.md and README.md up to date.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:

- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
