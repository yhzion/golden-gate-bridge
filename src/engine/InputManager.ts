import * as THREE from 'three';

export interface ControlState {
  fwd: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  boost: boolean;
  speed: number;
  euler: THREE.Euler;
  vel: THREE.Vector3;
  sens: number;
  damping: number;
  locked: boolean;
}

const KEY_MAP: Record<string, keyof Pick<ControlState, 'fwd' | 'back' | 'left' | 'right' | 'up' | 'down' | 'boost'>> = {
  KeyW: 'fwd',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'up',
  KeyQ: 'down',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
};

export class InputManager {
  ctrl: ControlState;
  private canvas: HTMLCanvasElement;
  private onWeatherKey: ((n: number) => void) | null = null;
  private onLightingKey: ((key: 'L' | 'V' | 'G') => void) | null = null;
  private hideTimer: number | null = null;
  private readonly HIDE_DELAY = 3000;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctrl = {
      fwd: false, back: false, left: false, right: false,
      up: false, down: false, boost: false,
      speed: 50,
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      vel: new THREE.Vector3(),
      sens: 0.002,
      damping: 0.90,
      locked: false,
    };

    this.canvas.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('wheel', this.onWheel, { passive: true });

    this.resetHideTimer();
  }

  setCallbacks(
    onWeatherKey: (n: number) => void,
    onLightingKey?: (key: 'L' | 'V' | 'G') => void,
  ) {
    this.onWeatherKey = onWeatherKey;
    this.onLightingKey = onLightingKey ?? null;
  }

  private onClick = () => {
    if (!this.ctrl.locked) this.canvas.requestPointerLock();
  };

  private onPointerLockChange = () => {
    this.ctrl.locked = document.pointerLockElement === this.canvas;
    this.showPanels();
    this.resetHideTimer();
  };

  private showPanels() {
    const overlay = document.getElementById('overlay');
    const hud = document.getElementById('hud');
    if (this.ctrl.locked) {
      if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
      if (hud) hud.style.opacity = '1';
    } else {
      if (overlay) { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'auto'; }
      if (hud) hud.style.opacity = '0';
    }
  }

  private hidePanels() {
    const overlay = document.getElementById('overlay');
    const hud = document.getElementById('hud');
    if (this.ctrl.locked) {
      if (hud) hud.style.opacity = '0';
    } else {
      if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
    }
  }

  private resetHideTimer() {
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hidePanels(), this.HIDE_DELAY);
  }

  private onMouseMove = (e: MouseEvent) => {
    this.showPanels();
    this.resetHideTimer();

    if (!this.ctrl.locked) return;
    this.ctrl.euler.y -= e.movementX * this.ctrl.sens;
    this.ctrl.euler.x -= e.movementY * this.ctrl.sens;
    this.ctrl.euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.ctrl.euler.x));
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const mapped = KEY_MAP[e.code];
    if (mapped) {
      this.ctrl[mapped] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyL') this.onLightingKey?.('L');
    if (e.code === 'KeyG') this.onLightingKey?.('G');
    if (e.code >= 'Digit7' && e.code <= 'Digit9') {
      this.onWeatherKey?.(+e.code.slice(5));
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const mapped = KEY_MAP[e.code];
    if (mapped) this.ctrl[mapped] = false;
  };

  private onWheel = (e: WheelEvent) => {
    this.ctrl.speed *= e.deltaY > 0 ? 0.92 : 1.08;
    this.ctrl.speed = THREE.MathUtils.clamp(this.ctrl.speed, 5, 500);
  };

  dispose() {
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.canvas.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('wheel', this.onWheel);
  }
}
