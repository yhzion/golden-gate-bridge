import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE } from '@/config/bridge';

/**
 * E1c — WetSurface
 * Wet reflection overlay on tower pier concrete in the splash zone (y=-2 to y=3).
 * Uses MeshPhysicalMaterial with clearcoat to simulate wet concrete.
 * Opacity oscillates slightly to simulate waves wetting/drying the surface.
 */
export class WetSurface extends BaseBridgePart {
  private readonly wetMaterials: THREE.MeshPhysicalMaterial[] = [];

  constructor() {
    super('WetSurface');
  }

  buildGeometry(): void {
    const pierZs = [0, BRIDGE.mainSpan];

    for (const pierZ of pierZs) {
      // Slightly larger shell around the pier base from y=-2 to y=3 (total height=5)
      // Pier base is roughly 8x5.5 units; we go a bit larger for the overlay
      const shellH = 5; // y=-2 to y=3
      const geo = new THREE.BoxGeometry(10, shellH, 8);

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x666666,
        roughness: 0.15,
        metalness: 0.0,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.4,
        side: THREE.FrontSide,
        depthWrite: false,
      });

      this.wetMaterials.push(mat);

      const mesh = new THREE.Mesh(geo, mat);
      // Center at y=0.5 so bottom is at y=-2 and top at y=3
      mesh.position.set(0, 0.5, pierZ);
      mesh.renderOrder = 1;
      this.group.add(mesh);
    }
  }

  update(_dt: number, elapsed: number): void {
    // Oscillate opacity slightly to simulate waves wetting/drying the surface
    const baseOpacity = 0.4;
    const amplitude = 0.08;
    const opacity = baseOpacity + amplitude * Math.sin(elapsed * 0.7);

    for (const mat of this.wetMaterials) {
      mat.opacity = opacity;
    }
  }
}
