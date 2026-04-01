import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A4 — TollPlaza
 * Modern open-road tolling gantries, south of south approach.
 * Located at z = -(sideSpan + 50), with gantryCount gantries spaced 20m apart.
 */
export class TollPlaza extends BaseBridgePart {
  constructor() {
    super('TollPlaza');
  }

  buildGeometry(): void {
    const baseZ = -(BRIDGE.sideSpan + 50);
    const gantrySpacing = 20;
    const count = APPROACH.gantryCount;
    const halfBeam = APPROACH.gantryW / 2;
    const colHeight = APPROACH.gantryH;
    const colSide = 0.6;

    for (let i = 0; i < count; i++) {
      const gz = baseZ + i * gantrySpacing;

      // Gantries stand at road level (deckH)
      const roadY = BRIDGE.deckH;

      // Left column
      const leftColGeo = new THREE.BoxGeometry(colSide, colHeight, colSide);
      const leftCol = new THREE.Mesh(leftColGeo);
      leftCol.position.set(-halfBeam, roadY + colHeight / 2, gz);
      leftCol.castShadow = true;
      leftCol.receiveShadow = true;
      this.group.add(leftCol);

      // Right column
      const rightColGeo = new THREE.BoxGeometry(colSide, colHeight, colSide);
      const rightCol = new THREE.Mesh(rightColGeo);
      rightCol.position.set(halfBeam, roadY + colHeight / 2, gz);
      rightCol.castShadow = true;
      rightCol.receiveShadow = true;
      this.group.add(rightCol);

      // Horizontal beam at top
      const beamGeo = new THREE.BoxGeometry(APPROACH.gantryW, 0.4, 0.8);
      const beam = new THREE.Mesh(beamGeo);
      beam.position.set(0, roadY + colHeight + 0.2, gz);
      beam.castShadow = true;
      beam.receiveShadow = true;
      this.group.add(beam);

      // Sensor housings: 6 small boxes on beam, evenly spaced
      const sensorCount = 6;
      for (let s = 0; s < sensorCount; s++) {
        const sx = -halfBeam + (APPROACH.gantryW / (sensorCount - 1)) * s;
        const sensorGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
        const sensor = new THREE.Mesh(sensorGeo);
        sensor.position.set(sx, roadY + colHeight + 0.55, gz);
        sensor.castShadow = true;
        sensor.receiveShadow = true;
        this.group.add(sensor);
      }
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
