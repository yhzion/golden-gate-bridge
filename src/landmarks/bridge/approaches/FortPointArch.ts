import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A1 — FortPointArch
 * Steel lattice truss arch spanning Fort Point, located south of the south tower.
 * Two parallel arch ribs with X-bracing and a deck beam.
 */
export class FortPointArch extends BaseBridgePart {
  constructor() {
    super('FortPointArch');
  }

  buildGeometry(): void {
    const archCenterZ = -APPROACH.archSpan / 2 - 10;
    const halfSpan = APPROACH.archSpan / 2;
    const rise = APPROACH.archRise;
    const ribX = BRIDGE.deckW / 2 - 2;

    // Build parabolic arch rib curve points
    const numPts = 24;
    const leftPoints: THREE.Vector3[] = [];
    const rightPoints: THREE.Vector3[] = [];

    for (let i = 0; i <= numPts; i++) {
      const t = (i / numPts) * 2 - 1; // -1 to +1
      const z = t * halfSpan + archCenterZ;
      const y = BRIDGE.deckH - rise * (1 - t * t); // parabola hangs below deck

      leftPoints.push(new THREE.Vector3(-ribX, y, z));
      rightPoints.push(new THREE.Vector3(ribX, y, z));
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftPoints);
    const rightCurve = new THREE.CatmullRomCurve3(rightPoints);

    // Create tube geometry for each rib
    const leftRibGeo = new THREE.TubeGeometry(leftCurve, 48, APPROACH.archTubeR, 8, false);
    const leftRib = new THREE.Mesh(leftRibGeo);
    leftRib.castShadow = true;
    leftRib.receiveShadow = true;
    this.group.add(leftRib);

    const rightRibGeo = new THREE.TubeGeometry(rightCurve, 48, APPROACH.archTubeR, 8, false);
    const rightRib = new THREE.Mesh(rightRibGeo);
    rightRib.castShadow = true;
    rightRib.receiveShadow = true;
    this.group.add(rightRib);

    // X-bracing between ribs using InstancedMesh
    const bracePairs = APPROACH.archBracePairs;
    const braceGeo = new THREE.CylinderGeometry(
      APPROACH.archBraceR,
      APPROACH.archBraceR,
      ribX * 2,
      6,
    );
    // Each pair has 2 diagonal braces; total instances = bracePairs * 2
    const braceCount = bracePairs * 2;
    const braceMesh = new THREE.InstancedMesh(braceGeo, new THREE.MeshStandardMaterial(), braceCount);
    braceMesh.castShadow = true;
    braceMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let instanceIdx = 0;

    for (let i = 0; i < bracePairs; i++) {
      // Sample two adjacent t values for X shape
      const t0 = (i / bracePairs) * 2 - 1;
      const t1 = ((i + 1) / bracePairs) * 2 - 1;

      const y0 = BRIDGE.deckH + rise * (1 - t0 * t0);
      const y1 = BRIDGE.deckH + rise * (1 - t1 * t1);
      const z0 = t0 * halfSpan + archCenterZ;
      const z1 = t1 * halfSpan + archCenterZ;

      // Brace 1: bottom-left to top-right (diagonal /)
      const mid1Y = (y0 + y1) / 2;
      const mid1Z = (z0 + z1) / 2;
      const dy1 = y1 - y0;
      const dz1 = z1 - z0;
      const len1 = Math.sqrt(dy1 * dy1 + dz1 * dz1);

      dummy.position.set(0, mid1Y, mid1Z);
      dummy.rotation.set(0, 0, -Math.atan2(dz1, dy1));
      dummy.scale.set(1, len1 / (ribX * 2), 1);
      dummy.updateMatrix();
      braceMesh.setMatrixAt(instanceIdx++, dummy.matrix);

      // Brace 2: top-left to bottom-right (diagonal \)
      const mid2Y = (y1 + y0) / 2;
      const mid2Z = (z1 + z0) / 2;
      const dy2 = y0 - y1;
      const dz2 = z1 - z0;
      const len2 = Math.sqrt(dy2 * dy2 + dz2 * dz2);

      dummy.position.set(0, mid2Y, mid2Z);
      dummy.rotation.set(0, 0, Math.atan2(dz2, dy2));
      dummy.scale.set(1, len2 / (ribX * 2), 1);
      dummy.updateMatrix();
      braceMesh.setMatrixAt(instanceIdx++, dummy.matrix);
    }

    braceMesh.instanceMatrix.needsUpdate = true;
    this.group.add(braceMesh);

    // Deck beam spanning the arch
    const beamGeo = new THREE.BoxGeometry(BRIDGE.deckW, 1.2, APPROACH.archSpan);
    const beam = new THREE.Mesh(beamGeo);
    beam.position.set(0, BRIDGE.deckH, archCenterZ);
    beam.castShadow = true;
    beam.receiveShadow = true;
    this.group.add(beam);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
