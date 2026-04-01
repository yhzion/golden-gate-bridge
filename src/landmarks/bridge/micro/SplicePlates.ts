import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * S3b — SplicePlates
 * Rectangular steel cover plates at truss chord splice locations every 30m.
 * Each splice location has a plate on both chord flanges (top + bottom)
 * and on both sides of the truss (x = ±deckW/2). Bolts arranged in 2×2 grid.
 */
export class SplicePlates extends BaseBridgePart {
  private plateMesh: THREE.InstancedMesh | null = null;
  private boltMesh: THREE.InstancedMesh | null = null;

  constructor() {
    super('SplicePlates');
  }

  buildGeometry(): void {
    const spliceSpacing = 30;
    const zStart = -BRIDGE.sideSpan;
    const zEnd = BRIDGE.mainSpan + BRIDGE.sideSpan;

    const spliceZs: number[] = [];
    for (let z = zStart; z <= zEnd; z += spliceSpacing) {
      spliceZs.push(z);
    }

    const chordSides = [-BRIDGE.deckW / 2, BRIDGE.deckW / 2];
    const chordYs = [BRIDGE.deckH, BRIDGE.deckH - DECK.trussH];

    // Each splice location: 2 chord sides × 2 chord heights = 4 plates
    const plateCount = spliceZs.length * chordSides.length * chordYs.length;
    const boltsPerPlate = 4; // 2×2 grid
    const boltCount = plateCount * boltsPerPlate;

    // ── Plate geometry ───────────────────────────────────────────────────
    // Plate: 0.5 (x) × 0.3 (y) × 0.8 (z)
    const plateGeo = new THREE.BoxGeometry(0.5, 0.3, 0.8);
    this.plateMesh = new THREE.InstancedMesh(
      plateGeo,
      new THREE.MeshStandardMaterial(),
      plateCount,
    );
    this.plateMesh.castShadow = false;

    // ── Bolt geometry ────────────────────────────────────────────────────
    // Small cylinder bolt head: r=0.01, h=0.05
    const boltGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 6);
    this.boltMesh = new THREE.InstancedMesh(
      boltGeo,
      new THREE.MeshStandardMaterial(),
      boltCount,
    );
    this.boltMesh.castShadow = false;

    const plateDummy = new THREE.Object3D();
    const boltDummy = new THREE.Object3D();
    let plateIdx = 0;
    let boltIdx = 0;

    // Bolt offsets within a 2×2 grid (local x, local z)
    const boltOffsets: [number, number][] = [
      [-0.12, -0.25],
      [0.12, -0.25],
      [-0.12, 0.25],
      [0.12, 0.25],
    ];

    for (const spliceZ of spliceZs) {
      for (const sideX of chordSides) {
        for (const chordY of chordYs) {
          // Place plate flush against the chord face
          plateDummy.position.set(sideX, chordY, spliceZ);
          plateDummy.rotation.set(0, 0, 0);
          plateDummy.updateMatrix();
          this.plateMesh.setMatrixAt(plateIdx++, plateDummy.matrix);

          // Place 4 bolts in a 2×2 grid on the plate face
          // Bolts protrude slightly outward in x (toward plate face)
          const boltX = sideX + (sideX < 0 ? -0.26 : 0.26);
          for (const [bx, bz] of boltOffsets) {
            boltDummy.position.set(boltX + bx, chordY, spliceZ + bz);
            // Rotate bolt so its axis aligns with x (outward normal)
            boltDummy.rotation.set(0, 0, Math.PI / 2);
            boltDummy.updateMatrix();
            this.boltMesh.setMatrixAt(boltIdx++, boltDummy.matrix);
          }
        }
      }
    }

    this.plateMesh.instanceMatrix.needsUpdate = true;
    this.plateMesh.count = plateIdx;
    this.boltMesh.instanceMatrix.needsUpdate = true;
    this.boltMesh.count = boltIdx;

    this.group.add(this.plateMesh);
    this.group.add(this.boltMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    if (this.plateMesh) {
      this.plateMesh.material = mats.deckSteel;
    }
    if (this.boltMesh) {
      this.boltMesh.material = mats.galvanizedSteel;
    }
  }
}
