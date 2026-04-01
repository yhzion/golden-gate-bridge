// src/roads/CircularRoad.ts
import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE, MARKING_ELEVATION } from './config';

// ─── Minimal geometry merger (avoids dependency on three/examples) ───────────
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();

  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geos) {
    totalVerts += (g.attributes.position as THREE.BufferAttribute).count;
    if (g.index) totalIndices += g.index.count;
  }

  const hasIndex = geos.every((g) => !!g.index);
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = hasIndex ? new Uint32Array(totalIndices) : null;

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geos) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
    const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      positions[(vOffset + i) * 3 + 0] = pos.getX(i);
      positions[(vOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vOffset + i) * 3 + 2] = pos.getZ(i);
    }
    if (nor) {
      for (let i = 0; i < count; i++) {
        normals[(vOffset + i) * 3 + 0] = nor.getX(i);
        normals[(vOffset + i) * 3 + 1] = nor.getY(i);
        normals[(vOffset + i) * 3 + 2] = nor.getZ(i);
      }
    } else {
      // default up normal for flat geometry
      for (let i = 0; i < count; i++) {
        normals[(vOffset + i) * 3 + 1] = 1;
      }
    }
    if (uv) {
      for (let i = 0; i < count; i++) {
        uvs[(vOffset + i) * 2 + 0] = uv.getX(i);
        uvs[(vOffset + i) * 2 + 1] = uv.getY(i);
      }
    }
    if (hasIndex && indices && g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[iOffset + i] = g.index.getX(i) + vOffset;
      }
      iOffset += g.index.count;
    }
    vOffset += count;
  }

  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (hasIndex && indices) {
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  return merged;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a flat ring mesh (XZ plane) at a given Y elevation. */
function makeRing(
  innerR: number,
  outerR: number,
  y: number,
  color: number,
  segments = 128,
): THREE.Mesh {
  const geo = new THREE.RingGeometry(innerR, outerR, segments);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color });
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
    const roadMesh = makeRing(roadInner, roadOuter, 0, ROAD_COLORS.asphalt, SEGS);
    this.group.add(roadMesh);

    // ── Bike lanes ────────────────────────────────────────────────────────
    // Inner bike lane: from roadInner - blw  to  roadInner
    const bikeInnerInner = roadInner - blw;
    const bikeInnerOuter = roadInner;
    const bikeInnerMesh = makeRing(bikeInnerInner, bikeInnerOuter, bikeElev, ROAD_COLORS.bikeLane, SEGS);
    this.group.add(bikeInnerMesh);

    // Outer bike lane: from roadOuter  to  roadOuter + blw
    const bikeOuterInner = roadOuter;
    const bikeOuterOuter = roadOuter + blw;
    const bikeOuterMesh = makeRing(bikeOuterInner, bikeOuterOuter, bikeElev, ROAD_COLORS.bikeLane, SEGS);
    this.group.add(bikeOuterMesh);

    // ── Sidewalks ─────────────────────────────────────────────────────────
    // Inner sidewalk: from bikeInnerInner - sww  to  bikeInnerInner
    const swInnerInner = bikeInnerInner - sww;
    const swInnerOuter = bikeInnerInner;
    const swInnerMesh = makeRing(swInnerInner, swInnerOuter, swElev, ROAD_COLORS.sidewalk, SEGS);
    this.group.add(swInnerMesh);

    // Outer sidewalk: from bikeOuterOuter  to  bikeOuterOuter + sww
    const swOuterInner = bikeOuterOuter;
    const swOuterOuter = bikeOuterOuter + sww;
    const swOuterMesh = makeRing(swOuterInner, swOuterOuter, swElev, ROAD_COLORS.sidewalk, SEGS);
    this.group.add(swOuterMesh);

    // ── Center divider line ───────────────────────────────────────────────
    const clw = FURNITURE.centerLineWidth; // 0.15
    const centerLineMesh = makeRing(R - clw / 2, R + clw / 2, MARKING_ELEVATION, ROAD_COLORS.centerLine, SEGS);
    this.group.add(centerLineMesh);

    // ── Dashed lane markings ──────────────────────────────────────────────
    // Lane dividers at  R ± laneWidth  (between lanes 1&2 on each side)
    const llw = FURNITURE.laneLineWidth;   // 0.1
    const dash = FURNITURE.laneLineDash;   // 3
    const gap = FURNITURE.laneLineGap;     // 5
    const laneMarkMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.laneLine });
    const ARC_SEGS = 4; // per-dash arc segments (thin slivers, 4 is enough)

    for (const offset of [-lw, lw]) {
      const markR = R + offset;
      const geo = buildDashedArcGeo(markR, llw / 2, dash, gap, ARC_SEGS);
      if (geo.attributes.position) {
        const mesh = new THREE.Mesh(geo, laneMarkMat);
        mesh.position.y = MARKING_ELEVATION;
        mesh.receiveShadow = true;
        this.group.add(mesh);
      }
    }

    scene.add(this.group);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dt: number): void {
    // Static road — no per-frame updates needed
  }
}
