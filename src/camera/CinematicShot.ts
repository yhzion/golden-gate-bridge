import * as THREE from 'three';

export interface ShotKeyframe {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export type TitlePosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'top-right'
  | 'top-left';

export type TitleAnimation =
  | 'slide-up'
  | 'slide-left'
  | 'slide-right'
  | 'fade';

export interface ShotConfig {
  name: string;
  duration: number;
  keyframes: ShotKeyframe[];
  easing?: 'linear' | 'easeInOut';
  subtitle?: string;
  titlePosition?: TitlePosition;
  titleAnimation?: TitleAnimation;
}

export class CinematicShot {
  readonly name: string;
  readonly duration: number;
  private positionCurve: THREE.CatmullRomCurve3;
  private lookAtCurve: THREE.CatmullRomCurve3;
  private easing: 'linear' | 'easeInOut';

  private _pos = new THREE.Vector3();
  private _look = new THREE.Vector3();

  // Cached boundary vectors (avoid allocation per transition)
  readonly startPosition: THREE.Vector3;
  readonly startLookAt: THREE.Vector3;
  readonly endPosition: THREE.Vector3;
  readonly endLookAt: THREE.Vector3;

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

    this.startPosition = this.positionCurve.getPoint(0);
    this.startLookAt = this.lookAtCurve.getPoint(0);
    this.endPosition = this.positionCurve.getPoint(1);
    this.endLookAt = this.lookAtCurve.getPoint(1);
  }

  /** Sample at time t (0..1). Returns reusable refs — copy if you need to keep them. */
  sample(t: number): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const e = this.easing === 'easeInOut' ? t * t * (3 - 2 * t) : t;
    this.positionCurve.getPoint(e, this._pos);
    this.lookAtCurve.getPoint(e, this._look);
    return { position: this._pos, lookAt: this._look };
  }
}
