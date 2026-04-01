// src/roads/PedestrianPaths.ts

import * as THREE from 'three';
import { ROAD, ROAD_COLORS } from './config';

export class PedestrianPaths {
  private group: THREE.Group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'PedestrianPaths';

    const mat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.pedestrian });

    // ── Ring path at R=250m, 4m wide ─────────────────────────────────────────
    const halfMain = ROAD.pedestrianMainWidth / 2; // 2m
    const ringGeo = new THREE.RingGeometry(250 - halfMain, 250 + halfMain, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, mat);
    ringMesh.position.y = ROAD.pedestrianElevation;
    ringMesh.receiveShadow = true;
    this.group.add(ringMesh);

    // ── 8 curved radial paths offset 22.5° from radial roads ─────────────────
    for (let i = 0; i < ROAD.pedestrianPathCount; i++) {
      // Radial roads are at i * (2π/8); offset by PI/8 (22.5°) to avoid overlap
      const baseAngle = (i * 2 * Math.PI) / ROAD.pedestrianPathCount;
      const angle = baseAngle + Math.PI / 8;
      this.buildCurvedPath(angle, mat);
    }

    scene.add(this.group);
  }

  private buildCurvedPath(angle: number, mat: THREE.MeshStandardMaterial): void {
    const startR = 50;
    const endR = 480;
    const points: THREE.Vector3[] = [];
    const segments = 8;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const r = startR + (endR - startR) * t;
      const angleOffset = Math.sin(t * Math.PI * 2) * 0.08;
      const a = angle + angleOffset;
      points.push(new THREE.Vector3(
        Math.cos(a) * r,
        ROAD.pedestrianElevation,
        Math.sin(a) * r,
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points);

    const halfW = ROAD.pedestrianTrailWidth / 2; // 1.25
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(halfW, 0.03);
    shape.lineTo(-halfW, 0.03);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 60,
      extrudePath: curve,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dt: number): void {
    // Static geometry — no per-frame updates needed
  }
}
