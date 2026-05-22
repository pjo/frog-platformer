# Frog vs. Smurf Invaders

A browser platformer built with Vue 3 + Vite. Play as a frog stomping Smurfs across 10 handcrafted levels — from a murky swamp to the void.

## Features

- **10 levels**, each with its own visual theme: swamp, cave, sky, lava, fortress, ice, desert, jungle, underwater, void
- **3 difficulty modes** — Easy (5 lives, slower enemies), Normal, Hard (2 lives, faster/tougher enemies)
- **Boss encounters** on levels 3, 5, 6, 7, 8, 9, 10 — progressively harder
- Moving platforms, power-ups (speed boost + star invincibility), checkpoints
- **Zero audio files** — all sound synthesised with the Web Audio API
- **Pixel-art sprites** generated from canvas drawing code (`scripts/gen-sprites.mjs`)
- Online leaderboard via a Vercel serverless function

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run gen-sprites  # regenerate public/sprites.png after editing scripts/gen-sprites.mjs
```

## Controls

| Action     | Keys          |
| ---------- | ------------- |
| Move       | ← → / A D     |
| Jump       | Space / W / ↑ |
| Pause      | P             |
| Mute       | M             |
| Fullscreen | F             |

Mobile touch controls are shown on smaller screens.
