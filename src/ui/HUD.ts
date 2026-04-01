import type { ControlState } from '@/engine/InputManager';

export class HUD {
  private speedEl: HTMLElement | null;
  private altEl: HTMLElement | null;
  private posEl: HTMLElement | null;
  private tierEl: HTMLElement | null;
  private fpsEl: HTMLElement | null;

  constructor() {
    this.speedEl = document.getElementById('hud-speed');
    this.altEl = document.getElementById('hud-alt');
    this.posEl = document.getElementById('hud-pos');
    this.tierEl = document.getElementById('hud-tier');
    this.fpsEl = document.getElementById('hud-fps');

    if (!this.tierEl) {
      const hud = document.getElementById('hud');
      if (hud) {
        const tierDiv = document.createElement('div');
        tierDiv.id = 'hud-tier';
        tierDiv.style.cssText = 'position:absolute;bottom:12px;left:12px;font-size:11px;opacity:0.7;';
        hud.appendChild(tierDiv);
        this.tierEl = tierDiv;
      }
    }
    if (!this.fpsEl) {
      const hud = document.getElementById('hud');
      if (hud) {
        const fpsDiv = document.createElement('div');
        fpsDiv.id = 'hud-fps';
        fpsDiv.style.cssText = 'position:absolute;bottom:12px;right:12px;font-size:11px;opacity:0.7;';
        hud.appendChild(fpsDiv);
        this.fpsEl = fpsDiv;
      }
    }
  }

  update(
    ctrl: ControlState,
    cameraPos: { x: number; y: number; z: number },
    tierLabel?: string,
    fps?: number,
  ) {
    if (this.speedEl) this.speedEl.textContent = String(Math.round(ctrl.speed * (ctrl.boost ? 3 : 1)));
    if (this.altEl) this.altEl.textContent = String(Math.round(cameraPos.y));
    if (this.posEl) this.posEl.textContent = `${Math.round(cameraPos.x)}, ${Math.round(cameraPos.z)}`;
    if (this.tierEl && tierLabel !== undefined) this.tierEl.textContent = `Quality: ${tierLabel}`;
    if (this.fpsEl && fps !== undefined) this.fpsEl.textContent = `${Math.round(fps)} FPS`;
  }
}
