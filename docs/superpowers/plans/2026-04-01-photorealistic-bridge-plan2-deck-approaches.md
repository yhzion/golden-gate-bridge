# Photorealistic Bridge Plan 2: Deck & Approaches Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 12 remaining structural parts — Deck system (D1–D7) and Approaches (A1–A5) — completing the bridge geometry.

**Architecture:** Each part follows the established `BaseBridgePart` pattern with `buildGeometry()` and `applyMaterials()`. Parts are registered in `BridgeAssembler.build()`. The deck spans from z=-343 (south) to z=1280+343 (north) at y=BRIDGE.deckH (67). Approaches connect to terrain.

**Tech Stack:** Three.js r183, TypeScript, ExtrudeGeometry with I-beam/L-angle profiles, InstancedMesh for repetitive elements.

---

## File Structure

### New files to create

```
src/landmarks/bridge/deck/
  StiffeningTruss.ts     # D1 — Warren truss chords + diagonals
  FloorSystem.ts         # D2 — I-beam floor beams + stringers
  RoadSurface.ts         # D3 — Crowned deck + median barrier
  SidewalkRailing.ts     # D4 — Art Deco railing + sidewalks
  LightStandards.ts      # D5 — Art Deco lamp posts
  DrainageUtilities.ts   # D6 — Scuppers + conduits
  ExpansionJoints.ts     # D7 — Finger joints at towers

src/landmarks/bridge/approaches/
  FortPointArch.ts       # A1 — Lattice truss arch
  SFAnchorage.ts         # A2 — South anchorage facade
  MarinAnchorage.ts      # A3 — North anchorage in hillside
  TollPlaza.ts           # A4 — Open-road tolling gantries
  ApproachViaducts.ts    # A5 — Concrete approach spans

src/world/textures/
  AsphaltPBR.ts          # Asphalt texture generator
```

### Files to modify

```
src/config/bridge.ts                       # Add APPROACH constants
src/landmarks/bridge/BridgeAssembler.ts    # Register D1–D7 + A1–A5
```

---

## Task 1: Add APPROACH Config Constants

**Files:**
- Modify: `src/config/bridge.ts`

- [ ] **Step 1: Add APPROACH constant block**

```typescript
export const APPROACH = {
  // Fort Point Arch (A1)
  archSpan: 52,         // meters — clear span over Fort Point
  archRise: 15,         // meters — rise of arch
  archTubeR: 0.6,       // meters — chord tube radius
  archBraceR: 0.2,      // meters — brace tube radius
  archBracePairs: 8,    // number of X-brace pairs

  // Anchorages (A2, A3)
  sfAncW: 28,           // meters — SF anchorage width
  sfAncH: 20,           // meters — SF anchorage height
  sfAncD: 40,           // meters — SF anchorage depth
  sfAncSteps: 4,        // number of stepped tiers
  marinAncW: 20,
  marinAncH: 14,
  marinAncD: 30,

  // Toll Plaza (A4)
  gantryW: 30,          // meters — gantry span
  gantryH: 6,           // meters — gantry height above road
  gantryCount: 3,       // number of gantries

  // Approach Viaducts (A5)
  sfViaductLen: 343,    // meters — south approach total length
  marinViaductLen: 343, // meters — north approach total length
  viaductSpanLen: 30,   // meters — individual span length
  viaductColW: 1.5,     // meters — column width
  viaductColD: 2.0,     // meters — column depth
} as const;
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/config/bridge.ts
git commit -m "feat(config): add APPROACH constants for deck & approach parts"
```

---

## Task 2: AsphaltPBR Texture Generator

**Files:**
- Create: `src/world/textures/AsphaltPBR.ts`

- [ ] **Step 1: Create AsphaltPBR.ts**

```typescript
import * as THREE from 'three';

export interface AsphaltTextureSet {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function generateAsphaltTextures(size = 1024): AsphaltTextureSet {
  // Color map: dark grey (#2a2a2a) with tire track wear patterns
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = size;
  const cc = colorCanvas.getContext('2d')!;

  // Base dark grey
  cc.fillStyle = '#2a2a2a';
  cc.fillRect(0, 0, size, size);

  // Aggregate speckle variation
  for (let i = 0; i < size * 4; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const val = 30 + Math.random() * 25;
    cc.fillStyle = `rgb(${val},${val},${val})`;
    cc.fillRect(x, y, 2, 2);
  }

  // Tire track wear (lighter strips in wheel paths)
  cc.globalAlpha = 0.15;
  cc.fillStyle = '#3a3a3a';
  // Left wheel path
  cc.fillRect(size * 0.25, 0, size * 0.08, size);
  // Right wheel path
  cc.fillRect(size * 0.67, 0, size * 0.08, size);
  cc.globalAlpha = 1.0;

  // Patch repairs (darker rectangles)
  for (let i = 0; i < 3; i++) {
    const px = Math.random() * size * 0.8;
    const py = Math.random() * size * 0.8;
    cc.fillStyle = '#1e1e1e';
    cc.fillRect(px, py, 40 + Math.random() * 60, 30 + Math.random() * 50);
  }

  // Normal map: aggregate bumps + thermal cracks
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = size;
  const nc = normalCanvas.getContext('2d')!;
  nc.fillStyle = '#8080ff';
  nc.fillRect(0, 0, size, size);

  // Aggregate bump noise
  for (let i = 0; i < size * 2; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const nx = 128 + (Math.random() - 0.5) * 40;
    const ny = 128 + (Math.random() - 0.5) * 40;
    nc.fillStyle = `rgb(${nx},${ny},255)`;
    nc.fillRect(x, y, 3, 3);
  }

  // Thermal cracks (thin dark lines in normal map)
  nc.strokeStyle = '#6070ff';
  nc.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    nc.beginPath();
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    nc.moveTo(sx, sy);
    for (let j = 0; j < 4; j++) {
      nc.lineTo(
        sx + (Math.random() - 0.5) * 120,
        sy + j * 30 + Math.random() * 20,
      );
    }
    nc.stroke();
  }

  // Roughness map: 0.85-0.95 base, smoother in wheel paths
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughCanvas.height = size;
  const rc = roughCanvas.getContext('2d')!;
  // High roughness base (~0.9 = 230/255)
  rc.fillStyle = '#e6e6e6';
  rc.fillRect(0, 0, size, size);

  // Smoother in wheel paths (~0.82)
  rc.fillStyle = '#d0d0d0';
  rc.fillRect(size * 0.25, 0, size * 0.08, size);
  rc.fillRect(size * 0.67, 0, size * 0.08, size);

  // Random roughness variation
  for (let i = 0; i < size; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 210 + Math.random() * 40;
    rc.fillStyle = `rgb(${v},${v},${v})`;
    rc.fillRect(x, y, 4, 4);
  }

  const wrap = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return {
    colorMap: wrap(colorCanvas),
    normalMap: wrap(normalCanvas),
    roughnessMap: wrap(roughCanvas),
  };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/world/textures/AsphaltPBR.ts
git commit -m "feat(S2): add AsphaltPBR procedural texture generator"
```

---

## Task 3: D1 — Stiffening Truss

Warren truss with I-section top/bottom chords and L-angle diagonals. Runs the full bridge length on both sides of the deck.

**Files:**
- Create: `src/landmarks/bridge/deck/StiffeningTruss.ts`

- [ ] **Step 1: Create StiffeningTruss.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';
import { createIBeamShape } from '@/world/profiles/IBeamProfile';
import { createLAngleShape } from '@/world/profiles/LAngleProfile';

/**
 * D1 — Stiffening Truss
 * Warren truss on both sides of the deck, spanning from
 * z = -sideSpan to z = mainSpan + sideSpan.
 * Top chord at y = deckH, bottom chord at y = deckH - trussH.
 * Panels are panelLen (7.6m) wide with alternating diagonals.
 */
export class StiffeningTruss extends BaseBridgePart {
  constructor() {
    super('StiffeningTruss');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const panelCount = Math.ceil(totalLen / DECK.panelLen);
    const sides = [-BRIDGE.deckW / 2, BRIDGE.deckW / 2];

    // Chord cross-section: I-beam
    const chordShape = createIBeamShape(0.4, 0.5, 0.08, 0.1);
    const chordOpts: THREE.ExtrudeGeometryOptions = { depth: totalLen, bevelEnabled: false };
    const chordGeo = new THREE.ExtrudeGeometry(chordShape, chordOpts);
    chordGeo.rotateX(-Math.PI / 2);
    chordGeo.rotateY(Math.PI / 2);

    for (const sideX of sides) {
      // Top chord
      const topChord = new THREE.Mesh(chordGeo);
      topChord.position.set(sideX, BRIDGE.deckH, startZ);
      topChord.castShadow = true;
      this.group.add(topChord);

      // Bottom chord
      const botChord = new THREE.Mesh(chordGeo);
      botChord.position.set(sideX, BRIDGE.deckH - DECK.trussH, startZ);
      botChord.castShadow = true;
      this.group.add(botChord);
    }

    // Diagonals via InstancedMesh
    const diagLen = Math.sqrt(DECK.panelLen ** 2 + DECK.trussH ** 2);
    const diagAngle = Math.atan2(DECK.trussH, DECK.panelLen);
    const diagShape = createLAngleShape(0.2, 0.2, 0.025);
    const diagOpts: THREE.ExtrudeGeometryOptions = { depth: diagLen, bevelEnabled: false };
    const diagGeo = new THREE.ExtrudeGeometry(diagShape, diagOpts);

    // 2 sides × panelCount diagonals
    const diagCount = sides.length * panelCount;
    const diagMesh = new THREE.InstancedMesh(diagGeo, undefined!, diagCount);
    diagMesh.castShadow = true;

    const mat = new THREE.Matrix4();
    let idx = 0;
    for (const sideX of sides) {
      for (let i = 0; i < panelCount; i++) {
        const z = startZ + i * DECK.panelLen;
        const ascending = i % 2 === 0;
        mat.identity();

        if (ascending) {
          // Bottom-left to top-right
          mat.makeRotationX(-diagAngle);
          mat.setPosition(sideX, BRIDGE.deckH - DECK.trussH, z);
        } else {
          // Top-left to bottom-right
          mat.makeRotationX(diagAngle);
          mat.setPosition(sideX, BRIDGE.deckH, z);
        }
        diagMesh.setMatrixAt(idx++, mat);
      }
    }
    diagMesh.instanceMatrix.needsUpdate = true;
    this.group.add(diagMesh);

    // Verticals at each panel point (InstancedMesh)
    const vertGeo = new THREE.BoxGeometry(DECK.trussThick, DECK.trussH, DECK.trussThick);
    const vertCount = sides.length * (panelCount + 1);
    const vertMesh = new THREE.InstancedMesh(vertGeo, undefined!, vertCount);
    vertMesh.castShadow = true;

    idx = 0;
    for (const sideX of sides) {
      for (let i = 0; i <= panelCount; i++) {
        const z = startZ + i * DECK.panelLen;
        mat.identity();
        mat.setPosition(sideX, BRIDGE.deckH - DECK.trussH / 2, z);
        vertMesh.setMatrixAt(idx++, mat);
      }
    }
    vertMesh.instanceMatrix.needsUpdate = true;
    this.group.add(vertMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/deck/StiffeningTruss.ts
git commit -m "feat(D1): add StiffeningTruss with Warren pattern"
```

---

## Task 4: D2 — Floor System

I-beam floor beams spanning between trusses at each panel point, plus longitudinal stringers.

**Files:**
- Create: `src/landmarks/bridge/deck/FloorSystem.ts`

- [ ] **Step 1: Create FloorSystem.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';
import { createIBeamShape } from '@/world/profiles/IBeamProfile';

/**
 * D2 — Floor System
 * Transverse I-beam floor beams at each panel point (every 7.6m),
 * plus longitudinal stringers between them.
 */
export class FloorSystem extends BaseBridgePart {
  constructor() {
    super('FloorSystem');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const panelCount = Math.ceil(totalLen / DECK.panelLen);

    // Floor beam cross-section
    const beamShape = createIBeamShape(
      0.4, DECK.floorBeamH, DECK.floorBeamWebT, DECK.floorBeamFlangeT,
    );
    const beamOpts: THREE.ExtrudeGeometryOptions = {
      depth: BRIDGE.deckW,
      bevelEnabled: false,
    };
    const beamGeo = new THREE.ExtrudeGeometry(beamShape, beamOpts);
    // Extrude along X (deck width direction)
    beamGeo.rotateY(Math.PI / 2);
    beamGeo.translate(-BRIDGE.deckW / 2, 0, 0);

    // Floor beams via InstancedMesh
    const beamCount = panelCount + 1;
    const beamMesh = new THREE.InstancedMesh(beamGeo, undefined!, beamCount);
    beamMesh.castShadow = true;

    const mat = new THREE.Matrix4();
    for (let i = 0; i <= panelCount; i++) {
      const z = startZ + i * DECK.panelLen;
      mat.identity();
      mat.setPosition(0, BRIDGE.deckH - DECK.trussH, z);
      beamMesh.setMatrixAt(i, mat);
    }
    beamMesh.instanceMatrix.needsUpdate = true;
    this.group.add(beamMesh);

    // Longitudinal stringers (6 lanes → 7 stringer lines)
    const stringerGeo = new THREE.BoxGeometry(
      DECK.stringerW, DECK.stringerH, totalLen,
    );
    const stringerXs = [-10.5, -7.5, -4.5, 0, 4.5, 7.5, 10.5];
    for (const sx of stringerXs) {
      const stringer = new THREE.Mesh(stringerGeo);
      stringer.position.set(
        sx,
        BRIDGE.deckH - DECK.trussH + DECK.floorBeamH / 2 + DECK.stringerH / 2,
        startZ + totalLen / 2,
      );
      stringer.castShadow = true;
      this.group.add(stringer);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/deck/FloorSystem.ts
git commit -m "feat(D2): add FloorSystem with I-beam floor beams and stringers"
```

---

## Task 5: D3 — Road Surface

Crowned orthotropic deck with 6 lanes and movable median barrier.

**Files:**
- Create: `src/landmarks/bridge/deck/RoadSurface.ts`

- [ ] **Step 1: Create RoadSurface.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK, LANES } from '@/config/bridge';

/**
 * D3 — Road Surface
 * Slightly crowned deck with 6 lanes, lane markings,
 * and movable median barrier (zipper system).
 */
export class RoadSurface extends BaseBridgePart {
  constructor() {
    super('RoadSurface');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const roadW = BRIDGE.deckW - 4; // minus sidewalks on each side

    // Crowned road profile — slight arch shape
    const crownH = 0.15; // 15cm crown
    const segments = 20;
    const shape = new THREE.Shape();
    const hw = roadW / 2;
    shape.moveTo(-hw, 0);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = -hw + t * roadW;
      // Parabolic crown
      const normalizedX = (x / hw);
      const y = crownH * (1 - normalizedX * normalizedX);
      shape.lineTo(x, y);
    }
    shape.lineTo(hw, 0);
    shape.lineTo(hw, -0.2); // deck thickness
    shape.lineTo(-hw, -0.2);
    shape.closePath();

    const deckGeo = new THREE.ExtrudeGeometry(shape, {
      depth: totalLen,
      bevelEnabled: false,
    });
    deckGeo.rotateX(-Math.PI / 2);
    deckGeo.rotateY(Math.PI / 2);

    const deckMesh = new THREE.Mesh(deckGeo);
    deckMesh.position.set(0, BRIDGE.deckH, startZ);
    deckMesh.receiveShadow = true;
    this.group.add(deckMesh);

    // Lane marking strips (white dashes)
    // Lane edges at ±1.5, ±4.5, ±7.5 from center
    const markingGeo = new THREE.PlaneGeometry(0.12, 3); // 12cm wide, 3m long dashes
    const markingXs = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
    const dashSpacing = 9; // 3m dash + 6m gap
    const dashCount = Math.floor(totalLen / dashSpacing);
    const markCount = markingXs.length * dashCount;

    const markMesh = new THREE.InstancedMesh(markingGeo, undefined!, markCount);
    const mat = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0, 0),
    );

    let idx = 0;
    for (const mx of markingXs) {
      for (let i = 0; i < dashCount; i++) {
        const z = startZ + i * dashSpacing + 1.5;
        mat.compose(
          new THREE.Vector3(mx, BRIDGE.deckH + 0.16, z),
          rot,
          new THREE.Vector3(1, 1, 1),
        );
        markMesh.setMatrixAt(idx++, mat);
      }
    }
    markMesh.instanceMatrix.needsUpdate = true;
    this.group.add(markMesh);

    // Movable median barrier (zipper system) — small concrete blocks along center
    const barrierGeo = new THREE.BoxGeometry(0.4, 0.8, 1.0);
    const barrierSpacing = 1.2;
    const barrierCount = Math.floor(totalLen / barrierSpacing);
    const barrierMesh = new THREE.InstancedMesh(barrierGeo, undefined!, barrierCount);
    barrierMesh.castShadow = true;

    for (let i = 0; i < barrierCount; i++) {
      const z = startZ + i * barrierSpacing + 0.5;
      mat.identity();
      mat.setPosition(0, BRIDGE.deckH + 0.4, z);
      barrierMesh.setMatrixAt(i, mat);
    }
    barrierMesh.instanceMatrix.needsUpdate = true;
    this.group.add(barrierMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.asphalt;
      }
    });

    // Override lane markings (second child: InstancedMesh of PlaneGeometry)
    const children = this.group.children;
    for (const child of children) {
      if (child instanceof THREE.InstancedMesh) {
        if ((child.geometry as THREE.PlaneGeometry).parameters?.width === 0.12) {
          child.material = mats.laneMarkings;
        } else {
          child.material = mats.pierConcrete; // median barrier
        }
      }
    }
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/deck/RoadSurface.ts
git commit -m "feat(D3): add RoadSurface with crowned deck and median barrier"
```

---

## Task 6: D4 — Sidewalk & Railing

Art Deco railing with vertical pickets on both sides, plus concrete sidewalks.

**Files:**
- Create: `src/landmarks/bridge/deck/SidewalkRailing.ts`

- [ ] **Step 1: Create SidewalkRailing.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D4 — Sidewalk & Railing
 * East sidewalk (pedestrian) + west sidewalk (bicycle).
 * Art Deco railing with vertical pickets and curved top rail.
 */
export class SidewalkRailing extends BaseBridgePart {
  constructor() {
    super('SidewalkRailing');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const halfW = BRIDGE.deckW / 2;

    // Sidewalk slabs (both sides, 2m wide each)
    const sidewalkW = 2.0;
    const sidewalkH = 0.15;
    const sidewalkGeo = new THREE.BoxGeometry(sidewalkW, sidewalkH, totalLen);

    for (const side of [-1, 1]) {
      const slab = new THREE.Mesh(sidewalkGeo);
      slab.position.set(
        side * (halfW - sidewalkW / 2),
        BRIDGE.deckH + sidewalkH / 2,
        startZ + totalLen / 2,
      );
      slab.receiveShadow = true;
      this.group.add(slab);
    }

    // Railing — vertical pickets via InstancedMesh
    const picketW = 0.025;
    const picketGeo = new THREE.BoxGeometry(picketW, DECK.railH, picketW);
    const picketCount = Math.floor(totalLen / DECK.railPicketSpacing);
    // 2 sides × 2 rails (inner + outer)
    const totalPickets = picketCount * 4;
    const picketMesh = new THREE.InstancedMesh(picketGeo, undefined!, totalPickets);
    picketMesh.castShadow = true;

    const mat = new THREE.Matrix4();
    let idx = 0;

    for (const side of [-1, 1]) {
      const outerX = side * halfW;
      const innerX = side * (halfW - sidewalkW);
      for (const railX of [outerX, innerX]) {
        for (let i = 0; i < picketCount; i++) {
          const z = startZ + i * DECK.railPicketSpacing;
          mat.identity();
          mat.setPosition(railX, BRIDGE.deckH + sidewalkH + DECK.railH / 2, z);
          picketMesh.setMatrixAt(idx++, mat);
        }
      }
    }
    picketMesh.instanceMatrix.needsUpdate = true;
    this.group.add(picketMesh);

    // Top rail (continuous horizontal bar)
    const topRailGeo = new THREE.BoxGeometry(0.08, 0.06, totalLen);
    for (const side of [-1, 1]) {
      const outerX = side * halfW;
      const innerX = side * (halfW - sidewalkW);
      for (const railX of [outerX, innerX]) {
        const rail = new THREE.Mesh(topRailGeo);
        rail.position.set(
          railX,
          BRIDGE.deckH + sidewalkH + DECK.railH,
          startZ + totalLen / 2,
        );
        rail.castShadow = true;
        this.group.add(rail);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Sidewalk slabs get concrete, railings get steel
        if (obj.geometry instanceof THREE.BoxGeometry) {
          const params = (obj.geometry as THREE.BoxGeometry).parameters;
          if (params.height === 0.15) {
            obj.material = mats.pierConcrete;
          } else {
            obj.material = mats.deckSteel;
          }
        } else {
          obj.material = mats.deckSteel;
        }
      }
    });
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/deck/SidewalkRailing.ts
git commit -m "feat(D4): add SidewalkRailing with Art Deco pickets"
```

---

## Task 7: D5 — Light Standards

Art Deco lamp posts along the bridge: tapered octagonal shaft with scrolled bracket arm and prismatic lantern housing.

**Files:**
- Create: `src/landmarks/bridge/deck/LightStandards.ts`

- [ ] **Step 1: Create LightStandards.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D5 — Light Standards
 * Art Deco lamp posts at DECK.lightSpacing (50m) intervals on both sides.
 * Tapered octagonal shaft + bracket arm + prismatic lantern housing.
 */
export class LightStandards extends BaseBridgePart {
  constructor() {
    super('LightStandards');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const count = Math.floor(totalLen / DECK.lightSpacing);
    const halfW = BRIDGE.deckW / 2;

    // Shaft: tapered octagonal cylinder
    const shaftH = 3.5;
    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.10, shaftH, 8);

    // Bracket arm
    const armGeo = new THREE.BoxGeometry(1.2, 0.06, 0.06);

    // Lantern housing (prismatic box with glass)
    const lanternGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);

    // Total light poles: 2 sides × count
    const totalPoles = 2 * count;

    // Shafts via InstancedMesh
    const shaftMesh = new THREE.InstancedMesh(shaftGeo, undefined!, totalPoles);
    shaftMesh.castShadow = true;
    const armMesh = new THREE.InstancedMesh(armGeo, undefined!, totalPoles);
    armMesh.castShadow = true;
    const lanternMesh = new THREE.InstancedMesh(lanternGeo, undefined!, totalPoles);

    const mat = new THREE.Matrix4();
    let idx = 0;

    for (const side of [-1, 1]) {
      const x = side * (halfW - 1.0); // 1m inside from edge
      for (let i = 0; i < count; i++) {
        const z = startZ + (i + 0.5) * DECK.lightSpacing;
        const baseY = BRIDGE.deckH + 0.15; // on sidewalk

        // Shaft
        mat.identity();
        mat.setPosition(x, baseY + shaftH / 2, z);
        shaftMesh.setMatrixAt(idx, mat);

        // Arm extends inward toward road
        mat.identity();
        mat.setPosition(x - side * 0.6, baseY + shaftH, z);
        armMesh.setMatrixAt(idx, mat);

        // Lantern at end of arm
        mat.identity();
        mat.setPosition(x - side * 1.2, baseY + shaftH, z);
        lanternMesh.setMatrixAt(idx, mat);

        idx++;
      }
    }

    shaftMesh.instanceMatrix.needsUpdate = true;
    armMesh.instanceMatrix.needsUpdate = true;
    lanternMesh.instanceMatrix.needsUpdate = true;

    this.group.add(shaftMesh, armMesh, lanternMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    const children = this.group.children as THREE.InstancedMesh[];
    // Shaft + arm = deckSteel, lantern = glass
    if (children[0]) children[0].material = mats.deckSteel;
    if (children[1]) children[1].material = mats.deckSteel;
    if (children[2]) children[2].material = mats.glass;
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/deck/LightStandards.ts
git commit -m "feat(D5): add LightStandards with Art Deco lamp posts"
```

---

## Task 8: D6 + D7 — Drainage/Utilities + Expansion Joints

Two smaller parts combined into one task.

**Files:**
- Create: `src/landmarks/bridge/deck/DrainageUtilities.ts`
- Create: `src/landmarks/bridge/deck/ExpansionJoints.ts`

- [ ] **Step 1: Create DrainageUtilities.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, DECK } from '@/config/bridge';

/**
 * D6 — Drainage & Utilities
 * Scuppers in deck curb at regular intervals + utility conduit runs under deck.
 */
export class DrainageUtilities extends BaseBridgePart {
  constructor() {
    super('DrainageUtilities');
  }

  buildGeometry(): void {
    const startZ = -BRIDGE.sideSpan;
    const endZ = BRIDGE.mainSpan + BRIDGE.sideSpan;
    const totalLen = endZ - startZ;
    const halfW = BRIDGE.deckW / 2;

    // Scuppers — small rectangular openings in deck curb every 15m
    const scupperSpacing = 15;
    const scupperCount = Math.floor(totalLen / scupperSpacing) * 2; // both sides
    const scupperGeo = new THREE.BoxGeometry(0.15, 0.1, 0.3);
    const scupperMesh = new THREE.InstancedMesh(scupperGeo, undefined!, scupperCount);

    const mat = new THREE.Matrix4();
    let idx = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < scupperCount / 2; i++) {
        const z = startZ + i * scupperSpacing;
        mat.identity();
        mat.setPosition(
          side * (halfW - 2.0), // at sidewalk/road boundary
          BRIDGE.deckH - 0.05,
          z,
        );
        scupperMesh.setMatrixAt(idx++, mat);
      }
    }
    scupperMesh.instanceMatrix.needsUpdate = true;
    this.group.add(scupperMesh);

    // Drain pipes (vertical tubes under deck at scupper locations)
    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 2, 6);
    const pipeCount = scupperCount;
    const pipeMesh = new THREE.InstancedMesh(pipeGeo, undefined!, pipeCount);

    idx = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < pipeCount / 2; i++) {
        const z = startZ + i * scupperSpacing;
        mat.identity();
        mat.setPosition(
          side * (halfW - 2.0),
          BRIDGE.deckH - DECK.trussH / 2,
          z,
        );
        pipeMesh.setMatrixAt(idx++, mat);
      }
    }
    pipeMesh.instanceMatrix.needsUpdate = true;
    this.group.add(pipeMesh);

    // Utility conduits — 3 longitudinal runs under the deck
    const conduitGeo = new THREE.CylinderGeometry(0.08, 0.08, totalLen, 6);
    conduitGeo.rotateX(Math.PI / 2);
    const conduitXs = [-5, 0, 5];
    for (const cx of conduitXs) {
      const conduit = new THREE.Mesh(conduitGeo);
      conduit.position.set(
        cx,
        BRIDGE.deckH - DECK.trussH + 0.5,
        startZ + totalLen / 2,
      );
      this.group.add(conduit);
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
```

- [ ] **Step 2: Create ExpansionJoints.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE } from '@/config/bridge';

/**
 * D7 — Expansion Joints
 * Finger joints at each tower location allowing thermal movement.
 * Steel fingers interlock from both sides of the gap.
 */
export class ExpansionJoints extends BaseBridgePart {
  constructor() {
    super('ExpansionJoints');
  }

  buildGeometry(): void {
    const towerZs = [0, BRIDGE.mainSpan];
    const roadW = BRIDGE.deckW - 4; // excluding sidewalks
    const fingerCount = 20; // fingers per joint
    const fingerW = roadW / fingerCount;
    const fingerLen = 0.6; // how far each finger extends
    const fingerH = 0.05;
    const gap = 0.08; // expansion gap

    const fingerGeo = new THREE.BoxGeometry(fingerW * 0.4, fingerH, fingerLen);

    for (const towerZ of towerZs) {
      // Fingers from south side
      for (let i = 0; i < fingerCount; i++) {
        const x = -roadW / 2 + (i + 0.5) * fingerW;
        const south = new THREE.Mesh(fingerGeo);
        south.position.set(x, BRIDGE.deckH + 0.01, towerZ - gap / 2 - fingerLen / 2);
        this.group.add(south);

        // Interleaved finger from north side
        const north = new THREE.Mesh(fingerGeo);
        north.position.set(
          x + fingerW * 0.5,
          BRIDGE.deckH + 0.01,
          towerZ + gap / 2 + fingerLen / 2,
        );
        this.group.add(north);
      }

      // Support beam under joint
      const supportGeo = new THREE.BoxGeometry(roadW, 0.3, 1.5);
      const support = new THREE.Mesh(supportGeo);
      support.position.set(0, BRIDGE.deckH - 0.2, towerZ);
      this.group.add(support);
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
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/landmarks/bridge/deck/DrainageUtilities.ts src/landmarks/bridge/deck/ExpansionJoints.ts
git commit -m "feat(D6,D7): add DrainageUtilities and ExpansionJoints"
```

---

## Task 9: A1 — Fort Point Arch

Steel lattice truss arch spanning Fort Point at the south end.

**Files:**
- Create: `src/landmarks/bridge/approaches/FortPointArch.ts`

- [ ] **Step 1: Create FortPointArch.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A1 — Fort Point Arch
 * Steel lattice truss arch spanning Fort Point.
 * Located just south of the south tower (z < 0).
 * Two parallel arch ribs with X-bracing between them.
 */
export class FortPointArch extends BaseBridgePart {
  constructor() {
    super('FortPointArch');
  }

  buildGeometry(): void {
    const archCenterZ = -APPROACH.archSpan / 2 - 10; // south of south tower
    const archStartZ = archCenterZ - APPROACH.archSpan / 2;
    const archEndZ = archCenterZ + APPROACH.archSpan / 2;
    const halfW = BRIDGE.deckW / 2;

    // Arch ribs — parabolic curve on both sides
    const segments = 24;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = archStartZ + t * APPROACH.archSpan;
      // Parabolic arch
      const y = BRIDGE.deckH - APPROACH.archRise * 4 * t * (1 - t);
      points.push(new THREE.Vector3(0, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, segments * 2, APPROACH.archTubeR, 8, false);

    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(tubeGeo);
      rib.position.x = side * (halfW - 2);
      rib.castShadow = true;
      this.group.add(rib);
    }

    // X-bracing between the two arch ribs
    const braceGeo = new THREE.CylinderGeometry(
      APPROACH.archBraceR, APPROACH.archBraceR, BRIDGE.deckW - 4, 6,
    );
    braceGeo.rotateZ(Math.PI / 2);

    const braceCount = APPROACH.archBracePairs * 2; // cross braces
    const braceMesh = new THREE.InstancedMesh(braceGeo, undefined!, braceCount);
    braceMesh.castShadow = true;

    const mat = new THREE.Matrix4();
    let idx = 0;
    for (let i = 0; i < APPROACH.archBracePairs; i++) {
      const t = (i + 0.5) / APPROACH.archBracePairs;
      const z = archStartZ + t * APPROACH.archSpan;
      const y = BRIDGE.deckH - APPROACH.archRise * 4 * t * (1 - t);

      // Horizontal brace
      mat.identity();
      mat.setPosition(0, y, z);
      braceMesh.setMatrixAt(idx++, mat);

      // Diagonal brace (rotated slightly)
      const rot = new THREE.Matrix4().makeRotationZ(0.3);
      mat.identity();
      mat.multiply(rot);
      mat.setPosition(0, y - 1.5, z);
      braceMesh.setMatrixAt(idx++, mat);
    }
    braceMesh.instanceMatrix.needsUpdate = true;
    this.group.add(braceMesh);

    // Deck beam across the arch top
    const deckGeo = new THREE.BoxGeometry(BRIDGE.deckW, 0.5, APPROACH.archSpan);
    const deck = new THREE.Mesh(deckGeo);
    deck.position.set(0, BRIDGE.deckH - 0.25, archCenterZ);
    deck.receiveShadow = true;
    this.group.add(deck);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.deckSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/approaches/FortPointArch.ts
git commit -m "feat(A1): add FortPointArch lattice truss arch"
```

---

## Task 10: A2 + A3 — SF Anchorage + Marin Anchorage

**Files:**
- Create: `src/landmarks/bridge/approaches/SFAnchorage.ts`
- Create: `src/landmarks/bridge/approaches/MarinAnchorage.ts`

- [ ] **Step 1: Create SFAnchorage.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A2 — SF Anchorage
 * South anchorage: stepped concrete mass with Art Deco facade
 * and cable entry portals. Located south of the south approach.
 */
export class SFAnchorage extends BaseBridgePart {
  constructor() {
    super('SFAnchorage');
  }

  buildGeometry(): void {
    const ancZ = -BRIDGE.sideSpan - APPROACH.sfAncD / 2;

    // Stepped tiers (4 decreasing steps)
    for (let step = 0; step < APPROACH.sfAncSteps; step++) {
      const scale = 1 - step * 0.15;
      const w = APPROACH.sfAncW * scale;
      const h = APPROACH.sfAncH / APPROACH.sfAncSteps;
      const d = APPROACH.sfAncD * scale;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo);
      mesh.position.set(
        0,
        step * h + h / 2,
        ancZ,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    // Cable entry portals (2 arched openings on north face)
    const portalGeo = new THREE.CylinderGeometry(2, 2, 3, 8, 1, false, 0, Math.PI);
    portalGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const portal = new THREE.Mesh(portalGeo);
      portal.position.set(
        side * 6,
        APPROACH.sfAncH * 0.6,
        ancZ + APPROACH.sfAncD / 2,
      );
      this.group.add(portal);
    }

    // Art Deco pilasters on facade
    const pilasterGeo = new THREE.BoxGeometry(0.6, APPROACH.sfAncH, 0.4);
    const pilasterSpacing = 4;
    const pilasterCount = Math.floor(APPROACH.sfAncW / pilasterSpacing);
    for (let i = 0; i < pilasterCount; i++) {
      const x = -APPROACH.sfAncW / 2 + (i + 0.5) * pilasterSpacing;
      const pilaster = new THREE.Mesh(pilasterGeo);
      pilaster.position.set(
        x,
        APPROACH.sfAncH / 2,
        ancZ + APPROACH.sfAncD / 2 + 0.2,
      );
      pilaster.castShadow = true;
      this.group.add(pilaster);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.anchorageConcrete;
      }
    });
  }
}
```

- [ ] **Step 2: Create MarinAnchorage.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A3 — Marin Anchorage
 * North anchorage embedded in hillside rock.
 * Simpler than SF — partially buried in terrain.
 */
export class MarinAnchorage extends BaseBridgePart {
  constructor() {
    super('MarinAnchorage');
  }

  buildGeometry(): void {
    const ancZ = BRIDGE.mainSpan + BRIDGE.sideSpan + APPROACH.marinAncD / 2;

    // Main concrete mass (partially visible)
    const mainGeo = new THREE.BoxGeometry(
      APPROACH.marinAncW, APPROACH.marinAncH, APPROACH.marinAncD,
    );
    const mainMesh = new THREE.Mesh(mainGeo);
    mainMesh.position.set(0, APPROACH.marinAncH / 2 - 4, ancZ);
    mainMesh.castShadow = true;
    this.group.add(mainMesh);

    // Cable entry portals
    const portalGeo = new THREE.CylinderGeometry(1.8, 1.8, 2.5, 8, 1, false, 0, Math.PI);
    portalGeo.rotateX(Math.PI / 2);
    portalGeo.rotateY(Math.PI); // face south
    for (const side of [-1, 1]) {
      const portal = new THREE.Mesh(portalGeo);
      portal.position.set(
        side * 5,
        APPROACH.marinAncH * 0.5,
        ancZ - APPROACH.marinAncD / 2,
      );
      this.group.add(portal);
    }

    // Rock base representation (irregular dodecahedrons)
    const rockGeo = new THREE.DodecahedronGeometry(6, 1);
    for (let i = 0; i < 3; i++) {
      const rock = new THREE.Mesh(rockGeo);
      rock.position.set(
        (i - 1) * 8,
        -2,
        ancZ + (Math.random() - 0.5) * 10,
      );
      rock.scale.set(1 + Math.random() * 0.3, 0.6, 1 + Math.random() * 0.3);
      this.group.add(rock);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.anchorageConcrete;
      }
    });
  }
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/landmarks/bridge/approaches/SFAnchorage.ts src/landmarks/bridge/approaches/MarinAnchorage.ts
git commit -m "feat(A2,A3): add SF and Marin anchorages"
```

---

## Task 11: A4 + A5 — Toll Plaza + Approach Viaducts

**Files:**
- Create: `src/landmarks/bridge/approaches/TollPlaza.ts`
- Create: `src/landmarks/bridge/approaches/ApproachViaducts.ts`

- [ ] **Step 1: Create TollPlaza.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A4 — Toll Plaza
 * Modern open-road tolling gantries (post-2013 renovation).
 * Located on the SF side approach.
 */
export class TollPlaza extends BaseBridgePart {
  constructor() {
    super('TollPlaza');
  }

  buildGeometry(): void {
    const tollStartZ = -BRIDGE.sideSpan - 50; // south of south approach

    for (let g = 0; g < APPROACH.gantryCount; g++) {
      const gantryZ = tollStartZ - g * 20;

      // Vertical supports (2 columns)
      const colGeo = new THREE.BoxGeometry(0.6, APPROACH.gantryH, 0.6);
      for (const side of [-1, 1]) {
        const col = new THREE.Mesh(colGeo);
        col.position.set(
          side * APPROACH.gantryW / 2,
          BRIDGE.deckH + APPROACH.gantryH / 2,
          gantryZ,
        );
        col.castShadow = true;
        this.group.add(col);
      }

      // Horizontal beam
      const beamGeo = new THREE.BoxGeometry(APPROACH.gantryW, 0.4, 0.8);
      const beam = new THREE.Mesh(beamGeo);
      beam.position.set(0, BRIDGE.deckH + APPROACH.gantryH, gantryZ);
      beam.castShadow = true;
      this.group.add(beam);

      // Sensor housings (small boxes on beam)
      const sensorGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
      for (let s = 0; s < 6; s++) {
        const sx = -APPROACH.gantryW / 2 + 3 + s * 4.5;
        const sensor = new THREE.Mesh(sensorGeo);
        sensor.position.set(sx, BRIDGE.deckH + APPROACH.gantryH - 0.4, gantryZ);
        this.group.add(sensor);
      }
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
```

- [ ] **Step 2: Create ApproachViaducts.ts**

```typescript
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, APPROACH } from '@/config/bridge';

/**
 * A5 — Approach Viaducts
 * Concrete approach spans with supporting columns on both sides.
 * South viaduct: z from -sideSpan to ~0
 * North viaduct: z from mainSpan to mainSpan + sideSpan
 */
export class ApproachViaducts extends BaseBridgePart {
  constructor() {
    super('ApproachViaducts');
  }

  buildGeometry(): void {
    const approaches = [
      { startZ: -BRIDGE.sideSpan, len: APPROACH.sfViaductLen, dir: 1 },
      { startZ: BRIDGE.mainSpan, len: APPROACH.marinViaductLen, dir: 1 },
    ];

    for (const app of approaches) {
      const spanCount = Math.floor(app.len / APPROACH.viaductSpanLen);

      // Deck slab for this approach
      const slabGeo = new THREE.BoxGeometry(BRIDGE.deckW, 0.5, app.len);
      const slab = new THREE.Mesh(slabGeo);
      slab.position.set(0, BRIDGE.deckH - 0.25, app.startZ + app.len / 2);
      slab.receiveShadow = true;
      this.group.add(slab);

      // Support columns
      for (let i = 0; i <= spanCount; i++) {
        const z = app.startZ + i * APPROACH.viaductSpanLen;
        // Height varies — shorter at ends, taller in middle
        const t = i / spanCount;
        const colH = BRIDGE.deckH * (0.3 + 0.7 * Math.sin(t * Math.PI));

        if (colH < 2) continue; // skip if too short (near terrain)

        const colGeo = new THREE.BoxGeometry(
          APPROACH.viaductColW, colH, APPROACH.viaductColD,
        );

        for (const side of [-1, 1]) {
          const col = new THREE.Mesh(colGeo);
          col.position.set(
            side * (BRIDGE.deckW / 2 - 2),
            colH / 2,
            z,
          );
          col.castShadow = true;
          this.group.add(col);
        }

        // Cross beam at top
        const crossGeo = new THREE.BoxGeometry(BRIDGE.deckW - 2, 0.8, 1.0);
        const cross = new THREE.Mesh(crossGeo);
        cross.position.set(0, colH, z);
        cross.castShadow = true;
        this.group.add(cross);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.anchorageConcrete;
      }
    });
  }
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/landmarks/bridge/approaches/TollPlaza.ts src/landmarks/bridge/approaches/ApproachViaducts.ts
git commit -m "feat(A4,A5): add TollPlaza and ApproachViaducts"
```

---

## Task 12: Register All D1–D7 + A1–A5 in BridgeAssembler

**Files:**
- Modify: `src/landmarks/bridge/BridgeAssembler.ts`

- [ ] **Step 1: Add imports for all 12 new parts**

Add after the existing cable imports:

```typescript
// Deck (D1–D7)
import { StiffeningTruss } from './deck/StiffeningTruss';
import { FloorSystem } from './deck/FloorSystem';
import { RoadSurface } from './deck/RoadSurface';
import { SidewalkRailing } from './deck/SidewalkRailing';
import { LightStandards } from './deck/LightStandards';
import { DrainageUtilities } from './deck/DrainageUtilities';
import { ExpansionJoints } from './deck/ExpansionJoints';

// Approaches (A1–A5)
import { FortPointArch } from './approaches/FortPointArch';
import { SFAnchorage } from './approaches/SFAnchorage';
import { MarinAnchorage } from './approaches/MarinAnchorage';
import { TollPlaza } from './approaches/TollPlaza';
import { ApproachViaducts } from './approaches/ApproachViaducts';
```

- [ ] **Step 2: Register all 12 parts in build()**

Add after the existing cable registrations:

```typescript
    // Deck (D1–D7)
    this.registerPart(new StiffeningTruss());
    this.registerPart(new FloorSystem());
    this.registerPart(new RoadSurface());
    this.registerPart(new SidewalkRailing());
    this.registerPart(new LightStandards());
    this.registerPart(new DrainageUtilities());
    this.registerPart(new ExpansionJoints());

    // Approaches (A1–A5)
    this.registerPart(new FortPointArch());
    this.registerPart(new SFAnchorage());
    this.registerPart(new MarinAnchorage());
    this.registerPart(new TollPlaza());
    this.registerPart(new ApproachViaducts());
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat: register D1-D7 deck + A1-A5 approach parts in BridgeAssembler"
```

---

## Summary

| Task | Parts | Files Created |
|------|-------|---------------|
| 1 | Config | APPROACH constants in bridge.ts |
| 2 | S2+ | AsphaltPBR.ts |
| 3 | D1 | StiffeningTruss.ts |
| 4 | D2 | FloorSystem.ts |
| 5 | D3 | RoadSurface.ts |
| 6 | D4 | SidewalkRailing.ts |
| 7 | D5 | LightStandards.ts |
| 8 | D6+D7 | DrainageUtilities.ts + ExpansionJoints.ts |
| 9 | A1 | FortPointArch.ts |
| 10 | A2+A3 | SFAnchorage.ts + MarinAnchorage.ts |
| 11 | A4+A5 | TollPlaza.ts + ApproachViaducts.ts |
| 12 | Assembly | BridgeAssembler.ts updated |

**After Plan 2:** All 25 structural parts complete. Plan 3 remains for micro-details (S3a–S3d) and environment (E1, E2).
