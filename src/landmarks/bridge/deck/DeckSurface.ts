import * as THREE from 'three';
import { BaseBridgePart } from '../BridgePart';
import { BRIDGE, LANES, LANE_W } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

/**
 * Bridge deck road surface with asphalt texture and lane markings.
 * Creates a flat road mesh spanning the full bridge length with
 * realistic lane markings matching Golden Gate Bridge conventions:
 * - 6 lanes (3 each direction)
 * - Dashed lane dividers (white)
 * - Solid edge lines
 * - Double yellow center line
 */
export class DeckSurface extends BaseBridgePart {
  private roadMesh!: THREE.Mesh;
  private markingsGroup = new THREE.Group();

  constructor() {
    super('deck-surface');
  }

  buildGeometry(): void {
    const totalLen = BRIDGE.totalLength;
    const roadW = BRIDGE.deckW - 2; // Leave space for railings/sidewalks

    // Road surface plane
    const roadGeo = new THREE.PlaneGeometry(roadW, totalLen, 1, 1);
    roadGeo.rotateX(-Math.PI / 2);
    this.roadMesh = new THREE.Mesh(roadGeo);
    this.roadMesh.position.set(0, BRIDGE.deckH + 0.02, totalLen / 2 - BRIDGE.sideSpan);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    // Sidewalks (slightly raised, darker surface on both edges)
    const sidewalkW = 1.8;
    for (const side of [-1, 1]) {
      const swGeo = new THREE.PlaneGeometry(sidewalkW, totalLen, 1, 1);
      swGeo.rotateX(-Math.PI / 2);
      const sw = new THREE.Mesh(swGeo);
      sw.position.set(
        side * (roadW / 2 + sidewalkW / 2),
        BRIDGE.deckH + 0.08,
        totalLen / 2 - BRIDGE.sideSpan,
      );
      sw.receiveShadow = true;
      sw.userData.isSidewalk = true;
      this.group.add(sw);
    }

    // --- Lane Markings ---
    this.buildLaneMarkings(totalLen, roadW);
  }

  private buildLaneMarkings(totalLen: number, _roadW: number): void {
    const markH = BRIDGE.deckH + 0.04; // Slightly above road surface
    const bridgeStart = -BRIDGE.sideSpan;

    // Center double yellow line (solid, between lane 3 and 4)
    const centerX = 0;
    this.addSolidLine(centerX - 0.12, markH, bridgeStart, totalLen, 0.08, 0xdda800);
    this.addSolidLine(centerX + 0.12, markH, bridgeStart, totalLen, 0.08, 0xdda800);

    // Edge lines (solid white) on both sides of the road
    const edgeOffset = (LANES.length / 2) * LANE_W + 0.3;
    this.addSolidLine(-edgeOffset, markH, bridgeStart, totalLen, 0.12, 0xcccccc);
    this.addSolidLine(edgeOffset, markH, bridgeStart, totalLen, 0.12, 0xcccccc);

    // Dashed lane dividers (white)
    // Southbound lanes: between lanes 0-1, 1-2
    // Northbound lanes: between lanes 3-4, 4-5
    const dashLen = 3.0;
    const gapLen = 9.0;
    const dividerPositions = [
      (LANES[0] + LANES[1]) / 2,
      (LANES[1] + LANES[2]) / 2,
      (LANES[3] + LANES[4]) / 2,
      (LANES[4] + LANES[5]) / 2,
    ];

    for (const lx of dividerPositions) {
      this.addDashedLine(lx, markH, bridgeStart, totalLen, 0.1, dashLen, gapLen, 0xcccccc);
    }

    this.group.add(this.markingsGroup);
  }

  private addSolidLine(
    x: number, y: number, zStart: number, length: number,
    width: number, color: number,
  ): void {
    const geo = new THREE.PlaneGeometry(width, length, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, zStart + length / 2);
    mesh.receiveShadow = true;
    this.markingsGroup.add(mesh);
  }

  private addDashedLine(
    x: number, y: number, zStart: number, totalLen: number,
    width: number, dashLen: number, gapLen: number, color: number,
  ): void {
    // Use instanced mesh for dashes
    const dashGeo = new THREE.PlaneGeometry(width, dashLen, 1, 1);
    dashGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });

    const segLen = dashLen + gapLen;
    const count = Math.ceil(totalLen / segLen);
    const instanced = new THREE.InstancedMesh(dashGeo, mat, count);
    const dummy = new THREE.Object3D();

    for (let n = 0; n < count; n++) {
      const z = zStart + n * segLen + dashLen / 2;
      if (z > zStart + totalLen) break;
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instanced.setMatrixAt(n, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    instanced.receiveShadow = true;
    this.markingsGroup.add(instanced);
  }

  applyMaterials(mats: BridgeMaterials): void {
    // Apply asphalt material to road surface
    this.roadMesh.material = mats.asphalt;

    // Apply a darker asphalt tone to sidewalks
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.8,
      metalness: 0,
    });
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.isSidewalk) {
        obj.material = sidewalkMat;
      }
    });
  }

  addMicroDetails(): void {
    // No additional micro-details needed
  }
}
