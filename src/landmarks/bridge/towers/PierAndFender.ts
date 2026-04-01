import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * T6 — PierAndFender
 * South pier (z=0): LatheGeometry elliptical caisson + stepped base + TorusGeometry fender ring
 * North pier (z=mainSpan): BoxGeometry pier + DodecahedronGeometry rock foundation
 *
 * Pier meshes → mats.pierConcrete
 * Fender meshes → mats.galvanizedSteel
 */
export class PierAndFender extends BaseBridgePart {
  private fenderMeshes: THREE.Mesh[] = [];

  constructor() {
    super('PierAndFender');
  }

  buildGeometry(): void {
    this._buildSouthPier();
    this._buildNorthPier();
  }

  private _buildSouthPier(): void {
    const pierZ = 0;
    const seaDepth = 30;
    const pierH = seaDepth + 20; // extends from below sea to above water

    // ---- Elliptical caisson using LatheGeometry ----
    // Profile: ellipse-like shape
    const points: THREE.Vector2[] = [];
    const segments = 20;
    const rBase = 18;
    const rTop = 14;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = -seaDepth + t * pierH;
      const r = rBase + (rTop - rBase) * t;
      points.push(new THREE.Vector2(r, y));
    }
    const caissGeo = new THREE.LatheGeometry(points, 32);
    const caiss = new THREE.Mesh(caissGeo);
    caiss.position.set(0, -seaDepth, pierZ);
    caiss.castShadow = true;
    caiss.receiveShadow = true;
    this.group.add(caiss);

    // ---- Stepped base ----
    const stepData = [
      { w: 42, d: 24, h: 4 },
      { w: 38, d: 22, h: 4 },
      { w: 34, d: 20, h: 4 },
    ];
    let stepY = -seaDepth;
    for (const step of stepData) {
      const geo = new THREE.BoxGeometry(step.w, step.h, step.d);
      const mesh = new THREE.Mesh(geo);
      mesh.position.set(0, stepY + step.h * 0.5, pierZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      stepY += step.h;
    }

    // ---- Fender ring (TorusGeometry) ----
    const fenderY = -seaDepth * 0.3;
    const fenderGeo = new THREE.TorusGeometry(rTop + 1.5, 0.8, 8, 48);
    const fender = new THREE.Mesh(fenderGeo);
    fender.rotation.x = Math.PI / 2;
    fender.position.set(0, fenderY, pierZ);
    this.fenderMeshes.push(fender);
    this.group.add(fender);
  }

  private _buildNorthPier(): void {
    const pierZ = BRIDGE.mainSpan;

    // ---- Main pier body ----
    const pierGeo = new THREE.BoxGeometry(36, 40, 20);
    const pier = new THREE.Mesh(pierGeo);
    pier.position.set(0, -20, pierZ);
    pier.castShadow = true;
    pier.receiveShadow = true;
    this.group.add(pier);

    // ---- Stepped superstructure ----
    const superGeo = new THREE.BoxGeometry(32, 20, 18);
    const superMesh = new THREE.Mesh(superGeo);
    superMesh.position.set(0, 10, pierZ);
    superMesh.castShadow = true;
    superMesh.receiveShadow = true;
    this.group.add(superMesh);

    // ---- Rock foundation (DodecahedronGeometry) ----
    const rockGeo = new THREE.DodecahedronGeometry(22, 1);
    const rock = new THREE.Mesh(rockGeo);
    rock.position.set(0, -48, pierZ);
    rock.scale.set(1, 0.5, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.group.add(rock);

    // ---- North fender rings ----
    for (const sign of [-1, 1]) {
      const fGeo = new THREE.TorusGeometry(5, 0.6, 8, 32);
      const fMesh = new THREE.Mesh(fGeo);
      fMesh.rotation.x = Math.PI / 2;
      fMesh.position.set(sign * 16, -10, pierZ);
      this.fenderMeshes.push(fMesh);
      this.group.add(fMesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (this.fenderMeshes.includes(obj)) {
          obj.material = mats.galvanizedSteel;
        } else {
          obj.material = mats.pierConcrete;
        }
      }
    });
  }
}
