import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, CABLE } from '@/config/bridge';

/**
 * C1 — MainCable
 * Two main suspension cables (side = -1, +1) following a catenary profile
 * across the full bridge length: south anchorage → south tower → main span
 * → north tower → north anchorage.
 */
export class MainCable extends BaseBridgePart {
  constructor() {
    super('MainCable');
  }

  buildGeometry(): void {
    const sides = [-1, 1] as const;
    const cableX = BRIDGE.deckW / 2 + 2;

    for (const side of sides) {
      const pts: THREE.Vector3[] = [];

      // --- South anchorage approach (11 pts) ---
      const southAnchorZ = -(BRIDGE.sideSpan + 30);
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const z = southAnchorZ + t * 30; // z: -(sideSpan+30) → -sideSpan
        const y = THREE.MathUtils.lerp(32.5, 50, t);
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      // --- South side span (40 pts) from z=-sideSpan to z=0 ---
      for (let i = 1; i <= 40; i++) {
        const t = i / 40;
        const z = -BRIDGE.sideSpan + t * BRIDGE.sideSpan; // -sideSpan → 0
        const y =
          THREE.MathUtils.lerp(50, BRIDGE.towerH, t) +
          -30 * Math.sin(Math.PI * t);
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      // --- Main span (121 pts) from z=0 to z=mainSpan ---
      for (let i = 1; i <= 121; i++) {
        const t = i / 121;
        const z = t * BRIDGE.mainSpan;
        const u = 2 * t - 1;
        const y = BRIDGE.cableSag + (BRIDGE.towerH - BRIDGE.cableSag) * u * u;
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      // --- North side span (40 pts) from z=mainSpan to z=mainSpan+sideSpan ---
      for (let i = 1; i <= 40; i++) {
        const t = i / 40;
        const z = BRIDGE.mainSpan + t * BRIDGE.sideSpan;
        const y =
          THREE.MathUtils.lerp(BRIDGE.towerH, 50, t) +
          -30 * Math.sin(Math.PI * t);
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      // --- North anchorage approach (11 pts) ---
      const northAnchorStartZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
      for (let i = 1; i <= 10; i++) {
        const t = i / 10;
        const z = northAnchorStartZ + t * 30;
        const y = THREE.MathUtils.lerp(50, 32.5, t);
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 300, CABLE.mainR, 12, false);
      const mesh = new THREE.Mesh(geo);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.cableSteel;
      }
    });
  }
}
