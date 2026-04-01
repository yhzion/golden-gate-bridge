# Road System 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete road network (circular road, radial roads, pedestrian paths, coastal path, and road furniture) for the Golden Gate eco-tourism city 3D simulation.

**Architecture:** `RoadSystem` is the entry-point that owns 5 subsystem instances (`CircularRoad`, `RadialRoads`, `PedestrianPaths`, `CoastalPath`, `RoadFurniture`). Each subsystem follows the `build(scene)/update(dt)` pattern. All constants live in `src/roads/config.ts`. InstancedMesh is used for all repeated objects (trees, lights, benches, bollards). Curved paths use CatmullRomCurve3 + ExtrudeGeometry.

**Tech Stack:** Three.js, TypeScript, Vite

**Spec:** `docs/superpowers/specs/2026-04-01-road-system-3d-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/roads/config.ts` | All road dimensions, colors, and furniture spacing constants (`as const`) |
| `src/roads/CircularRoad.ts` | R=1500m circular road with 4 lanes, bike lanes, sidewalks, center line, lane markings |
| `src/roads/RadialRoads.ts` | 8 radial roads at 45deg intervals from R=500 to R=1500 |
| `src/roads/PedestrianPaths.ts` | Curved pedestrian paths inside the inner ring (R<500m) |
| `src/roads/CoastalPath.ts` | 6500m coastal boardwalk with 8 viewpoint decks and railings |
| `src/roads/RoadFurniture.ts` | InstancedMesh trees, streetlights, tram rails, benches, bollards |
| `src/roads/RoadSystem.ts` | Entry-point composing all 5 subsystems |

### Modified files

| File | Change |
|------|--------|
| `src/main.ts` | Import `RoadSystem`, call `build(scene)`, register `update(dt)` in game loop |

---

## Task 1: config.ts — Road Constants

**Files:**
- Create: `src/roads/config.ts`

- [ ] **Step 1: Create `src/roads/config.ts` with all constants from spec**

```typescript
// src/roads/config.ts

export const ROAD = {
  circularRadius: 1500,
  circularWidth: 22,
  laneWidth: 3.5,
  laneCount: 4,
  bikeLaneWidth: 2,
  sidewalkWidth: 2,
  sidewalkElevation: 0.15,
  bikeElevation: 0.05,
  radialCount: 8,
  radialWidth: 14,
  radialLaneWidth: 3.5,
  radialInnerR: 500,
  radialOuterR: 1500,
  pedestrianMainWidth: 4,
  pedestrianTrailWidth: 2.5,
  pedestrianElevation: 0.05,
  pedestrianPathCount: 8,
  coastalRadius: 1600,
  coastalWidth: 6,
  coastalElevation: 0.08,
  viewpointCount: 8,
  viewpointW: 10,
  viewpointD: 8,
} as const;

export const ROAD_COLORS = {
  asphalt: 0x333333,
  bikeLane: 0x2d6a4f,
  sidewalk: 0x888888,
  pedestrian: 0xc4a882,
  boardwalk: 0x8b6914,
  centerLine: 0xffd700,
  laneLine: 0xffffff,
  tramRail: 0xaaaaaa,
  bollard: 0xcccccc,
  railing: 0x999999,
  treeTrunk: 0x5c3a1e,
  treeCanopy: 0x2d6a4f,
  bench: 0x8b6914,
} as const;

export const FURNITURE = {
  treeSpacingCircular: 15,
  treeSpacingRadial: 20,
  treeHeight: 12,
  treeTrunkH: 4,
  treeTrunkR: 0.2,
  treeCanopyR: 4,
  smallTreeHeight: 10,
  smallTreeCanopyR: 3,
  lightSpacingCircular: 25,
  lightHeight: 6,
  lightPoleR: 0.08,
  lightGlobeR: 0.3,
  bollardSpacingCoastal: 15,
  bollardHeight: 1,
  bollardR: 0.075,
  benchSpacing: 50,
  benchW: 1.5,
  benchD: 0.5,
  benchH: 0.45,
  benchesPerViewpoint: 4,
  tramGauge: 1.435,
  tramRailWidth: 0.05,
  tramRailElevation: 0.02,
  laneLineWidth: 0.1,
  laneLineDash: 3,
  laneLineGap: 5,
  centerLineWidth: 0.15,
  railingHeight: 1.1,
  railingPostSpacing: 2,
  railingPostR: 0.03,
  railingWireR: 0.008,
} as const;

export const MARKING_ELEVATION = 0.01;
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/config.ts
git commit -m "feat(roads): add road system constants config"
```

---

## Task 2: CircularRoad — Outer Ring Road

**Files:**
- Create: `src/roads/CircularRoad.ts`

- [ ] **Step 1: Create CircularRoad class with build/update interface**

```typescript
// src/roads/CircularRoad.ts
import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE, MARKING_ELEVATION } from './config';

export class CircularRoad {
  private group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'CircularRoad';

    this.buildRoadSurface();
    this.buildBikeLanes();
    this.buildSidewalks();
    this.buildCenterLine();
    this.buildLaneMarkings();

    scene.add(this.group);
  }

  update(_dt: number): void {
    // Future expansion (e.g., traffic signals)
  }

  private buildRoadSurface(): void {
    // 4-lane road surface: inner radius = circularRadius - laneWidth*2, outer = circularRadius + laneWidth*2
    const halfRoad = ROAD.laneWidth * (ROAD.laneCount / 2);
    const innerR = ROAD.circularRadius - halfRoad;
    const outerR = ROAD.circularRadius + halfRoad;
    const geo = new THREE.RingGeometry(innerR, outerR, 128);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.asphalt,
      roughness: 0.9,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private buildBikeLanes(): void {
    const halfRoad = ROAD.laneWidth * (ROAD.laneCount / 2);

    // Outer bike lane
    const outerInner = ROAD.circularRadius + halfRoad;
    const outerOuter = outerInner + ROAD.bikeLaneWidth;
    const outerGeo = new THREE.RingGeometry(outerInner, outerOuter, 128);
    outerGeo.rotateX(-Math.PI / 2);

    // Inner bike lane
    const innerOuter = ROAD.circularRadius - halfRoad;
    const innerInner = innerOuter - ROAD.bikeLaneWidth;
    const innerGeo = new THREE.RingGeometry(innerInner, innerOuter, 128);
    innerGeo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.bikeLane,
      roughness: 0.85,
      metalness: 0.05,
    });

    const outerMesh = new THREE.Mesh(outerGeo, mat);
    outerMesh.position.y = ROAD.bikeElevation;
    outerMesh.receiveShadow = true;

    const innerMesh = new THREE.Mesh(innerGeo, mat);
    innerMesh.position.y = ROAD.bikeElevation;
    innerMesh.receiveShadow = true;

    this.group.add(outerMesh, innerMesh);
  }

  private buildSidewalks(): void {
    const halfRoad = ROAD.laneWidth * (ROAD.laneCount / 2);

    // Outer sidewalk (outside outer bike lane)
    const outerBikeEdge = ROAD.circularRadius + halfRoad + ROAD.bikeLaneWidth;
    const outerGeo = new THREE.RingGeometry(outerBikeEdge, outerBikeEdge + ROAD.sidewalkWidth, 128);
    outerGeo.rotateX(-Math.PI / 2);

    // Inner sidewalk (inside inner bike lane)
    const innerBikeEdge = ROAD.circularRadius - halfRoad - ROAD.bikeLaneWidth;
    const innerGeo = new THREE.RingGeometry(innerBikeEdge - ROAD.sidewalkWidth, innerBikeEdge, 128);
    innerGeo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.sidewalk,
      roughness: 0.95,
      metalness: 0.05,
    });

    const outerMesh = new THREE.Mesh(outerGeo, mat);
    outerMesh.position.y = ROAD.sidewalkElevation;
    outerMesh.receiveShadow = true;

    const innerMesh = new THREE.Mesh(innerGeo, mat);
    innerMesh.position.y = ROAD.sidewalkElevation;
    innerMesh.receiveShadow = true;

    this.group.add(outerMesh, innerMesh);
  }

  private buildCenterLine(): void {
    // Yellow center divider line at the midpoint (circularRadius)
    const innerR = ROAD.circularRadius - FURNITURE.centerLineWidth / 2;
    const outerR = ROAD.circularRadius + FURNITURE.centerLineWidth / 2;
    const geo = new THREE.RingGeometry(innerR, outerR, 128);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.centerLine,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = MARKING_ELEVATION;
    this.group.add(mesh);
  }

  private buildLaneMarkings(): void {
    // White dashed lane dividers between lanes (3 lines: at +-3.5m and +-7m offsets skipping center)
    // Lane boundaries relative to center: +-laneWidth/2 is center line (done above)
    // Remaining boundaries: at +-laneWidth from center (between lanes 1-2 and 3-4)
    const offsets = [
      ROAD.circularRadius - ROAD.laneWidth,  // between inner lanes
      ROAD.circularRadius + ROAD.laneWidth,  // between outer lanes
    ];

    const dashAngle = FURNITURE.laneLineDash / ROAD.circularRadius; // arc angle for 3m dash
    const gapAngle = FURNITURE.laneLineGap / ROAD.circularRadius;  // arc angle for 5m gap
    const totalAngle = dashAngle + gapAngle;
    const dashCount = Math.floor((2 * Math.PI) / totalAngle);

    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.laneLine,
      roughness: 0.7,
    });

    for (const r of offsets) {
      const halfW = FURNITURE.laneLineWidth / 2;
      // Create dashed ring by merging individual arc segments
      const geos: THREE.BufferGeometry[] = [];
      for (let i = 0; i < dashCount; i++) {
        const startAngle = i * totalAngle;
        const arcGeo = new THREE.RingGeometry(r - halfW, r + halfW, 4, 1, startAngle, dashAngle);
        arcGeo.rotateX(-Math.PI / 2);
        geos.push(arcGeo);
      }
      // Merge all dash geometries into one
      const merged = mergeGeometries(geos);
      if (merged) {
        const mesh = new THREE.Mesh(merged, mat);
        mesh.position.y = MARKING_ELEVATION;
        this.group.add(mesh);
        // Dispose individual geometries
        for (const g of geos) g.dispose();
      }
    }
  }
}

// Utility: merge array of BufferGeometries into one
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;

  let totalVerts = 0;
  let totalIdx = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIdx);
  let vertOffset = 0;
  let idxOffset = 0;

  for (const g of geos) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    positions.set(new Float32Array(pos.array), vertOffset * 3);
    if (norm) normals.set(new Float32Array(norm.array), vertOffset * 3);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[idxOffset + i] = g.index.getX(i) + vertOffset;
      }
      idxOffset += g.index.count;
    }
    vertOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/CircularRoad.ts
git commit -m "feat(roads): add CircularRoad with lanes, bike lanes, sidewalks, markings"
```

---

## Task 3: RadialRoads — 8 Radial Streets

**Files:**
- Create: `src/roads/RadialRoads.ts`

- [ ] **Step 1: Create RadialRoads class**

```typescript
// src/roads/RadialRoads.ts
import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE, MARKING_ELEVATION } from './config';

export class RadialRoads {
  private group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'RadialRoads';

    for (let i = 0; i < ROAD.radialCount; i++) {
      const angle = (i * Math.PI * 2) / ROAD.radialCount; // 45deg intervals
      this.buildRadialRoad(angle);
    }

    scene.add(this.group);
  }

  update(_dt: number): void {}

  private buildRadialRoad(angle: number): void {
    const length = ROAD.radialOuterR - ROAD.radialInnerR; // 1000m
    const halfWidth = ROAD.radialWidth / 2; // 7m

    // Main road surface (full width including bike+sidewalk areas)
    const roadGeo = new THREE.PlaneGeometry(ROAD.radialWidth, length);
    roadGeo.rotateX(-Math.PI / 2);

    // Position at midpoint between inner and outer radius
    const midR = (ROAD.radialInnerR + ROAD.radialOuterR) / 2;

    const roadMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.asphalt,
      roughness: 0.9,
      metalness: 0.1,
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;

    // Vehicle lanes: center 7m (2 lanes x 3.5m)
    // Bike+sidewalk strips on each side: 3.5m each
    // Build sidewalk+bike overlays on top
    const sideWidth = (ROAD.radialWidth - ROAD.radialLaneWidth * 2) / 2; // 3.5m per side

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.sidewalk,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Left sidewalk+bike strip
    const leftGeo = new THREE.PlaneGeometry(sideWidth, length);
    leftGeo.rotateX(-Math.PI / 2);
    const leftMesh = new THREE.Mesh(leftGeo, sidewalkMat);
    leftMesh.position.set(-(ROAD.radialLaneWidth + sideWidth / 2), ROAD.sidewalkElevation, 0);
    leftMesh.receiveShadow = true;

    // Right sidewalk+bike strip
    const rightGeo = new THREE.PlaneGeometry(sideWidth, length);
    rightGeo.rotateX(-Math.PI / 2);
    const rightMesh = new THREE.Mesh(rightGeo, sidewalkMat);
    rightMesh.position.set(ROAD.radialLaneWidth + sideWidth / 2, ROAD.sidewalkElevation, 0);
    rightMesh.receiveShadow = true;

    // Center line (yellow)
    const centerGeo = new THREE.PlaneGeometry(FURNITURE.centerLineWidth, length);
    centerGeo.rotateX(-Math.PI / 2);
    const centerMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.centerLine,
      roughness: 0.7,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.y = MARKING_ELEVATION;

    // Group everything, rotate and translate
    const roadGroup = new THREE.Group();
    roadGroup.add(roadMesh, leftMesh, rightMesh, centerMesh);

    // Position: translate to midpoint along angle direction, then rotate
    roadGroup.position.set(
      Math.cos(angle) * midR,
      0,
      Math.sin(angle) * midR,
    );
    roadGroup.rotation.y = -angle + Math.PI / 2;

    this.group.add(roadGroup);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/RadialRoads.ts
git commit -m "feat(roads): add 8 radial roads at 45deg intervals"
```

---

## Task 4: PedestrianPaths — Inner Ring Curved Paths

**Files:**
- Create: `src/roads/PedestrianPaths.ts`

- [ ] **Step 1: Create PedestrianPaths class with curved paths using CatmullRomCurve3**

```typescript
// src/roads/PedestrianPaths.ts
import * as THREE from 'three';
import { ROAD, ROAD_COLORS } from './config';

export class PedestrianPaths {
  private group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'PedestrianPaths';

    // Inner ring concentric path at R=250m
    this.buildRingPath(250, ROAD.pedestrianMainWidth);

    // Curved radial paths from center outward (8 paths, organic curves)
    for (let i = 0; i < ROAD.pedestrianPathCount; i++) {
      const baseAngle = (i * Math.PI * 2) / ROAD.pedestrianPathCount;
      // Offset by 22.5deg from radial roads so paths don't overlap
      const angle = baseAngle + Math.PI / ROAD.pedestrianPathCount;
      this.buildCurvedPath(angle);
    }

    scene.add(this.group);
  }

  update(_dt: number): void {}

  private buildRingPath(radius: number, width: number): void {
    const innerR = radius - width / 2;
    const outerR = radius + width / 2;
    const geo = new THREE.RingGeometry(innerR, outerR, 96);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.pedestrian,
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = ROAD.pedestrianElevation;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private buildCurvedPath(angle: number): void {
    // Create organic curved path from ~50m to ~480m (inner ring boundary)
    const startR = 50;
    const endR = 480;
    const points: THREE.Vector3[] = [];
    const segments = 8;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const r = startR + (endR - startR) * t;
      // Add gentle sinusoidal curve offset for organic feel
      const angleOffset = Math.sin(t * Math.PI * 2) * 0.08;
      const a = angle + angleOffset;
      points.push(new THREE.Vector3(
        Math.cos(a) * r,
        ROAD.pedestrianElevation,
        Math.sin(a) * r,
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points);

    // Create path shape (cross-section)
    const halfW = ROAD.pedestrianTrailWidth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(halfW, 0.03); // slight thickness
    shape.lineTo(-halfW, 0.03);
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 60,
      extrudePath: curve,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.pedestrian,
      roughness: 0.85,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/PedestrianPaths.ts
git commit -m "feat(roads): add curved pedestrian paths in inner ring"
```

---

## Task 5: CoastalPath — Boardwalk with Viewpoint Decks

**Files:**
- Create: `src/roads/CoastalPath.ts`

- [ ] **Step 1: Create CoastalPath class with boardwalk, viewpoints, and railings**

```typescript
// src/roads/CoastalPath.ts
import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE } from './config';

export class CoastalPath {
  private group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'CoastalPath';

    this.buildBoardwalk();
    this.buildViewpointDecks();
    this.buildRailings();

    scene.add(this.group);
  }

  update(_dt: number): void {}

  private buildBoardwalk(): void {
    // Coastal path runs as a circle at R=coastalRadius (just outside the circular road)
    const halfW = ROAD.coastalWidth / 2;
    const innerR = ROAD.coastalRadius - halfW;
    const outerR = ROAD.coastalRadius + halfW;

    const geo = new THREE.RingGeometry(innerR, outerR, 128);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.boardwalk,
      roughness: 0.8,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = ROAD.coastalElevation;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private buildViewpointDecks(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.boardwalk,
      roughness: 0.75,
      metalness: 0.1,
    });

    const deckGeo = new THREE.BoxGeometry(ROAD.viewpointW, 0.1, ROAD.viewpointD);

    for (let i = 0; i < ROAD.viewpointCount; i++) {
      const angle = (i * Math.PI * 2) / ROAD.viewpointCount;
      const deckMesh = new THREE.Mesh(deckGeo, mat);

      // Position deck extending outward from coastal path
      const deckR = ROAD.coastalRadius + ROAD.coastalWidth / 2 + ROAD.viewpointD / 2;
      deckMesh.position.set(
        Math.cos(angle) * deckR,
        ROAD.coastalElevation,
        Math.sin(angle) * deckR,
      );
      deckMesh.rotation.y = -angle;
      deckMesh.receiveShadow = true;
      this.group.add(deckMesh);
    }
  }

  private buildRailings(): void {
    // Railing posts along the outer edge of the boardwalk using InstancedMesh
    const circumference = 2 * Math.PI * ROAD.coastalRadius;
    const postCount = Math.floor(circumference / FURNITURE.railingPostSpacing);

    const postGeo = new THREE.CylinderGeometry(
      FURNITURE.railingPostR, FURNITURE.railingPostR,
      FURNITURE.railingHeight, 6,
    );
    const postMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.railing,
      roughness: 0.3,
      metalness: 0.8,
    });

    const postMesh = new THREE.InstancedMesh(postGeo, postMat, postCount);
    postMesh.castShadow = true;

    const mat4 = new THREE.Matrix4();
    const outerEdge = ROAD.coastalRadius + ROAD.coastalWidth / 2;

    for (let i = 0; i < postCount; i++) {
      const angle = (i / postCount) * Math.PI * 2;
      mat4.makeTranslation(
        Math.cos(angle) * outerEdge,
        ROAD.coastalElevation + FURNITURE.railingHeight / 2,
        Math.sin(angle) * outerEdge,
      );
      postMesh.setMatrixAt(i, mat4);
    }
    postMesh.instanceMatrix.needsUpdate = true;

    this.group.add(postMesh);

    // Top wire rail (thin ring)
    const wireGeo = new THREE.TorusGeometry(
      outerEdge, FURNITURE.railingWireR, 6, 256,
    );
    const wireMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.railing,
      roughness: 0.3,
      metalness: 0.8,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.y = ROAD.coastalElevation + FURNITURE.railingHeight;
    this.group.add(wireMesh);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/CoastalPath.ts
git commit -m "feat(roads): add coastal boardwalk with viewpoint decks and railings"
```

---

## Task 6: RoadFurniture — Trees, Lights, Tram Rails, Benches, Bollards

**Files:**
- Create: `src/roads/RoadFurniture.ts`

- [ ] **Step 1: Create RoadFurniture class scaffold with build method orchestrating all sub-builders**

```typescript
// src/roads/RoadFurniture.ts
import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE, MARKING_ELEVATION } from './config';

export class RoadFurniture {
  private group = new THREE.Group();

  build(scene: THREE.Scene): void {
    this.group.name = 'RoadFurniture';

    this.buildStreetTrees();
    this.buildStreetLights();
    this.buildTramRails();
    this.buildBenches();
    this.buildBollards();

    scene.add(this.group);
  }

  update(_dt: number): void {}

  // --- Street Trees (InstancedMesh) ---

  private buildStreetTrees(): void {
    // Trees along circular road outer sidewalk, both sides
    const outerSidewalkR = ROAD.circularRadius + ROAD.laneWidth * 2 + ROAD.bikeLaneWidth + ROAD.sidewalkWidth - 0.5;
    const innerSidewalkR = ROAD.circularRadius - ROAD.laneWidth * 2 - ROAD.bikeLaneWidth - ROAD.sidewalkWidth + 0.5;

    const circumference = 2 * Math.PI * ROAD.circularRadius;
    const treesPerSide = Math.floor(circumference / FURNITURE.treeSpacingCircular);
    const totalCircularTrees = treesPerSide * 2;

    // Trees along radial roads
    const radialLength = ROAD.radialOuterR - ROAD.radialInnerR;
    const treesPerRadialSide = Math.floor(radialLength / FURNITURE.treeSpacingRadial);
    const totalRadialTrees = treesPerRadialSide * 2 * ROAD.radialCount;

    const totalTrees = totalCircularTrees + totalRadialTrees;

    // Trunk InstancedMesh
    const trunkGeo = new THREE.CylinderGeometry(
      FURNITURE.treeTrunkR, FURNITURE.treeTrunkR * 1.3,
      FURNITURE.treeTrunkH, 6,
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.treeTrunk,
      roughness: 0.9,
    });
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, totalTrees);
    trunkMesh.castShadow = true;

    // Canopy InstancedMesh
    const canopyGeo = new THREE.IcosahedronGeometry(FURNITURE.treeCanopyR, 1);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.treeCanopy,
      roughness: 0.8,
    });
    const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, totalTrees);
    canopyMesh.castShadow = true;

    const mat4 = new THREE.Matrix4();
    let idx = 0;

    // Circular road trees
    for (let side = 0; side < 2; side++) {
      const r = side === 0 ? outerSidewalkR : innerSidewalkR;
      for (let i = 0; i < treesPerSide; i++) {
        const angle = (i / treesPerSide) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        // Trunk
        mat4.makeTranslation(x, FURNITURE.treeTrunkH / 2, z);
        trunkMesh.setMatrixAt(idx, mat4);

        // Canopy
        mat4.makeTranslation(x, FURNITURE.treeTrunkH + FURNITURE.treeCanopyR * 0.8, z);
        canopyMesh.setMatrixAt(idx, mat4);

        idx++;
      }
    }

    // Radial road trees
    for (let r = 0; r < ROAD.radialCount; r++) {
      const angle = (r * Math.PI * 2) / ROAD.radialCount;
      const perpAngle = angle + Math.PI / 2;
      const offset = ROAD.radialWidth / 2 - 0.5; // inside sidewalk edge

      for (let side = 0; side < 2; side++) {
        const sideSign = side === 0 ? 1 : -1;
        for (let i = 0; i < treesPerRadialSide; i++) {
          const dist = ROAD.radialInnerR + i * FURNITURE.treeSpacingRadial;
          const x = Math.cos(angle) * dist + Math.cos(perpAngle) * offset * sideSign;
          const z = Math.sin(angle) * dist + Math.sin(perpAngle) * offset * sideSign;

          mat4.makeTranslation(x, FURNITURE.treeTrunkH / 2, z);
          trunkMesh.setMatrixAt(idx, mat4);

          mat4.makeTranslation(x, FURNITURE.treeTrunkH + FURNITURE.smallTreeCanopyR * 0.8, z);
          canopyMesh.setMatrixAt(idx, mat4);

          idx++;
        }
      }
    }

    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    this.group.add(trunkMesh, canopyMesh);
  }

  // --- Street Lights (InstancedMesh) ---

  private buildStreetLights(): void {
    const circumference = 2 * Math.PI * ROAD.circularRadius;
    const lightsPerSide = Math.floor(circumference / FURNITURE.lightSpacingCircular);
    const totalLights = lightsPerSide * 2; // both sides of circular road

    // Pole
    const poleGeo = new THREE.CylinderGeometry(
      FURNITURE.lightPoleR, FURNITURE.lightPoleR * 1.5,
      FURNITURE.lightHeight, 6,
    );
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.7,
    });
    const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, totalLights);

    // Globe (emissive)
    const globeGeo = new THREE.SphereGeometry(FURNITURE.lightGlobeR, 8, 8);
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const globeMesh = new THREE.InstancedMesh(globeGeo, globeMat, totalLights);

    const mat4 = new THREE.Matrix4();
    let idx = 0;

    const outerEdge = ROAD.circularRadius + ROAD.laneWidth * 2 + ROAD.bikeLaneWidth + 1;
    const innerEdge = ROAD.circularRadius - ROAD.laneWidth * 2 - ROAD.bikeLaneWidth - 1;

    for (let side = 0; side < 2; side++) {
      const r = side === 0 ? outerEdge : innerEdge;
      for (let i = 0; i < lightsPerSide; i++) {
        const angle = (i / lightsPerSide) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        mat4.makeTranslation(x, FURNITURE.lightHeight / 2, z);
        poleMesh.setMatrixAt(idx, mat4);

        mat4.makeTranslation(x, FURNITURE.lightHeight + FURNITURE.lightGlobeR, z);
        globeMesh.setMatrixAt(idx, mat4);

        idx++;
      }
    }

    poleMesh.instanceMatrix.needsUpdate = true;
    globeMesh.instanceMatrix.needsUpdate = true;
    this.group.add(poleMesh, globeMesh);
  }

  // --- Tram Rails ---

  private buildTramRails(): void {
    // Two rails along the outer lane of the circular road, standard gauge 1.435m apart
    const railR = ROAD.circularRadius + ROAD.laneWidth * 1.5; // outer lane center
    const halfGauge = FURNITURE.tramGauge / 2;

    const railMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.tramRail,
      roughness: 0.3,
      metalness: 0.85,
    });

    for (const sign of [-1, 1]) {
      const r = railR + halfGauge * sign;
      const halfW = FURNITURE.tramRailWidth / 2;
      const geo = new THREE.RingGeometry(r - halfW, r + halfW, 128);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, railMat);
      mesh.position.y = FURNITURE.tramRailElevation;
      this.group.add(mesh);
    }
  }

  // --- Benches (InstancedMesh) ---

  private buildBenches(): void {
    // Benches along coastal path + viewpoint deck benches
    const coastalCircumference = 2 * Math.PI * ROAD.coastalRadius;
    const coastalBenches = Math.floor(coastalCircumference / FURNITURE.benchSpacing);
    const viewpointBenches = ROAD.viewpointCount * FURNITURE.benchesPerViewpoint;
    const totalBenches = coastalBenches + viewpointBenches;

    const benchGeo = new THREE.BoxGeometry(FURNITURE.benchW, FURNITURE.benchH, FURNITURE.benchD);
    const benchMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.bench,
      roughness: 0.8,
      metalness: 0.1,
    });
    const benchMesh = new THREE.InstancedMesh(benchGeo, benchMat, totalBenches);
    benchMesh.castShadow = true;

    const mat4 = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    let idx = 0;

    // Coastal path benches (inner edge of boardwalk)
    const benchR = ROAD.coastalRadius - ROAD.coastalWidth / 2 + 1;
    for (let i = 0; i < coastalBenches; i++) {
      const angle = (i / coastalBenches) * Math.PI * 2;
      const pos = new THREE.Vector3(
        Math.cos(angle) * benchR,
        ROAD.coastalElevation + FURNITURE.benchH / 2,
        Math.sin(angle) * benchR,
      );
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      mat4.compose(pos, quat, scale);
      benchMesh.setMatrixAt(idx++, mat4);
    }

    // Viewpoint deck benches (4 per deck, arranged in pairs)
    for (let v = 0; v < ROAD.viewpointCount; v++) {
      const vAngle = (v * Math.PI * 2) / ROAD.viewpointCount;
      const deckR = ROAD.coastalRadius + ROAD.coastalWidth / 2 + ROAD.viewpointD / 2;
      const deckX = Math.cos(vAngle) * deckR;
      const deckZ = Math.sin(vAngle) * deckR;
      const perpAngle = vAngle + Math.PI / 2;

      for (let b = 0; b < FURNITURE.benchesPerViewpoint; b++) {
        const bx = (b < 2 ? -1 : 1) * 2; // left/right pairs
        const bz = (b % 2 === 0 ? -1 : 1) * 1.5; // front/back
        const pos = new THREE.Vector3(
          deckX + Math.cos(vAngle) * bz + Math.cos(perpAngle) * bx,
          ROAD.coastalElevation + FURNITURE.benchH / 2,
          deckZ + Math.sin(vAngle) * bz + Math.sin(perpAngle) * bx,
        );
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -vAngle);
        mat4.compose(pos, quat, scale);
        benchMesh.setMatrixAt(idx++, mat4);
      }
    }

    benchMesh.instanceMatrix.needsUpdate = true;
    this.group.add(benchMesh);
  }

  // --- Bollards (InstancedMesh) ---

  private buildBollards(): void {
    // Bollards at inner ring entry points (8 radial road entrances, ~8 bollards per entrance)
    const bollardsPerEntry = 5; // across the road width at 1.5m spacing
    const totalBollards = ROAD.radialCount * bollardsPerEntry;

    const bollardGeo = new THREE.CylinderGeometry(
      FURNITURE.bollardR, FURNITURE.bollardR,
      FURNITURE.bollardHeight, 8,
    );
    const bollardMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.bollard,
      roughness: 0.3,
      metalness: 0.8,
    });
    const bollardMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, totalBollards);

    const mat4 = new THREE.Matrix4();
    let idx = 0;

    for (let r = 0; r < ROAD.radialCount; r++) {
      const angle = (r * Math.PI * 2) / ROAD.radialCount;
      const perpAngle = angle + Math.PI / 2;
      const entryR = ROAD.radialInnerR; // at inner ring boundary

      for (let b = 0; b < bollardsPerEntry; b++) {
        const offset = (b - (bollardsPerEntry - 1) / 2) * 1.5;
        const x = Math.cos(angle) * entryR + Math.cos(perpAngle) * offset;
        const z = Math.sin(angle) * entryR + Math.sin(perpAngle) * offset;

        mat4.makeTranslation(x, FURNITURE.bollardHeight / 2, z);
        bollardMesh.setMatrixAt(idx++, mat4);
      }
    }

    bollardMesh.instanceMatrix.needsUpdate = true;
    this.group.add(bollardMesh);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/RoadFurniture.ts
git commit -m "feat(roads): add road furniture — trees, lights, tram rails, benches, bollards"
```

---

## Task 7: RoadSystem — Entry Point Composing All Modules

**Files:**
- Create: `src/roads/RoadSystem.ts`

- [ ] **Step 1: Create RoadSystem class that orchestrates all subsystems**

```typescript
// src/roads/RoadSystem.ts
import * as THREE from 'three';
import { CircularRoad } from './CircularRoad';
import { RadialRoads } from './RadialRoads';
import { PedestrianPaths } from './PedestrianPaths';
import { CoastalPath } from './CoastalPath';
import { RoadFurniture } from './RoadFurniture';

export class RoadSystem {
  private circular = new CircularRoad();
  private radials = new RadialRoads();
  private pedestrian = new PedestrianPaths();
  private coastal = new CoastalPath();
  private furniture = new RoadFurniture();

  build(scene: THREE.Scene): void {
    this.circular.build(scene);
    this.radials.build(scene);
    this.pedestrian.build(scene);
    this.coastal.build(scene);
    this.furniture.build(scene);
  }

  update(dt: number): void {
    this.circular.update(dt);
    this.radials.update(dt);
    this.pedestrian.update(dt);
    this.coastal.update(dt);
    this.furniture.update(dt);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/roads/RoadSystem.ts
git commit -m "feat(roads): add RoadSystem entry point composing all road modules"
```

---

## Task 8: main.ts Integration

**Files:**
- Modify: `src/main.ts:14-15` (add import), `src/main.ts:51-53` (add build/update)

- [ ] **Step 1: Add RoadSystem import to main.ts**

Add after the `BirdSystem` import (line 16):

```typescript
import { RoadSystem } from '@/roads/RoadSystem';
```

- [ ] **Step 2: Instantiate and build RoadSystem in init()**

Add after the `birds.build(sm.scene)` call (after line 58), before the progress bar update:

```typescript
  const roads = new RoadSystem();
  roads.build(sm.scene);
```

- [ ] **Step 3: Register RoadSystem update in the game loop**

Add inside the `loop.register` callback, after `birds.update(dt, elapsed)` (after line 143):

```typescript
    roads.update(dt);
```

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate RoadSystem into main scene and game loop"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] CircularRoad: R=1500m, 4 lanes, bike lanes, sidewalks, center line, lane markings — Task 2
- [x] RadialRoads: 8 roads at 45deg, from R=500 to R=1500, 14m wide — Task 3
- [x] PedestrianPaths: curved paths inside R=500, CatmullRomCurve3 — Task 4
- [x] CoastalPath: boardwalk at R=1600, 8 viewpoint decks, railings — Task 5
- [x] RoadFurniture: trees, streetlights, tram rails, benches, bollards — Task 6
- [x] config.ts: all constants — Task 1
- [x] RoadSystem entry point — Task 7
- [x] main.ts integration — Task 8

**Placeholder scan:** No TBD, TODO, or "implement later" found.

**Type consistency:** All types, method names, and imports are consistent across tasks. `build(scene)/update(dt)` pattern uniform.
