import type { GameState } from './GameState';
import { intersects, circleHitsRect } from '../utils/physics';
import { ENGINE, PLAYER_CFG, TIMERS, SCORING, POWERS, COLORS } from '../utils/constants';
import { PHASE_AGGRESSIVE, PHASE_BERSERK, SHOOTER_RANGE } from '../levels/types';
import type { InputManager } from './Input';

export interface PhysicsEvents {
  onScore: (points: number) => void;
  onFlyCollected: () => void;
  onLifeLost: () => void;
  onAdvanceLevel: () => void;
  sfx: (name: 'jump' | 'fly' | 'powerup' | 'stomp' | 'hit' | 'checkpoint') => void;
  burst: (x: number, y: number, color: string, count: number, speed: number) => void;
}

export class Physics {
  static update(
    state: GameState,
    input: InputManager,
    dt: number,
    events: PhysicsEvents,
    reduceMotion: boolean,
  ) {
    const dts = Math.min(ENGINE.MAX_DT_SCALE, dt / ENGINE.DT_NORMALIZER);

    this.updateMovingPlatforms(state, dts);
    this.updatePlayer(state, input, dts, events);
    this.updateHazards(state, events);
    this.updateFlies(state, events);
    this.updatePowerUps(state, events);
    this.updateCheckpoints(state, events);
    this.updateEnemies(state, dts, events);
    this.updateParticles(state, dts);
    this.updateCamera(state, dts);
    this.updateWin(state, events);

    if (state.screenShake > 0) {
      state.screenShake = reduceMotion
        ? 0
        : Math.max(0, state.screenShake - ENGINE.SCREEN_SHAKE_DECAY);
    }
    if (state.levelBannerTimer > 0) {
      state.levelBannerTimer--;
    }
  }

  private static updatePlayer(
    state: GameState,
    input: InputManager,
    dts: number,
    events: PhysicsEvents,
  ) {
    const player = state.player;
    const boost = player.speedTimer > 0 ? POWERS.SPEED_MULTIPLIER : 1;

    if (input.left && !input.right) {
      player.vx -= player.accel * boost;
      player.facing = -1;
    }
    if (input.right && !input.left) {
      player.vx += player.accel * boost;
      player.facing = 1;
    }
    if (input.jump) player.jumpBuffer = TIMERS.JUMP_BUFFER;

    if (player.jumpBuffer > 0 && (player.onGround || player.coyoteFrames > 0)) {
      player.vy = -player.jumpForce;
      player.onGround = false;
      player.coyoteFrames = 0;
      player.jumpBuffer = 0;
      player.squish = 1;
      events.sfx('jump');
    }

    player.jumpBuffer = Math.max(0, player.jumpBuffer - 1);
    player.coyoteFrames = Math.max(0, player.coyoteFrames - 1);
    player.invincible = Math.max(0, player.invincible - 1);
    player.checkpointPulse = Math.max(0, player.checkpointPulse - 1);
    player.speedTimer = Math.max(0, player.speedTimer - 1);
    player.starTimer = Math.max(0, player.starTimer - 1);

    const maxSpd =
      player.speedTimer > 0 ? player.maxSpeed * POWERS.SPEED_MULTIPLIER : player.maxSpeed;
    player.vx *= player.onGround ? player.dragGround : player.dragAir;
    if (Math.abs(player.vx) < PLAYER_CFG.MIN_SPEED_THRESHOLD) player.vx = 0;
    player.vx = Math.max(-maxSpd, Math.min(maxSpd, player.vx));

    player.vy = Math.min(ENGINE.MAX_FALL_SPEED, player.vy + state.world.gravity * dts);
    player.x += player.vx * dts;
    this.resolveH(state);
    const wasGround = player.onGround;
    player.y += player.vy * dts;
    player.onGround = false;
    this.resolveV(state);

    if (!player.onGround && wasGround) player.coyoteFrames = TIMERS.COYOTE_FRAMES;
    if (player.y > state.world.height + ENGINE.DEATH_Y_OFFSET) events.onLifeLost();
    player.x = Math.max(0, Math.min(player.x, state.world.width - player.w));
    player.squish += (0 - player.squish) * PLAYER_CFG.SQUISH_RECOVERY;
  }

  private static resolveH(state: GameState) {
    for (const p of state.platforms) {
      if (!intersects(state.player, p)) continue;
      state.player.x = state.player.vx > 0 ? p.x - state.player.w : p.x + p.w;
      state.player.vx = 0;
    }
  }

  private static resolveV(state: GameState) {
    for (const p of state.platforms) {
      if (!intersects(state.player, p)) continue;
      if (state.player.vy > 0) {
        state.player.y = p.y - state.player.h;
        state.player.vy = 0;
        state.player.onGround = true;
      } else {
        state.player.y = p.y + p.h;
        state.player.vy = 0;
      }
    }
  }

  private static updateMovingPlatforms(state: GameState, dts: number) {
    for (const p of state.platforms) {
      if (!p.vx) continue;
      p.x += p.vx * dts;
      if (
        p.minPX !== undefined &&
        p.maxPX !== undefined &&
        (p.x <= p.minPX || p.x + p.w >= p.maxPX)
      )
        p.vx! *= -1;
    }
  }

  private static updateCamera(state: GameState, dts: number) {
    const target = Math.max(
      0,
      Math.min(
        state.player.x - ENGINE.VIEWPORT_W * ENGINE.CAMERA_OFFSET_RATIO,
        state.world.width - ENGINE.VIEWPORT_W,
      ),
    );
    state.world.cameraX += (target - state.world.cameraX) * Math.min(1, ENGINE.CAMERA_LAG * dts);
    state.world.bgOffset += ENGINE.BG_PARALLAX_SPEED * dts;
    state.world.fgOffset += ENGINE.FG_PARALLAX_SPEED * dts;
  }

  private static updateFlies(state: GameState, events: PhysicsEvents) {
    for (const f of state.flies) {
      if (f.taken || !circleHitsRect(f.x, f.y, f.r + 6, state.player)) continue;
      f.taken = true;
      events.onFlyCollected();
      events.onScore(SCORING.FLY);
      events.sfx('fly');
      events.burst(f.x, f.y, COLORS.PARTICLE_FLY, 8, 4);
    }
  }

  private static updatePowerUps(state: GameState, events: PhysicsEvents) {
    for (const pu of state.powerUps) {
      if (pu.taken || !circleHitsRect(pu.x, pu.y, pu.r + 8, state.player)) continue;
      pu.taken = true;
      events.sfx('powerup');
      if (pu.type === 'speed') {
        state.player.speedTimer = TIMERS.SPEED_BOOST;
        events.burst(pu.x, pu.y, COLORS.PARTICLE_SPEED, 12, 5);
      } else {
        state.player.starTimer = TIMERS.STAR_POWER;
        state.player.invincible = TIMERS.STAR_POWER;
        events.burst(pu.x, pu.y, COLORS.PARTICLE_STAR, 16, 6);
      }
    }
  }

  private static readonly CHASE_RANGE = 260;
  private static readonly CHASE_MULT = 1.6;

  private static updateEnemies(state: GameState, dts: number, events: PhysicsEvents) {
    for (const e of state.enemies) {
      if (e.dying) {
        e.deathTimer = Math.max(0, e.deathTimer - dts);
        continue;
      }
      if (!e.alive) continue;

      const dx = state.player.x - e.x;
      const chasing = !e.isBoss && Math.abs(dx) < Physics.CHASE_RANGE;

      if (chasing) {
        e.vx = Math.sign(dx) * Math.abs(e.patrolVx) * Physics.CHASE_MULT;
        e.mood = 'alert';
      } else {
        if (e.x <= e.minX || e.x + e.w >= e.maxX) e.vx *= -1;
        e.mood = Math.abs(dx) < 160 ? 'alert' : 'walk';
      }

      // Boss phase behavior
      if (e.isBoss) {
        const phase = e.hp / e.maxHp;
        if (phase <= PHASE_BERSERK) {
          e.vx = Math.sign(e.vx) * Math.abs(e.patrolVx) * 2.8;
          if (e.onGround && Math.abs(dx) < 320) {
            e.vy = -11;
            e.onGround = false;
          }
        } else if (phase <= PHASE_AGGRESSIVE) {
          e.vx = Math.sign(e.vx) * Math.abs(e.patrolVx) * 1.8;
        }
      }

      // Jumper: hop toward player when grounded and in range
      if (e.type === 'jumper') {
        e.jumpCooldown = Math.max(0, e.jumpCooldown - 1);
        if (e.onGround && e.jumpCooldown === 0 && Math.abs(dx) < Physics.CHASE_RANGE) {
          e.vy = -10;
          e.jumpCooldown = 80;
        }
      }

      // Vertical physics for jumpers and bosses; Y-clamp for everything else
      if (e.type === 'jumper' || e.isBoss) {
        e.vy = Math.min(ENGINE.MAX_FALL_SPEED, e.vy + ENGINE.GRAVITY * dts);
        e.y += e.vy * dts;
        e.onGround = false;
        for (const p of state.platforms) {
          if (!intersects(e, p)) continue;
          if (e.vy > 0) {
            e.y = p.y - e.h;
            e.vy = 0;
            e.onGround = true;
          } else {
            e.y = p.y + p.h;
            e.vy = 0;
          }
        }
      } else {
        e.y = e.spawnY;
        e.vy = 0;
        e.onGround = true;
      }

      // Shooter: fire projectile when player in range
      if (e.type === 'shooter') {
        e.shootCooldown = Math.max(0, e.shootCooldown - 1);
        if (e.shootCooldown === 0 && Math.abs(dx) < SHOOTER_RANGE) {
          state.hazards.push({
            x: e.x + e.w / 2,
            y: e.y + e.h / 2 - 6,
            w: 10,
            h: 6,
            type: 'projectile',
            vx: Math.sign(dx) * 5,
            active: true,
          });
          e.shootCooldown = 120;
        }
      }

      // Shield: raise shield after cooldown expires
      if (e.type === 'shield' && e.shieldCooldown > 0) {
        e.shieldCooldown = Math.max(0, e.shieldCooldown - 1);
        if (e.shieldCooldown === 0) e.shieldUp = true;
      }

      e.x += e.vx * dts;
      e.x = Math.max(e.minX, Math.min(e.x, e.maxX - e.w));
      e.bob += 0.04 * dts;

      if (!intersects(state.player, e)) continue;

      const stomped =
        state.player.vy > 1 && state.player.y + state.player.h - e.y < (e.isBoss ? 32 : 22);
      const starActive = state.player.starTimer > 0;

      if (stomped || starActive) {
        if (e.type === 'shield' && e.shieldUp && !starActive) {
          // Stomping a shielded enemy bounces the player back and costs a life
          events.onLifeLost();
        } else {
          e.hp--;
          const killed = e.hp <= 0;
          if (killed) {
            e.alive = false;
            e.dying = true;
            e.deathTimer = TIMERS.DEATH_ANIMATION;
            events.burst(
              e.x + e.w / 2,
              e.y + e.h / 2,
              e.isBoss ? COLORS.PARTICLE_BOSS_DEATH : COLORS.PARTICLE_ENEMY_DEATH,
              e.isBoss ? 26 : 10,
              e.isBoss ? 9 : 4,
            );
            events.onScore(e.isBoss ? SCORING.BOSS_KILL : SCORING.ENEMY_KILL);
          } else {
            events.burst(e.x + e.w / 2, e.y, COLORS.PARTICLE_ENEMY_HIT, 8, 4);
            events.onScore(100);
          }
          state.player.vy = e.isBoss ? PLAYER_CFG.BOUNCE_BOSS : PLAYER_CFG.BOUNCE_NORMAL;
          state.player.squish = PLAYER_CFG.SQUISH_STOMP_VAL;
          events.sfx('stomp');
          state.screenShake = e.isBoss ? 9 : 4;
        }
      } else if (starActive === false) {
        if (e.type === 'shield' && e.shieldUp) {
          // Side-bumping a shielded enemy knocks the shield down
          e.shieldUp = false;
          e.shieldCooldown = 90;
        } else {
          events.onLifeLost();
        }
      }
    }
  }

  private static updateHazards(state: GameState, events: PhysicsEvents) {
    const player = state.player;

    // Pass 1: move projectiles; deactivate those that left world bounds
    for (const h of state.hazards) {
      if (h.type === 'projectile') {
        h.x += h.vx ?? 0;
        if (h.x < 0 || h.x > state.world.width) h.active = false;
      }
    }

    // Pass 2: player collision — no break; loseLife() guard prevents double-damage
    for (const h of state.hazards) {
      if (intersects(player, h)) {
        if (h.type === 'projectile') h.active = false;
        events.onLifeLost();
      }
    }

    // Pass 3: remove inactive hazards — runs once after all marking
    state.hazards = state.hazards.filter((h) => h.active !== false);
  }

  private static updateCheckpoints(state: GameState, events: PhysicsEvents) {
    for (const cp of state.checkpoints) {
      if (intersects(state.player, cp) && !cp.active) {
        state.checkpoints.forEach((c) => {
          c.active = false;
        });
        cp.active = true;
        state.checkpoint.x = cp.x - 20;
        events.onScore(SCORING.CHECKPOINT);
        state.player.checkpointPulse = TIMERS.CHECKPOINT_PULSE;
        events.sfx('checkpoint');
        events.burst(cp.x + cp.w / 2, cp.y, COLORS.PARTICLE_CHECKPOINT, 8, 4);
      }
    }
  }

  private static updateParticles(state: GameState, dts: number) {
    for (const p of state.particles) {
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.vy += 0.2 * dts;
      p.life -= dts;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  private static updateWin(state: GameState, events: PhysicsEvents) {
    // If it's the last level and the boss is alive, can't win yet
    if (state.currentLevel === 10 && state.enemies.some((e) => e.isBoss && e.alive)) return;
    if (intersects(state.player, state.finishGate)) events.onAdvanceLevel();
  }
}
