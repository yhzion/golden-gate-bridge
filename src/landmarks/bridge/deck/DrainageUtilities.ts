import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * D6 — DrainageUtilities
 * Scuppers, drain pipes, and utility conduits under the deck.
 * - Scuppers: InstancedMesh BoxGeometry every 15m on both sides
 * - Drain pipes: InstancedMesh CylinderGeometry below each scupper
 * - Conduits: 3 CylinderGeometry runs under deck at x = [-5, 0, 5]
 */
export class DrainageUtilities extends BaseBridgePart {
  constructor() {
    super('DrainageUtilities');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;

    const scupperSpacing = 15;
    const scupperCount = Math.floor(totalLen / scupperSpacing);

    // Scupper x positions — just inside each curb
    const scupperXs = [-(deckW / 2 - 0.3), (deckW / 2 - 0.3)];

    const scupperGeo = new THREE.BoxGeometry(0.15, 0.1, 0.3);
    const drainPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 2, 6);

    for (const sx of scupperXs) {
      // Scuppers
      const scupperMesh = new THREE.InstancedMesh(scupperGeo, undefined, scupperCount);
      scupperMesh.castShadow = false;
      scupperMesh.receiveShadow = false;

      // Drain pipes
      const drainMesh = new THREE.InstancedMesh(drainPipeGeo, undefined, scupperCount);
      drainMesh.castShadow = false;
      drainMesh.receiveShadow = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < scupperCount; i++) {
        const z = zStart + i * scupperSpacing + scupperSpacing / 2;

        // Scupper flush with deck underside
        dummy.position.set(sx, deckH - 0.05, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        scupperMesh.setMatrixAt(i, dummy.matrix);

        // Drain pipe hanging below scupper
        dummy.position.set(sx, deckH - 1.1, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        drainMesh.setMatrixAt(i, dummy.matrix);
      }

      scupperMesh.instanceMatrix.needsUpdate = true;
      drainMesh.instanceMatrix.needsUpdate = true;

      this.group.add(scupperMesh);
      this.group.add(drainMesh);
    }

    // --- Utility conduits (continuous runs under deck) ---
    const conduitXs = [-5, 0, 5];
    const conduitGeo = new THREE.CylinderGeometry(0.05, 0.05, totalLen, 6);

    for (const cx of conduitXs) {
      const conduitMesh = new THREE.Mesh(conduitGeo);
      // Rotate so it runs along Z axis
      conduitMesh.rotation.set(Math.PI / 2, 0, 0);
      conduitMesh.position.set(cx, deckH - 0.8, zStart + totalLen / 2);
      conduitMesh.castShadow = false;
      conduitMesh.receiveShadow = false;
      this.group.add(conduitMesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.galvanizedSteel;
      }
    });
  }
}
