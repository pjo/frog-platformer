/**
 * Generates public/sprites.png from the same pixel-art drawing code used at
 * runtime. Run with:  node scripts/gen-sprites.mjs
 *
 * Layout: 8 rows × 6 columns, each cell 64×64 px
 *   row 0  frogIdle    row 1  frogRun     row 2  frogJump
 *   row 3  frogHurt    row 4  frogVictory row 5  smurfWalk
 *   row 6  smurfAlert  row 7  flySpin
 */

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/sprites.png');

const FW = 64,
  FH = 64,
  COLS = 6,
  ROWS = 8;
const SPRITE_ROWS = {
  frogIdle: 0,
  frogRun: 1,
  frogJump: 2,
  frogHurt: 3,
  frogVictory: 4,
  smurfWalk: 5,
  smurfAlert: 6,
  flySpin: 7,
};

function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawFrogFrame(ctx, ox, oy, frame, state) {
  const ph = frame % 6;
  const legShift = state === 'run' ? [0, 3, 5, 3, 0, -1][ph] : state === 'jump' ? -3 : 0;
  const armShift = state === 'run' ? [2, 0, -2, -1, 1, 2][ph] : state === 'victory' ? -5 : 0;
  const blink = state === 'idle' && ph === 4;
  const mo = state === 'hurt' ? 1 : state === 'victory' ? 2 : 0;
  const sq = state === 'jump' ? -4 : state === 'hurt' ? 2 : 0;
  px(ctx, ox + 20, oy + 22 + sq, 24, 22, '#22c55e');
  px(ctx, ox + 18, oy + 18 + sq, 28, 12, '#16a34a');
  px(ctx, ox + 16, oy + 12 + sq, 32, 16, '#22c55e');
  px(ctx, ox + 18, oy + 6 + sq, 10, 10, '#4ade80');
  px(ctx, ox + 36, oy + 6 + sq, 10, 10, '#4ade80');
  px(ctx, ox + 20, oy + 8 + sq, 6, 6, '#ffffff');
  px(ctx, ox + 38, oy + 8 + sq, 6, 6, '#ffffff');
  if (!blink) {
    px(ctx, ox + 22, oy + 10 + sq, 2, 2, '#0f172a');
    px(ctx, ox + 40, oy + 10 + sq, 2, 2, '#0f172a');
  } else {
    px(ctx, ox + 20, oy + 11 + sq, 6, 1, '#0f172a');
    px(ctx, ox + 38, oy + 11 + sq, 6, 1, '#0f172a');
  }
  px(ctx, ox + 24, oy + 21 + sq, 16, mo === 2 ? 4 : 3, mo ? '#14532d' : '#166534');
  if (mo === 1) px(ctx, ox + 27, oy + 23 + sq, 10, 3, '#ef4444');
  px(ctx, ox + 12 - armShift, oy + 24 + sq, 8, 7, '#22c55e');
  px(ctx, ox + 44 + armShift, oy + 24 + sq, 8, 7, '#22c55e');
  px(ctx, ox + 10 - armShift, oy + 29 + sq, 6, 5, '#16a34a');
  px(ctx, ox + 48 + armShift, oy + 29 + sq, 6, 5, '#16a34a');
  px(ctx, ox + 22, oy + 42 + sq, 8, 10 + legShift, '#166534');
  px(ctx, ox + 34, oy + 42 + sq, 8, 10 - legShift, '#166534');
  px(ctx, ox + 20, oy + 52 + sq + legShift, 12, 4, '#14532d');
  px(ctx, ox + 32, oy + 52 + sq - legShift, 12, 4, '#14532d');
}

function drawSmurfFrame(ctx, ox, oy, frame, state) {
  const ph = frame % 6;
  const step = state === 'walk' ? [0, 2, 3, 2, 0, -1][ph] : 0;
  const ew = state === 'alert' && (ph === 2 || ph === 3);
  const mouth = state === 'alert' ? 4 : 2;
  // ── Pointed Phrygian cap (white, drooping tip) ──
  px(ctx, ox + 28, oy + 0, 8, 4, '#e2e8f0'); // tip
  px(ctx, ox + 26, oy + 4, 12, 4, '#f1f5f9');
  px(ctx, ox + 22, oy + 8, 18, 4, '#f8fafc');
  px(ctx, ox + 18, oy + 12, 26, 6, '#ffffff'); // brim
  // ── Blue head ──
  px(ctx, ox + 16, oy + 16, 32, 16, '#93c5fd');
  // Eyes
  px(ctx, ox + 20, oy + 18, 6, ew ? 6 : 4, '#ffffff');
  px(ctx, ox + 38, oy + 18, 6, ew ? 6 : 4, '#ffffff');
  px(ctx, ox + 22, oy + 20, 2, 2, '#0f172a');
  px(ctx, ox + 40, oy + 20, 2, 2, '#0f172a');
  // Rosy cheeks
  px(ctx, ox + 18, oy + 25, 6, 3, 'rgba(248,113,113,0.45)');
  px(ctx, ox + 40, oy + 25, 6, 3, 'rgba(248,113,113,0.45)');
  // Nose
  px(ctx, ox + 30, oy + 23, 4, 3, '#7dd3fc');
  // Mouth
  px(ctx, ox + 26, oy + 29, 12, mouth, '#1e293b');
  // ── Blue body ──
  px(ctx, ox + 18, oy + 32, 28, 10, '#60a5fa');
  // White shirt/belly
  px(ctx, ox + 22, oy + 33, 20, 8, '#f8fafc');
  // Arms
  px(ctx, ox + 10, oy + 33, 8, 6, '#60a5fa');
  px(ctx, ox + 46, oy + 33, 8, 6, '#60a5fa');
  px(ctx, ox + 8, oy + 37, 6, 4, '#3b82f6');
  px(ctx, ox + 50, oy + 37, 6, 4, '#3b82f6');
  // ── White trousers ──
  px(ctx, ox + 18, oy + 42, 28, 8, '#f1f5f9');
  // ── Blue legs ──
  px(ctx, ox + 20, oy + 50, 8, 6 + step, '#2563eb');
  px(ctx, ox + 36, oy + 50, 8, 6 - step, '#2563eb');
  // Shoes
  px(ctx, ox + 18, oy + 54 + step, 12, 4, '#1d4ed8');
  px(ctx, ox + 34, oy + 54 - step, 12, 4, '#1d4ed8');
}

function drawFlyFrame(ctx, ox, oy, frame) {
  const wings = [8, 10, 12, 10, 8, 6][frame % 6];
  px(ctx, ox + 28, oy + 24, 8, 16, '#facc15');
  px(ctx, ox + 24, oy + 28, 16, 8, '#eab308');
  px(ctx, ox + 18, oy + 22, wings, 4, 'rgba(255,255,255,0.8)');
  px(ctx, ox + 64 - 18 - wings, oy + 22, wings, 4, 'rgba(255,255,255,0.8)');
  px(ctx, ox + 30, oy + 20, 4, 4, '#111827');
}

const canvas = createCanvas(FW * COLS, FH * ROWS);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

for (let i = 0; i < COLS; i++) {
  drawFrogFrame(ctx, i * FW, SPRITE_ROWS.frogIdle * FH, i, 'idle');
  drawFrogFrame(ctx, i * FW, SPRITE_ROWS.frogRun * FH, i, 'run');
  drawFrogFrame(ctx, i * FW, SPRITE_ROWS.frogJump * FH, i, 'jump');
  drawFrogFrame(ctx, i * FW, SPRITE_ROWS.frogHurt * FH, i, 'hurt');
  drawFrogFrame(ctx, i * FW, SPRITE_ROWS.frogVictory * FH, i, 'victory');
  drawSmurfFrame(ctx, i * FW, SPRITE_ROWS.smurfWalk * FH, i, 'walk');
  drawSmurfFrame(ctx, i * FW, SPRITE_ROWS.smurfAlert * FH, i, 'alert');
  drawFlyFrame(ctx, i * FW, SPRITE_ROWS.flySpin * FH, i);
}

writeFileSync(OUT, canvas.toBuffer('image/png'));
console.log(`Wrote ${OUT}  (${FW * COLS}×${FH * ROWS}px)`);
