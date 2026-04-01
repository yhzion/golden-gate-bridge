import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER } from '@/config/bridge';

/**
 * S3a — RivetSystem
 * Hot-driven dome-head rivets instanced across tower column faces and
 * truss chord top flanges. One large InstancedMesh for all rivets.
 */
export class RivetSystem extends BaseBridgePart {
  private rivetMesh: THREE.InstancedMesh | null = null;

  constructor() {
    super('RivetSystem');
  }

  buildGeometry(): void {
    // ── Count instances first ──────────────────────────────────────────────

    // Tower column faces: for each tower (2), each side col (2), each section,
    // front/back faces and left/right faces, rows every 0.5m (sample every 2nd
    // = effective spacing 1.0m) and columns every 0.3m.
    const towerZs = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];
    const faces = ['front', 'back', 'left', 'right'] as const;

    let towerRivetCount = 0;
    for (const sec of TOWER.sections) {
      const w = TOWER.baseW * sec.scale;
      const d = TOWER.baseD * sec.scale;
      const rowStep = 1.0; // sample every 2nd row (0.5m step → 1.0m effective)
      const colStepFB = 0.3; // front/back face spacing
      const colStepLR = 0.3; // left/right face spacing
      const numRowsFB = Math.floor(sec.h / rowStep);
      const numRowsLR = numRowsFB;
      const numColsFB = Math.floor(w / colStepFB);
      const numColsLR = Math.floor(d / colStepLR);
      // front + back faces: numRowsFB * numColsFB each
      // left + right faces: numRowsLR * numColsLR each
      towerRivetCount +=
        2 * numRowsFB * numColsFB + 2 * numRowsLR * numColsLR;
    }
    // Multiply by towers × column sides
    towerRivetCount *= towerZs.length * sides.length;

    // Truss chord top flanges: both sides (x = ±deckW/2)
    // z runs from -sideSpan to mainSpan+sideSpan, spacing 0.3m
    const zStart = -BRIDGE.sideSpan;
    const zEnd = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const trussStep = 0.3;
    const numTrussRivets = Math.floor((zEnd - zStart) / trussStep) * 2; // ×2 sides

    const totalCount = Math.min(towerRivetCount + numTrussRivets, 50000);

    // ── Geometry ──────────────────────────────────────────────────────────
    // Half-sphere: SphereGeometry scaled Y by 0.5
    const geo = new THREE.SphereGeometry(0.0125, 6, 4);
    geo.scale(1, 0.5, 1);

    this.rivetMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial(), totalCount);
    this.rivetMesh.castShadow = false;
    this.rivetMesh.receiveShadow = false;

    const dummy = new THREE.Object3D();
    let idx = 0;

    // ── Tower rivets ──────────────────────────────────────────────────────
    outer: for (const towerZ of towerZs) {
      for (const side of sides) {
        const colX = side * TOWER.colSpacing / 2;
        for (const sec of TOWER.sections) {
          const w = TOWER.baseW * sec.scale;
          const d = TOWER.baseD * sec.scale;
          const rowStep = 1.0;
          const colStepFB = 0.3;
          const colStepLR = 0.3;
          const halfW = w / 2;
          const halfD = d / 2;
          const offset = 0.005; // slight surface offset so rivet sits proud

          for (const face of faces) {
            const numRows = Math.floor(sec.h / rowStep);
            if (face === 'front' || face === 'back') {
              const faceZ = face === 'front' ? towerZ + halfD + offset : towerZ - halfD - offset;
              const normalY = 0;
              const rotX = face === 'front' ? Math.PI / 2 : -Math.PI / 2;
              const numCols = Math.floor(w / colStepFB);
              for (let row = 0; row < numRows; row++) {
                const y = sec.y0 + row * rowStep + rowStep / 2;
                for (let col = 0; col < numCols; col++) {
                  const x = colX - halfW + col * colStepFB + colStepFB / 2;
                  dummy.position.set(x, y + normalY, faceZ);
                  dummy.rotation.set(rotX, 0, 0);
                  dummy.updateMatrix();
                  this.rivetMesh!.setMatrixAt(idx++, dummy.matrix);
                  if (idx >= totalCount) break outer;
                }
              }
            } else {
              // left / right face
              const faceX = face === 'right' ? colX + halfW + offset : colX - halfW - offset;
              const rotZ = face === 'right' ? -Math.PI / 2 : Math.PI / 2;
              const numCols = Math.floor(d / colStepLR);
              for (let row = 0; row < numRows; row++) {
                const y = sec.y0 + row * rowStep + rowStep / 2;
                for (let col = 0; col < numCols; col++) {
                  const z = towerZ - halfD + col * colStepLR + colStepLR / 2;
                  dummy.position.set(faceX, y, z);
                  dummy.rotation.set(0, 0, rotZ);
                  dummy.updateMatrix();
                  this.rivetMesh!.setMatrixAt(idx++, dummy.matrix);
                  if (idx >= totalCount) break outer;
                }
              }
            }
          }
        }
      }
    }

    // ── Truss chord top flange rivets ─────────────────────────────────────
    const chordY = BRIDGE.deckH + 0.005; // sit on top of chord flange
    for (const sideX of [-BRIDGE.deckW / 2, BRIDGE.deckW / 2]) {
      for (let z = zStart; z < zEnd; z += trussStep) {
        if (idx >= totalCount) break;
        dummy.position.set(sideX, chordY, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.rivetMesh!.setMatrixAt(idx++, dummy.matrix);
      }
    }

    // Zero out any unused slots
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = idx; i < totalCount; i++) {
      this.rivetMesh!.setMatrixAt(i, zero);
    }
    this.rivetMesh.instanceMatrix.needsUpdate = true;
    this.rivetMesh.count = idx;

    this.group.add(this.rivetMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    if (this.rivetMesh) {
      this.rivetMesh.material = mats.deckSteel;
    }
  }
}
