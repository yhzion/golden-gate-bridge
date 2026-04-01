import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * T3 — TowerCells
 * Internal cell grid for each tower column using InstancedMesh.
 * Vertical ribs and X-bracing diagonals are placed on the front and back faces
 * of each column between y=72 and y=220.
 */
export class TowerCells extends BaseBridgePart {
  constructor() {
    super('TowerCells');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];
    const faceSigns = [-1, 1]; // front / back face of each column

    const yStart = 72;
    const yEnd = 220;
    const ribW = 0.25;
    const ribD = 0.15;

    // Collect rib Y positions
    const ribYs: number[] = [];
    for (let y = yStart; y <= yEnd; y += TOWER.cellSpacing) {
      ribYs.push(y);
    }
    const ribCount = ribYs.length * towerZs.length * sides.length * faceSigns.length;

    // ---- Vertical ribs ----
    const ribH = TOWER.cellSpacing * 0.9;
    const ribGeo = new THREE.BoxGeometry(ribW, ribH, ribD);
    const ribMesh = new THREE.InstancedMesh(ribGeo, new THREE.MeshStandardMaterial(), ribCount);
    ribMesh.castShadow = true;
    let ribIdx = 0;
    const dummy = new THREE.Object3D();

    for (const towerZ of towerZs) {
      for (const side of sides) {
        for (const faceSign of faceSigns) {
          for (const ry of ribYs) {
            const faceOffset = (TOWER.baseD * 0.5 + 0.01) * faceSign;
            dummy.position.set(
              side * TOWER.colSpacing / 2,
              ry + ribH * 0.5,
              towerZ + faceOffset,
            );
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            ribMesh.setMatrixAt(ribIdx++, dummy.matrix);
          }
        }
      }
    }
    ribMesh.instanceMatrix.needsUpdate = true;
    this.group.add(ribMesh);

    // ---- X-bracing diagonals ----
    // Two diagonals per cell (forming an X) on each face
    const diagCount = (ribYs.length - 1) * towerZs.length * sides.length * faceSigns.length * 2;
    const cellW = TOWER.baseW * 0.8;
    const cellHVal = TOWER.cellH;
    const diagLen = Math.sqrt(cellW * cellW + cellHVal * cellHVal);
    const diagGeo = new THREE.BoxGeometry(diagLen, ribD, ribD);
    const diagMesh = new THREE.InstancedMesh(diagGeo, new THREE.MeshStandardMaterial(), diagCount);
    diagMesh.castShadow = true;
    let diagIdx = 0;

    for (const towerZ of towerZs) {
      for (const side of sides) {
        for (const faceSign of faceSigns) {
          for (let i = 0; i < ribYs.length - 1; i++) {
            const y0 = ribYs[i];
            const y1 = ribYs[i + 1];
            const midY = (y0 + y1) * 0.5;
            const faceOffset = (TOWER.baseD * 0.5 + 0.02) * faceSign;
            const colX = side * TOWER.colSpacing / 2;
            const angle = Math.atan2(y1 - y0, cellW);

            // Diagonal 1: bottom-left to top-right
            dummy.position.set(colX, midY, towerZ + faceOffset);
            dummy.rotation.set(0, 0, angle);
            dummy.updateMatrix();
            diagMesh.setMatrixAt(diagIdx++, dummy.matrix);

            // Diagonal 2: bottom-right to top-left
            dummy.position.set(colX, midY, towerZ + faceOffset);
            dummy.rotation.set(0, 0, -angle);
            dummy.updateMatrix();
            diagMesh.setMatrixAt(diagIdx++, dummy.matrix);
          }
        }
      }
    }
    diagMesh.instanceMatrix.needsUpdate = true;
    this.group.add(diagMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        obj.material = mats.towerSteel;
      }
    });
  }
}
