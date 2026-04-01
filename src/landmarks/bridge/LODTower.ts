import * as THREE from 'three';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class LODTower {
  readonly group = new THREE.Group();
  private static sharedGeo: THREE.BufferGeometry | null = null;

  constructor(mats: BridgeMaterials) {
    if (!LODTower.sharedGeo) {
      LODTower.sharedGeo = LODTower.createMergedGeometry();
    }
    const mesh = new THREE.Mesh(LODTower.sharedGeo, mats.towerSteel);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.group.add(mesh);
  }

  private static createMergedGeometry(): THREE.BufferGeometry {
    const geos: THREE.BufferGeometry[] = [];
    const halfCol = TOWER.colSpacing / 2;

    // Two simplified columns (boxes instead of cruciform)
    for (const side of [-1, 1]) {
      const col = new THREE.BoxGeometry(
        TOWER.baseW * 0.8, BRIDGE.towerH, TOWER.baseD * 0.8
      );
      col.translate(side * halfCol, BRIDGE.towerH / 2, 0);
      geos.push(col);
    }

    // Two cross-struts at portal heights (first and third)
    for (const py of [TOWER.portalYs[0], TOWER.portalYs[2]]) {
      const strut = new THREE.BoxGeometry(
        TOWER.colSpacing, TOWER.portalH, TOWER.baseD * 0.6
      );
      strut.translate(0, py, 0);
      geos.push(strut);
    }

    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    return merged;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
