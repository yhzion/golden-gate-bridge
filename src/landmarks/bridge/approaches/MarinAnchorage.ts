import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A3 — MarinAnchorage
 * North anchorage embedded in hillside rock.
 * Located north of the north tower at z = mainSpan + sideSpan + marinAncD/2.
 */
export class MarinAnchorage extends BaseBridgePart {
  constructor() {
    super('MarinAnchorage');
  }

  buildGeometry(): void {
    const anchorZ = BRIDGE.mainSpan + BRIDGE.sideSpan + APPROACH.marinAncD / 2;
    const w = APPROACH.marinAncW;
    const h = APPROACH.marinAncH;
    const d = APPROACH.marinAncD;

    // Main concrete mass, partially below grade (y offset slightly below 0)
    const massGeo = new THREE.BoxGeometry(w, h, d);
    const mass = new THREE.Mesh(massGeo);
    mass.position.set(0, h / 2 - 3, anchorZ); // partially below grade
    mass.castShadow = true;
    mass.receiveShadow = true;
    this.group.add(mass);

    // Cable entry portals on south face (facing toward bridge, negative z side)
    const southFaceZ = anchorZ - d / 2;
    const portalCableXs = [-5, 5];
    for (const cx of portalCableXs) {
      const portalGeo = new THREE.CylinderGeometry(2.0, 2.0, 3, 16, 1, false, 0, Math.PI);
      const portal = new THREE.Mesh(portalGeo);
      // Rotate to open toward -z (south)
      portal.rotation.set(-Math.PI / 2, 0, 0);
      portal.position.set(cx, BRIDGE.deckH + 2, southFaceZ);
      portal.castShadow = true;
      portal.receiveShadow = true;
      this.group.add(portal);
    }

    // Rock base: 3 dodecahedron geometries scattered around base
    const rockConfigs: Array<{ x: number; z: number; r: number; ry: number }> = [
      { x: -8, z: anchorZ - 5, r: 6, ry: 0.3 },
      { x: 10, z: anchorZ + 8, r: 6, ry: 1.1 },
      { x: 2, z: anchorZ + 12, r: 6, ry: 2.0 },
    ];

    for (const cfg of rockConfigs) {
      const rockGeo = new THREE.DodecahedronGeometry(cfg.r, 1);
      const rock = new THREE.Mesh(rockGeo);
      rock.position.set(cfg.x, 0, cfg.z);
      rock.rotation.y = cfg.ry;
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.anchorageConcrete;
      }
    });
  }
}
