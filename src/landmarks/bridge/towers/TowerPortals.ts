import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * T2 — TowerPortals
 * Arched portal struts spanning between the two columns at each portalY level.
 * Each portal has:
 *   - A top beam
 *   - A bottom beam
 *   - An arch crown (half-cylinder) bridging the opening
 *   - Two side walls flanking the arch
 */
export class TowerPortals extends BaseBridgePart {
  constructor() {
    super('TowerPortals');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const span = TOWER.colSpacing; // full gap between column centres
    const beamH = TOWER.portalH;
    const beamD = TOWER.baseD * 0.8;
    const archR = span * 0.25; // arch inner radius
    const archSegments = 16;

    for (const towerZ of towerZs) {
      for (const portalY of TOWER.portalYs) {
        // ---- Top beam ----
        const topGeo = new THREE.BoxGeometry(span, beamH, beamD);
        const topMesh = new THREE.Mesh(topGeo);
        topMesh.position.set(0, portalY + beamH * 0.5, towerZ);
        topMesh.castShadow = true;
        this.group.add(topMesh);

        // ---- Bottom beam ----
        const botGeo = new THREE.BoxGeometry(span, beamH, beamD);
        const botMesh = new THREE.Mesh(botGeo);
        botMesh.position.set(0, portalY - beamH * 0.5, towerZ);
        botMesh.castShadow = true;
        this.group.add(botMesh);

        // ---- Arch crown (half-cylinder) ----
        // CylinderGeometry(radiusTop, radiusBottom, height, radialSegs, heightSegs, openEnded, thetaStart, thetaLength)
        const archGeo = new THREE.CylinderGeometry(
          archR, archR, beamD, archSegments, 1, false, 0, Math.PI,
        );
        // Rotate so the flat face of the semicircle faces down
        archGeo.rotateZ(Math.PI);
        const archMesh = new THREE.Mesh(archGeo);
        archMesh.position.set(0, portalY + beamH + archR, towerZ);
        archMesh.castShadow = true;
        this.group.add(archMesh);

        // ---- Side walls (left and right of arch) ----
        const wallH = archR;
        const wallW = (span - archR * 2) * 0.5;
        if (wallW > 0) {
          for (const sign of [-1, 1]) {
            const wallGeo = new THREE.BoxGeometry(wallW, wallH, beamD);
            const wallMesh = new THREE.Mesh(wallGeo);
            wallMesh.position.set(
              sign * (archR + wallW * 0.5),
              portalY + beamH + wallH * 0.5,
              towerZ,
            );
            wallMesh.castShadow = true;
            this.group.add(wallMesh);
          }
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
