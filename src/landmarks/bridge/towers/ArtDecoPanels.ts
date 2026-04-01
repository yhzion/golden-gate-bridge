import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * T4 — ArtDecoPanels
 * Decorative Art Deco elements:
 *  - Vertical fluting at column corners (thin cylinders)
 *  - Chevron panels between strut levels (V-shaped ExtrudeGeometry)
 *  - Stepped crown moldings at portal levels (nested BoxGeometry steps)
 */
export class ArtDecoPanels extends BaseBridgePart {
  constructor() {
    super('ArtDecoPanels');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];

    for (const towerZ of towerZs) {
      for (const side of sides) {
        const colX = side * TOWER.colSpacing / 2;

        this._addFluting(colX, towerZ);
        this._addChevrons(colX, towerZ);
        this._addCrownMoldings(colX, towerZ);
      }
    }
  }

  private _addFluting(colX: number, towerZ: number): void {
    const fluteR = 0.12;
    const fluteH = TOWER.sections[TOWER.sections.length - 1].y0
      + TOWER.sections[TOWER.sections.length - 1].h
      - TOWER.sections[0].y0;

    const cornerOffsets: [number, number][] = [
      [-TOWER.baseW / 2, -TOWER.baseD / 2],
      [TOWER.baseW / 2, -TOWER.baseD / 2],
      [-TOWER.baseW / 2, TOWER.baseD / 2],
      [TOWER.baseW / 2, TOWER.baseD / 2],
    ];

    const fluteGeo = new THREE.CylinderGeometry(fluteR, fluteR, fluteH, 8, 1);
    const yCenter = TOWER.sections[0].y0 + fluteH / 2;

    for (const [ox, oz] of cornerOffsets) {
      const flute = new THREE.Mesh(fluteGeo);
      flute.position.set(colX + ox, yCenter, towerZ + oz);
      flute.castShadow = true;
      this.group.add(flute);
    }
  }

  private _addChevrons(colX: number, towerZ: number): void {
    const portalYs = TOWER.portalYs as readonly number[];

    for (let i = 0; i < portalYs.length - 1; i++) {
      const yBot = portalYs[i];
      const yTop = portalYs[i + 1];
      const panelH = (yTop - yBot) * 0.4;
      const panelW = TOWER.baseW * 0.6;

      // V-shaped chevron
      const shape = new THREE.Shape();
      shape.moveTo(-panelW / 2, 0);
      shape.lineTo(0, panelH);
      shape.lineTo(panelW / 2, 0);
      shape.lineTo(panelW * 0.45, 0);
      shape.lineTo(0, panelH * 0.85);
      shape.lineTo(-panelW * 0.45, 0);
      shape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: 0.15,
        bevelEnabled: false,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const mesh = new THREE.Mesh(geo);
      mesh.position.set(colX, yBot + (yTop - yBot) * 0.3, towerZ + TOWER.baseD / 2 + 0.01);
      mesh.castShadow = true;
      this.group.add(mesh);

      // Back face chevron
      const meshBack = new THREE.Mesh(geo);
      meshBack.position.set(colX, yBot + (yTop - yBot) * 0.3, towerZ - TOWER.baseD / 2 - 0.16);
      meshBack.rotation.y = Math.PI;
      meshBack.castShadow = true;
      this.group.add(meshBack);
    }
  }

  private _addCrownMoldings(colX: number, towerZ: number): void {
    const steps = 3;
    const baseW = TOWER.baseW * 1.05;
    const baseD = TOWER.baseD * 1.05;
    const stepH = 0.4;

    for (const portalY of TOWER.portalYs) {
      for (let s = 0; s < steps; s++) {
        const factor = 1 - s * 0.06;
        const geo = new THREE.BoxGeometry(baseW * factor, stepH, baseD * factor);
        const mesh = new THREE.Mesh(geo);
        mesh.position.set(colX, portalY - stepH * s - stepH * 0.5, towerZ);
        mesh.castShadow = true;
        this.group.add(mesh);
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
