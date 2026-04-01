import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A5 — ApproachViaducts
 * Concrete approach spans on both sides of the bridge.
 * South: from z = -sideSpan, length sfViaductLen
 * North: from z = mainSpan, length marinViaductLen
 */
export class ApproachViaducts extends BaseBridgePart {
  constructor() {
    super('ApproachViaducts');
  }

  buildGeometry(): void {
    this.buildViaduct(
      -BRIDGE.sideSpan,
      APPROACH.sfViaductLen,
      -1, // south extends in negative z direction
    );
    this.buildViaduct(
      BRIDGE.mainSpan,
      APPROACH.marinViaductLen,
      1, // north extends in positive z direction
    );
  }

  private buildViaduct(startZ: number, length: number, direction: 1 | -1): void {
    const deckW = BRIDGE.deckW;
    const spanLen = APPROACH.viaductSpanLen;
    const colW = APPROACH.viaductColW;
    const colD = APPROACH.viaductColD;
    const colXOffset = deckW / 2 - 2;

    // Deck slab
    const deckGeo = new THREE.BoxGeometry(deckW, 0.5, length);
    const deck = new THREE.Mesh(deckGeo);
    const deckCenterZ = startZ + direction * (length / 2);
    deck.position.set(0, BRIDGE.deckH - 0.25, deckCenterZ);
    deck.castShadow = false;
    deck.receiveShadow = true;
    this.group.add(deck);

    // Support columns at spanLen intervals
    const numSpans = Math.floor(length / spanLen);

    for (let i = 0; i <= numSpans; i++) {
      const t = numSpans > 0 ? i / numSpans : 0; // 0..1 along viaduct
      const colZ = startZ + direction * spanLen * i;

      // Column height: full height from ground to deck underside
      const colH = BRIDGE.deckH - 0.5; // deck slab thickness is 0.5

      // Left column — bottom at y=0, top at deck underside
      const leftColGeo = new THREE.BoxGeometry(colW, colH, colD);
      const leftCol = new THREE.Mesh(leftColGeo);
      leftCol.position.set(-colXOffset, colH / 2, colZ);
      leftCol.castShadow = true;
      leftCol.receiveShadow = true;
      this.group.add(leftCol);

      // Right column
      const rightColGeo = new THREE.BoxGeometry(colW, colH, colD);
      const rightCol = new THREE.Mesh(rightColGeo);
      rightCol.position.set(colXOffset, colH / 2, colZ);
      rightCol.castShadow = true;
      rightCol.receiveShadow = true;
      this.group.add(rightCol);

      // Cross beam at top of column pair
      const crossBeamGeo = new THREE.BoxGeometry(deckW - 2, 0.8, 1.0);
      const crossBeam = new THREE.Mesh(crossBeamGeo);
      crossBeam.position.set(0, BRIDGE.deckH - 0.4, colZ);
      crossBeam.castShadow = true;
      crossBeam.receiveShadow = true;
      this.group.add(crossBeam);
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
