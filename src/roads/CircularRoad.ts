// src/roads/CircularRoad.ts
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROAD, ROAD_COLORS, FURNITURE, MARKING_ELEVATION } from './config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a flat ring mesh (XZ plane) at a given Y elevation. */
function makeRing(
  innerR: number,
  outerR: number,
  y: number,
  color: number,
  segments = 128,
  roughness?: number,
  metalness?: number,
): THREE.Mesh {
  const geo = new THREE.RingGeometry(innerR, outerR, segments);
  geo.rotateX(-Math.PI / 2);
  const matParams: THREE.MeshStandardMaterialParameters = { color };
  if (roughness !== undefined) matParams.roughness = roughness;
  if (metalness !== undefined) matParams.metalness = metalness;
  const mat = new THREE.MeshStandardMaterial(matParams);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Build dashed-arc lane-marking geometry at a given radius.
 * Each dash is a thin ring sector approximated with a RingGeometry
 * spanning the arc length of the dash.
 */
function buildDashedArcGeo(
  radius: number,
  halfWidth: number,
  dashLen: number,
  gapLen: number,
  segments: number,
): THREE.BufferGeometry {
  const circumference = 2 * Math.PI * radius;
  const cycle = dashLen + gapLen;
  const dashAngle = (dashLen / circumference) * 2 * Math.PI;
  const cycleAngle = (cycle / circumference) * 2 * Math.PI;
  const numDashes = Math.floor(circumference / cycle);

  const geos: THREE.BufferGeometry[] = [];

  for (let i = 0; i < numDashes; i++) {
    const startAngle = i * cycleAngle;
    const g = new THREE.RingGeometry(
      radius - halfWidth,
      radius + halfWidth,
      segments,
      1,
      startAngle,
      dashAngle,
    );
    g.rotateX(-Math.PI / 2);
    geos.push(g);
  }

  if (geos.length === 0) return new THREE.BufferGeometry();
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}

// ─── CircularRoad ─────────────────────────────────────────────────────────────

export class CircularRoad {
  private group!: THREE.Group;

  build(scene: THREE.Scene): void {
    this.group = new THREE.Group();
    this.group.name = 'CircularRoad';

    const R = ROAD.circularRadius;
    const lw = ROAD.laneWidth;          // 3.5 m
    const blw = ROAD.bikeLaneWidth;     // 2 m
    const sww = ROAD.sidewalkWidth;     // 2 m
    const bikeElev = ROAD.bikeElevation;    // 0.05
    const swElev = ROAD.sidewalkElevation;  // 0.15
    const SEGS = 256; // ring geometry angular segments

    // ── Road surface (4 lanes total: 2×lw each side) ──────────────────────
    // Spans from R - 2*lw  to  R + 2*lw  (total 4 lanes × 3.5 = 14 m wide)
    const roadInner = R - 2 * lw;
    const roadOuter = R + 2 * lw;
    const roadMesh = makeRing(roadInner, roadOuter, 0, ROAD_COLORS.asphalt, SEGS, 0.9, 0.1);
    this.group.add(roadMesh);

    // ── Bike lanes ────────────────────────────────────────────────────────
    // Inner bike lane: from roadInner - blw  to  roadInner
    const bikeInnerInner = roadInner - blw;
    const bikeInnerOuter = roadInner;
    const bikeInnerMesh = makeRing(bikeInnerInner, bikeInnerOuter, bikeElev, ROAD_COLORS.bikeLane, SEGS, 0.85, 0.05);
    this.group.add(bikeInnerMesh);

    // Outer bike lane: from roadOuter  to  roadOuter + blw
    const bikeOuterInner = roadOuter;
    const bikeOuterOuter = roadOuter + blw;
    const bikeOuterMesh = makeRing(bikeOuterInner, bikeOuterOuter, bikeElev, ROAD_COLORS.bikeLane, SEGS, 0.85, 0.05);
    this.group.add(bikeOuterMesh);

    // ── Sidewalks ─────────────────────────────────────────────────────────
    // Inner sidewalk: from bikeInnerInner - sww  to  bikeInnerInner
    const swInnerInner = bikeInnerInner - sww;
    const swInnerOuter = bikeInnerInner;
    const swInnerMesh = makeRing(swInnerInner, swInnerOuter, swElev, ROAD_COLORS.sidewalk, SEGS, 0.95, 0.05);
    this.group.add(swInnerMesh);

    // Outer sidewalk: from bikeOuterOuter  to  bikeOuterOuter + sww
    const swOuterInner = bikeOuterOuter;
    const swOuterOuter = bikeOuterOuter + sww;
    const swOuterMesh = makeRing(swOuterInner, swOuterOuter, swElev, ROAD_COLORS.sidewalk, SEGS, 0.95, 0.05);
    this.group.add(swOuterMesh);

    // ── Center divider line ───────────────────────────────────────────────
    const clw = FURNITURE.centerLineWidth; // 0.15
    const centerLineMesh = makeRing(R - clw / 2, R + clw / 2, MARKING_ELEVATION, ROAD_COLORS.centerLine, SEGS, 0.7);
    this.group.add(centerLineMesh);

    // ── Dashed lane markings ──────────────────────────────────────────────
    // Lane dividers at  R ± laneWidth  (between lanes 1&2 on each side)
    const llw = FURNITURE.laneLineWidth;   // 0.1
    const dash = FURNITURE.laneLineDash;   // 3
    const gap = FURNITURE.laneLineGap;     // 5
    const laneMarkMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.laneLine, roughness: 0.7 });
    const ARC_SEGS = 4; // per-dash arc segments (thin slivers, 4 is enough)

    for (const offset of [-lw, lw]) {
      const markR = R + offset;
      const geo = buildDashedArcGeo(markR, llw / 2, dash, gap, ARC_SEGS);
      const mesh = new THREE.Mesh(geo, laneMarkMat);
      mesh.position.y = MARKING_ELEVATION;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    scene.add(this.group);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dt: number): void {
    // Static road — no per-frame updates needed
  }
}
