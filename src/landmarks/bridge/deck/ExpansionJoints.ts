import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * D7 — ExpansionJoints
 * Finger joints at tower locations (z=0 and z=mainSpan).
 * - Interleaved finger plates: individual BoxGeometry meshes, 20 per joint side
 * - Support beam under each joint
 */
export class ExpansionJoints extends BaseBridgePart {
  constructor() {
    super('ExpansionJoints');
  }

  buildGeometry(): void {
    const { mainSpan, deckH, deckW } = BRIDGE;

    const roadW = deckW - 4;
    const jointZs = [0, mainSpan];

    // Finger plate dimensions
    const fingerW = roadW / 20; // divide road width into 20 fingers
    const fingerThick = 0.04;
    const fingerLen = 0.6; // protrusion length per side
    const fingerH = 0.15;
    const gapBetween = 0.02;

    for (const jz of jointZs) {
      // --- Finger plates: 20 on each side (near and far), interleaved ---
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 20; i++) {
          // Alternate fingers offset so they interleave
          const xOffset = (i - 9.5) * (fingerW + gapBetween);
          const zOffset = side === -1 ? -fingerLen / 2 : fingerLen / 2;

          const fingerGeo = new THREE.BoxGeometry(fingerW - gapBetween, fingerH, fingerLen);
          const fingerMesh = new THREE.Mesh(fingerGeo);
          fingerMesh.position.set(xOffset, deckH - fingerH / 2, jz + zOffset);
          fingerMesh.castShadow = true;
          fingerMesh.receiveShadow = true;
          this.group.add(fingerMesh);
        }
      }

      // --- Support beam under each joint ---
      const supportGeo = new THREE.BoxGeometry(roadW, 0.3, 1.5);
      const supportMesh = new THREE.Mesh(supportGeo);
      supportMesh.position.set(0, deckH - fingerH - 0.15, jz);
      supportMesh.castShadow = true;
      supportMesh.receiveShadow = true;
      this.group.add(supportMesh);
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
