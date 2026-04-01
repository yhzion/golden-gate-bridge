import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D5 — LightStandards
 * Art Deco lamp posts at lightSpacing (50m) intervals on both sides.
 * - Shaft: tapered octagonal CylinderGeometry
 * - Bracket arm: BoxGeometry
 * - Lantern: BoxGeometry with glass material
 */
export class LightStandards extends BaseBridgePart {
  constructor() {
    super('LightStandards');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;
    const { lightSpacing } = DECK;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;

    const poleCount = Math.floor(totalLen / lightSpacing);
    // Sidewalk edge positions
    const sidewalkXs = [-(deckW / 2 - 0.5), (deckW / 2 - 0.5)];

    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.10, 3.5, 8);
    const armGeo = new THREE.BoxGeometry(1.2, 0.06, 0.06);
    const lanternGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);

    const shaftBaseY = deckH + 3.5 / 2;
    const armY = deckH + 3.5 - 0.15;
    const lanternY = deckH + 3.5 - 0.05 + 0.2;

    for (const sx of sidewalkXs) {
      const sign = sx > 0 ? 1 : -1;

      // Shaft InstancedMesh
      const shaftMesh = new THREE.InstancedMesh(shaftGeo, undefined, poleCount);
      shaftMesh.castShadow = true;
      shaftMesh.receiveShadow = false;

      // Arm InstancedMesh
      const armMesh = new THREE.InstancedMesh(armGeo, undefined, poleCount);
      armMesh.castShadow = true;
      armMesh.receiveShadow = false;

      // Lantern InstancedMesh
      const lanternMesh = new THREE.InstancedMesh(lanternGeo, undefined, poleCount);
      lanternMesh.castShadow = false;
      lanternMesh.receiveShadow = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < poleCount; i++) {
        const z = zStart + i * lightSpacing + lightSpacing / 2;

        // Shaft
        dummy.position.set(sx, shaftBaseY, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        shaftMesh.setMatrixAt(i, dummy.matrix);

        // Arm — offset inward toward road
        dummy.position.set(sx - sign * 0.6, armY, z);
        dummy.updateMatrix();
        armMesh.setMatrixAt(i, dummy.matrix);

        // Lantern at end of arm
        dummy.position.set(sx - sign * 1.2, lanternY, z);
        dummy.updateMatrix();
        lanternMesh.setMatrixAt(i, dummy.matrix);
      }

      shaftMesh.instanceMatrix.needsUpdate = true;
      armMesh.instanceMatrix.needsUpdate = true;
      lanternMesh.instanceMatrix.needsUpdate = true;

      this.group.add(shaftMesh);
      this.group.add(armMesh);
      this.group.add(lanternMesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        const geo = obj.geometry;
        if (geo instanceof THREE.BoxGeometry) {
          const params = (geo as THREE.BoxGeometry).parameters;
          // Lantern: 0.3 × 0.4 × 0.3 (all < 1)
          if (params.width < 1.0 && params.height < 1.0 && params.depth < 1.0) {
            obj.material = mats.glass;
          } else {
            // Arm: 1.2 × 0.06 × 0.06
            obj.material = mats.deckSteel;
          }
        } else {
          // CylinderGeometry shaft
          obj.material = mats.deckSteel;
        }
      }
    });
  }
}
