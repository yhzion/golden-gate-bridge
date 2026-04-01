import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D6 — Drainage & Utilities
 * Scuppers in deck curb at regular intervals + utility conduit runs under deck.
 */
export class DrainageUtilities extends BaseBridgePart {
  constructor() {
    super('DrainageUtilities');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const halfW = BRIDGE.deckW / 2;

    // Scuppers — small rectangular openings in deck curb every 15m
    const scupperSpacing = 15;
    const scuppersPerSide = Math.floor(totalLen / scupperSpacing);
    const scupperCount = scuppersPerSide * 2;
    const scupperGeo = new THREE.BoxGeometry(0.15, 0.1, 0.3);
    const scupperMesh = new THREE.InstancedMesh(scupperGeo, undefined!, scupperCount);

    const mat = new THREE.Matrix4();
    let idx = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < scuppersPerSide; i++) {
        const z = startZ + i * scupperSpacing;
        mat.identity();
        mat.setPosition(
          side * (halfW - 2.0),
          BRIDGE.deckH - 0.05,
          z,
        );
        scupperMesh.setMatrixAt(idx++, mat);
      }
    }
    scupperMesh.instanceMatrix.needsUpdate = true;
    this.group.add(scupperMesh);

    // Drain pipes (vertical tubes under deck at scupper locations)
    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 2, 6);
    const pipeMesh = new THREE.InstancedMesh(pipeGeo, undefined!, scupperCount);

    idx = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < scuppersPerSide; i++) {
        const z = startZ + i * scupperSpacing;
        mat.identity();
        mat.setPosition(
          side * (halfW - 2.0),
          BRIDGE.deckH - DECK.trussH / 2,
          z,
        );
        pipeMesh.setMatrixAt(idx++, mat);
      }
    }
    pipeMesh.instanceMatrix.needsUpdate = true;
    this.group.add(pipeMesh);

    // Utility conduits — 3 longitudinal runs under the deck
    const conduitGeo = new THREE.CylinderGeometry(0.08, 0.08, totalLen, 6);
    conduitGeo.rotateX(Math.PI / 2);
    const conduitXs = [-5, 0, 5];
    for (const cx of conduitXs) {
      const conduit = new THREE.Mesh(conduitGeo);
      conduit.position.set(
        cx,
        BRIDGE.deckH - DECK.trussH + 0.5,
        startZ + totalLen / 2,
      );
      this.group.add(conduit);
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
