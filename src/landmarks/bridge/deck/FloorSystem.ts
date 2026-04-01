import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';
import { createIBeamShape } from '@/world/profiles/IBeamProfile';

/**
 * D2 — FloorSystem
 * Transverse I-beam floor beams at every panel point (7.6m intervals)
 * plus longitudinal stringers running the full deck length.
 */
export class FloorSystem extends BaseBridgePart {
  constructor() {
    super('FloorSystem');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;
    const { panelLen, floorBeamH, floorBeamWebT, floorBeamFlangeT, stringerW, stringerH } = DECK;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;
    const panelCount = Math.floor(totalLen / panelLen);
    const beamY = deckH - floorBeamH / 2;

    // Tower exclusion zones — floor beams break at tower column positions
    const towerZs = [0, mainSpan];
    const towerExclusion = 5;
    const isNearTower = (z: number) =>
      towerZs.some((tz) => Math.abs(z - tz) < towerExclusion);

    // --- Floor beams (transverse I-beams) ---
    const beamShape = createIBeamShape(0.4, floorBeamH, floorBeamWebT, floorBeamFlangeT);
    const beamExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: deckW,
      bevelEnabled: false,
    };
    const beamGeo = new THREE.ExtrudeGeometry(beamShape, beamExtrudeSettings);
    // ExtrudeGeometry extrudes along Z; rotate 90° around Y so it spans along X
    beamGeo.rotateY(Math.PI / 2);

    const floorBeamMesh = new THREE.InstancedMesh(beamGeo, undefined, panelCount + 1);
    floorBeamMesh.castShadow = true;
    floorBeamMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i <= panelCount; i++) {
      const z = zStart + i * panelLen;
      if (isNearTower(z)) {
        dummy.position.set(0, -1000, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        floorBeamMesh.setMatrixAt(i, dummy.matrix);
        dummy.scale.set(1, 1, 1);
        continue;
      }
      // After rotating around Y, extrusion runs along -X direction;
      // offset by +deckW/2 so beam is centered on x=0
      dummy.position.set(deckW / 2, beamY, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      floorBeamMesh.setMatrixAt(i, dummy.matrix);
    }
    floorBeamMesh.instanceMatrix.needsUpdate = true;
    this.group.add(floorBeamMesh);

    // --- Longitudinal stringers — split at tower positions ---
    const stringerXs = [-10.5, -7.5, -4.5, 0, 4.5, 7.5, 10.5];
    const stringerY = deckH - floorBeamH - stringerH / 2;
    const segments = this.buildSegments(zStart, zEnd, towerZs, towerExclusion);

    for (const sx of stringerXs) {
      for (const seg of segments) {
        const segLen = seg.z1 - seg.z0;
        const geo = new THREE.BoxGeometry(stringerW, stringerH, segLen);
        const mesh = new THREE.Mesh(geo);
        mesh.position.set(sx, stringerY, seg.z0 + segLen / 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
      }
    }
  }

  private buildSegments(zStart: number, zEnd: number, towerZs: number[], ex: number): { z0: number; z1: number }[] {
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

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
