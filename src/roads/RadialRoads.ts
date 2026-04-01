// src/roads/RadialRoads.ts

import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE, MARKING_ELEVATION } from './config';

export class RadialRoads {
  private group: THREE.Group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'RadialRoads';

    const roadLength = ROAD.radialOuterR - ROAD.radialInnerR; // 1000m
    const midR = (ROAD.radialInnerR + ROAD.radialOuterR) / 2; // 1000m

    const asphaltMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.asphalt });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.sidewalk });
    const centerLineMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.centerLine });

    // Sidewalk strip half-width offset from road center: half vehicle lanes + half sidewalk strip
    // Vehicle lanes span ±(radialLaneWidth) = ±3.5m from center (2 lanes × 3.5m = 7m total)
    // Sidewalk strip width = 3.5m, centered at ±(3.5 + 1.75) = ±5.25m from road center
    const sidewalkOffset = ROAD.radialLaneWidth + ROAD.radialLaneWidth / 2; // 3.5 + 1.75 = 5.25m

    for (let i = 0; i < ROAD.radialCount; i++) {
      const angle = (i * 2 * Math.PI) / ROAD.radialCount;
      const roadGroup = new THREE.Group();

      // --- Main road surface ---
      const roadGeo = new THREE.PlaneGeometry(ROAD.radialWidth, roadLength);
      const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      roadGroup.add(roadMesh);

      // --- Sidewalk overlay strips (left and right) ---
      const sidewalkGeo = new THREE.PlaneGeometry(ROAD.radialLaneWidth, roadLength);

      const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
      leftSidewalk.rotation.x = -Math.PI / 2;
      leftSidewalk.position.set(-sidewalkOffset, ROAD.sidewalkElevation, 0);
      leftSidewalk.receiveShadow = true;
      roadGroup.add(leftSidewalk);

      const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
      rightSidewalk.rotation.x = -Math.PI / 2;
      rightSidewalk.position.set(sidewalkOffset, ROAD.sidewalkElevation, 0);
      rightSidewalk.receiveShadow = true;
      roadGroup.add(rightSidewalk);

      // --- Center line ---
      const centerLineGeo = new THREE.PlaneGeometry(FURNITURE.centerLineWidth, roadLength);
      const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.set(0, MARKING_ELEVATION, 0);
      centerLine.receiveShadow = true;
      roadGroup.add(centerLine);

      // --- Position and orient the road group ---
      roadGroup.position.set(
        Math.cos(angle) * midR,
        0,
        Math.sin(angle) * midR,
      );
      roadGroup.rotation.y = -angle + Math.PI / 2;

      this.group.add(roadGroup);
    }

    scene.add(this.group);
  }

  update(_dt: number): void {
    // static geometry — no per-frame updates needed
  }
}
