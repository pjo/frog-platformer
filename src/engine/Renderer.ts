import type { GameState } from './GameState';
import { LEVELS } from '../levels/index';
import { THEMES } from '../levels/themes';
import { blit, aframe, SPRITE } from '../composables/useSpriteSheet';
import { COLORS, ENGINE, DRAW_CFG } from '../utils/constants';
import type { Enemy } from '../levels/types';
import { PHASE_AGGRESSIVE, PHASE_BERSERK, SHOOTER_RANGE } from '../levels/types';

export interface UIState {
  won: boolean;
  gameOver: boolean;
  paused: boolean;
  fliesCollected: number;
  totalFlies: number;
  score: number;
  reduceMotion: boolean;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  spriteSheet: HTMLImageElement | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // Helper for drawing rounded rectangles
  private rr(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  render(state: GameState, ui: UIState) {
    const sx = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake : 0;
    const sy = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake : 0;
    this.ctx.save();
    this.ctx.translate(sx, sy);

    this.drawParallax(state);
    this.drawWorld(state, ui);
    this.drawOverlay(ui);
    this.drawLevelBanner(state);

    this.ctx.restore();
  }

  private drawParallax(state: GameState) {
    const theme = THEMES[LEVELS[state.currentLevel - 1].theme];
    theme.drawParallax(
      this.ctx,
      state.world.cameraX,
      state.world.width,
      ENGINE.VIEWPORT_W,
      ENGINE.VIEWPORT_H,
    );
  }

  private drawWorld(state: GameState, ui: UIState) {
    this.ctx.save();
    this.ctx.translate(-state.world.cameraX, 0);
    this.drawGround(state);
    this.drawPlatforms(state);
    this.drawCheckpoints(state);
    this.drawFlies(state);
    this.drawPowerUps(state);
    this.drawHazards(state);
    this.drawEnemies(state);
    this.drawFinishGate(state);
    this.drawPlayer(state, ui);
    this.drawParticlesInWorld(state, ui);
    this.ctx.restore();
  }

  private drawGround(state: GameState) {
    const theme = THEMES[LEVELS[state.currentLevel - 1].theme];
    this.ctx.fillStyle = theme.groundColor;
    this.ctx.fillRect(0, 560, state.world.width, 160);
    const grassSpacing = 96;
    const grassCount = Math.ceil(state.world.width / grassSpacing) + 1;
    for (let i = 0; i < grassCount; i++) {
      const x = i * grassSpacing + (Math.sin(i * 3.1 + state.world.fgOffset * 0.02) + 1) * 16;
      this.ctx.fillStyle = i % 3 === 0 ? theme.groundAccentA : theme.groundAccentB;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 560);
      this.ctx.lineTo(x + 10, 530);
      this.ctx.lineTo(x + 18, 560);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawPlatforms(state: GameState) {
    for (const p of state.platforms) {
      if (p.type === 'ground') continue;
      if (p.type === 'stone') {
        this.ctx.fillStyle = COLORS.PLATFORM_STONE;
        this.rr(p.x, p.y, p.w, p.h, 8);
        this.ctx.fillStyle = COLORS.PLATFORM_STONE_HIGHLIGHT;
        this.rr(p.x + 4, p.y + 4, p.w - 8, 6, 4);
      } else {
        this.ctx.fillStyle = COLORS.PLATFORM_WOOD;
        this.rr(p.x, p.y, p.w, p.h, 10);
        this.ctx.fillStyle = COLORS.PLATFORM_WOOD_PATTERN;
        for (let i = 0; i < p.w; i += 28) this.ctx.fillRect(p.x + i, p.y + 4, 16, p.h - 8);
      }
      if (p.vx) {
        this.ctx.fillStyle = COLORS.PLATFORM_MOVING_HIGHLIGHT;
        this.rr(p.x, p.y, p.w, p.h, 10);
      }
    }
  }

  private drawCheckpoints(state: GameState) {
    for (const cp of state.checkpoints) {
      this.ctx.fillStyle = COLORS.CHECKPOINT_POLE;
      this.ctx.fillRect(cp.x + 10, cp.y, 8, cp.h);
      const pulse = cp.active ? 1 + Math.sin(performance.now() * 0.008) * 0.06 : 1;
      this.ctx.save();
      this.ctx.translate(cp.x + 18, cp.y + 10);
      this.ctx.scale(pulse, pulse);
      this.ctx.fillStyle = cp.active ? COLORS.CHECKPOINT_ACTIVE : COLORS.CHECKPOINT_INACTIVE;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(46, 14);
      this.ctx.lineTo(0, 28);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawFlies(state: GameState) {
    const frame = aframe(12);
    for (const f of state.flies) {
      if (f.taken) continue;
      const bob = Math.sin(performance.now() * 0.008 + f.x * 0.02) * 5;
      blit(
        this.ctx,
        this.spriteSheet!,
        SPRITE.rows.flySpin,
        frame,
        f.x + DRAW_CFG.FLY_OFFSET_X,
        f.y + DRAW_CFG.FLY_OFFSET_Y + bob,
        DRAW_CFG.FLY_DRAW_W,
        DRAW_CFG.FLY_DRAW_H,
      );
    }
  }

  private drawPowerUps(state: GameState) {
    for (const pu of state.powerUps) {
      if (pu.taken) continue;
      const bob = Math.sin(performance.now() * 0.005 + pu.x * 0.01) * 4;
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.1;
      this.ctx.save();
      this.ctx.translate(pu.x, pu.y + bob);
      this.ctx.scale(pulse, pulse);
      if (pu.type === 'speed') {
        this.ctx.fillStyle = COLORS.PU_SPEED_BASE;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pu.r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = COLORS.PU_SPEED_GLINT;
        this.ctx.beginPath();
        this.ctx.arc(-4, -4, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(4, -2, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = COLORS.PU_SPEED_TEXT;
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('S', 0, 4);
      } else {
        this.ctx.fillStyle = COLORS.PU_STAR_BASE;
        this.drawStarShape(0, 0, pu.r, pu.r * 0.45, 5);
        this.ctx.fillStyle = COLORS.PU_STAR_TEXT;
        this.ctx.font = 'bold 8px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('\u2605', 0, 3);
      }
      this.ctx.restore();
    }
  }

  private drawStarShape(cx: number, cy: number, or: number, ir: number, pts: number) {
    this.ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = (i * Math.PI) / pts - Math.PI / 2;
      const r = i % 2 === 0 ? or : ir;
      i === 0
        ? this.ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        : this.ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawHazards(state: GameState) {
    for (const h of state.hazards) {
      if (h.type === 'projectile') {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowColor = '#ef4444';
        this.ctx.shadowBlur = 6;
        this.ctx.fillRect(h.x, h.y, h.w, h.h);
        this.ctx.shadowBlur = 0;
        continue;
      }
      const g = this.ctx.createLinearGradient(h.x, h.y, h.x, h.y + h.h);
      g.addColorStop(0, COLORS.HAZARD_GRAD_START);
      g.addColorStop(1, COLORS.HAZARD_GRAD_END);
      this.ctx.fillStyle = g;
      this.rr(h.x, h.y, h.w, h.h, 14);
      for (let i = 0; i < h.w; i += 18) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.arc(
          h.x + i + 8,
          h.y + 8 + Math.sin((i + performance.now() * 0.02) * 0.2) * 2,
          4,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }
    }
  }

  private drawEnemies(state: GameState) {
    const playerX = state.player.x;
    for (const e of state.enemies) {
      if (e.dying) {
        if (e.deathTimer <= 0) continue;
        const t = 1 - e.deathTimer / 20;
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, 1 - t);
        this.ctx.translate(e.x + e.w / 2, e.y + e.h);
        this.ctx.scale(1 + t * 1.4, Math.max(0.05, 1 - t * 0.95));
        if (e.isBoss) {
          this.ctx.fillStyle = COLORS.PARTICLE_BOSS_DEATH;
          this.rr(-e.w / 2, -12, e.w, 12, 4);
        } else if (this.spriteSheet) {
          this.ctx.imageSmoothingEnabled = false;
          this.ctx.drawImage(
            this.spriteSheet,
            0,
            SPRITE.rows.smurfWalk * SPRITE.fh,
            SPRITE.fw,
            SPRITE.fh,
            -22,
            -38,
            44,
            38,
          );
        }
        this.ctx.restore();
        continue;
      }
      if (!e.alive) continue;
      const yb = Math.sin(performance.now() * 0.01 + e.bob) * 1.6;
      if (e.isBoss) {
        this.drawBoss(e, yb);
        continue;
      }

      // Hue shift and type indicators for non-boss enemies
      this.ctx.save();
      if (e.type === 'jumper') {
        this.ctx.filter = `hue-rotate(40deg)`;
        // Jump-ready chevron above enemy
        if (e.onGround && e.jumpCooldown === 0) {
          this.ctx.fillStyle = '#fde68a';
          this.ctx.font = 'bold 14px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('▲', e.x + e.w / 2, e.y - 6);
        }
      } else if (e.type === 'shooter') {
        this.ctx.filter = `hue-rotate(120deg)`;
        // Red dot when player is in range
        if (Math.abs(playerX - e.x) < SHOOTER_RANGE) {
          this.ctx.fillStyle = '#ef4444';
          this.ctx.beginPath();
          this.ctx.arc(e.x + e.w / 2, e.y - 8, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      } else if (e.type === 'shield') {
        // Shield arc in front of enemy when shield is up
        if (e.shieldUp) {
          const facing = Math.sign(e.vx) || 1;
          this.ctx.strokeStyle = 'rgba(100,180,255,0.7)';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(
            e.x + e.w / 2,
            e.y + e.h / 2,
            e.w * 0.7,
            facing > 0 ? -Math.PI / 3 : Math.PI - Math.PI / 3,
            facing > 0 ? Math.PI / 3 : Math.PI + Math.PI / 3,
          );
          this.ctx.stroke();
        }
      }
      const row = e.mood === 'alert' ? SPRITE.rows.smurfAlert : SPRITE.rows.smurfWalk;
      const fr = e.mood === 'alert' ? aframe(7) : aframe(10);
      blit(
        this.ctx,
        this.spriteSheet!,
        row,
        fr,
        e.x + DRAW_CFG.ENEMY_OFFSET_X,
        e.y + DRAW_CFG.ENEMY_OFFSET_Y + yb,
        DRAW_CFG.ENEMY_DRAW_W,
        DRAW_CFG.ENEMY_DRAW_H,
        e.vx > 0,
      );
      this.ctx.restore();
    }
  }

  private drawBoss(e: Enemy, yb: number) {
    const phase = e.hp / e.maxHp;
    const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.04;
    this.ctx.save();
    // Phase 3: white flash overlay every ~333ms
    if (phase <= PHASE_BERSERK && Math.floor(Date.now() / 333) % 2 === 0) {
      this.ctx.filter = 'brightness(3) saturate(0)';
    } else if (phase <= PHASE_AGGRESSIVE) {
      this.ctx.filter = 'hue-rotate(30deg)';
    }
    this.ctx.translate(e.x + e.w / 2, e.y + e.h / 2 + yb);
    this.ctx.scale(e.vx > 0 ? -pulse : pulse, pulse);
    this.ctx.fillStyle = COLORS.BOSS_BODY;
    this.rr(-44, -34, 88, 68, 14);
    this.ctx.fillStyle = COLORS.BOSS_CROWN;
    this.ctx.beginPath();
    this.ctx.moveTo(-30, -34);
    this.ctx.lineTo(-22, -56);
    this.ctx.lineTo(-8, -38);
    this.ctx.lineTo(0, -58);
    this.ctx.lineTo(8, -38);
    this.ctx.lineTo(22, -56);
    this.ctx.lineTo(30, -34);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.fillStyle = COLORS.TEXT_PRIMARY;
    this.ctx.beginPath();
    this.ctx.arc(-15, -10, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(15, -10, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = COLORS.PARTICLE_DAMAGE;
    this.ctx.beginPath();
    this.ctx.arc(-15, -10, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(15, -10, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = COLORS.TEXT_PRIMARY;
    this.ctx.beginPath();
    this.ctx.arc(-13, -12, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(17, -12, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = COLORS.BOSS_EYE_PUPIL;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 10, 20, 0, Math.PI);
    this.ctx.stroke();
    this.ctx.fillStyle = COLORS.BOSS_HP_BG_DARKEN;
    this.ctx.fillRect(-36, -52, 72, 9);
    this.ctx.fillStyle =
      e.hp === 3 ? COLORS.BOSS_HP_HIGH : e.hp === 2 ? COLORS.BOSS_HP_MED : COLORS.BOSS_HP_LOW;
    this.ctx.fillRect(-36, -52, 72 * (e.hp / e.maxHp), 9);
    this.ctx.restore();
  }

  private drawFinishGate(state: GameState) {
    const bossLocked =
      state.currentLevel === LEVELS.length && state.enemies.some((e) => e.isBoss && e.alive);
    this.ctx.fillStyle = bossLocked ? COLORS.GATE_LOCKED : COLORS.GATE_UNLOCKED;
    this.ctx.fillRect(state.finishGate.x, state.finishGate.y, 10, state.finishGate.h);
    this.ctx.fillRect(
      state.finishGate.x + state.finishGate.w - 10,
      state.finishGate.y,
      10,
      state.finishGate.h,
    );
    this.ctx.fillRect(state.finishGate.x, state.finishGate.y, state.finishGate.w, 10);
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.04;
    this.ctx.save();
    this.ctx.translate(state.finishGate.x + state.finishGate.w / 2, state.finishGate.y + 18);
    this.ctx.scale(pulse, pulse);
    this.ctx.fillStyle = bossLocked ? COLORS.PARTICLE_DAMAGE : COLORS.PARTICLE_BOSS_DEATH;
    this.rr(-36, 0, 72, 34, 10);
    this.ctx.fillStyle = COLORS.TEXT_PRIMARY;
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      bossLocked
        ? 'BOSS!'
        : state.currentLevel < LEVELS.length
          ? `LVL ${state.currentLevel + 1}`
          : 'EXIT',
      0,
      24,
    );
    this.ctx.restore();
  }

  private drawPlayer(state: GameState, ui: UIState) {
    if (state.player.invincible > 0 && Math.floor(state.player.invincible / 6) % 2 === 0) return;
    if (state.player.starTimer > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.32;
      this.ctx.fillStyle = COLORS.PU_STAR_BASE;
      this.ctx.beginPath();
      this.ctx.arc(
        state.player.x + state.player.w / 2,
        state.player.y + state.player.h / 2,
        DRAW_CFG.STAR_AURA_RADIUS,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
      this.ctx.restore();
    }
    let row = SPRITE.rows.frogIdle,
      frame = aframe(6);
    if (ui.won) ((row = SPRITE.rows.frogVictory), (frame = aframe(8)));
    else if (state.player.invincible > 100) ((row = SPRITE.rows.frogHurt), (frame = aframe(8)));
    else if (!state.player.onGround)
      ((row = SPRITE.rows.frogJump),
        (frame = Math.min(5, Math.floor(Math.max(-12, Math.min(12, state.player.vy + 12)) / 4))));
    else if (Math.abs(state.player.vx) > 1.1) ((row = SPRITE.rows.frogRun), (frame = aframe(12)));

    if (state.player.checkpointPulse > 0) {
      this.ctx.fillStyle = 'rgba(250,204,21,0.22)';
      this.ctx.beginPath();
      this.ctx.arc(
        state.player.x + state.player.w / 2,
        state.player.y + state.player.h / 2,
        DRAW_CFG.PULSE_AURA_BASE_RADIUS + state.player.checkpointPulse * 0.5,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    }
    blit(
      this.ctx,
      this.spriteSheet!,
      row,
      frame,
      state.player.x + DRAW_CFG.PLAYER_OFFSET_X,
      state.player.y + DRAW_CFG.PLAYER_OFFSET_Y,
      DRAW_CFG.PLAYER_DRAW_W,
      DRAW_CFG.PLAYER_DRAW_H,
      state.player.facing < 0,
    );
  }

  private drawParticlesInWorld(state: GameState, ui: UIState) {
    if (ui.reduceMotion) return;
    for (const p of state.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawOverlay(ui: UIState) {
    if (!ui.paused && !ui.gameOver && !ui.won) return;
    this.ctx.fillStyle = COLORS.OVERLAY_BG;
    this.ctx.fillRect(0, 0, ENGINE.VIEWPORT_W, ENGINE.VIEWPORT_H);
    this.ctx.fillStyle = COLORS.TEXT_PRIMARY;
    this.ctx.font = '800 64px sans-serif';
    this.ctx.textAlign = 'center';

    if (ui.won) this.ctx.fillText('Victory!', ENGINE.VIEWPORT_W / 2, ENGINE.VIEWPORT_H / 2 - 20);
    else if (ui.gameOver)
      this.ctx.fillText('Game Over', ENGINE.VIEWPORT_W / 2, ENGINE.VIEWPORT_H / 2 - 20);
    else this.ctx.fillText('Paused', ENGINE.VIEWPORT_W / 2, ENGINE.VIEWPORT_H / 2 - 20);

    this.ctx.font = '24px sans-serif';
    const sub = ui.won
      ? `Final score ${ui.score} \u00B7 ${ui.fliesCollected}/${ui.totalFlies} flies \u00B7 All levels cleared!`
      : ui.gameOver
        ? 'Press R to try again.'
        : 'Press P or tap Resume.';
    this.ctx.fillText(sub, ENGINE.VIEWPORT_W / 2, ENGINE.VIEWPORT_H / 2 + 28);
  }

  private drawLevelBanner(state: GameState) {
    if (state.levelBannerTimer <= 0) return;
    const alpha = Math.min(1, state.levelBannerTimer / 40);
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = COLORS.OVERLAY_BG;
    this.ctx.fillRect(0, ENGINE.VIEWPORT_H / 2 - 52, ENGINE.VIEWPORT_W, 104);
    this.ctx.fillStyle = COLORS.TEXT_PRIMARY;
    this.ctx.font = 'bold 40px sans-serif';
    this.ctx.textAlign = 'center';
    const names = [
      'Swamp Forest',
      'Crystal Cave',
      'Sky Kingdom',
      'Lava Fields',
      'Dark Fortress',
      'Frozen Peaks',
      'Scorched Sands',
      'Jungle Depths',
      'Sunken Reef',
      'The Void',
    ];
    this.ctx.fillText(
      `Level ${state.currentLevel}: ${names[state.currentLevel - 1]}`,
      ENGINE.VIEWPORT_W / 2,
      ENGINE.VIEWPORT_H / 2 + 14,
    );
    this.ctx.restore();
  }
}
