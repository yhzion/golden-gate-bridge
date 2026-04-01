import * as THREE from 'three';
import { CinematicShot } from './CinematicShot';
import type { ShotConfig } from './CinematicShot';

const CROSSFADE_DURATION = 2; // seconds

export class CinematicDirector {
  private shots: CinematicShot[];
  private currentIndex = 0;
  private shotTime = 0;
  isActive = true;

  // Crossfade state
  private crossfading = false;
  private crossfadeTime = 0;
  private fadeFromPos = new THREE.Vector3();
  private fadeFromLook = new THREE.Vector3();
  private fadeToPos = new THREE.Vector3();
  private fadeToLook = new THREE.Vector3();

  // Reusable temps
  private _pos = new THREE.Vector3();
  private _look = new THREE.Vector3();
  private _obj = new THREE.Object3D();

  // Shot name callback
  onShotChange: ((name: string) => void) | null = null;

  constructor(configs: ShotConfig[]) {
    this.shots = configs.map(c => new CinematicShot(c));
  }

  /** Call once per frame. Returns true if it updated the camera. */
  update(dt: number, camera: THREE.Camera): boolean {
    if (!this.isActive || this.shots.length === 0) return false;

    if (this.crossfading) {
      this.crossfadeTime += dt;
      const t = Math.min(this.crossfadeTime / CROSSFADE_DURATION, 1);
      const e = t * t * (3 - 2 * t); // smoothstep

      this._pos.lerpVectors(this.fadeFromPos, this.fadeToPos, e);
      this._look.lerpVectors(this.fadeFromLook, this.fadeToLook, e);

      camera.position.copy(this._pos);
      this._obj.position.copy(this._pos);
      this._obj.lookAt(this._look);
      camera.quaternion.copy(this._obj.quaternion);

      if (t >= 1) {
        this.crossfading = false;
        this.shotTime = 0;
        this.onShotChange?.(this.shots[this.currentIndex].name);
      }
      return true;
    }

    const shot = this.shots[this.currentIndex];
    this.shotTime += dt;
    const t = Math.min(this.shotTime / shot.duration, 1);
    const { position, lookAt } = shot.sample(t);

    camera.position.copy(position);
    this._obj.position.copy(position);
    this._obj.lookAt(lookAt);
    camera.quaternion.copy(this._obj.quaternion);

    if (t >= 1) {
      this.startCrossfade();
    }

    return true;
  }

  private startCrossfade() {
    const currentShot = this.shots[this.currentIndex];
    this.fadeFromPos.copy(currentShot.endPosition);
    this.fadeFromLook.copy(currentShot.endLookAt);

    this.currentIndex = (this.currentIndex + 1) % this.shots.length;

    const nextShot = this.shots[this.currentIndex];
    this.fadeToPos.copy(nextShot.startPosition);
    this.fadeToLook.copy(nextShot.startLookAt);

    this.crossfading = true;
    this.crossfadeTime = 0;
  }

  /** Resume cinematic, restarting the current shot from the beginning */
  resume() {
    this.isActive = true;
    this.shotTime = 0;
    this.crossfading = false;
    this.onShotChange?.(this.shots[this.currentIndex].name);
  }

  pause() {
    this.isActive = false;
  }
}
