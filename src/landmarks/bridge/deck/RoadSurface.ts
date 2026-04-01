import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * D3 — RoadSurface
 * Crowned road surface with 6 lanes, lane markings, and median barrier.
 * - Road: slightly crowned (parabolic, 15cm crown), width = deckW-4
 * - Lane markings: dashed InstancedMesh at lane dividers
 * - Median barrier: InstancedMesh BoxGeometry along center
 */
export class RoadSurface extends BaseBridgePart {
  constructor() {
    super('RoadSurface');
  }

  buildGeometry(): void {
    const { mainSpan, sideSpan, deckH, deckW } = BRIDGE;

    const zStart = -sideSpan;
    const zEnd = mainSpan + sideSpan;
    const totalLen = zEnd - zStart;

    const roadW = deckW - 4; // minus sidewalks on each side
    const crownHeight = 0.15; // 15cm parabolic crown
    const roadThickness = 0.12;

    // --- Crowned road surface via ExtrudeGeometry ---
    // Build a cross-section shape (parabolic crown, slightly wider than flat)
    const crownShape = new THREE.Shape();
    const hw = roadW / 2;
    const segments = 20;

    crownShape.moveTo(-hw, 0);
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * 2 - 1; // -1 to 1
      const x = t * hw;
      const y = crownHeight * (1 - t * t); // parabolic crown
      if (i === 0) {
        crownShape.lineTo(x, y);
      } else {
        crownShape.lineTo(x, y);
      }
    }
    crownShape.lineTo(hw, -roadThickness);
    crownShape.lineTo(-hw, -roadThickness);
    crownShape.closePath();

    const roadExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: totalLen,
      bevelEnabled: false,
    };
    const roadGeo = new THREE.ExtrudeGeometry(crownShape, roadExtrudeSettings);
    const roadMesh = new THREE.Mesh(roadGeo);
    roadMesh.position.set(0, deckH, zStart);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    // --- Lane markings ---
    // Dashes at lane dividers: x = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]
    const markingXs = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
    const dashLen = 3;
    const dashSpacing = 9; // gap+dash period
    const dashCount = Math.floor(totalLen / dashSpacing);
    const markingGeo = new THREE.PlaneGeometry(0.15, dashLen);

    for (const mx of markingXs) {
      const markingMesh = new THREE.InstancedMesh(markingGeo, undefined, dashCount);
      markingMesh.receiveShadow = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < dashCount; i++) {
        const z = zStart + i * dashSpacing + dashLen / 2;
        dummy.position.set(mx, deckH + crownHeight * (1 - Math.pow((mx / hw), 2)) + 0.005, z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        markingMesh.setMatrixAt(i, dummy.matrix);
      }
      markingMesh.instanceMatrix.needsUpdate = true;
      this.group.add(markingMesh);
    }

    // --- Median barrier ---
    // Jersey barrier profile: BoxGeometry(0.4, 0.8, 1.0) at x=0 every 1.2m
    const barrierSpacing = 1.2;
    const barrierCount = Math.floor(totalLen / barrierSpacing);
    const barrierGeo = new THREE.BoxGeometry(0.4, 0.8, 1.0);
    const barrierMesh = new THREE.InstancedMesh(barrierGeo, undefined, barrierCount);
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < barrierCount; i++) {
      const z = zStart + i * barrierSpacing + 0.5;
      dummy.position.set(0, deckH + 0.4, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      barrierMesh.setMatrixAt(i, dummy.matrix);
    }
    barrierMesh.instanceMatrix.needsUpdate = true;
    this.group.add(barrierMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Identify by geometry type or traversal order
        obj.material = mats.asphalt;
      }
    });

    // Re-assign markings and barriers by inspecting geometry
    let meshIdx = 0;
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        const geo = obj.geometry;
        if (geo instanceof THREE.PlaneGeometry) {
          obj.material = mats.laneMarkings;
        } else if (geo instanceof THREE.BoxGeometry) {
          obj.material = mats.pierConcrete;
        }
      } else if (obj instanceof THREE.Mesh && !(obj instanceof THREE.InstancedMesh)) {
        meshIdx++;
        // First mesh is the road surface
        if (meshIdx === 1) {
          obj.material = mats.asphalt;
        }
      }
    });
  }
}
