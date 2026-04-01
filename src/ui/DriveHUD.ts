/**
 * Minimal HUD for drive mode: speed and view mode display.
 */
export class DriveHUD {
  private el: HTMLElement;
  private speedEl: HTMLElement;
  private viewEl: HTMLElement;

  constructor() {
    this.el = document.getElementById('drive-hud')!;
    this.speedEl = document.getElementById('drive-speed')!;
    this.viewEl = document.getElementById('drive-view')!;
  }

  show(): void {
    this.el.style.display = 'block';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  update(speedMs: number, viewMode: 'first' | 'third'): void {
    this.speedEl.textContent = Math.round(speedMs * 3.6).toString();
    this.viewEl.textContent = viewMode === 'first' ? '1ST' : '3RD';
  }
}
