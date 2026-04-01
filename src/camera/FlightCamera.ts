import * as THREE from 'three';
import type { ControlState } from '@/engine/InputManager';
import { BRIDGE } from '@/config/bridge';
import { terrainH } from '@/world/TerrainGenerator';
import { CinematicDirector } from './CinematicDirector';
import { CINEMATIC_SHOTS } from './shots';

export class FlightCamera {
  private camera: THREE.Camera;
  private ctrl: ControlState;
  readonly director: CinematicDirector;
  private _dir = new THREE.Vector3();
  private _right = new THREE.Vector3();

  constructor(camera: THREE.Camera, ctrl: ControlState) {
    this.camera = camera;
    this.ctrl = ctrl;
    ctrl.euler.set(-0.15, 2.3, 0);
    camera.quaternion.setFromEuler(ctrl.euler);

    this.director = new CinematicDirector(CINEMATIC_SHOTS);
  }

  /** Enter free-flight mode (pointer lock acquired) */
  enterFreeFlight() {
    this.director.pause();
  }

  /** Return to cinematic mode (pointer lock released) */
  enterCinematic() {
    this.director.resume();
  }

  update(dt: number) {
    // Cinematic mode — director drives the camera
    if (this.director.update(dt, this.camera)) {
      this.ctrl.euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      return;
    }

    // Free flight
    this.camera.quaternion.setFromEuler(this.ctrl.euler);
    const spd = this.ctrl.speed * (this.ctrl.boost ? 3 : 1) * dt;
    const dir = this._dir;
    this.camera.getWorldDirection(dir);
    const right = this._right.crossVectors(dir, this.camera.up).normalize();

    if (this.ctrl.fwd) this.ctrl.vel.addScaledVector(dir, spd);
    if (this.ctrl.back) this.ctrl.vel.addScaledVector(dir, -spd);
    if (this.ctrl.right) this.ctrl.vel.addScaledVector(right, spd);
    if (this.ctrl.left) this.ctrl.vel.addScaledVector(right, -spd);
    if (this.ctrl.up) this.ctrl.vel.y += spd;
    if (this.ctrl.down) this.ctrl.vel.y -= spd;

    const maxStep = 10;
    if (this.ctrl.vel.length() > maxStep) this.ctrl.vel.setLength(maxStep);

    this.camera.position.add(this.ctrl.vel);
    this.ctrl.vel.multiplyScalar(this.ctrl.damping);

    // Collisions
    const px = this.camera.position.x;
    const py = this.camera.position.y;
    const pz = this.camera.position.z;
    const B = BRIDGE;

    // Bridge deck
    if (pz > -B.sideSpan && pz < B.mainSpan + B.sideSpan && Math.abs(px) < B.deckW / 2 + 3) {
      if (py > B.deckH - 6 && py < B.deckH + 3) {
        this.camera.position.y = B.deckH + 3;
        this.ctrl.vel.y = Math.max(0, this.ctrl.vel.y);
      } else if (py < B.deckH - 6 && py > B.deckH - 12) {
        this.camera.position.y = B.deckH - 12;
        this.ctrl.vel.y = Math.min(0, this.ctrl.vel.y);
      }
    }

    // Tower legs
    const colSpacing = B.deckW / 2 + 2;
    const legHW = 5, legHD = 4;
    for (const tz of [0, B.mainSpan]) {
      for (const side of [-1, 1]) {
        const legX = side * colSpacing;
        const dx = Math.abs(px - legX), dz = Math.abs(pz - tz);
        if (dx < legHW && dz < legHD && py < B.towerH + 5) {
          const penX = legHW - dx, penZ = legHD - dz;
          if (penX < penZ) {
            this.camera.position.x = legX + Math.sign(px - legX) * legHW;
            this.ctrl.vel.x = 0;
          } else {
            this.camera.position.z = tz + Math.sign(pz - tz) * legHD;
            this.ctrl.vel.z = 0;
          }
        }
      }
    }

    // Terrain
    const tH = terrainH(px, pz);
    if (py < tH + 3) { this.camera.position.y = tH + 3; this.ctrl.vel.y = Math.max(0, this.ctrl.vel.y); }
    if (this.camera.position.y < 2) { this.camera.position.y = 2; this.ctrl.vel.y = 0; }
  }
}
