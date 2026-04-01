import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * T8 — MaintenanceAccess
 * Maintenance infrastructure for each tower:
 *  - Elevator shaft (tall BoxGeometry beside the column)
 *  - Machine room at the top of the shaft
 *  - Ladder rungs (InstancedMesh CylinderGeometry) inside the shaft
 *  - Catwalks at each portal strut level (BoxGeometry)
 *
 * All meshes → mats.galvanizedSteel
 */
export class MaintenanceAccess extends BaseBridgePart {
  constructor() {
    super('MaintenanceAccess');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];

    for (const towerZ of towerZs) {
      this._buildShaft(towerZ);
      this._buildCatwalks(towerZ);
    }
  }

  private _buildShaft(towerZ: number): void {
    const shaftX = TOWER.colSpacing / 2 + TOWER.baseW * 0.6;
    const shaftY0 = TOWER.sections[0].y0;
    const shaftTop = TOWER.sections[TOWER.sections.length - 1].y0
      + TOWER.sections[TOWER.sections.length - 1].h;
    const shaftH = shaftTop - shaftY0;
    const shaftW = 1.4;
    const shaftD = 1.4;

    // Shaft body
    const shaftGeo = new THREE.BoxGeometry(shaftW, shaftH, shaftD);
    const shaftMesh = new THREE.Mesh(shaftGeo);
    shaftMesh.position.set(shaftX, shaftY0 + shaftH * 0.5, towerZ);
    shaftMesh.castShadow = true;
    this.group.add(shaftMesh);

    // Machine room at top
    const mrH = 3.5;
    const mrGeo = new THREE.BoxGeometry(shaftW * 1.5, mrH, shaftD * 1.5);
    const mrMesh = new THREE.Mesh(mrGeo);
    mrMesh.position.set(shaftX, shaftTop + mrH * 0.5, towerZ);
    mrMesh.castShadow = true;
    this.group.add(mrMesh);

    // Machine room roof (low-pitched box)
    const roofGeo = new THREE.BoxGeometry(shaftW * 1.7, 0.4, shaftD * 1.7);
    const roofMesh = new THREE.Mesh(roofGeo);
    roofMesh.position.set(shaftX, shaftTop + mrH + 0.2, towerZ);
    this.group.add(roofMesh);

    // ---- Ladder rungs (InstancedMesh) ----
    const rungSpacing = 0.4;
    const rungCount = Math.floor(shaftH / rungSpacing);
    const rungGeo = new THREE.CylinderGeometry(0.025, 0.025, shaftD * 0.7, 6, 1);
    const rungMesh = new THREE.InstancedMesh(
      rungGeo,
      new THREE.MeshStandardMaterial(),
      rungCount,
    );
    rungMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < rungCount; i++) {
      const ry = shaftY0 + i * rungSpacing + rungSpacing * 0.5;
      dummy.position.set(shaftX, ry, towerZ);
      dummy.rotation.set(Math.PI / 2, 0, 0); // rung horizontal along Z
      dummy.updateMatrix();
      rungMesh.setMatrixAt(i, dummy.matrix);
    }
    rungMesh.instanceMatrix.needsUpdate = true;
    this.group.add(rungMesh);
  }

  private _buildCatwalks(towerZ: number): void {
    const catwalkW = TOWER.colSpacing + TOWER.baseW;
    const catwalkD = 0.8;
    const catwalkH = 0.15;
    const shaftX = TOWER.colSpacing / 2 + TOWER.baseW * 0.6;

    for (const portalY of TOWER.portalYs) {
      // Main catwalk spanning between columns
      const walkGeo = new THREE.BoxGeometry(catwalkW, catwalkH, catwalkD);
      const walkMesh = new THREE.Mesh(walkGeo);
      walkMesh.position.set(0, portalY - 0.5, towerZ);
      walkMesh.castShadow = true;
      this.group.add(walkMesh);

      // Short connector from shaft to catwalk (each side)
      for (const sign of [-1, 1]) {
        const connLen = Math.abs(shaftX) - catwalkW * 0.5;
        if (connLen > 0.1) {
          const connGeo = new THREE.BoxGeometry(connLen, catwalkH, catwalkD);
          const connMesh = new THREE.Mesh(connGeo);
          connMesh.position.set(
            sign * (catwalkW * 0.5 + connLen * 0.5),
            portalY - 0.5,
            towerZ,
          );
          connMesh.castShadow = true;
          this.group.add(connMesh);
        }
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.material = mats.galvanizedSteel;
      }
    });
  }
}
