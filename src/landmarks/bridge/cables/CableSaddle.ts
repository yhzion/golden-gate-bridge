import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, CABLE } from '@/config/bridge';

/**
 * C4 — CableSaddle
 * Roller saddles mounted at the top of each tower, guiding the main cables
 * over the tower tops. Two towers (z=0, z=mainSpan) × two cable sides (-1, +1).
 *
 * Each saddle consists of:
 *   • A saddle frame (BoxGeometry)
 *   • Three roller cylinders seated in the cable groove
 *   • Decorative hex bolt heads on the frame faces
 */
export class CableSaddle extends BaseBridgePart {
  constructor() {
    super('CableSaddle');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan] as const;
    const sides = [-1, 1] as const;
    const cableX = BRIDGE.deckW / 2 + 2;
    const saddleY = BRIDGE.towerH + 5.5;

    for (const tz of towerZs) {
      for (const side of sides) {
        const x = side * cableX;
        this.buildSaddle(x, saddleY, tz);
      }
    }
  }

  private buildSaddle(x: number, y: number, z: number): void {
    // --- Saddle frame ---
    const frameGeo = new THREE.BoxGeometry(
      CABLE.saddleW,
      CABLE.saddleH,
      CABLE.saddleD,
    );
    const frame = new THREE.Mesh(frameGeo);
    frame.position.set(x, y, z);
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.group.add(frame);

    // --- Three roller cylinders ---
    const rollerR = CABLE.mainR * 2;
    const rollerLen = CABLE.saddleW * 0.9;
    const rollerGeo = new THREE.CylinderGeometry(rollerR, rollerR, rollerLen, 12);
    rollerGeo.rotateZ(Math.PI / 2); // lay along X axis

    const rollerOffsets = [-CABLE.saddleD * 0.28, 0, CABLE.saddleD * 0.28];
    for (const dz of rollerOffsets) {
      const roller = new THREE.Mesh(rollerGeo);
      roller.position.set(x, y + CABLE.saddleH * 0.25, z + dz);
      roller.castShadow = true;
      this.group.add(roller);
    }

    // --- Decorative bolt heads (front and back faces of frame) ---
    const boltGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 6);
    boltGeo.rotateX(Math.PI / 2); // point along Z

    const boltRows = [-CABLE.saddleH * 0.28, CABLE.saddleH * 0.28];
    const boltCols = [-CABLE.saddleW * 0.3, 0, CABLE.saddleW * 0.3];
    const boltFaces = [-CABLE.saddleD / 2 - 0.06, CABLE.saddleD / 2 + 0.06];

    for (const faceZ of boltFaces) {
      for (const dy of boltRows) {
        for (const dx of boltCols) {
          const bolt = new THREE.Mesh(boltGeo);
          bolt.position.set(x + dx, y + dy, z + faceZ);
          this.group.add(bolt);
        }
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.castIron;
      }
    });
  }
}
