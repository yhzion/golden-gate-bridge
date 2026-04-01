import type { ControlState } from '@/engine/InputManager';

export class HUD {
  private speedEl: HTMLElement | null;
  private altEl: HTMLElement | null;
  private posEl: HTMLElement | null;

  constructor() {
    this.speedEl = document.getElementById('hud-speed');
    this.altEl = document.getElementById('hud-alt');
    this.posEl = document.getElementById('hud-pos');
  }

  update(ctrl: ControlState, cameraPos: { x: number; y: number; z: number }) {
    if (this.speedEl) this.speedEl.textContent = String(Math.round(ctrl.speed * (ctrl.boost ? 3 : 1)));
    if (this.altEl) this.altEl.textContent = String(Math.round(cameraPos.y));
    if (this.posEl) this.posEl.textContent = `${Math.round(cameraPos.x)}, ${Math.round(cameraPos.z)}`;
  }
}
