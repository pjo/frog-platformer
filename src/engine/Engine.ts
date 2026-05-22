import { InputManager } from './Input';

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: InputManager;

  private rafId: number = 0;
  private lastTime: number = 0;

  // Callbacks to hook into the core loops before we migrate them
  onUpdate?: (dt: number) => void;
  onRender?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.input = new InputManager();
  }

  start() {
    this.input.mount();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    this.input.unmount();
    cancelAnimationFrame(this.rafId);
  }

  private loop(ts: number) {
    const dt = Math.min(40, ts - this.lastTime);
    this.lastTime = ts;

    if (this.onUpdate) this.onUpdate(dt);
    if (this.onRender) this.onRender();

    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }
}
