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

    // Chord IBeam shape
    const chordShape = createIBeamShape(0.4, 0.5, 0.08, 0.1);
    const chordExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: totalLen,
      bevelEnabled: false,
    };

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
      // Top chord
      const topChordGeo = new THREE.ExtrudeGeometry(chordShape, chordExtrudeSettings);
      // ExtrudeGeometry extrudes along Z; we want it along Z already, just position it
      const topChordMesh = new THREE.Mesh(topChordGeo);
      topChordMesh.position.set(sideX, deckH, zStart);
      topChordMesh.castShadow = true;
      topChordMesh.receiveShadow = true;
      this.group.add(topChordMesh);

      // Bottom chord
      const botChordGeo = new THREE.ExtrudeGeometry(chordShape, chordExtrudeSettings);
      const botChordMesh = new THREE.Mesh(botChordGeo);
      botChordMesh.position.set(sideX, deckH - trussH, zStart);
      botChordMesh.castShadow = true;
      botChordMesh.receiveShadow = true;
      this.group.add(botChordMesh);

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
        dummy.position.set(sideX, deckH - trussH / 2, zPanel);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        vertMesh.setMatrixAt(i, dummy.matrix);
      }
      vertMesh.instanceMatrix.needsUpdate = true;
      this.group.add(vertMesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
