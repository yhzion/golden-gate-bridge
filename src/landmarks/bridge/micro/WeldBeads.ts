import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * S3c — WeldBeads
 * Weld repair lines at ~10 scattered locations on the deck truss.
 * Each weld is a TubeGeometry along a short CatmullRomCurve3.
 * Positions use a seeded pseudo-random sequence for repeatable placement.
 */
export class WeldBeads extends BaseBridgePart {
  constructor() {
    super('WeldBeads');
  }

  /** Simple seeded pseudo-random: returns value in [0, 1) */
  private seededRandom(seed: number): number {
    // Park-Miller style integer hash
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  buildGeometry(): void {
    const weldCount = 10;
    const zStart = -BRIDGE.sideSpan;
    const zRange = BRIDGE.mainSpan + 2 * BRIDGE.sideSpan;
    const sides = [-BRIDGE.deckW / 2, BRIDGE.deckW / 2];
    const yRange = DECK.trussH;

    for (let i = 0; i < weldCount; i++) {
      // Seeded values for this weld index
      const r0 = this.seededRandom(i * 5 + 0);
      const r1 = this.seededRandom(i * 5 + 1);
      const r2 = this.seededRandom(i * 5 + 2);
      const r3 = this.seededRandom(i * 5 + 3);
      const r4 = this.seededRandom(i * 5 + 4);

      const sideX = sides[Math.floor(r0 * 2)];
      const baseZ = zStart + r1 * zRange;
      const baseY = BRIDGE.deckH - DECK.trussH + r2 * yRange;
      const weldLen = 1.0 + r3 * 1.0; // 1–2m long
      const curve3Pts = 3 + Math.floor(r4 * 3); // 3–5 control points

      // Build CatmullRomCurve3 control points with slight jitter
      const points: THREE.Vector3[] = [];
      for (let j = 0; j < curve3Pts; j++) {
        const t = j / (curve3Pts - 1);
        const jitterY = (this.seededRandom(i * 17 + j * 3 + 0) - 0.5) * 0.04;
        const jitterX = (this.seededRandom(i * 17 + j * 3 + 1) - 0.5) * 0.04;
        points.push(
          new THREE.Vector3(
            sideX + jitterX,
            baseY + jitterY,
            baseZ + t * weldLen,
          ),
        );
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeSegments = 12;
      const tubeGeo = new THREE.TubeGeometry(curve, tubeSegments, 0.008, 6, false);
      const mesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial());
      mesh.castShadow = false;
      this.group.add(mesh);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.galvanizedSteel;
      }
    });
  }
}
