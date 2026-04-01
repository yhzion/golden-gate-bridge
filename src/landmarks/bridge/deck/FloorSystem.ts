import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';
import { createIBeamShape } from '@/world/profiles/IBeamProfile';

/**
 * D2 — FloorSystem
 * Transverse I-beam floor beams at every panel point (7.6m intervals)
 * plus longitudinal stringers running the full deck length.
 */
export class FloorSystem extends BaseBridgePart {
  constructor() {
    super('FloorSystem');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;
    const { panelLen, floorBeamH, floorBeamWebT, floorBeamFlangeT, stringerW, stringerH } = DECK;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;
    const panelCount = Math.floor(totalLen / panelLen);
    const beamY = deckH - floorBeamH / 2;

    // --- Floor beams (transverse I-beams) ---
    const beamShape = createIBeamShape(0.4, floorBeamH, floorBeamWebT, floorBeamFlangeT);
    const beamExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: deckW,
      bevelEnabled: false,
    };
    const beamGeo = new THREE.ExtrudeGeometry(beamShape, beamExtrudeSettings);
    // ExtrudeGeometry extrudes along Z; rotate 90° around Y so it spans along X
    beamGeo.rotateY(Math.PI / 2);

    const floorBeamMesh = new THREE.InstancedMesh(beamGeo, undefined, panelCount + 1);
    floorBeamMesh.castShadow = true;
    floorBeamMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i <= panelCount; i++) {
      const z = zStart + i * panelLen;
      // After rotating around Y, extrusion runs along -X direction;
      // offset by +deckW/2 so beam is centered on x=0
      dummy.position.set(deckW / 2, beamY, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      floorBeamMesh.setMatrixAt(i, dummy.matrix);
    }
    floorBeamMesh.instanceMatrix.needsUpdate = true;
    this.group.add(floorBeamMesh);

    // --- Longitudinal stringers ---
    const stringerXs = [-10.5, -7.5, -4.5, 0, 4.5, 7.5, 10.5];
    const stringerGeo = new THREE.BoxGeometry(stringerW, stringerH, totalLen);
    const stringerY = deckH - floorBeamH - stringerH / 2;

    for (const sx of stringerXs) {
      const mesh = new THREE.Mesh(stringerGeo);
      mesh.position.set(sx, stringerY, zStart + totalLen / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
