import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';
import { createCruciformShape } from '@/world/profiles/CruciformProfile';

/**
 * T1 — TowerShaft
 * Cruciform stepback columns for both towers (z=0, z=mainSpan),
 * each with two columns (side=-1, +1) and five vertical sections.
 */
export class TowerShaft extends BaseBridgePart {
  constructor() {
    super('TowerShaft');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];

    for (const towerZ of towerZs) {
      for (const side of sides) {
        for (const sec of TOWER.sections) {
          const w = TOWER.baseW * sec.scale;
          const d = TOWER.baseD * sec.scale;
          const fw = TOWER.flangeW * sec.scale;
          const fd = TOWER.flangeD * sec.scale;

          const shape = createCruciformShape(w, d, fw, fd);

          const extrudeSettings: THREE.ExtrudeGeometryOptions = {
            depth: sec.h,
            bevelEnabled: false,
          };

          const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          // ExtrudeGeometry extrudes along Z; rotate to make it vertical (along Y)
          geo.rotateX(-Math.PI / 2);

          const mesh = new THREE.Mesh(geo);
          mesh.position.set(
            side * TOWER.colSpacing / 2,
            sec.y0,
            towerZ,
          );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.group.add(mesh);
        }
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.towerSteel;
      }
    });
  }
}
