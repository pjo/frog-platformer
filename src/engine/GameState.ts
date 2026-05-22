import type { Platform, Enemy, Fly, Hazard, CP, Particle, PowerUp, Rect } from '../levels/types';
import { ENGINE, PLAYER_CFG } from '../utils/constants';

export class GameState {
  world = {
    width: 5200,
    height: ENGINE.VIEWPORT_H,
    gravity: ENGINE.GRAVITY,
    cameraX: 0,
    bgOffset: 0,
    fgOffset: 0,
  };
  checkpoint = { x: PLAYER_CFG.START_X };

  player = {
    x: PLAYER_CFG.START_X,
    y: PLAYER_CFG.START_Y,
    w: PLAYER_CFG.WIDTH,
    h: PLAYER_CFG.HEIGHT,
    vx: 0,
    vy: 0,
    maxSpeed: PLAYER_CFG.MAX_SPEED,
    accel: PLAYER_CFG.ACCEL,
    dragGround: PLAYER_CFG.DRAG_GROUND,
    dragAir: PLAYER_CFG.DRAG_AIR,
    jumpForce: PLAYER_CFG.JUMP_FORCE,
    coyoteFrames: 0,
    jumpBuffer: 0,
    onGround: false,
    facing: 1,
    invincible: 0,
    squish: 0,
    checkpointPulse: 0,
    speedTimer: 0,
    starTimer: 0,
  };

  platforms: Platform[] = [];
  enemies: Enemy[] = [];
  flies: Fly[] = [];
  hazards: Hazard[] = [];
  checkpoints: CP[] = [];
  powerUps: PowerUp[] = [];
  particles: Particle[] = [];
  finishGate: Rect = { x: 4890, y: 362, w: 60, h: 140 };

  enemyInitData: Array<{ x: number; vx: number; hp: number }> = [];

  screenShake = 0;
  levelBannerTimer = 0;

  // UI bridging variables
  score = 0;
  lives = 3;
  fliesCollected = 0;
  elapsedMs = 0;
  currentLevel = 1;
}
