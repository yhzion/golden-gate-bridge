import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * S3d — GussetPlates
 * Triangular connection plates at truss panel points where diagonals
 * meet the top and bottom chords.
 * Right-triangle shape with legs [0.6, 0.5], extruded 0.02m thick.
 * Placed at every panelLen interval, both truss sides, at top and bottom chord.
 */
export class GussetPlates extends BaseBridgePart {
  private gussetMesh: THREE.InstancedMesh | null = null;

  constructor() {
    super('GussetPlates');
  }

  buildGeometry(): void {
    const zStart = -BRIDGE.sideSpan;
    const zEnd = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const panelLen = DECK.panelLen;

    const panelZs: number[] = [];
    for (let z = zStart; z <= zEnd + 1e-6; z += panelLen) {
      panelZs.push(z);
    }

    const chordSides = [-BRIDGE.deckW / 2, BRIDGE.deckW / 2];
    const chordYs = [BRIDGE.deckH, BRIDGE.deckH - DECK.trussH];

    const totalCount = panelZs.length * chordSides.length * chordYs.length;

    // ── Triangle Shape ───────────────────────────────────────────────────
    // Right triangle with legs [0.6, 0.5] in the Y-Z plane
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.6, 0);   // horizontal leg along z-axis
    shape.lineTo(0, 0.5);   // vertical leg along y-axis
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.02,
      bevelEnabled: false,
    };

    // Extrude along Z; then rotate so it faces outward in X
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // ExtrudeGeometry extrudes along local Z; rotate so plate faces outward (X axis)
    geo.rotateY(Math.PI / 2);

    this.gussetMesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial(),
      totalCount,
    );
    this.gussetMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (const panelZ of panelZs) {
      for (const sideX of chordSides) {
        for (const chordY of chordYs) {
          // Position plate at chord junction
          // Offset slightly outward in X so plate sits on the outer face
          const offsetX = sideX < 0 ? -0.01 : 0.01;
          dummy.position.set(sideX + offsetX, chordY, panelZ);

          // Mirror the plate for the left side so the triangle points inward
          if (sideX < 0) {
            dummy.scale.set(-1, 1, 1);
          } else {
            dummy.scale.set(1, 1, 1);
          }

          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          this.gussetMesh.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }

    this.gussetMesh.instanceMatrix.needsUpdate = true;
    this.gussetMesh.count = idx;

    this.group.add(this.gussetMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    if (this.gussetMesh) {
      this.gussetMesh.material = mats.deckSteel;
    }
  }
}
