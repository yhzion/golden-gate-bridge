import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, CABLE } from '@/config/bridge';

/**
 * C3 — Suspenders
 * Paired vertical wire ropes that connect the main cables to the deck.
 * Each suspender position has:
 *   • Two CylinderGeometry ropes offset by suspPairGap in X
 *   • A small SphereGeometry socket fitting at the top and bottom of each rope
 *
 * Uses InstancedMesh for both ropes and sockets for performance.
 */
export class Suspenders extends BaseBridgePart {
  constructor() {
    super('Suspenders');
  }

  buildGeometry(): void {
    const cableX = BRIDGE.deckW / 2 + 2;
    const sides = [-1, 1] as const;

    // --- Build suspender position list ---
    interface SuspenderPos {
      z: number;
      cableY: number;
      h: number;
    }

    const buildPositions = (
      zList: number[],
      yFn: (z: number) => number,
    ): SuspenderPos[] => {
      const result: SuspenderPos[] = [];
      for (const z of zList) {
        const cableY = yFn(z);
        const h = cableY - BRIDGE.deckH - 2;
        if (h >= 2) {
          result.push({ z, cableY, h });
        }
      }
      return result;
    };

    const mainZs: number[] = [];
    const mainCount = Math.floor(BRIDGE.mainSpan / BRIDGE.suspSpacing);
    for (let i = 1; i < mainCount; i++) {
      mainZs.push(i * BRIDGE.suspSpacing);
    }

    const sideZsSouth: number[] = [];
    const sideZsNorth: number[] = [];
    const sideCount = Math.floor(BRIDGE.sideSpan / BRIDGE.suspSpacing);
    for (let i = 1; i < sideCount; i++) {
      sideZsSouth.push(-BRIDGE.sideSpan + i * BRIDGE.suspSpacing);
      sideZsNorth.push(BRIDGE.mainSpan + i * BRIDGE.suspSpacing);
    }

    const mainYFn = (z: number): number => {
      const t = z / BRIDGE.mainSpan;
      const u = 2 * t - 1;
      return BRIDGE.cableSag + (BRIDGE.towerH - BRIDGE.cableSag) * u * u;
    };

    const southYFn = (z: number): number => {
      const t = (z + BRIDGE.sideSpan) / BRIDGE.sideSpan;
      return THREE.MathUtils.lerp(50, BRIDGE.towerH, t) + -30 * Math.sin(Math.PI * t);
    };

    const northYFn = (z: number): number => {
      const t = (z - BRIDGE.mainSpan) / BRIDGE.sideSpan;
      return THREE.MathUtils.lerp(BRIDGE.towerH, 50, t) + -30 * Math.sin(Math.PI * t);
    };

    const allPositions: SuspenderPos[] = [
      ...buildPositions(mainZs, mainYFn),
      ...buildPositions(sideZsSouth, southYFn),
      ...buildPositions(sideZsNorth, northYFn),
    ];

    // Total instances: positions × sides × 2 ropes per pair
    const totalRopes = allPositions.length * sides.length * 2;
    const totalSockets = totalRopes * 2; // top + bottom per rope

    // --- Rope geometry (unit height=1, scaled per instance) ---
    const ropeGeo = new THREE.CylinderGeometry(CABLE.suspR, CABLE.suspR, 1, 6);

    // --- Socket geometry ---
    const socketR = CABLE.suspR * 2.5;
    const socketGeo = new THREE.SphereGeometry(socketR, 6, 6);

    const ropeMesh = new THREE.InstancedMesh(
      ropeGeo,
      new THREE.MeshStandardMaterial(), // placeholder
      totalRopes,
    );
    ropeMesh.castShadow = true;
    ropeMesh.receiveShadow = true;

    const socketMesh = new THREE.InstancedMesh(
      socketGeo,
      new THREE.MeshStandardMaterial(), // placeholder
      totalSockets,
    );
    socketMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    let ropeIdx = 0;
    let socketIdx = 0;

    const offsets = [-CABLE.suspPairGap / 2, CABLE.suspPairGap / 2] as const;

    for (const side of sides) {
      const baseX = side * cableX;

      for (const pos of allPositions) {
        const midY = BRIDGE.deckH + 2 + pos.h / 2;

        for (const xOff of offsets) {
          const rx = baseX + xOff;

          // Rope
          dummy.position.set(rx, midY, pos.z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, pos.h, 1);
          dummy.updateMatrix();
          ropeMesh.setMatrixAt(ropeIdx++, dummy.matrix);

          // Top socket (at cable attachment)
          dummy.scale.set(1, 1, 1);
          dummy.position.set(rx, pos.cableY - 2, pos.z);
          dummy.updateMatrix();
          socketMesh.setMatrixAt(socketIdx++, dummy.matrix);

          // Bottom socket (at deck)
          dummy.position.set(rx, BRIDGE.deckH + 2, pos.z);
          dummy.updateMatrix();
          socketMesh.setMatrixAt(socketIdx++, dummy.matrix);
        }
      }
    }

    ropeMesh.instanceMatrix.needsUpdate = true;
    socketMesh.instanceMatrix.needsUpdate = true;

    this.group.add(ropeMesh);
    this.group.add(socketMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        obj.material = mats.cableSteel;
      }
    });
  }
}
