import * as THREE from 'three';

export type UpdateFn = (dt: number, elapsed: number) => void;

export class GameLoop {
  private clock = new THREE.Clock();
  private running = false;
  private updateFns: UpdateFn[] = [];
  private renderFn: (() => void) | null = null;

  register(fn: UpdateFn) {
    this.updateFns.push(fn);
  }

  setRender(fn: () => void) {
    this.renderFn = fn;
  }

  start() {
    this.running = true;
    this.clock.start();
    this.tick();
  }

  stop() {
    this.running = false;
  }

  private tick = () => {
    if (!this.running) return;
    requestAnimationFrame(this.tick);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    for (const fn of this.updateFns) {
      fn(dt, elapsed);
    }

    this.renderFn?.();
  };
}
