import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A2 — SFAnchorage
 * South anchorage: stepped concrete mass with Art Deco facade.
 * Located south of the south tower at z = -(sideSpan + sfAncD/2).
 */
export class SFAnchorage extends BaseBridgePart {
  constructor() {
    super('SFAnchorage');
  }

  buildGeometry(): void {
    const anchorZ = -(BRIDGE.sideSpan + APPROACH.sfAncD / 2);
    const steps = APPROACH.sfAncSteps;

    // 4 stepped tiers, each progressively smaller
    for (let step = 0; step < steps; step++) {
      const scale = 1 - step * 0.15;
      const w = APPROACH.sfAncW * scale;
      const h = APPROACH.sfAncH * (1 - step * 0.1);
      const d = APPROACH.sfAncD * scale;
      const yOffset = step * 2; // stack tiers upward

      const tierGeo = new THREE.BoxGeometry(w, h, d);
      const tier = new THREE.Mesh(tierGeo);
      tier.position.set(0, yOffset + h / 2, anchorZ);
      tier.castShadow = true;
      tier.receiveShadow = true;
      this.group.add(tier);
    }

    // Cable entry portals on north face (facing toward bridge, positive z side)
    const northFaceZ = anchorZ + APPROACH.sfAncD / 2;
    const portalCableXs = [-6, 6];
    for (const cx of portalCableXs) {
      const portalGeo = new THREE.CylinderGeometry(2.5, 2.5, 3, 16, 1, false, 0, Math.PI);
      const portal = new THREE.Mesh(portalGeo);
      // Rotate to face north (opening toward +z direction)
      portal.rotation.set(Math.PI / 2, 0, 0);
      portal.position.set(cx, BRIDGE.deckH + 2, northFaceZ);
      portal.castShadow = true;
      portal.receiveShadow = true;
      this.group.add(portal);
    }

    // Art Deco pilasters on the north facade at 4m spacing
    const pilasterSpacing = 4;
    const facadeW = APPROACH.sfAncW;
    const pilasterCount = Math.floor(facadeW / pilasterSpacing) - 1;
    const pilasterH = APPROACH.sfAncH;

    for (let i = 0; i < pilasterCount; i++) {
      const px = -facadeW / 2 + pilasterSpacing * (i + 1);
      const pilasterGeo = new THREE.BoxGeometry(0.6, pilasterH, 0.4);
      const pilaster = new THREE.Mesh(pilasterGeo);
      pilaster.position.set(px, pilasterH / 2, northFaceZ + 0.2);
      pilaster.castShadow = true;
      pilaster.receiveShadow = true;
      this.group.add(pilaster);
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
