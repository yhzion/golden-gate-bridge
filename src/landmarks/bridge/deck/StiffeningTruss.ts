import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';
import { createIBeamShape } from '@/world/profiles/IBeamProfile';
import { createLAngleShape } from '@/world/profiles/LAngleProfile';

/**
 * D1 — StiffeningTruss
 * Warren truss on both sides (x = ±deckW/2).
 * Spans from z=-sideSpan to z=mainSpan+sideSpan.
 * - Top chord at y=deckH, bottom chord at y=deckH-trussH
 * - Chords: ExtrudeGeometry with IBeam profile
 * - Diagonals: InstancedMesh with LAngle profile, alternating ascending/descending
 * - Verticals: InstancedMesh BoxGeometry at each panel point
 */
export class StiffeningTruss extends BaseBridgePart {
  constructor() {
    super('StiffeningTruss');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;
    const { trussH, panelLen } = DECK;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;

    const sides = [-deckW / 2, deckW / 2];

    // Tower exclusion zones — truss members don't pass through tower columns
    const towerZs = [0, mainSpan];
    const towerExclusion = 5; // ±5m around each tower centre
    const isNearTower = (z: number) =>
      towerZs.some((tz) => Math.abs(z - tz) < towerExclusion);

    // Build chord segments that skip tower exclusion zones
    const chordSegments = this.buildSegments(zStart, zEnd, towerZs, towerExclusion);
    const chordShape = createIBeamShape(0.4, 0.5, 0.08, 0.1);

    // Diagonal LAngle shape
    const diagShape = createLAngleShape(0.2, 0.2, 0.025);
    const panelCount = Math.floor(totalLen / panelLen);
    const diagLen = Math.sqrt(panelLen * panelLen + trussH * trussH);
    const diagExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: diagLen,
      bevelEnabled: false,
    };
    const diagGeo = new THREE.ExtrudeGeometry(diagShape, diagExtrudeSettings);

    // Vertical BoxGeometry
    const vertGeo = new THREE.BoxGeometry(DECK.trussThick, trussH, DECK.trussThick);

    for (const sideX of sides) {
      // Top & bottom chords — one segment per gap-free span
      for (const seg of chordSegments) {
        const segLen = seg.z1 - seg.z0;
        const segSettings: THREE.ExtrudeGeometryOptions = { depth: segLen, bevelEnabled: false };

        const topGeo = new THREE.ExtrudeGeometry(chordShape, segSettings);
        const topMesh = new THREE.Mesh(topGeo);
        topMesh.position.set(sideX, deckH, seg.z0);
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        this.group.add(topMesh);

        const botGeo = new THREE.ExtrudeGeometry(chordShape, segSettings);
        const botMesh = new THREE.Mesh(botGeo);
        botMesh.position.set(sideX, deckH - trussH, seg.z0);
        botMesh.castShadow = true;
        botMesh.receiveShadow = true;
        this.group.add(botMesh);
      }

      // Diagonals — alternating ascending/descending
      const diagCount = panelCount * 2; // one per direction per panel
      const diagMesh = new THREE.InstancedMesh(diagGeo, undefined, diagCount);
      diagMesh.castShadow = true;
      diagMesh.receiveShadow = true;

      const angleAsc = Math.atan2(trussH, panelLen);
      const angleDesc = -angleAsc;

      const dummy = new THREE.Object3D();
      let instanceIdx = 0;

      for (let i = 0; i < panelCount; i++) {
        const zPanel = zStart + i * panelLen;

        if (isNearTower(zPanel)) {
          // Hide instances in tower exclusion zone
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          diagMesh.setMatrixAt(instanceIdx++, dummy.matrix);
          diagMesh.setMatrixAt(instanceIdx++, dummy.matrix);
          dummy.scale.set(1, 1, 1);
          continue;
        }

        // Ascending diagonal: bottom-left to top-right
        dummy.position.set(sideX, deckH - trussH, zPanel);
        dummy.rotation.set(angleAsc, 0, 0);
        dummy.updateMatrix();
        diagMesh.setMatrixAt(instanceIdx++, dummy.matrix);

        // Descending diagonal: top-left to bottom-right
        dummy.position.set(sideX, deckH, zPanel);
        dummy.rotation.set(angleDesc, 0, 0);
        dummy.updateMatrix();
        diagMesh.setMatrixAt(instanceIdx++, dummy.matrix);
      }
      diagMesh.instanceMatrix.needsUpdate = true;
      this.group.add(diagMesh);

      // Verticals
      const vertMesh = new THREE.InstancedMesh(vertGeo, undefined, panelCount + 1);
      vertMesh.castShadow = true;
      vertMesh.receiveShadow = true;

      for (let i = 0; i <= panelCount; i++) {
        const zPanel = zStart + i * panelLen;
        if (isNearTower(zPanel)) {
          dummy.position.set(0, -1000, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          vertMesh.setMatrixAt(i, dummy.matrix);
          dummy.scale.set(1, 1, 1);
          continue;
        }
        dummy.position.set(sideX, deckH - trussH / 2, zPanel);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        vertMesh.setMatrixAt(i, dummy.matrix);
      }
      vertMesh.instanceMatrix.needsUpdate = true;
      this.group.add(vertMesh);
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
