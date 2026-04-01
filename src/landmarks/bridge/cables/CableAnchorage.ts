import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * C5 — CableAnchorage
 * Massive stepped concrete anchorage blocks at both ends of the bridge,
 * where the main cables are anchored into bedrock.
 *
 * South anchorage: z = -(sideSpan + 30)
 * North anchorage: z =   mainSpan + sideSpan + 30
 *
 * Each anchorage has:
 *   • Three stepped concrete tiers (decreasing width/depth upward)
 *   • Two cable entry portals (one per cable side)
 *   • Art Deco facade pilasters on the front face
 */
export class CableAnchorage extends BaseBridgePart {
  constructor() {
    super('CableAnchorage');
  }

  buildGeometry(): void {
    const southZ = -(BRIDGE.sideSpan + 30);
    const northZ = BRIDGE.mainSpan + BRIDGE.sideSpan + 30;

    this.buildAnchorage(southZ, 1);  // South: cable enters from north (+z direction)
    this.buildAnchorage(northZ, -1); // North: cable enters from south (-z direction)
  }

  /**
   * @param z        World Z centre of this anchorage
   * @param faceDir  +1 = face toward +z (south anchorage), -1 = face toward -z (north)
   */
  private buildAnchorage(z: number, faceDir: number): void {
    // Stepped concrete tiers — each tier is wider and deeper than the one above.
    const tiers = [
      { w: 60, h: 30, d: 40, yBase: -5 },   // base tier (partially buried)
      { w: 48, h: 25, d: 32, yBase: 25 },   // mid tier
      { w: 36, h: 20, d: 24, yBase: 50 },   // top tier
    ] as const;

    for (const tier of tiers) {
      const geo = new THREE.BoxGeometry(tier.w, tier.h, tier.d);
      const mesh = new THREE.Mesh(geo);
      mesh.position.set(0, tier.yBase + tier.h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    // --- Cable entry portals ---
    // Two tunnel-like portals, one for each cable (left/right).
    const portalW = 2.5;
    const portalH = 3.5;
    const cableX = BRIDGE.deckW / 2 + 2;
    const topTierYBase = 50;
    const topTierH = 20;
    const portalY = topTierYBase + topTierH * 0.55;
    const portalFaceZ = z + faceDir * 12; // on front face of top tier

    for (const side of [-1, 1] as const) {
      // Portal surround (hollow-looking arch frame)
      const surGeo = new THREE.BoxGeometry(portalW + 1.2, portalH + 1.2, 0.5);
      const surMesh = new THREE.Mesh(surGeo);
      surMesh.position.set(side * cableX, portalY, portalFaceZ);
      this.group.add(surMesh);

      // Dark void box (slightly inset to suggest depth)
      const voidGeo = new THREE.BoxGeometry(portalW, portalH, 0.8);
      const voidMesh = new THREE.Mesh(voidGeo);
      voidMesh.position.set(side * cableX, portalY, portalFaceZ + faceDir * 0.15);
      this.group.add(voidMesh);
    }

    // --- Art Deco facade pilasters ---
    // Vertical rectangular fins on the front face of the top tier.
    const pilasterCount = 5;
    const pilasterW = 1.2;
    const pilasterH = topTierH * 0.85;
    const pilasterD = 0.8;
    const pilasterY = topTierYBase + topTierH / 2;
    const pilasterSpacing = 36 / (pilasterCount + 1); // spread across top tier width

    for (let i = 1; i <= pilasterCount; i++) {
      const px = -18 + i * pilasterSpacing;
      const pilGeo = new THREE.BoxGeometry(pilasterW, pilasterH, pilasterD);
      const pilMesh = new THREE.Mesh(pilGeo);
      pilMesh.position.set(px, pilasterY, portalFaceZ + faceDir * 0.4);
      pilMesh.castShadow = true;
      this.group.add(pilMesh);

      // Capital (top block)
      const capGeo = new THREE.BoxGeometry(pilasterW + 0.4, 1.0, pilasterD + 0.4);
      const capMesh = new THREE.Mesh(capGeo);
      capMesh.position.set(px, pilasterY + pilasterH / 2 + 0.5, portalFaceZ + faceDir * 0.4);
      this.group.add(capMesh);
    }

    // --- Horizontal string course (decorative band) ---
    const bandGeo = new THREE.BoxGeometry(tiers[2].w + 1, 1.5, 0.6);
    const bandMesh = new THREE.Mesh(bandGeo);
    bandMesh.position.set(0, topTierYBase + topTierH * 0.35, portalFaceZ + faceDir * 0.3);
    this.group.add(bandMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.anchorageConcrete;
      }
    });
  }
}
