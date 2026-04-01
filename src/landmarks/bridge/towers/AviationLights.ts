import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * T7 — AviationLights
 * FAA obstruction lighting at each tower top, each column:
 *  - Octagonal platform (CylinderGeometry, 8 sides)
 *  - Light housing (CylinderGeometry)
 *  - Red emissive lens (SphereGeometry)
 *  - Guard railing (TorusGeometry)
 *
 * Housing → mats.galvanizedSteel
 * Lens → custom red emissive material (built at applyMaterials time)
 */
export class AviationLights extends BaseBridgePart {
  private lensMeshes: THREE.Mesh[] = [];
  private lensMaterial: THREE.MeshStandardMaterial | null = null;

  constructor() {
    super('AviationLights');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];
    const capTopY = TOWER.sections[TOWER.sections.length - 1].y0
      + TOWER.sections[TOWER.sections.length - 1].h
      + 3 * 0.8  // 3 pyramid steps × 0.8 height each
      + 1.2;     // saddle base height

    for (const towerZ of towerZs) {
      for (const side of sides) {
        const colX = side * TOWER.colSpacing / 2;
        let y = capTopY;

        // ---- Platform (octagonal) ----
        const platGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 8, 1);
        const platMesh = new THREE.Mesh(platGeo);
        platMesh.position.set(colX, y + 0.125, towerZ);
        platMesh.castShadow = true;
        this.group.add(platMesh);
        y += 0.25;

        // ---- Light housing ----
        const housingGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 12, 1);
        const housingMesh = new THREE.Mesh(housingGeo);
        housingMesh.position.set(colX, y + 0.3, towerZ);
        housingMesh.castShadow = true;
        this.group.add(housingMesh);
        y += 0.6;

        // ---- Red lens ----
        const lensGeo = new THREE.SphereGeometry(0.28, 16, 16);
        const lensMesh = new THREE.Mesh(lensGeo);
        lensMesh.position.set(colX, y + 0.28, towerZ);
        this.lensMeshes.push(lensMesh);
        this.group.add(lensMesh);
        y += 0.56;

        // ---- Guard railing ----
        const railGeo = new THREE.TorusGeometry(1.1, 0.04, 8, 32);
        const railMesh = new THREE.Mesh(railGeo);
        railMesh.rotation.x = Math.PI / 2;
        railMesh.position.set(colX, capTopY + 0.1, towerZ);
        this.group.add(railMesh);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    // Build a dedicated red emissive material for the lenses
    this.lensMaterial = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.0,
    });

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (this.lensMeshes.includes(obj)) {
          obj.material = this.lensMaterial!;
        } else {
          obj.material = mats.galvanizedSteel;
        }
      }
    });
  }

  dispose(): void {
    super.dispose();
    this.lensMaterial?.dispose();
  }
}
