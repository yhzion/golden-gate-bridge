import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D4 — SidewalkRailing
 * East/west sidewalks with Art Deco railings.
 * - Sidewalk slabs: BoxGeometry 2m wide on each side
 * - Railing pickets: InstancedMesh BoxGeometry at railPicketSpacing
 * - Top rail: continuous BoxGeometry running the full length
 */
export class SidewalkRailing extends BaseBridgePart {
  constructor() {
    super('SidewalkRailing');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;
    const { railH, railPicketSpacing } = DECK;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;

    const sidewalkW = 2.0;
    const sidewalkThick = 0.15;
    // Sidewalks sit at outer edges of deck
    // deckW/2 = 13.7; sidewalk center is at ±(deckW/2 - sidewalkW/2)
    const sidewalkXs = [-(deckW / 2 - sidewalkW / 2), (deckW / 2 - sidewalkW / 2)];

    for (const sx of sidewalkXs) {
      // Sidewalk slab
      const slabGeo = new THREE.BoxGeometry(sidewalkW, sidewalkThick, totalLen);
      const slabMesh = new THREE.Mesh(slabGeo);
      slabMesh.position.set(sx, deckH + sidewalkThick / 2, zStart + totalLen / 2);
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = false;
      this.group.add(slabMesh);

      // Picket positions: inner and outer rail lines
      const sign = sx > 0 ? 1 : -1;
      const innerRailX = sx - sign * (sidewalkW / 2 - 0.1);
      const outerRailX = sx + sign * (sidewalkW / 2 - 0.1);
      const railXs = [innerRailX, outerRailX];

      const picketCount = Math.floor(totalLen / railPicketSpacing);
      const picketGeo = new THREE.BoxGeometry(0.025, railH, 0.025);

      for (const rx of railXs) {
        const picketMesh = new THREE.InstancedMesh(picketGeo, undefined, picketCount);
        picketMesh.castShadow = true;
        picketMesh.receiveShadow = false;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < picketCount; i++) {
          const z = zStart + i * railPicketSpacing + railPicketSpacing / 2;
          dummy.position.set(rx, deckH + sidewalkThick + railH / 2, z);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          picketMesh.setMatrixAt(i, dummy.matrix);
        }
        picketMesh.instanceMatrix.needsUpdate = true;
        this.group.add(picketMesh);

        // Top rail (continuous)
        const topRailGeo = new THREE.BoxGeometry(0.08, 0.06, totalLen);
        const topRailMesh = new THREE.Mesh(topRailGeo);
        topRailMesh.position.set(rx, deckH + sidewalkThick + railH + 0.03, zStart + totalLen / 2);
        topRailMesh.castShadow = false;
        topRailMesh.receiveShadow = false;
        this.group.add(topRailMesh);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj instanceof THREE.InstancedMesh) {
          // Pickets are InstancedMesh → deckSteel
          obj.material = mats.deckSteel;
        } else {
          const geo = obj.geometry;
          if (geo instanceof THREE.BoxGeometry) {
            // Check dimensions to distinguish slab from rail
            const params = (geo as THREE.BoxGeometry).parameters;
            if (params.width >= 1.5) {
              // wide slab
              obj.material = mats.pierConcrete;
            } else {
              // narrow top rail
              obj.material = mats.deckSteel;
            }
          }
        }
      }
    });
  }
}
