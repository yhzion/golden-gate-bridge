// src/roads/CoastalPath.ts

import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE } from './config';

export class CoastalPath {
  private group!: THREE.Group;

  build(scene: THREE.Scene): void {
    this.group = new THREE.Group();
    this.group.name = 'CoastalPath';

    const R = ROAD.coastalRadius;           // 1600
    const halfW = ROAD.coastalWidth / 2;    // 3
    const elev = ROAD.coastalElevation;     // 0.08

    // ── Shared materials ──────────────────────────────────────────────────────
    const boardwalkMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.boardwalk,   // 0x8b6914
      roughness: 0.8,
      metalness: 0.1,
    });

    const railingMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.railing,     // 0x999999
      roughness: 0.3,
      metalness: 0.8,
    });

    // ── 1. Boardwalk surface ──────────────────────────────────────────────────
    const boardwalkGeo = new THREE.RingGeometry(R - halfW, R + halfW, 256);
    boardwalkGeo.rotateX(-Math.PI / 2);
    const boardwalkMesh = new THREE.Mesh(boardwalkGeo, boardwalkMat);
    boardwalkMesh.position.y = elev;
    boardwalkMesh.receiveShadow = true;
    this.group.add(boardwalkMesh);

    // ── 2. Viewpoint decks ────────────────────────────────────────────────────
    const deckW = ROAD.viewpointW;   // 10
    const deckD = ROAD.viewpointD;   // 8
    const deckGeo = new THREE.BoxGeometry(deckW, 0.1, deckD);
    const deckR = R + halfW + deckD / 2;  // outer edge of boardwalk + half deck depth

    for (let i = 0; i < ROAD.viewpointCount; i++) {
      const angle = (i * 2 * Math.PI) / ROAD.viewpointCount;
      const deck = new THREE.Mesh(deckGeo, boardwalkMat);
      deck.position.set(
        Math.cos(angle) * deckR,
        elev,
        Math.sin(angle) * deckR,
      );
      deck.rotation.y = -angle;
      deck.receiveShadow = true;
      this.group.add(deck);
    }

    // ── 3. Railings along outer edge ──────────────────────────────────────────

    // Railing posts (InstancedMesh)
    const railingR = R + halfW;                               // 1603
    const postH = FURNITURE.railingHeight;                    // 1.1
    const postSpacing = FURNITURE.railingPostSpacing;         // 2
    const outerCircumference = 2 * Math.PI * railingR;
    const postCount = Math.round(outerCircumference / postSpacing); // ≈ 5034

    const postGeo = new THREE.CylinderGeometry(
      FURNITURE.railingPostR,   // 0.03
      FURNITURE.railingPostR,   // 0.03
      postH,
      6,
    );
    const postMesh = new THREE.InstancedMesh(postGeo, railingMat, postCount);
    postMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < postCount; i++) {
      const angle = (i / postCount) * 2 * Math.PI;
      dummy.position.set(
        Math.cos(angle) * railingR,
        elev + postH / 2,
        Math.sin(angle) * railingR,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      postMesh.setMatrixAt(i, dummy.matrix);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    this.group.add(postMesh);

    // Top wire (torus at outer edge)
    const wireGeo = new THREE.TorusGeometry(
      railingR,
      FURNITURE.railingWireR,   // 0.008
      6,
      256,
    );
    const wireMesh = new THREE.Mesh(wireGeo, railingMat);
    wireMesh.position.y = elev + postH;  // coastalElevation + railingHeight
    wireMesh.rotation.x = Math.PI / 2;  // lay the torus flat (XZ plane)
    this.group.add(wireMesh);

    scene.add(this.group);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dt: number): void {
    // Static geometry — no per-frame updates needed
  }
}
