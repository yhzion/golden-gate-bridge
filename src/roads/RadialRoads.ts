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
    const bikeLaneMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.bikeLane });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.sidewalk });
    const centerLineMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.centerLine });

    // Shared geometry instances — created once, reused across all 8 roads
    const roadGeo = new THREE.PlaneGeometry(ROAD.radialWidth, roadLength);
    const bikeLaneGeo = new THREE.PlaneGeometry(ROAD.bikeLaneWidth, roadLength);
    const sidewalkGeo = new THREE.PlaneGeometry(1.5, roadLength);
    const centerLineGeo = new THREE.PlaneGeometry(FURNITURE.centerLineWidth, roadLength);

    // Bike lane offset: ±(radialLaneWidth + bikeLaneWidth/2) from road center
    const bikeLaneOffset = ROAD.radialLaneWidth + ROAD.bikeLaneWidth / 2; // 3.5 + 1.0 = 4.5m
    // Sidewalk offset: ±(radialLaneWidth + bikeLaneWidth + 0.75) from road center
    const sidewalkOffset = ROAD.radialLaneWidth + ROAD.bikeLaneWidth + 0.75; // 3.5 + 2.0 + 0.75 = 6.25m

    for (let i = 0; i < ROAD.radialCount; i++) {
      const angle = (i * 2 * Math.PI) / ROAD.radialCount;
      const roadGroup = new THREE.Group();

      // --- Main road surface ---
      const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      roadGroup.add(roadMesh);

      // --- Bike lane strips (left and right, inner 2m, between vehicle lanes and sidewalk) ---
      const leftBikeLane = new THREE.Mesh(bikeLaneGeo, bikeLaneMat);
      leftBikeLane.rotation.x = -Math.PI / 2;
      leftBikeLane.position.set(-bikeLaneOffset, ROAD.bikeElevation, 0);
      leftBikeLane.receiveShadow = true;
      roadGroup.add(leftBikeLane);

      const rightBikeLane = new THREE.Mesh(bikeLaneGeo, bikeLaneMat);
      rightBikeLane.rotation.x = -Math.PI / 2;
      rightBikeLane.position.set(bikeLaneOffset, ROAD.bikeElevation, 0);
      rightBikeLane.receiveShadow = true;
      roadGroup.add(rightBikeLane);

      // --- Sidewalk strips (left and right, outer 1.5m, at road edge) ---
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
