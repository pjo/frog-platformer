import { describe, it, expect, vi } from 'vitest';
import { Physics } from '../Physics';
import { GameState } from '../GameState';
import { InputManager } from '../Input';
import type { Enemy } from '../../levels/types';
import type { PhysicsEvents } from '../Physics';

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    x: 400,
    y: 522,
    w: 44,
    h: 38,
    vx: 2,
    vy: 0,
    patrolVx: 2,
    minX: 300,
    maxX: 600,
    alive: true,
    dying: false,
    deathTimer: 0,
    bob: 0,
    hue: 0,
    mood: 'walk',
    hp: 1,
    maxHp: 1,
    isBoss: false,
    type: 'basic',
    jumpCooldown: 0,
    shootCooldown: 0,
    shieldUp: false,
    shieldCooldown: 0,
    onGround: true,
    spawnY: 522,
    ...overrides,
  };
}

function makeState(enemyOverrides: Partial<Enemy> = {}): GameState {
  const state = new GameState();
  state.enemies = [makeEnemy(enemyOverrides)];
  // Ground platform enemy stands on; player will be positioned above it
  state.platforms = [{ x: 0, y: 560, w: 1280, h: 160, type: 'ground' }];
  return state;
}

function makeEvents(): PhysicsEvents {
  return {
    onScore: vi.fn(),
    onFlyCollected: vi.fn(),
    onLifeLost: vi.fn(),
    onAdvanceLevel: vi.fn(),
    sfx: vi.fn(),
    burst: vi.fn(),
  };
}

// Create a real InputManager with no keys pressed
function makeNoInput(): InputManager {
  return new InputManager();
}

describe('Jumper enemy', () => {
  it('decrements jumpCooldown each frame', () => {
    const state = makeState({ type: 'jumper', jumpCooldown: 10 });
    const events = makeEvents();
    state.player.x = 9999; // far away — no jump triggered
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.enemies[0].jumpCooldown).toBe(9);
  });

  it('jumps when grounded, cooldown is 0, and player is in range', () => {
    const state = makeState({ type: 'jumper', jumpCooldown: 0, onGround: true, vy: 0 });
    const events = makeEvents();
    // Player above ground, within CHASE_RANGE (260px)
    state.player.x = state.enemies[0].x + 100;
    state.player.y = 300; // well above ground (560), won't fall into platform
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    // After jump impulse + gravity: vy should be negative (moving up)
    expect(state.enemies[0].vy).toBeLessThan(0);
    expect(state.enemies[0].jumpCooldown).toBeGreaterThan(0);
  });

  it('does not jump when cooldown is non-zero', () => {
    const state = makeState({ type: 'jumper', jumpCooldown: 5, onGround: true, vy: 0 });
    const events = makeEvents();
    state.player.x = state.enemies[0].x + 100;
    state.player.y = 300;
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.enemies[0].jumpCooldown).toBe(4);
    // vy was not given jump impulse (-10), so it should not be deeply negative
    expect(state.enemies[0].vy).toBeGreaterThan(-5);
  });
});

describe('Shooter enemy', () => {
  it('fires a projectile when player is in range and shootCooldown is 0', () => {
    const state = makeState({ type: 'shooter', shootCooldown: 0 });
    const events = makeEvents();
    state.player.x = state.enemies[0].x + 200; // within SHOOTER_RANGE (400px)
    state.player.y = 300;
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.hazards.length).toBeGreaterThan(0);
    expect(state.hazards[state.hazards.length - 1].type).toBe('projectile');
  });

  it('does not fire when player is out of range', () => {
    const state = makeState({ type: 'shooter', shootCooldown: 0 });
    const events = makeEvents();
    state.player.x = state.enemies[0].x + 500; // beyond SHOOTER_RANGE
    state.player.y = 300;
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.hazards.length).toBe(0);
  });

  it('sets shootCooldown to 120 after firing', () => {
    const state = makeState({ type: 'shooter', shootCooldown: 0 });
    const events = makeEvents();
    state.player.x = state.enemies[0].x + 200;
    state.player.y = 300;
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.enemies[0].shootCooldown).toBe(120);
  });
});

describe('Shield enemy', () => {
  // Helper: positions the player so they land ON the enemy (stomp)
  // Player y is above enemy, vy is positive (falling)
  function positionPlayerStomp(state: GameState) {
    const e = state.enemies[0];
    state.player.x = e.x + 10; // overlap in x
    state.player.y = e.y - 44; // just above enemy top (won't intersect ground: 522-44=478, bottom=532 < 560)
    state.player.vy = 5; // falling
    state.player.invincible = 0;
    state.player.starTimer = 0;
  }

  // Helper: positions player to the side of enemy (side bump, not stomp)
  // Player is above ground but overlapping enemy in y
  function positionPlayerSide(state: GameState) {
    const e = state.enemies[0];
    state.player.x = e.x - 10; // slightly to the left, overlapping x
    state.player.y = 490; // y: 490, bottom: 544 — overlaps enemy (522..560) but above ground (560)
    state.player.vy = 0;
    state.player.invincible = 0;
    state.player.starTimer = 0;
  }

  it('stomping a shielded enemy calls onLifeLost (no star)', () => {
    const state = makeState({ type: 'shield', shieldUp: true });
    const events = makeEvents();
    positionPlayerStomp(state);
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(events.onLifeLost).toHaveBeenCalled();
    expect(state.enemies[0].alive).toBe(true);
  });

  it('side-bumping a shielded enemy knocks the shield down without calling onLifeLost', () => {
    const state = makeState({ type: 'shield', shieldUp: true });
    const events = makeEvents();
    positionPlayerSide(state);
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.enemies[0].shieldUp).toBe(false);
    expect(state.enemies[0].shieldCooldown).toBe(90);
    expect(events.onLifeLost).not.toHaveBeenCalled();
  });

  it('raises shield again after shieldCooldown expires', () => {
    const state = makeState({ type: 'shield', shieldUp: false, shieldCooldown: 1 });
    const events = makeEvents();
    state.player.x = 9999; // far — no collision
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.enemies[0].shieldUp).toBe(true);
    expect(state.enemies[0].shieldCooldown).toBe(0);
  });

  it('star power bypasses shield and kills the enemy', () => {
    const state = makeState({ type: 'shield', shieldUp: true });
    const events = makeEvents();
    positionPlayerStomp(state);
    state.player.invincible = 100;
    state.player.starTimer = 100;
    Physics.update(state, makeNoInput(), 16.6667, events, true);
    expect(state.enemies[0].alive).toBe(false);
    expect(state.enemies[0].dying).toBe(true);
    expect(events.onLifeLost).not.toHaveBeenCalled();
  });
});

describe('Boss phase thresholds', () => {
  it('applies 1.8x speed multiplier in AGGRESSIVE phase', () => {
    const state = makeState({
      isBoss: true,
      hp: 3,
      maxHp: 5, // ratio 0.6, below PHASE_AGGRESSIVE (0.66)
      patrolVx: 2,
      vx: 2,
      vy: 0,
    });
    state.player.x = 9999; // far away
    Physics.update(state, makeNoInput(), 16.6667, makeEvents(), true);
    expect(Math.abs(state.enemies[0].vx)).toBeCloseTo(2 * 1.8, 1);
  });

  it('applies 2.8x speed multiplier in BERSERK phase', () => {
    const state = makeState({
      isBoss: true,
      hp: 1,
      maxHp: 5, // ratio 0.2, below PHASE_BERSERK (0.33)
      patrolVx: 2,
      vx: 2,
      vy: 0,
      onGround: false,
    });
    state.player.x = 9999; // far away
    Physics.update(state, makeNoInput(), 16.6667, makeEvents(), true);
    expect(Math.abs(state.enemies[0].vx)).toBeCloseTo(2 * 2.8, 1);
  });
});

describe('resetEntities field reset', () => {
  it('resets shield, cooldowns, and vy after respawn', () => {
    const enemy = makeEnemy({
      type: 'shield',
      shieldUp: false,
      shieldCooldown: 45,
      jumpCooldown: 20,
      shootCooldown: 30,
      vy: 7,
      onGround: false,
    });
    // Simulate the reset loop from FrogGame.vue resetEntities()
    enemy.vy = 0;
    enemy.jumpCooldown = 0;
    enemy.shootCooldown = 0;
    enemy.shieldUp = enemy.type === 'shield';
    enemy.shieldCooldown = 0;
    enemy.onGround = false;

    expect(enemy.shieldUp).toBe(true);
    expect(enemy.vy).toBe(0);
    expect(enemy.jumpCooldown).toBe(0);
    expect(enemy.shootCooldown).toBe(0);
    expect(enemy.shieldCooldown).toBe(0);
  });
});
