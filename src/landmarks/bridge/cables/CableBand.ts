import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, CABLE } from '@/config/bridge';

/**
 * C2 — CableBand
 * Cast-iron clamp rings placed at every suspender attachment point along
 * both main cables. Uses InstancedMesh for GPU-efficient rendering.
 *
 * Band placement mirrors the suspender spacing used in C3 (Suspenders):
 *   • Main span:       suspenders every BRIDGE.suspSpacing
 *   • South side span: suspenders every BRIDGE.suspSpacing
 *   • North side span: suspenders every BRIDGE.suspSpacing
 */
export class CableBand extends BaseBridgePart {
  constructor() {
    super('CableBand');
  }

  buildGeometry(): void {
    const cableX = BRIDGE.deckW / 2 + 2;
    const sides = [-1, 1] as const;

    // Collect all suspender Z positions (same logic as Suspenders C3).
    const suspenderZs: number[] = [];

    // Main span
    const mainCount = Math.floor(BRIDGE.mainSpan / BRIDGE.suspSpacing);
    for (let i = 1; i < mainCount; i++) {
      suspenderZs.push(i * BRIDGE.suspSpacing);
    }

    // South side span
    const sideCount = Math.floor(BRIDGE.sideSpan / BRIDGE.suspSpacing);
    for (let i = 1; i < sideCount; i++) {
      suspenderZs.push(-BRIDGE.sideSpan + i * BRIDGE.suspSpacing);
    }

    // North side span
    for (let i = 1; i < sideCount; i++) {
      suspenderZs.push(BRIDGE.mainSpan + i * BRIDGE.suspSpacing);
    }

    const totalBands = suspenderZs.length * sides.length;

    // TorusGeometry wrapping the cable; rotated to sit perpendicular to cable axis (Z).
    const bandGeo = new THREE.TorusGeometry(CABLE.bandR, CABLE.bandW / 2, 8, 16);
    // Rotate so the torus ring wraps around the Z-axis cable (torus normally in XY plane).
    bandGeo.rotateX(Math.PI / 2);

    const instancedMesh = new THREE.InstancedMesh(
      bandGeo,
      new THREE.MeshStandardMaterial(), // placeholder; replaced in applyMaterials
      totalBands,
    );
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (const side of sides) {
      for (const z of suspenderZs) {
        // Compute cable Y at this Z position.
        const y = this.cableYAtZ(z);

        dummy.position.set(side * cableX, y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(idx++, dummy.matrix);
      }
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.group.add(instancedMesh);
  }

  /** Compute cable Y for a given Z coordinate, matching MainCable profile. */
  private cableYAtZ(z: number): number {
    if (z >= 0 && z <= BRIDGE.mainSpan) {
      // Main span parabola
      const t = z / BRIDGE.mainSpan;
      const u = 2 * t - 1;
      return BRIDGE.cableSag + (BRIDGE.towerH - BRIDGE.cableSag) * u * u;
    } else if (z >= -BRIDGE.sideSpan && z < 0) {
      // South side span
      const t = (z + BRIDGE.sideSpan) / BRIDGE.sideSpan; // 0→1
      return THREE.MathUtils.lerp(50, BRIDGE.towerH, t) + -30 * Math.sin(Math.PI * t);
    } else if (z > BRIDGE.mainSpan && z <= BRIDGE.mainSpan + BRIDGE.sideSpan) {
      // North side span
      const t = (z - BRIDGE.mainSpan) / BRIDGE.sideSpan; // 0→1
      return THREE.MathUtils.lerp(BRIDGE.towerH, 50, t) + -30 * Math.sin(Math.PI * t);
    }
    return BRIDGE.towerH;
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        obj.material = mats.castIron;
      }
    });
  }
}
