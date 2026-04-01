import * as THREE from 'three';
import type { ControlState } from '@/engine/InputManager';
import { BRIDGE } from '@/config/bridge';
import { terrainH } from '@/world/TerrainGenerator';

export interface Viewpoint {
  name: string;
  pos: [number, number, number];
  look: [number, number, number];
}

export const VIEWPOINTS: Record<number, Viewpoint> = {
  1: { name: 'OVERVIEW', pos: [-500, 140, -400], look: [0, 90, 640] },
  2: { name: 'DECK LEVEL', pos: [3, 72, -200], look: [3, 70, 600] },
  3: { name: 'TOWER TOP', pos: [25, 240, 10], look: [0, 80, 640] },
  4: { name: 'CABLE PASS', pos: [16, 160, 400], look: [16, 84, 640] },
  5: { name: 'AERIAL', pos: [-200, 380, 200], look: [0, 50, 800] },
  6: { name: 'WATER LEVEL', pos: [80, 5, 640], look: [0, 60, 640] },
};

export class FlightCamera {
  private camera: THREE.Camera;
  private ctrl: ControlState;
  autoFly = true;
  private autoAngle = -0.3;

  // Viewpoint animation
  private animatingView = false;
  private viewT = 0;
  private viewDur = 2.5;
  private viewFrom = new THREE.Vector3();
  private viewTo = new THREE.Vector3();
  private viewQFrom = new THREE.Quaternion();
  private viewQTo = new THREE.Quaternion();

  constructor(camera: THREE.Camera, ctrl: ControlState) {
    this.camera = camera;
    this.ctrl = ctrl;
    ctrl.euler.set(-0.15, 2.3, 0);
    camera.quaternion.setFromEuler(ctrl.euler);
  }

  goToViewpoint(n: number) {
    const vp = VIEWPOINTS[n];
    if (!vp) return;
    this.autoFly = false;

    this.viewFrom.copy(this.camera.position);
    this.viewQFrom.copy(this.camera.quaternion);
    this.viewTo.set(...vp.pos);

    const tmpCam = new THREE.Object3D();
    tmpCam.position.set(...vp.pos);
    tmpCam.lookAt(...vp.look);
    this.viewQTo.copy(tmpCam.quaternion);

    this.viewT = 0;
    this.viewDur = 2.5;
    this.animatingView = true;

    const label = document.getElementById('viewpoint-label');
    if (label) {
      label.textContent = vp.name;
      label.style.opacity = '1';
      setTimeout(() => (label.style.opacity = '0'), 2000);
    }
  }

  update(dt: number) {
    if (this.autoFly) {
      this.autoAngle += dt * 0.03;
      const r = 700 + 200 * Math.sin(this.autoAngle * 0.2);
      const h = 160 + 60 * Math.sin(this.autoAngle * 0.15);
      this.camera.position.set(Math.sin(this.autoAngle) * r, h, 640 + Math.cos(this.autoAngle) * r);
      this.camera.lookAt(0, 80, 640);
      this.ctrl.euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      return;
    }

    if (this.animatingView) {
      this.viewT += dt / this.viewDur;
      if (this.viewT >= 1) { this.viewT = 1; this.animatingView = false; }
      const e = this.viewT * this.viewT * (3 - 2 * this.viewT);
      this.camera.position.lerpVectors(this.viewFrom, this.viewTo, e);
      this.camera.quaternion.slerpQuaternions(this.viewQFrom, this.viewQTo, e);
      this.ctrl.euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      return;
    }

    // Free flight
    this.camera.quaternion.setFromEuler(this.ctrl.euler);
    const spd = this.ctrl.speed * (this.ctrl.boost ? 3 : 1) * dt;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();

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
