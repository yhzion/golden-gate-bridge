import * as THREE from 'three';
import type { BridgeMaterials } from '@/world/Materials';

export interface BridgePart {
  readonly name: string;
  readonly group: THREE.Group;
  buildGeometry(): void;
  applyMaterials(mats: BridgeMaterials): void;
  addMicroDetails(): void;
  update?(dt: number, elapsed: number): void;
  dispose(): void;
}

export abstract class BaseBridgePart implements BridgePart {
  readonly name: string;
  readonly group = new THREE.Group();

  constructor(name: string) {
    this.name = name;
  }

  abstract buildGeometry(): void;

  applyMaterials(_mats: BridgeMaterials): void {
    // Default no-op; parts override as needed
  }

  addMicroDetails(): void {
    // Default no-op; Phase 3 will override
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj instanceof THREE.InstancedMesh) return;
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }
}
