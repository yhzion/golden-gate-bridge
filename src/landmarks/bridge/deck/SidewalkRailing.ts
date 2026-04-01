import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D4 — SidewalkRailing
 * East/west sidewalks with Art Deco railings.
 * Geometry breaks at tower column positions (z=0, z=mainSpan).
 */

/** Z-segments that skip tower exclusion zones */
function buildSegments(zStart: number, zEnd: number, towerZs: number[], ex: number): { z0: number; z1: number }[] {
  const cuts = towerZs.map((tz) => ({ lo: tz - ex, hi: tz + ex })).sort((a, b) => a.lo - b.lo);
  const segs: { z0: number; z1: number }[] = [];
  let cursor = zStart;
  for (const c of cuts) {
    if (cursor < c.lo) segs.push({ z0: cursor, z1: c.lo });
    cursor = Math.max(cursor, c.hi);
  }
  if (cursor < zEnd) segs.push({ z0: cursor, z1: zEnd });
  return segs;
}

export class SidewalkRailing extends BaseBridgePart {
  constructor() {
    super('SidewalkRailing');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;
    const { railH, railPicketSpacing } = DECK;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;

    const sidewalkW = 2.0;
    const sidewalkThick = 0.15;
    const sidewalkXs = [-(deckW / 2 - sidewalkW / 2), (deckW / 2 - sidewalkW / 2)];

    const towerZs = [0, mainSpan];
    const towerExclusion = 5;
    const segments = buildSegments(zStart, zEnd, towerZs, towerExclusion);
    const isNearTower = (z: number) =>
      towerZs.some((tz) => Math.abs(z - tz) < towerExclusion);

    for (const sx of sidewalkXs) {
      // Sidewalk slabs — one per segment
      for (const seg of segments) {
        const segLen = seg.z1 - seg.z0;
        const slabGeo = new THREE.BoxGeometry(sidewalkW, sidewalkThick, segLen);
        const slabMesh = new THREE.Mesh(slabGeo);
        slabMesh.position.set(sx, deckH + sidewalkThick / 2, seg.z0 + segLen / 2);
        slabMesh.receiveShadow = true;
        slabMesh.castShadow = false;
        this.group.add(slabMesh);
      }

      const sign = sx > 0 ? 1 : -1;
      const innerRailX = sx - sign * (sidewalkW / 2 - 0.1);
      const outerRailX = sx + sign * (sidewalkW / 2 - 0.1);
      const railXs = [innerRailX, outerRailX];

      const totalLen = zEnd - zStart;
      const picketCount = Math.floor(totalLen / railPicketSpacing);
      const picketGeo = new THREE.BoxGeometry(0.025, railH, 0.025);

      for (const rx of railXs) {
        // Pickets — skip near towers
        const picketMesh = new THREE.InstancedMesh(picketGeo, undefined, picketCount);
        picketMesh.castShadow = true;
        picketMesh.receiveShadow = false;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < picketCount; i++) {
          const z = zStart + i * railPicketSpacing + railPicketSpacing / 2;
          if (isNearTower(z)) {
            dummy.position.set(0, -1000, 0);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            picketMesh.setMatrixAt(i, dummy.matrix);
            dummy.scale.set(1, 1, 1);
            continue;
          }
          dummy.position.set(rx, deckH + sidewalkThick + railH / 2, z);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          picketMesh.setMatrixAt(i, dummy.matrix);
        }
        picketMesh.instanceMatrix.needsUpdate = true;
        this.group.add(picketMesh);

        // Top rails — one per segment
        for (const seg of segments) {
          const segLen = seg.z1 - seg.z0;
          const topRailGeo = new THREE.BoxGeometry(0.08, 0.06, segLen);
          const topRailMesh = new THREE.Mesh(topRailGeo);
          topRailMesh.position.set(rx, deckH + sidewalkThick + railH + 0.03, seg.z0 + segLen / 2);
          topRailMesh.castShadow = false;
          topRailMesh.receiveShadow = false;
          this.group.add(topRailMesh);
        }
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj instanceof THREE.InstancedMesh) {
          obj.material = mats.deckSteel;
        } else {
          const geo = obj.geometry;
          if (geo instanceof THREE.BoxGeometry) {
            const params = (geo as THREE.BoxGeometry).parameters;
            if (params.width >= 1.5) {
              obj.material = mats.pierConcrete;
            } else {
              obj.material = mats.deckSteel;
            }
          }
        }
      }
    });
  }
}
