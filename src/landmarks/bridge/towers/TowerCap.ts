import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * T5 — TowerCap
 * Stepped pyramidal cap and cable saddle at the top of each tower column.
 * Cap: 3-step pyramid (BoxGeometry, each step slightly smaller)
 * Saddle: base plate + groove (half-cylinder) + side walls
 */
export class TowerCap extends BaseBridgePart {
  private saddleMeshes: THREE.Mesh[] = [];

  constructor() {
    super('TowerCap');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];
    const topY = TOWER.sections[TOWER.sections.length - 1].y0
      + TOWER.sections[TOWER.sections.length - 1].h;

    for (const towerZ of towerZs) {
      for (const side of sides) {
        const colX = side * TOWER.colSpacing / 2;
        let currentY = topY;

        // ---- 3-step pyramid cap ----
        const pyramidSteps = 3;
        const baseCapW = TOWER.baseW * 1.1;
        const baseCapD = TOWER.baseD * 1.1;
        const capStepH = 0.8;

        for (let s = 0; s < pyramidSteps; s++) {
          const factor = 1 - s * 0.15;
          const geo = new THREE.BoxGeometry(
            baseCapW * factor,
            capStepH,
            baseCapD * factor,
          );
          const mesh = new THREE.Mesh(geo);
          mesh.position.set(colX, currentY + capStepH * 0.5, towerZ);
          mesh.castShadow = true;
          this.group.add(mesh);
          currentY += capStepH;
        }

        // ---- Cable saddle ----
        const saddleY = currentY;
        const saddleBaseW = TOWER.baseW * 0.9;
        const saddleBaseD = TOWER.baseD * 0.85;
        const saddleBaseH = 1.2;
        const grooveR = 0.55;
        const grooveSegments = 16;

        // Saddle base plate
        const plateGeo = new THREE.BoxGeometry(saddleBaseW, saddleBaseH, saddleBaseD);
        const plateMesh = new THREE.Mesh(plateGeo);
        plateMesh.position.set(colX, saddleY + saddleBaseH * 0.5, towerZ);
        plateMesh.castShadow = true;
        this.saddleMeshes.push(plateMesh);
        this.group.add(plateMesh);

        // Saddle groove (half-cylinder — the cable sits in this)
        const grooveGeo = new THREE.CylinderGeometry(
          grooveR, grooveR, saddleBaseD, grooveSegments, 1, false, 0, Math.PI,
        );
        const grooveMesh = new THREE.Mesh(grooveGeo);
        // Rotate so the channel opens upward and runs along Z
        grooveMesh.rotation.z = Math.PI;
        grooveMesh.rotation.x = Math.PI / 2;
        grooveMesh.position.set(colX, saddleY + saddleBaseH + grooveR * 0.5, towerZ);
        grooveMesh.castShadow = true;
        this.saddleMeshes.push(grooveMesh);
        this.group.add(grooveMesh);

        // Saddle side walls
        const wallW = 0.3;
        const wallH = grooveR * 2;
        for (const wallSign of [-1, 1]) {
          const wallGeo = new THREE.BoxGeometry(wallW, wallH, saddleBaseD);
          const wallMesh = new THREE.Mesh(wallGeo);
          wallMesh.position.set(
            colX + wallSign * (saddleBaseW * 0.5 - wallW * 0.5),
            saddleY + saddleBaseH + wallH * 0.5,
            towerZ,
          );
          wallMesh.castShadow = true;
          this.saddleMeshes.push(wallMesh);
          this.group.add(wallMesh);
        }
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Saddle meshes use castIron; the rest use towerSteel
        if (this.saddleMeshes.includes(obj)) {
          obj.material = mats.castIron;
        } else {
          obj.material = mats.towerSteel;
        }
      }
    });
  }
}
