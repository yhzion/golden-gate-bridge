import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * D7 — Expansion Joints
 * Finger joints at each tower location allowing thermal movement.
 * Steel fingers interlock from both sides of the gap.
 */
export class ExpansionJoints extends BaseBridgePart {
  constructor() {
    super('ExpansionJoints');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const roadW = BRIDGE.deckW - 4;
    const fingerCount = 20;
    const fingerW = roadW / fingerCount;
    const fingerLen = 0.6;
    const fingerH = 0.05;
    const gap = 0.08;

    const fingerGeo = new THREE.BoxGeometry(fingerW * 0.4, fingerH, fingerLen);

    for (const towerZ of towerZs) {
      for (let i = 0; i < fingerCount; i++) {
        const x = -roadW / 2 + (i + 0.5) * fingerW;

        // South side finger
        const south = new THREE.Mesh(fingerGeo);
        south.position.set(x, BRIDGE.deckH + 0.01, towerZ - gap / 2 - fingerLen / 2);
        this.group.add(south);

        // Interleaved north side finger
        const north = new THREE.Mesh(fingerGeo);
        north.position.set(
          x + fingerW * 0.5,
          BRIDGE.deckH + 0.01,
          towerZ + gap / 2 + fingerLen / 2,
        );
        this.group.add(north);
      }

      // Support beam under joint
      const supportGeo = new THREE.BoxGeometry(roadW, 0.3, 1.5);
      const support = new THREE.Mesh(supportGeo);
      support.position.set(0, BRIDGE.deckH - 0.2, towerZ);
      this.group.add(support);
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
