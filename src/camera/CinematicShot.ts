import * as THREE from 'three';

export interface ShotKeyframe {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface ShotConfig {
  name: string;
  duration: number;
  keyframes: ShotKeyframe[];
  easing?: 'linear' | 'easeInOut';
}

export class CinematicShot {
  readonly name: string;
  readonly duration: number;
  private positionCurve: THREE.CatmullRomCurve3;
  private lookAtCurve: THREE.CatmullRomCurve3;
  private easing: 'linear' | 'easeInOut';

  private _pos = new THREE.Vector3();
  private _look = new THREE.Vector3();

  constructor(config: ShotConfig) {
    this.name = config.name;
    this.duration = config.duration;
    this.easing = config.easing ?? 'easeInOut';

    this.positionCurve = new THREE.CatmullRomCurve3(
      config.keyframes.map(kf => new THREE.Vector3(...kf.position)),
    );
    this.lookAtCurve = new THREE.CatmullRomCurve3(
      config.keyframes.map(kf => new THREE.Vector3(...kf.lookAt)),
    );
  }

  /** Sample at time t (0..1). Returns reusable refs — copy if you need to keep them. */
  sample(t: number): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const e = this.easing === 'easeInOut' ? t * t * (3 - 2 * t) : t;
    this.positionCurve.getPoint(e, this._pos);
    this.lookAtCurve.getPoint(e, this._look);
    return { position: this._pos, lookAt: this._look };
  }

  get startPosition(): THREE.Vector3 {
    return this.positionCurve.getPoint(0);
  }

  get startLookAt(): THREE.Vector3 {
    return this.lookAtCurve.getPoint(0);
  }

  get endPosition(): THREE.Vector3 {
    return this.positionCurve.getPoint(1);
  }

  get endLookAt(): THREE.Vector3 {
    return this.lookAtCurve.getPoint(1);
  }
}
