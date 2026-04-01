# Photorealistic Golden Gate Bridge — Plan 1: Foundation, Towers, Cables & Materials

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the primitive-geometry bridge with photorealistic towers and cables using accurate cross-sections, expanded PBR materials, and the new modular BridgePart architecture.

**Architecture:** Each bridge component is a `BridgePart` class with a 4-phase lifecycle (`buildGeometry` → `applyMaterials` → `addMicroDetails` → `update`). A `BridgeAssembler` orchestrates all parts, replacing the monolithic `GoldenGateBridge.ts`. Shared geometry profiles (I-beam, L-angle, cruciform) are reusable utilities.

**Tech Stack:** Three.js (r183), TypeScript, Vite, MeshPhysicalMaterial (clearcoat), procedural CanvasTexture (1024px)

**Note:** This is a 3D visualization project with no test framework. Verification is visual: run `npm run dev`, inspect in browser, check geometry and materials look correct.

---

## File Map

### New Files (Create)
| File | Responsibility |
|------|---------------|
| `src/landmarks/bridge/BridgePart.ts` | Interface + abstract base class for all bridge parts |
| `src/landmarks/bridge/BridgeAssembler.ts` | Orchestrates 30 parts, replaces `GoldenGateBridge.ts` |
| `src/world/profiles/CruciformProfile.ts` | Parametric + cross-section Shape for tower columns |
| `src/world/profiles/IBeamProfile.ts` | Parametric I-beam cross-section Shape |
| `src/world/profiles/LAngleProfile.ts` | Parametric L-angle cross-section Shape |
| `src/world/textures/SteelPBR.ts` | 1024px procedural steel texture stack |
| `src/world/textures/ConcretePBR.ts` | 1024px procedural concrete texture stack |
| `src/world/textures/CablePBR.ts` | Cable strand wrapping normal map |
| `src/world/textures/WeatheringLayer.ts` | Shared rust/stain/peeling overlay system |
| `src/landmarks/bridge/towers/TowerShaft.ts` | T1: Cruciform stepback columns |
| `src/landmarks/bridge/towers/TowerPortals.ts` | T2: Arched portal struts |
| `src/landmarks/bridge/towers/TowerCells.ts` | T3: Internal cell grid + X-bracing |
| `src/landmarks/bridge/towers/ArtDecoPanels.ts` | T4: Decorative panels & fluting |
| `src/landmarks/bridge/towers/TowerCap.ts` | T5: Pyramidal cap + cable saddle |
| `src/landmarks/bridge/towers/PierAndFender.ts` | T6: Concrete pier + steel fender |
| `src/landmarks/bridge/towers/AviationLights.ts` | T7: Obstruction lights + platforms |
| `src/landmarks/bridge/towers/MaintenanceAccess.ts` | T8: Elevator, ladders, catwalks |
| `src/landmarks/bridge/cables/MainCable.ts` | C1: 61-strand bundle cable |
| `src/landmarks/bridge/cables/CableBand.ts` | C2: Cast steel clamps |
| `src/landmarks/bridge/cables/Suspenders.ts` | C3: Paired wire ropes + sockets |
| `src/landmarks/bridge/cables/CableSaddle.ts` | C4: Roller saddle mechanism |
| `src/landmarks/bridge/cables/CableAnchorage.ts` | C5: Splay chamber + eyebars |

### Modified Files
| File | Change |
|------|--------|
| `src/world/Materials.ts` | Expand `BridgeMaterials` from 4 to 12 materials, use new PBR generators |
| `src/main.ts` | Replace `GoldenGateBridge` with `BridgeAssembler`, wire `update()` |
| `src/config/bridge.ts` | Add tower detail constants (cell counts, flange dimensions, etc.) |

### Files Removed After Migration
| File | Reason |
|------|--------|
| `src/landmarks/GoldenGateBridge.ts` | Replaced by `BridgeAssembler` + individual part classes |

---

## Task 1: BridgePart Interface & Base Class

**Files:**
- Create: `src/landmarks/bridge/BridgePart.ts`

- [ ] **Step 1: Create the BridgePart interface and abstract base class**

```typescript
// src/landmarks/bridge/BridgePart.ts
import * as THREE from 'three';
import type { BridgeMaterials } from '@/world/Materials';

export interface BridgePart {
  readonly name: string;
  readonly group: THREE.Group;
  buildGeometry(): void;
  applyMaterials(mats: BridgeMaterials): void;
  addMicroDetails(): void;
  update?(dt: number, elapsed: number): void;
  dispose(): void;
}

export abstract class BaseBridgePart implements BridgePart {
  readonly name: string;
  readonly group = new THREE.Group();

  constructor(name: string) {
    this.name = name;
  }

  abstract buildGeometry(): void;

  applyMaterials(_mats: BridgeMaterials): void {
    // Default no-op; parts override as needed
  }

  addMicroDetails(): void {
    // Default no-op; Phase 3 will override
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj instanceof THREE.InstancedMesh) return;
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `BridgePart.ts`

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/BridgePart.ts
git commit -m "feat: add BridgePart interface and base class"
```

---

## Task 2: Geometry Profile Utilities

**Files:**
- Create: `src/world/profiles/CruciformProfile.ts`
- Create: `src/world/profiles/IBeamProfile.ts`
- Create: `src/world/profiles/LAngleProfile.ts`

- [ ] **Step 1: Create CruciformProfile — + shaped cross-section for tower columns**

```typescript
// src/world/profiles/CruciformProfile.ts
import { Shape } from 'three';

/**
 * Creates a cruciform (+) cross-section Shape.
 * @param width - Total width (flange tip to flange tip, horizontal)
 * @param depth - Total depth (flange tip to flange tip, vertical)
 * @param webW - Web thickness (horizontal)
 * @param webD - Web thickness (vertical)
 */
export function createCruciformShape(
  width: number,
  depth: number,
  webW: number,
  webD: number,
): Shape {
  const hw = width / 2;
  const hd = depth / 2;
  const hww = webW / 2;
  const hwd = webD / 2;

  const s = new Shape();
  // Start top-left of top flange, trace clockwise
  s.moveTo(-hww, hd);
  s.lineTo(hww, hd);
  s.lineTo(hww, hwd);
  s.lineTo(hw, hwd);
  s.lineTo(hw, -hwd);
  s.lineTo(hww, -hwd);
  s.lineTo(hww, -hd);
  s.lineTo(-hww, -hd);
  s.lineTo(-hww, -hwd);
  s.lineTo(-hw, -hwd);
  s.lineTo(-hw, hwd);
  s.lineTo(-hww, hwd);
  s.closePath();
  return s;
}
```

- [ ] **Step 2: Create IBeamProfile — I-beam cross-section for truss chords and floor beams**

```typescript
// src/world/profiles/IBeamProfile.ts
import { Shape } from 'three';

/**
 * Creates an I-beam cross-section Shape.
 * @param width - Flange width
 * @param height - Total height
 * @param webT - Web thickness
 * @param flangeT - Flange thickness
 */
export function createIBeamShape(
  width: number,
  height: number,
  webT: number,
  flangeT: number,
): Shape {
  const hw = width / 2;
  const hh = height / 2;
  const hwt = webT / 2;

  const s = new Shape();
  // Bottom-left, clockwise
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  s.lineTo(hw, -hh + flangeT);
  s.lineTo(hwt, -hh + flangeT);
  s.lineTo(hwt, hh - flangeT);
  s.lineTo(hw, hh - flangeT);
  s.lineTo(hw, hh);
  s.lineTo(-hw, hh);
  s.lineTo(-hw, hh - flangeT);
  s.lineTo(-hwt, hh - flangeT);
  s.lineTo(-hwt, -hh + flangeT);
  s.lineTo(-hw, -hh + flangeT);
  s.closePath();
  return s;
}
```

- [ ] **Step 3: Create LAngleProfile — L-angle section for truss diagonals**

```typescript
// src/world/profiles/LAngleProfile.ts
import { Shape } from 'three';

/**
 * Creates an L-angle cross-section Shape.
 * @param legW - Horizontal leg length
 * @param legH - Vertical leg length
 * @param t - Thickness of both legs
 */
export function createLAngleShape(
  legW: number,
  legH: number,
  t: number,
): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(legW, 0);
  s.lineTo(legW, t);
  s.lineTo(t, t);
  s.lineTo(t, legH);
  s.lineTo(0, legH);
  s.closePath();
  return s;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/world/profiles/
git commit -m "feat: add geometry profile utilities (cruciform, I-beam, L-angle)"
```

---

## Task 3: Expand Bridge Config Constants

**Files:**
- Modify: `src/config/bridge.ts`

- [ ] **Step 1: Add tower, cable, and deck detail constants**

Add after the existing `BRIDGE` constant:

```typescript
// Tower detail constants
export const TOWER = {
  colSpacing: 15.7, // half deck width + 2m
  baseW: 8,
  baseD: 5.5,
  flangeW: 2.8,
  flangeD: 2.0,
  sections: [
    { y0: -15, h: 82, scale: 1.25 },
    { y0: 67, h: 45, scale: 1.0 },
    { y0: 112, h: 45, scale: 0.88 },
    { y0: 157, h: 40, scale: 0.78 },
    { y0: 197, h: 30, scale: 0.7 },
  ],
  portalYs: [67, 112, 157, 197, 225] as readonly number[],
  portalH: 3.5,
  cellsPerSection: 4,
  cellH: 16,
  cellSpacing: 22,
} as const;

export const CABLE = {
  mainR: 0.46,      // main cable radius (0.92m diameter)
  bandW: 0.6,       // cable band width
  bandR: 0.55,      // cable band outer radius
  suspR: 0.04,      // suspender rope radius
  suspPairGap: 0.3, // gap between paired suspender ropes
  saddleW: 3.5,
  saddleH: 3,
  saddleD: 5,
} as const;

export const DECK = {
  trussH: 7.6,
  trussThick: 0.3,
  panelLen: 7.6,
  floorBeamH: 1.2,
  floorBeamWebT: 0.12,
  floorBeamFlangeT: 0.18,
  stringerW: 0.5,
  stringerH: 0.8,
  railH: 1.2,
  railPicketSpacing: 0.15,
  lightSpacing: 50,
} as const;
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/config/bridge.ts
git commit -m "feat: add detailed tower, cable, and deck constants"
```

---

## Task 4: PBR Texture Generators

**Files:**
- Create: `src/world/textures/SteelPBR.ts`
- Create: `src/world/textures/ConcretePBR.ts`
- Create: `src/world/textures/CablePBR.ts`
- Create: `src/world/textures/WeatheringLayer.ts`

- [ ] **Step 1: Create WeatheringLayer — shared overlay system**

```typescript
// src/world/textures/WeatheringLayer.ts
import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface WeatheringParams {
  age: number;           // 0–1, how old/weathered
  saltExposure: number;  // 0–1, proximity to salt water
  moistureZone: number;  // 0–1, how wet this area typically is
}

export function generateWeatheringOverlay(
  size: number,
  params: WeatheringParams,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      // Rust spots: concentrated at bottom (gravity) and near edges
      const rustNoise = fbm(nx * 8, ny * 8, 4);
      const rustGravity = ny * 0.3; // more rust toward bottom
      const rustChance = rustNoise * params.age * 0.6 + rustGravity * params.saltExposure;
      const isRust = rustChance > 0.55;

      // Salt deposits: white crystalline patches
      const saltNoise = fbm(nx * 12 + 50, ny * 12 + 50, 3);
      const isSalt = saltNoise * params.saltExposure > 0.6;

      // Paint peeling: reveals darker undercoat
      const peelNoise = fbm(nx * 6 + 100, ny * 6 + 100, 4);
      const isPeeling = peelNoise * params.age > 0.65;

      // Water stain streaks: vertical
      const streakNoise = hash2(Math.floor(nx * 30), 0) * fbm(nx * 2, ny * 15, 3);
      const isStreak = streakNoise * params.moistureZone > 0.5;

      // Encode as RGBA overlay:
      // R = rust intensity, G = salt intensity, B = peel intensity, A = streak
      d[i] = isRust ? Math.floor(rustChance * 255) : 0;
      d[i + 1] = isSalt ? Math.floor(saltNoise * 200) : 0;
      d[i + 2] = isPeeling ? Math.floor(peelNoise * 180) : 0;
      d[i + 3] = isStreak ? Math.floor(streakNoise * 150) : 0;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
```

- [ ] **Step 2: Create SteelPBR — 1024px procedural steel texture stack**

```typescript
// src/world/textures/SteelPBR.ts
import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface SteelTextureSet {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
}

export function generateSteelTextures(size = 1024): SteelTextureSet {
  // --- Color Map ---
  const col = makeCanvas(size);
  const colD = col.img.data;
  // International Orange base: R=192, G=69, B=48 (#c04530)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const variation = (fbm(x * 0.005, y * 0.005, 3) - 0.5) * 20;
      const repaintPatch = fbm(x * 0.002, y * 0.002, 2);
      const bright = repaintPatch > 0.6 ? 10 : 0; // slightly brighter where recently repainted
      colD[i] = Math.min(255, Math.max(0, 192 + variation + bright));
      colD[i + 1] = Math.min(255, Math.max(0, 69 + variation * 0.4));
      colD[i + 2] = Math.min(255, Math.max(0, 48 + variation * 0.3));
      colD[i + 3] = 255;
    }
  }
  col.ctx.putImageData(col.img, 0, 0);

  // --- Normal Map ---
  const nor = makeCanvas(size);
  const norD = nor.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;

      // Rivet pattern: 64px grid
      const rx = x % 64, ry = y % 64;
      const rivetDist = Math.sqrt((rx - 32) ** 2 + (ry - 32) ** 2);
      if (rivetDist < 5) {
        const rd = Math.max(0, 5 - rivetDist);
        dx += (rx - 32) * rd * 0.12;
        dy += (ry - 32) * rd * 0.12;
      }

      // Plate seams: horizontal every 128px, vertical every 256px
      if (Math.abs(y % 128 - 64) < 2) {
        dy += Math.abs(y % 128 - 64) < 1 ? 0.6 : -0.4;
      }
      if (Math.abs(x % 256 - 128) < 2) {
        dx += Math.abs(x % 256 - 128) < 1 ? 0.6 : -0.4;
      }

      // Steel grain direction (horizontal rolling marks)
      dx += (hash2(x * 0.3, y * 0.3) - 0.5) * 0.12;
      dy += (hash2(x * 0.3 + 100, y * 0.3 + 100) - 0.5) * 0.08;

      // Surface pitting from corrosion
      dx += (fbm(x * 0.05, y * 0.05, 2) - 0.5) * 0.15;
      dy += (fbm(x * 0.05 + 200, y * 0.05 + 200, 2) - 0.5) * 0.15;

      const len = Math.sqrt(dx * dx + dy * dy + 1);
      norD[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 3] = 255;
    }
  }
  nor.ctx.putImageData(nor.img, 0, 0);

  // --- Roughness Map ---
  const rou = makeCanvas(size);
  const rouD = rou.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Base roughness 0.5, varies 0.4–0.7
      const base = 0.5;
      const noise = (fbm(x * 0.008, y * 0.008, 3) - 0.5) * 0.3;
      // Rougher at plate seams
      const seamDist = Math.min(Math.abs(y % 128 - 64), Math.abs(x % 256 - 128));
      const seamBoost = seamDist < 4 ? 0.15 : 0;
      const val = Math.min(1, Math.max(0, base + noise + seamBoost));
      const b = (val * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  // --- Metalness Map ---
  const met = makeCanvas(size);
  const metD = met.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Base metalness 0.3 (paint over metal)
      const base = 0.3;
      const worn = fbm(x * 0.01, y * 0.01, 3);
      // Higher metalness where paint is thin
      const val = Math.min(0.5, base + (worn > 0.6 ? (worn - 0.6) * 0.5 : 0));
      const b = (val * 255) | 0;
      metD[i] = b; metD[i + 1] = b; metD[i + 2] = b; metD[i + 3] = 255;
    }
  }
  met.ctx.putImageData(met.img, 0, 0);

  // --- AO Map ---
  const ao = makeCanvas(size);
  const aoD = ao.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Darker near rivet heads and plate seams
      let occlusion = 1.0;
      const rx = x % 64, ry = y % 64;
      const rivetDist = Math.sqrt((rx - 32) ** 2 + (ry - 32) ** 2);
      if (rivetDist < 8) {
        occlusion -= (8 - rivetDist) * 0.03;
      }
      const seamDist = Math.min(Math.abs(y % 128 - 64), Math.abs(x % 256 - 128));
      if (seamDist < 6) {
        occlusion -= (6 - seamDist) * 0.02;
      }
      occlusion += (fbm(x * 0.02, y * 0.02, 2) - 0.5) * 0.08;
      const b = (Math.min(1, Math.max(0, occlusion)) * 255) | 0;
      aoD[i] = b; aoD[i + 1] = b; aoD[i + 2] = b; aoD[i + 3] = 255;
    }
  }
  ao.ctx.putImageData(ao.img, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return {
    colorMap: wrap(col.canvas),
    normalMap: wrap(nor.canvas),
    roughnessMap: wrap(rou.canvas),
    metalnessMap: wrap(met.canvas),
    aoMap: wrap(ao.canvas),
  };
}
```

- [ ] **Step 3: Create ConcretePBR**

```typescript
// src/world/textures/ConcretePBR.ts
import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface ConcreteTextureSet {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

export function generateConcreteTextures(size = 1024): ConcreteTextureSet {
  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
  }

  // --- Color Map ---
  const col = makeCanvas();
  const colD = col.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Warm grey base (#999088) with variation
      const n = (fbm(x * 0.004, y * 0.004, 4) - 0.5) * 30;
      // Water stain streaks (vertical darker lines)
      const streak = hash2(Math.floor(x / 20), 0);
      const streakDark = streak > 0.7 ? -15 * fbm(x * 0.01, y * 0.03, 2) : 0;
      // Algae near bottom (green tint)
      const algae = y > size * 0.7 ? (y / size - 0.7) * 40 : 0;
      colD[i] = Math.min(255, Math.max(0, 153 + n + streakDark));
      colD[i + 1] = Math.min(255, Math.max(0, 144 + n + streakDark + algae * 0.5));
      colD[i + 2] = Math.min(255, Math.max(0, 136 + n + streakDark));
      colD[i + 3] = 255;
    }
  }
  col.ctx.putImageData(col.img, 0, 0);

  // --- Normal Map ---
  const nor = makeCanvas();
  const norD = nor.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;
      // Board-formed texture (horizontal lines from formwork)
      if (y % 128 < 3) dy += 0.5;
      // Aggregate bumps
      dx += (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 0.5;
      dy += (fbm(x * 0.03 + 50, y * 0.03 + 50, 3) - 0.5) * 0.5;
      // Crack network
      const crackVal = fbm(x * 0.008, y * 0.008, 5);
      if (Math.abs(crackVal - 0.5) < 0.02) {
        dx += (hash2(x * 0.1, y * 0.1) - 0.5) * 1.5;
        dy += (hash2(x * 0.1 + 33, y * 0.1 + 33) - 0.5) * 1.5;
      }
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      norD[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 3] = 255;
    }
  }
  nor.ctx.putImageData(nor.img, 0, 0);

  // --- Roughness Map ---
  const rou = makeCanvas();
  const rouD = rou.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const val = 0.82 + (fbm(x * 0.01, y * 0.01, 3) - 0.5) * 0.15;
      const b = (Math.min(0.95, Math.max(0.7, val)) * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  // --- AO Map ---
  const ao = makeCanvas();
  const aoD = ao.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let occ = 1.0;
      // Darker in form seams
      if (y % 128 < 5) occ -= (5 - (y % 128)) * 0.04;
      occ += (fbm(x * 0.015, y * 0.015, 2) - 0.5) * 0.1;
      const b = (Math.min(1, Math.max(0, occ)) * 255) | 0;
      aoD[i] = b; aoD[i + 1] = b; aoD[i + 2] = b; aoD[i + 3] = 255;
    }
  }
  ao.ctx.putImageData(ao.img, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return {
    colorMap: wrap(col.canvas),
    normalMap: wrap(nor.canvas),
    roughnessMap: wrap(rou.canvas),
    aoMap: wrap(ao.canvas),
  };
}
```

- [ ] **Step 4: Create CablePBR**

```typescript
// src/world/textures/CablePBR.ts
import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface CableTextureSet {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function generateCableTextures(size = 1024): CableTextureSet {
  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
  }

  // --- Normal Map: helical strand wrapping ---
  const nor = makeCanvas();
  const norD = nor.img.data;
  const strandCount = 61;
  const helixPitch = size / 8; // pixels per full helical wrap

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;

      // Helical strand pattern: diagonal grooves
      const angle = Math.PI * 0.15; // helix angle
      const u = x * Math.cos(angle) + y * Math.sin(angle);
      const strandPhase = (u % (size / strandCount)) / (size / strandCount);
      // Groove between strands
      if (strandPhase < 0.08 || strandPhase > 0.92) {
        const groove = strandPhase < 0.08 ? strandPhase / 0.08 : (1 - strandPhase) / 0.08;
        dx += Math.cos(angle) * (1 - groove) * 0.8;
        dy += Math.sin(angle) * (1 - groove) * 0.8;
      }
      // Individual wire texture
      dx += (hash2(x * 0.5, y * 0.5) - 0.5) * 0.08;
      dy += (hash2(x * 0.5 + 77, y * 0.5 + 77) - 0.5) * 0.06;

      const len = Math.sqrt(dx * dx + dy * dy + 1);
      norD[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 3] = 255;
    }
  }
  nor.ctx.putImageData(nor.img, 0, 0);

  // --- Roughness Map ---
  const rou = makeCanvas();
  const rouD = rou.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const val = 0.42 + (fbm(x * 0.01, y * 0.01, 2) - 0.5) * 0.15;
      const b = (Math.min(0.55, Math.max(0.35, val)) * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return { normalMap: wrap(nor.canvas), roughnessMap: wrap(rou.canvas) };
}
```

- [ ] **Step 5: Verify compiles and commit**

Run: `npx tsc --noEmit`

```bash
git add src/world/textures/
git commit -m "feat: add PBR texture generators (steel, concrete, cable, weathering)"
```

---

## Task 5: Expand Materials System

**Files:**
- Modify: `src/world/Materials.ts`

- [ ] **Step 1: Rewrite Materials.ts with expanded BridgeMaterials**

Replace the entire file content:

```typescript
// src/world/Materials.ts
import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import { generateSteelTextures } from '@/world/textures/SteelPBR';
import { generateConcreteTextures } from '@/world/textures/ConcretePBR';
import { generateCableTextures } from '@/world/textures/CablePBR';
import { generateWeatheringOverlay } from '@/world/textures/WeatheringLayer';
import { generateProceduralNormal } from '@/world/textures/LegacyNormals';

export interface BridgeMaterials {
  // Steel variants
  towerSteel: THREE.MeshPhysicalMaterial;
  deckSteel: THREE.MeshPhysicalMaterial;
  cableSteel: THREE.MeshPhysicalMaterial;
  freshPaint: THREE.MeshPhysicalMaterial;

  // Concrete variants
  pierConcrete: THREE.MeshStandardMaterial;
  anchorageConcrete: THREE.MeshStandardMaterial;

  // Road
  asphalt: THREE.MeshStandardMaterial;
  laneMarkings: THREE.MeshStandardMaterial;

  // Functional
  galvanizedSteel: THREE.MeshStandardMaterial;
  castIron: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;

  // Shared
  weatheringOverlay: THREE.CanvasTexture;

  // Legacy compatibility (used by systems not yet migrated)
  bridge: THREE.MeshPhysicalMaterial;
  cable: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  road: THREE.MeshStandardMaterial;
}

export function createMaterials(): BridgeMaterials {
  const steelTex = generateSteelTextures(1024);
  steelTex.colorMap.repeat.set(8, 8);
  steelTex.normalMap.repeat.set(8, 8);
  steelTex.roughnessMap.repeat.set(8, 8);
  steelTex.metalnessMap.repeat.set(8, 8);
  steelTex.aoMap.repeat.set(8, 8);

  const concreteTex = generateConcreteTextures(1024);
  concreteTex.colorMap.repeat.set(4, 4);
  concreteTex.normalMap.repeat.set(4, 4);
  concreteTex.roughnessMap.repeat.set(4, 4);
  concreteTex.aoMap.repeat.set(4, 4);

  const cableTex = generateCableTextures(1024);
  cableTex.normalMap.repeat.set(1, 20);
  cableTex.roughnessMap.repeat.set(1, 20);

  const weathering = generateWeatheringOverlay(512, {
    age: 0.4, saltExposure: 0.6, moistureZone: 0.5,
  });

  const towerSteel = new THREE.MeshPhysicalMaterial({
    color: BRIDGE.color,
    map: steelTex.colorMap,
    normalMap: steelTex.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: steelTex.roughnessMap,
    roughness: 0.55,
    metalnessMap: steelTex.metalnessMap,
    metalness: 0.3,
    aoMap: steelTex.aoMap,
    aoMapIntensity: 0.8,
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.5,
  });

  const deckSteel = new THREE.MeshPhysicalMaterial({
    color: BRIDGE.color,
    normalMap: steelTex.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.6,
    metalness: 0.3,
    clearcoat: 0.05,
    clearcoatRoughness: 0.7,
    envMapIntensity: 0.4,
  });

  const cableSteel = new THREE.MeshPhysicalMaterial({
    color: 0xb03d2a, // slightly darker than tower
    normalMap: cableTex.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: cableTex.roughnessMap,
    roughness: 0.45,
    metalness: 0.4,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.5,
  });

  const freshPaint = new THREE.MeshPhysicalMaterial({
    color: 0xcc4a35,
    roughness: 0.35,
    metalness: 0.2,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.6,
  });

  const pierConcrete = new THREE.MeshStandardMaterial({
    map: concreteTex.colorMap,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: concreteTex.roughnessMap,
    roughness: 0.85,
    metalness: 0,
    aoMap: concreteTex.aoMap,
    aoMapIntensity: 0.7,
  });

  const anchorageConcrete = new THREE.MeshStandardMaterial({
    color: 0x9a918a,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.8,
    metalness: 0,
  });

  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.92,
    metalness: 0,
    normalMap: steelTex.normalMap, // placeholder, will get own in Plan 2
    normalScale: new THREE.Vector2(0.2, 0.2),
  });

  const laneMarkings = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.6,
    metalness: 0.05,
  });

  const galvanizedSteel = new THREE.MeshStandardMaterial({
    color: 0x888890,
    roughness: 0.4,
    metalness: 0.6,
  });

  const castIron = new THREE.MeshStandardMaterial({
    color: 0x8b4030,
    roughness: 0.65,
    metalness: 0.5,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffeecc,
    roughness: 0.1,
    metalness: 0,
    transmission: 0.6,
    thickness: 0.5,
    emissive: 0xffaa44,
    emissiveIntensity: 1.5,
  });

  return {
    towerSteel,
    deckSteel,
    cableSteel,
    freshPaint,
    pierConcrete,
    anchorageConcrete,
    asphalt,
    laneMarkings,
    galvanizedSteel,
    castIron,
    glass,
    weatheringOverlay: weathering,
    // Legacy compatibility
    bridge: towerSteel,
    cable: cableSteel as unknown as THREE.MeshStandardMaterial,
    concrete: pierConcrete,
    road: asphalt,
  };
}
```

- [ ] **Step 2: Extract the old generateProceduralNormal into a legacy file (keep for systems not yet migrated)**

```typescript
// src/world/textures/LegacyNormals.ts
import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export function generateProceduralNormal(size: number, type: 'steel' | 'concrete' | 'asphalt'): THREE.CanvasTexture {
  // (Copy the existing generateProceduralNormal function body from old Materials.ts)
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;

      if (type === 'steel') {
        const rx = x % 64, ry = y % 64;
        const rivetDist = Math.sqrt((rx - 32) ** 2 + (ry - 32) ** 2);
        if (rivetDist < 4) {
          const rd = Math.max(0, 4 - rivetDist);
          dx += (rx - 32) * rd * 0.15;
          dy += (ry - 32) * rd * 0.15;
        }
        if (Math.abs(y % 128 - 64) < 2) dy += (Math.abs(y % 128 - 64) < 1 ? 0.5 : -0.3);
        if (Math.abs(x % 256 - 128) < 2) dx += (Math.abs(x % 256 - 128) < 1 ? 0.5 : -0.3);
        dx += (hash2(x * 0.5, y * 0.5) - 0.5) * 0.15;
        dy += (hash2(x * 0.5 + 100, y * 0.5 + 100) - 0.5) * 0.15;
      } else if (type === 'concrete') {
        dx = (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 0.6;
        dy = (fbm(x * 0.03 + 50, y * 0.03 + 50, 3) - 0.5) * 0.6;
        if (y % 128 < 2) dy += 0.4;
      } else {
        dx = (hash2(x * 0.3, y * 0.3) - 0.5) * 0.3;
        dy = (hash2(x * 0.3 + 77, y * 0.3 + 77) - 0.5) * 0.3;
        dx += (fbm(x * 0.08, y * 0.08, 2) - 0.5) * 0.2;
        dy += (fbm(x * 0.08 + 33, y * 0.08 + 33, 2) - 0.5) * 0.2;
      }

      const len = Math.sqrt(dx * dx + dy * dy + 1);
      d[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      d[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      d[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
```

- [ ] **Step 3: Verify dev server starts without errors**

Run: `npm run dev`
Expected: Compiles and renders bridge (using legacy material aliases)

- [ ] **Step 4: Commit**

```bash
git add src/world/Materials.ts src/world/textures/LegacyNormals.ts
git commit -m "feat: expand materials system to 12 PBR materials with 1024px textures"
```

---

## Task 6: BridgeAssembler Shell

**Files:**
- Create: `src/landmarks/bridge/BridgeAssembler.ts`

- [ ] **Step 1: Create the assembler that will orchestrate all parts**

```typescript
// src/landmarks/bridge/BridgeAssembler.ts
import { BaseLandmark } from '@/landmarks/BaseLandmark';
import type { BridgePart } from './BridgePart';
import type { BridgeMaterials } from '@/world/Materials';

export class BridgeAssembler extends BaseLandmark {
  private parts: BridgePart[] = [];
  private updatableParts: BridgePart[] = [];

  constructor(private mats: BridgeMaterials) {
    super('golden-gate');
  }

  registerPart(part: BridgePart): void {
    this.parts.push(part);
    if (part.update) {
      this.updatableParts.push(part);
    }
  }

  build(): void {
    // Phase 1: Geometry
    for (const p of this.parts) {
      p.buildGeometry();
    }

    // Phase 2: Materials
    for (const p of this.parts) {
      p.applyMaterials(this.mats);
    }

    // Phase 3: Micro-details
    for (const p of this.parts) {
      p.addMicroDetails();
    }

    // Add all part groups to our group
    for (const p of this.parts) {
      this.group.add(p.group);
    }
  }

  update(dt: number, elapsed: number): void {
    for (const p of this.updatableParts) {
      p.update!(dt, elapsed);
    }
  }

  dispose(): void {
    for (const p of this.parts) {
      p.dispose();
    }
    super.dispose();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat: add BridgeAssembler orchestrator shell"
```

---

## Task 7: T1 — Tower Shaft (Cruciform Stepback Columns)

**Files:**
- Create: `src/landmarks/bridge/towers/TowerShaft.ts`

- [ ] **Step 1: Implement the tower shaft with cruciform cross-sections**

```typescript
// src/landmarks/bridge/towers/TowerShaft.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import { createCruciformShape } from '@/world/profiles/CruciformProfile';
import type { BridgeMaterials } from '@/world/Materials';

export class TowerShaft extends BaseBridgePart {
  constructor() {
    super('tower-shaft');
  }

  buildGeometry(): void {
    const { colSpacing, baseW, baseD, flangeW, flangeD, sections } = TOWER;

    for (const towerZ of [0, BRIDGE.mainSpan]) {
      const towerGroup = new THREE.Group();
      towerGroup.position.z = towerZ;

      for (const side of [-1, 1]) {
        for (const sec of sections) {
          const w = baseW * sec.scale;
          const d = baseD * sec.scale;
          const fw = flangeW * sec.scale;
          const fd = flangeD * sec.scale;

          const shape = createCruciformShape(w, d, fw, fd);
          const geo = new THREE.ExtrudeGeometry(shape, {
            depth: sec.h,
            bevelEnabled: false,
          });
          // ExtrudeGeometry goes along +Z; rotate so it goes along +Y
          geo.rotateX(-Math.PI / 2);

          const mesh = new THREE.Mesh(geo);
          mesh.position.set(side * colSpacing, sec.y0, 0);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          towerGroup.add(mesh);
        }
      }

      this.group.add(towerGroup);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.towerSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Register in BridgeAssembler — add import and registration**

In `BridgeAssembler.ts`, add a static factory method that registers all tower parts:

```typescript
// Add to BridgeAssembler.ts — import at top:
import { TowerShaft } from './towers/TowerShaft';

// Add method:
  registerTowerParts(): void {
    this.registerPart(new TowerShaft());
  }
```

Update `build()` to call `this.registerTowerParts()` before the phase loop (or call it from main.ts before build).

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: Tower columns should show + shaped cross-section instead of rectangles. The stepback taper should be visible.

- [ ] **Step 4: Commit**

```bash
git add src/landmarks/bridge/towers/TowerShaft.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T1): add cruciform stepback tower shaft geometry"
```

---

## Task 8: T2 — Portal Struts (Arched Cross-Braces)

**Files:**
- Create: `src/landmarks/bridge/towers/TowerPortals.ts`

- [ ] **Step 1: Implement arched portal struts with vehicle passage openings**

```typescript
// src/landmarks/bridge/towers/TowerPortals.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class TowerPortals extends BaseBridgePart {
  constructor() {
    super('tower-portals');
  }

  buildGeometry(): void {
    const { colSpacing, baseD, portalYs, portalH } = TOWER;
    const braceWidth = colSpacing * 2 - TOWER.baseW * 0.6;

    for (const towerZ of [0, BRIDGE.mainSpan]) {
      for (const by of portalYs) {
        // Main strut body
        const strut = this.createPortalStrut(braceWidth, portalH, baseD * 0.6);
        strut.position.set(0, by, towerZ);
        strut.castShadow = true;
        this.group.add(strut);
      }
    }
  }

  private createPortalStrut(width: number, height: number, depth: number): THREE.Group {
    const g = new THREE.Group();

    // Top beam
    const topGeo = new THREE.BoxGeometry(width, height * 0.3, depth);
    const top = new THREE.Mesh(topGeo);
    top.position.y = height * 0.35;
    g.add(top);

    // Bottom beam
    const botGeo = new THREE.BoxGeometry(width, height * 0.3, depth);
    const bot = new THREE.Mesh(botGeo);
    bot.position.y = -height * 0.35;
    g.add(bot);

    // Arch opening: create as a curved shape between top and bottom
    // Two side walls flanking the arch
    const archW = width * 0.6; // vehicle passage width
    const archH = height * 0.4;
    const wallW = (width - archW) / 2;

    for (const side of [-1, 1]) {
      const wallGeo = new THREE.BoxGeometry(wallW, archH, depth);
      const wall = new THREE.Mesh(wallGeo);
      wall.position.set(side * (archW / 2 + wallW / 2), 0, 0);
      g.add(wall);
    }

    // Arch crown: half-cylinder above the opening
    const archGeo = new THREE.CylinderGeometry(
      archW / 2, archW / 2, depth, 16, 1, false, 0, Math.PI,
    );
    archGeo.rotateX(Math.PI / 2);
    archGeo.rotateZ(Math.PI);
    const arch = new THREE.Mesh(archGeo);
    arch.position.y = archH * 0.2;
    g.add(arch);

    return g;
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.towerSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Register in BridgeAssembler**

```typescript
// Add import
import { TowerPortals } from './towers/TowerPortals';

// In registerTowerParts():
this.registerPart(new TowerPortals());
```

- [ ] **Step 3: Verify and commit**

Run: `npm run dev`
Expected: Horizontal braces now show arched openings where vehicles would pass through.

```bash
git add src/landmarks/bridge/towers/TowerPortals.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T2): add arched portal struts with vehicle passage openings"
```

---

## Task 9: T3 — Cell Structure (Internal Grid + X-Bracing)

**Files:**
- Create: `src/landmarks/bridge/towers/TowerCells.ts`

- [ ] **Step 1: Implement cell grid using InstancedMesh**

```typescript
// src/landmarks/bridge/towers/TowerCells.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class TowerCells extends BaseBridgePart {
  constructor() {
    super('tower-cells');
  }

  buildGeometry(): void {
    const { colSpacing, baseW, baseD } = TOWER;
    const cellH = TOWER.cellH;
    const cellSpacing = TOWER.cellSpacing;
    const barThick = 0.4;

    // Count total cells for instancing
    const cellStartY = 72;
    const cellEndY = 220;
    const cellCount = Math.floor((cellEndY - cellStartY) / cellSpacing);
    const towerPositions = [0, BRIDGE.mainSpan];
    const sides = [-1, 1];
    const faces = [-1, 1]; // front and back face of each column
    const totalCells = cellCount * towerPositions.length * sides.length * faces.length;

    // Vertical ribs (cell frame sides)
    const ribGeo = new THREE.BoxGeometry(barThick, cellH, barThick);
    const ribMesh = new THREE.InstancedMesh(ribGeo, new THREE.MeshStandardMaterial(), totalCells * 2);
    const _m4 = new THREE.Matrix4();
    let ribIdx = 0;

    // X-bracing diagonals
    const diagLen = Math.sqrt(cellH * cellH + (baseW * 0.4) ** 2);
    const diagGeo = new THREE.BoxGeometry(barThick * 0.5, diagLen, barThick * 0.5);
    const diagMesh = new THREE.InstancedMesh(diagGeo, new THREE.MeshStandardMaterial(), totalCells * 2);
    let diagIdx = 0;

    const diagAngle = Math.atan2(baseW * 0.4, cellH);

    for (const tz of towerPositions) {
      for (const side of sides) {
        const cx = side * colSpacing;
        for (const face of faces) {
          const faceZ = tz + face * (baseD * 0.5 * 0.85 - 0.2);
          for (let i = 0; i < cellCount; i++) {
            const cy = cellStartY + i * cellSpacing;

            // Left and right vertical ribs of cell
            for (const ribSide of [-1, 1]) {
              _m4.makeTranslation(
                cx + ribSide * baseW * 0.2,
                cy + cellH / 2,
                faceZ,
              );
              ribMesh.setMatrixAt(ribIdx++, _m4);
            }

            // X-brace: two diagonal bars
            for (const diagDir of [-1, 1]) {
              _m4.identity();
              _m4.makeRotationZ(diagDir * diagAngle);
              _m4.setPosition(cx, cy + cellH / 2, faceZ);
              diagMesh.setMatrixAt(diagIdx++, _m4);
            }
          }
        }
      }
    }

    ribMesh.instanceMatrix.needsUpdate = true;
    diagMesh.instanceMatrix.needsUpdate = true;
    ribMesh.count = ribIdx;
    diagMesh.count = diagIdx;

    this.group.add(ribMesh, diagMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        obj.material = mats.towerSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Register and commit**

```typescript
import { TowerCells } from './towers/TowerCells';
// In registerTowerParts():
this.registerPart(new TowerCells());
```

```bash
git add src/landmarks/bridge/towers/TowerCells.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T3): add tower cell structure with X-bracing via InstancedMesh"
```

---

## Task 10: T4 — Art Deco Panels

**Files:**
- Create: `src/landmarks/bridge/towers/ArtDecoPanels.ts`

- [ ] **Step 1: Implement decorative panels with chevron motifs and fluting**

```typescript
// src/landmarks/bridge/towers/ArtDecoPanels.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class ArtDecoPanels extends BaseBridgePart {
  constructor() {
    super('art-deco-panels');
  }

  buildGeometry(): void {
    const { colSpacing, baseW, baseD } = TOWER;

    for (const tz of [0, BRIDGE.mainSpan]) {
      for (const side of [-1, 1]) {
        const cx = side * colSpacing;

        // Vertical fluting at column corners (4 flutes per corner)
        this.addFluting(cx, tz, baseW, baseD);

        // Chevron panels between portal struts
        this.addChevronPanels(cx, tz, baseW, baseD);

        // Stepped crown molding at each strut level
        this.addCrownMoldings(cx, tz, baseW, baseD);
      }
    }
  }

  private addFluting(cx: number, tz: number, w: number, d: number): void {
    const fluteR = 0.15;
    const fluteGeo = new THREE.CylinderGeometry(fluteR, fluteR, 150, 6);
    const fluteCount = 4;
    const spacing = 0.5;

    for (const cornerX of [-1, 1]) {
      for (const cornerZ of [-1, 1]) {
        for (let f = 0; f < fluteCount; f++) {
          const flute = new THREE.Mesh(fluteGeo);
          flute.position.set(
            cx + cornerX * (w / 2 - 0.3) + f * spacing * cornerX * 0.3,
            75 + 75, // centered vertically on tower
            tz + cornerZ * (d / 2 - 0.3),
          );
          this.group.add(flute);
        }
      }
    }
  }

  private addChevronPanels(cx: number, tz: number, w: number, _d: number): void {
    // Recessed chevron panels on tower face between strut levels
    const panelYs = [75, 120, 165, 205];
    const panelH = 12;
    const panelW = w * 0.6;
    const recessDepth = 0.3;

    for (const py of panelYs) {
      // Chevron shape: V-shaped indentation
      const shape = new THREE.Shape();
      const hw = panelW / 2;
      const hh = panelH / 2;
      shape.moveTo(-hw, -hh);
      shape.lineTo(0, hh * 0.3); // chevron peak
      shape.lineTo(hw, -hh);
      shape.lineTo(hw, hh);
      shape.lineTo(0, hh * 0.7);
      shape.lineTo(-hw, hh);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: recessDepth,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 1,
      });

      for (const face of [-1, 1]) {
        const panel = new THREE.Mesh(geo);
        panel.position.set(cx, py, tz + face * (_d / 2 + 0.01));
        if (face === -1) panel.rotation.y = Math.PI;
        this.group.add(panel);
      }
    }
  }

  private addCrownMoldings(cx: number, tz: number, w: number, d: number): void {
    // Stepped molding at each portal strut level
    const moldingYs = TOWER.portalYs;
    const steps = 3;
    const stepH = 0.4;
    const stepInset = 0.2;

    for (const my of moldingYs) {
      for (let s = 0; s < steps; s++) {
        const sw = w + 1.0 - s * stepInset * 2;
        const sd = d + 0.5 - s * stepInset * 2;
        const geo = new THREE.BoxGeometry(sw, stepH, sd);
        const mesh = new THREE.Mesh(geo);
        mesh.position.set(cx, my - TOWER.portalH / 2 - s * stepH, tz);
        this.group.add(mesh);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.towerSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Register and commit**

```bash
git add src/landmarks/bridge/towers/ArtDecoPanels.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T4): add Art Deco panels with chevrons, fluting, and crown moldings"
```

---

## Task 11: T5 — Tower Cap & Saddle

**Files:**
- Create: `src/landmarks/bridge/towers/TowerCap.ts`

- [ ] **Step 1: Implement stepped pyramidal cap and grooved cable saddle**

```typescript
// src/landmarks/bridge/towers/TowerCap.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class TowerCap extends BaseBridgePart {
  constructor() {
    super('tower-cap');
  }

  buildGeometry(): void {
    const { colSpacing, baseW, baseD } = TOWER;

    for (const tz of [0, BRIDGE.mainSpan]) {
      for (const side of [-1, 1]) {
        const cx = side * colSpacing;

        // Stepped pyramidal cap (3 steps)
        const steps = [
          { w: baseW * 0.75, d: baseD * 0.75, h: 1.5 },
          { w: baseW * 0.6, d: baseD * 0.6, h: 1.2 },
          { w: baseW * 0.45, d: baseD * 0.45, h: 1.0 },
        ];
        let capY = BRIDGE.towerH;
        for (const step of steps) {
          const geo = new THREE.BoxGeometry(step.w, step.h, step.d);
          const mesh = new THREE.Mesh(geo);
          mesh.position.set(cx, capY + step.h / 2, tz);
          this.group.add(mesh);
          capY += step.h;
        }

        // Cable saddle: grooved casting sitting on top of cap
        const saddleGroup = this.createSaddle();
        saddleGroup.position.set(cx, capY + 0.5, tz);
        this.group.add(saddleGroup);
      }
    }
  }

  private createSaddle(): THREE.Group {
    const g = new THREE.Group();

    // Saddle base plate
    const basePlate = new THREE.BoxGeometry(4, 0.8, 6);
    g.add(new THREE.Mesh(basePlate));

    // Saddle groove: half-cylinder channel for cable
    const grooveR = BRIDGE.cableR + 0.1;
    const grooveGeo = new THREE.CylinderGeometry(grooveR, grooveR, 6, 12, 1, true, 0, Math.PI);
    grooveGeo.rotateX(Math.PI / 2);
    const groove = new THREE.Mesh(grooveGeo);
    groove.position.y = 0.4;
    g.add(groove);

    // Side walls of saddle
    for (const sx of [-1, 1]) {
      const wallGeo = new THREE.BoxGeometry(0.5, 2, 6);
      const wall = new THREE.Mesh(wallGeo);
      wall.position.set(sx * 1.8, 1.0, 0);
      g.add(wall);
    }

    return g;
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.castIron;
      }
    });
  }
}
```

- [ ] **Step 2: Register and commit**

```bash
git add src/landmarks/bridge/towers/TowerCap.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T5): add stepped pyramidal tower cap and grooved cable saddle"
```

---

## Task 12: T6 — Pier & Fender

**Files:**
- Create: `src/landmarks/bridge/towers/PierAndFender.ts`

- [ ] **Step 1: Implement elliptical pier and steel fender ring**

```typescript
// src/landmarks/bridge/towers/PierAndFender.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class PierAndFender extends BaseBridgePart {
  private pierMeshes: THREE.Mesh[] = [];
  private fenderMeshes: THREE.Mesh[] = [];

  constructor() {
    super('pier-and-fender');
  }

  buildGeometry(): void {
    // South pier (tower at z=0): larger, elliptical caisson in deep water
    this.buildSouthPier();
    // North pier (tower at z=mainSpan): shorter, founded on rock
    this.buildNorthPier();
  }

  private buildSouthPier(): void {
    const g = new THREE.Group();
    const hw = TOWER.colSpacing + TOWER.baseW * 0.65;
    const hd = TOWER.baseD * 1.25;

    // Elliptical caisson: use LatheGeometry with elliptical profile
    const points: THREE.Vector2[] = [];
    const pierH = 25;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = hw * (1 + (1 - t) * 0.15); // slight taper: wider at base
      points.push(new THREE.Vector2(r, -12 + t * pierH));
    }
    const pierGeo = new THREE.LatheGeometry(points, 24);
    // Scale to make elliptical (wider in X than Z)
    pierGeo.scale(1, 1, hd / hw);
    const pier = new THREE.Mesh(pierGeo);
    pier.position.set(0, 0, 0);
    pier.receiveShadow = true;
    this.pierMeshes.push(pier);
    g.add(pier);

    // Stepped base
    const stepGeo = new THREE.BoxGeometry(hw * 2.4, 3, hd * 2.4);
    const step = new THREE.Mesh(stepGeo);
    step.position.set(0, -14, 0);
    step.receiveShadow = true;
    this.pierMeshes.push(step);
    g.add(step);

    // Steel fender ring: protects pier from ship collision
    const fenderGeo = new THREE.TorusGeometry(hw * 1.3, 1.5, 8, 32);
    fenderGeo.scale(1, 0.3, hd / hw * 1.3);
    const fender = new THREE.Mesh(fenderGeo);
    fender.position.set(0, -5, 0);
    fender.rotation.x = Math.PI / 2;
    this.fenderMeshes.push(fender);
    g.add(fender);

    this.group.add(g);
  }

  private buildNorthPier(): void {
    const g = new THREE.Group();
    const hw = TOWER.colSpacing + TOWER.baseW * 0.65;
    const hd = TOWER.baseD * 1.25;

    // Shorter pier founded on rock
    const pierGeo = new THREE.BoxGeometry(hw * 2, 18, hd * 2);
    const pier = new THREE.Mesh(pierGeo);
    pier.position.set(0, -6, BRIDGE.mainSpan);
    pier.receiveShadow = true;
    this.pierMeshes.push(pier);
    g.add(pier);

    // Rock foundation visible at base
    const rockGeo = new THREE.DodecahedronGeometry(hw * 1.2, 1);
    rockGeo.scale(1.5, 0.4, 1.2);
    const rock = new THREE.Mesh(rockGeo);
    rock.position.set(0, -16, BRIDGE.mainSpan);
    this.pierMeshes.push(rock);
    g.add(rock);

    this.group.add(g);
  }

  applyMaterials(mats: BridgeMaterials): void {
    for (const m of this.pierMeshes) {
      m.material = mats.pierConcrete;
    }
    for (const m of this.fenderMeshes) {
      m.material = mats.galvanizedSteel;
    }
  }
}
```

- [ ] **Step 2: Register and commit**

```bash
git add src/landmarks/bridge/towers/PierAndFender.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T6): add elliptical pier with stepped base and steel fender ring"
```

---

## Task 13: T7 & T8 — Aviation Lights + Maintenance Access

**Files:**
- Create: `src/landmarks/bridge/towers/AviationLights.ts`
- Create: `src/landmarks/bridge/towers/MaintenanceAccess.ts`

- [ ] **Step 1: Aviation Lights with detailed housing and platforms**

```typescript
// src/landmarks/bridge/towers/AviationLights.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class AviationLights extends BaseBridgePart {
  constructor() {
    super('aviation-lights');
  }

  buildGeometry(): void {
    const { colSpacing } = TOWER;

    for (const tz of [0, BRIDGE.mainSpan]) {
      for (const side of [-1, 1]) {
        const cx = side * colSpacing;
        const g = new THREE.Group();

        // Light platform (small octagonal platform)
        const platGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 8);
        const plat = new THREE.Mesh(platGeo);
        plat.position.y = 0;
        g.add(plat);

        // Light housing (cylindrical)
        const housingGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8);
        const housing = new THREE.Mesh(housingGeo);
        housing.position.y = 0.55;
        g.add(housing);

        // Light lens (emissive red sphere)
        const lensGeo = new THREE.SphereGeometry(0.35, 12, 8);
        const lensMat = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 5,
          roughness: 0.2,
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.y = 1.1;
        g.add(lens);

        // Guard railing around platform
        const railGeo = new THREE.TorusGeometry(1.1, 0.04, 4, 16);
        const rail = new THREE.Mesh(railGeo);
        rail.position.y = 0.8;
        rail.rotation.x = Math.PI / 2;
        g.add(rail);

        g.position.set(cx, BRIDGE.towerH + 6, tz);
        this.group.add(g);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.material.emissive) {
        obj.material = mats.galvanizedSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Maintenance Access with elevator housing, ladders, catwalks**

```typescript
// src/landmarks/bridge/towers/MaintenanceAccess.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, TOWER } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class MaintenanceAccess extends BaseBridgePart {
  constructor() {
    super('maintenance-access');
  }

  buildGeometry(): void {
    for (const tz of [0, BRIDGE.mainSpan]) {
      // Elevator enclosure on one side of tower
      this.addElevatorHousing(TOWER.colSpacing, tz);

      // Ladder rungs on tower face (instanced)
      this.addLadderRungs(tz);

      // Inspection catwalks at strut levels
      this.addCatwalks(tz);
    }
  }

  private addElevatorHousing(cx: number, tz: number): void {
    const g = new THREE.Group();

    // Elevator shaft: tall narrow box attached to column
    const shaftGeo = new THREE.BoxGeometry(2.5, BRIDGE.towerH - 20, 2);
    const shaft = new THREE.Mesh(shaftGeo);
    shaft.position.y = BRIDGE.towerH / 2;
    g.add(shaft);

    // Machine room at top
    const roomGeo = new THREE.BoxGeometry(3, 4, 2.5);
    const room = new THREE.Mesh(roomGeo);
    room.position.y = BRIDGE.towerH + 2;
    g.add(room);

    g.position.set(cx + TOWER.baseW / 2 + 1.5, 0, tz);
    this.group.add(g);
  }

  private addLadderRungs(tz: number): void {
    const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 4);
    rungGeo.rotateZ(Math.PI / 2);
    const rungCount = Math.floor(BRIDGE.towerH / 0.4);
    const rungMesh = new THREE.InstancedMesh(
      rungGeo, new THREE.MeshStandardMaterial(), rungCount,
    );

    const _m4 = new THREE.Matrix4();
    for (let i = 0; i < rungCount; i++) {
      _m4.makeTranslation(
        -TOWER.colSpacing - TOWER.baseW / 2 - 0.5,
        20 + i * 0.4,
        tz,
      );
      rungMesh.setMatrixAt(i, _m4);
    }
    rungMesh.instanceMatrix.needsUpdate = true;
    this.group.add(rungMesh);
  }

  private addCatwalks(tz: number): void {
    const cwW = TOWER.colSpacing * 2 + TOWER.baseW;
    const cwGeo = new THREE.BoxGeometry(cwW, 0.1, 1.5);

    for (const py of TOWER.portalYs) {
      const cw = new THREE.Mesh(cwGeo);
      cw.position.set(0, py + TOWER.portalH / 2 + 0.5, tz - TOWER.baseD * 0.5 - 1);
      this.group.add(cw);
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.material = mats.galvanizedSteel;
      }
    });
  }
}
```

- [ ] **Step 3: Register both and commit**

```bash
git add src/landmarks/bridge/towers/AviationLights.ts src/landmarks/bridge/towers/MaintenanceAccess.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(T7,T8): add aviation lights with platforms and maintenance access"
```

---

## Task 14: C1 — Main Cable (61-Strand Bundle)

**Files:**
- Create: `src/landmarks/bridge/cables/MainCable.ts`

- [ ] **Step 1: Implement main cable reusing existing catenary math with strand normal map**

```typescript
// src/landmarks/bridge/cables/MainCable.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, CABLE } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class MainCable extends BaseBridgePart {
  constructor() {
    super('main-cable');
  }

  buildGeometry(): void {
    const B = BRIDGE;
    const cableOffset = B.deckW / 2 + 2;

    for (const side of [-1, 1]) {
      const x = side * cableOffset;
      const pts = this.computeCablePoints(x, B);
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 300, CABLE.mainR, 12, false);
      const tube = new THREE.Mesh(tubeGeo);
      tube.castShadow = true;
      this.group.add(tube);
    }
  }

  private computeCablePoints(x: number, B: typeof BRIDGE): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const ancTopY = 32.5;

    // South anchorage approach
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const z = THREE.MathUtils.lerp(-B.sideSpan - 30, -B.sideSpan, t);
      const y = THREE.MathUtils.lerp(ancTopY, 50, t);
      pts.push(new THREE.Vector3(x, y, z));
    }

    // South side span
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const z = -B.sideSpan + t * B.sideSpan;
      const sag = -30 * Math.sin(Math.PI * t);
      const y = THREE.MathUtils.lerp(50, B.towerH, t) + sag;
      pts.push(new THREE.Vector3(x, y, z));
    }

    // Main span (parabolic)
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const z = t * B.mainSpan;
      const y = B.cableSag + (B.towerH - B.cableSag) * Math.pow(2 * t - 1, 2);
      pts.push(new THREE.Vector3(x, y, z));
    }

    // North side span
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const z = B.mainSpan + t * B.sideSpan;
      const sag = -30 * Math.sin(Math.PI * t);
      const y = THREE.MathUtils.lerp(B.towerH, 50, t) + sag;
      pts.push(new THREE.Vector3(x, y, z));
    }

    // North anchorage approach
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const z = THREE.MathUtils.lerp(B.mainSpan + B.sideSpan, B.mainSpan + B.sideSpan + 30, t);
      const y = THREE.MathUtils.lerp(50, ancTopY, t);
      pts.push(new THREE.Vector3(x, y, z));
    }

    return pts;
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.cableSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Register and commit**

```bash
git add src/landmarks/bridge/cables/MainCable.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(C1): add 61-strand main cable with higher segment count"
```

---

## Task 15: C2 — Cable Bands

**Files:**
- Create: `src/landmarks/bridge/cables/CableBand.ts`

- [ ] **Step 1: Implement cable band clamps using InstancedMesh**

```typescript
// src/landmarks/bridge/cables/CableBand.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, CABLE } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class CableBand extends BaseBridgePart {
  constructor() {
    super('cable-band');
  }

  buildGeometry(): void {
    const B = BRIDGE;
    const cableOffset = B.deckW / 2 + 2;

    // Band geometry: torus segment wrapping cable
    const bandGeo = new THREE.TorusGeometry(
      CABLE.bandR, CABLE.bandW / 2, 8, 16,
    );
    bandGeo.rotateX(Math.PI / 2);

    // Count bands across all spans
    const mainBands = Math.floor(B.mainSpan / B.suspSpacing);
    const sideBands = Math.floor(B.sideSpan / B.suspSpacing) * 2;
    const totalBands = (mainBands + sideBands) * 2; // ×2 for both cable sides

    const bandMesh = new THREE.InstancedMesh(
      bandGeo, new THREE.MeshStandardMaterial(), totalBands,
    );
    const _m4 = new THREE.Matrix4();
    let idx = 0;

    for (const side of [-1, 1]) {
      const x = side * cableOffset;

      // Main span bands
      for (let i = 1; i < mainBands; i++) {
        const t = i / mainBands;
        const z = t * B.mainSpan;
        const y = B.cableSag + (B.towerH - B.cableSag) * Math.pow(2 * t - 1, 2);
        _m4.makeTranslation(x, y, z);
        bandMesh.setMatrixAt(idx++, _m4);
      }

      // Side span bands
      for (const spanStart of [-B.sideSpan, B.mainSpan]) {
        const ns = Math.floor(B.sideSpan / B.suspSpacing);
        for (let i = 1; i < ns; i++) {
          const t = i / ns;
          const z = spanStart + t * B.sideSpan;
          let y: number;
          if (spanStart < 0) {
            y = THREE.MathUtils.lerp(50, B.towerH, t) + (-30 * Math.sin(Math.PI * t));
          } else {
            y = THREE.MathUtils.lerp(B.towerH, 50, t) + (-30 * Math.sin(Math.PI * t));
          }
          _m4.makeTranslation(x, y, z);
          bandMesh.setMatrixAt(idx++, _m4);
        }
      }
    }

    bandMesh.count = idx;
    bandMesh.instanceMatrix.needsUpdate = true;
    bandMesh.castShadow = true;
    this.group.add(bandMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        obj.material = mats.castIron;
      }
    });
  }
}
```

- [ ] **Step 2: Register and commit**

```bash
git add src/landmarks/bridge/cables/CableBand.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(C2): add cable band clamps at suspender attachment points"
```

---

## Task 16: C3 — Suspenders (Paired Wire Ropes)

**Files:**
- Create: `src/landmarks/bridge/cables/Suspenders.ts`

- [ ] **Step 1: Implement paired suspender ropes with socket fittings**

```typescript
// src/landmarks/bridge/cables/Suspenders.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, CABLE } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class Suspenders extends BaseBridgePart {
  constructor() {
    super('suspenders');
  }

  buildGeometry(): void {
    const B = BRIDGE;
    const cableOffset = B.deckW / 2 + 2;
    const gap = CABLE.suspPairGap;

    // Socket fitting at each end of suspender rope
    const socketGeo = new THREE.SphereGeometry(0.12, 6, 4);

    // Collect all suspender positions
    const positions: { x: number; y: number; z: number; h: number }[] = [];

    for (const side of [-1, 1]) {
      const x = side * cableOffset;

      // Main span
      const n = Math.floor(B.mainSpan / B.suspSpacing);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const z = t * B.mainSpan;
        const cableY = B.cableSag + (B.towerH - B.cableSag) * Math.pow(2 * t - 1, 2);
        const h = cableY - B.deckH - 2;
        if (h < 2) continue;
        positions.push({ x, y: B.deckH + 2, z, h });
      }

      // Side spans
      for (const spanStart of [-B.sideSpan, B.mainSpan]) {
        const ns = Math.floor(B.sideSpan / B.suspSpacing);
        for (let i = 1; i < ns; i++) {
          const t = i / ns;
          const z = spanStart + t * B.sideSpan;
          let cableY: number;
          if (spanStart < 0) {
            cableY = THREE.MathUtils.lerp(50, B.towerH, t) + (-30 * Math.sin(Math.PI * t));
          } else {
            cableY = THREE.MathUtils.lerp(B.towerH, 50, t) + (-30 * Math.sin(Math.PI * t));
          }
          const h = cableY - B.deckH - 2;
          if (h < 2) continue;
          positions.push({ x, y: B.deckH + 2, z, h });
        }
      }
    }

    // Paired ropes: two cylinders per position
    const ropeGeo = new THREE.CylinderGeometry(CABLE.suspR, CABLE.suspR, 1, 4);
    const totalRopes = positions.length * 2;
    const ropeMesh = new THREE.InstancedMesh(ropeGeo, new THREE.MeshStandardMaterial(), totalRopes);
    const socketMesh = new THREE.InstancedMesh(socketGeo, new THREE.MeshStandardMaterial(), totalRopes * 2);

    const _m4 = new THREE.Matrix4();
    const _s = new THREE.Vector3();
    let ropeIdx = 0;
    let socketIdx = 0;

    for (const pos of positions) {
      for (const offset of [-gap / 2, gap / 2]) {
        // Rope
        _m4.identity();
        _s.set(1, pos.h, 1);
        _m4.makeTranslation(pos.x + offset, pos.y + pos.h / 2, pos.z);
        _m4.scale(_s);
        ropeMesh.setMatrixAt(ropeIdx++, _m4);

        // Top socket
        _m4.makeTranslation(pos.x + offset, pos.y + pos.h, pos.z);
        socketMesh.setMatrixAt(socketIdx++, _m4);

        // Bottom socket
        _m4.makeTranslation(pos.x + offset, pos.y, pos.z);
        socketMesh.setMatrixAt(socketIdx++, _m4);
      }
    }

    ropeMesh.count = ropeIdx;
    socketMesh.count = socketIdx;
    ropeMesh.instanceMatrix.needsUpdate = true;
    socketMesh.instanceMatrix.needsUpdate = true;

    this.group.add(ropeMesh, socketMesh);
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) {
        obj.material = mats.cableSteel;
      }
    });
  }
}
```

- [ ] **Step 2: Register and commit**

```bash
git add src/landmarks/bridge/cables/Suspenders.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(C3): add paired suspender ropes with socket fittings"
```

---

## Task 17: C4 & C5 — Cable Saddle + Cable Anchorage

**Files:**
- Create: `src/landmarks/bridge/cables/CableSaddle.ts`
- Create: `src/landmarks/bridge/cables/CableAnchorage.ts`

- [ ] **Step 1: Cable Saddle — roller mechanism at tower top**

```typescript
// src/landmarks/bridge/cables/CableSaddle.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE, CABLE } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class CableSaddle extends BaseBridgePart {
  constructor() {
    super('cable-saddle');
  }

  buildGeometry(): void {
    const cableOffset = BRIDGE.deckW / 2 + 2;

    for (const tz of [0, BRIDGE.mainSpan]) {
      for (const side of [-1, 1]) {
        const x = side * cableOffset;
        const g = new THREE.Group();

        // Saddle frame
        const frameGeo = new THREE.BoxGeometry(CABLE.saddleW, CABLE.saddleH, CABLE.saddleD);
        g.add(new THREE.Mesh(frameGeo));

        // Roller cylinders (cable rolls over these)
        const rollerGeo = new THREE.CylinderGeometry(0.3, 0.3, CABLE.saddleD - 0.5, 8);
        rollerGeo.rotateX(Math.PI / 2);
        for (const rx of [-0.6, 0, 0.6]) {
          const roller = new THREE.Mesh(rollerGeo);
          roller.position.set(rx, CABLE.saddleH / 2 - 0.3, 0);
          g.add(roller);
        }

        // Bolts on saddle (decorative)
        const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 6);
        for (const bx of [-1.2, -0.6, 0, 0.6, 1.2]) {
          for (const bz of [-CABLE.saddleD / 2 - 0.1, CABLE.saddleD / 2 + 0.1]) {
            const bolt = new THREE.Mesh(boltGeo);
            bolt.position.set(bx, 0, bz);
            bolt.rotation.x = Math.PI / 2;
            g.add(bolt);
          }
        }

        g.position.set(x, BRIDGE.towerH + 5.5, tz);
        this.group.add(g);
      }
    }
  }

  applyMaterials(mats: BridgeMaterials): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = mats.castIron;
      }
    });
  }
}
```

- [ ] **Step 2: Cable Anchorage — stepped concrete with splay chamber**

```typescript
// src/landmarks/bridge/cables/CableAnchorage.ts
import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class CableAnchorage extends BaseBridgePart {
  constructor() {
    super('cable-anchorage');
  }

  buildGeometry(): void {
    const B = BRIDGE;

    for (const z of [-B.sideSpan - 30, B.mainSpan + B.sideSpan + 30]) {
      const g = new THREE.Group();

      // Stepped concrete mass (3 steps, Art Deco style)
      const steps = [
        { w: 48, h: 12, d: 55 },
        { w: 42, h: 10, d: 48 },
        { w: 36, h: 10, d: 42 },
      ];
      let sy = 0;
      for (const step of steps) {
        const geo = new THREE.BoxGeometry(step.w, step.h, step.d);
        const mesh = new THREE.Mesh(geo);
        mesh.position.y = sy + step.h / 2;
        mesh.receiveShadow = true;
        g.add(mesh);
        sy += step.h;
      }

      // Cable entry portals (where cables enter the anchorage)
      const portalW = 4;
      const portalH = 6;
      const cableOffset = B.deckW / 2 + 2;
      for (const side of [-1, 1]) {
        // Portal frame
        const portalGeo = new THREE.BoxGeometry(portalW + 1, portalH + 1, 3);
        const portal = new THREE.Mesh(portalGeo);
        portal.position.set(
          side * cableOffset,
          sy - 5,
          z > 0 ? -steps[2].d / 2 : steps[2].d / 2,
        );
        g.add(portal);
      }

      // Art Deco facade treatment: vertical pilasters
      for (let px = -18; px <= 18; px += 6) {
        const pilGeo = new THREE.BoxGeometry(1, sy + 2, 1);
        const pil = new THREE.Mesh(pilGeo);
        pil.position.set(px, sy / 2, z > 0 ? -steps[0].d / 2 - 0.5 : steps[0].d / 2 + 0.5);
        g.add(pil);
      }

      g.position.set(0, 0, z);
      this.group.add(g);
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

- [ ] **Step 3: Register both and commit**

```bash
git add src/landmarks/bridge/cables/CableSaddle.ts src/landmarks/bridge/cables/CableAnchorage.ts src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat(C4,C5): add cable saddle with rollers and stepped cable anchorages"
```

---

## Task 18: Final BridgeAssembler — Register All Parts

**Files:**
- Modify: `src/landmarks/bridge/BridgeAssembler.ts`

- [ ] **Step 1: Complete the assembler with all tower and cable part registrations**

Replace the full `BridgeAssembler.ts`:

```typescript
// src/landmarks/bridge/BridgeAssembler.ts
import { BaseLandmark } from '@/landmarks/BaseLandmark';
import type { BridgePart } from './BridgePart';
import type { BridgeMaterials } from '@/world/Materials';

// Towers
import { TowerShaft } from './towers/TowerShaft';
import { TowerPortals } from './towers/TowerPortals';
import { TowerCells } from './towers/TowerCells';
import { ArtDecoPanels } from './towers/ArtDecoPanels';
import { TowerCap } from './towers/TowerCap';
import { PierAndFender } from './towers/PierAndFender';
import { AviationLights } from './towers/AviationLights';
import { MaintenanceAccess } from './towers/MaintenanceAccess';

// Cables
import { MainCable } from './cables/MainCable';
import { CableBand } from './cables/CableBand';
import { Suspenders } from './cables/Suspenders';
import { CableSaddle } from './cables/CableSaddle';
import { CableAnchorage } from './cables/CableAnchorage';

export class BridgeAssembler extends BaseLandmark {
  private parts: BridgePart[] = [];
  private updatableParts: BridgePart[] = [];

  constructor(private mats: BridgeMaterials) {
    super('golden-gate');
  }

  private registerPart(part: BridgePart): void {
    this.parts.push(part);
    if (part.update) {
      this.updatableParts.push(part);
    }
  }

  build(): void {
    // Register all parts
    // Towers
    this.registerPart(new TowerShaft());
    this.registerPart(new TowerPortals());
    this.registerPart(new TowerCells());
    this.registerPart(new ArtDecoPanels());
    this.registerPart(new TowerCap());
    this.registerPart(new PierAndFender());
    this.registerPart(new AviationLights());
    this.registerPart(new MaintenanceAccess());

    // Cables
    this.registerPart(new MainCable());
    this.registerPart(new CableBand());
    this.registerPart(new Suspenders());
    this.registerPart(new CableSaddle());
    this.registerPart(new CableAnchorage());

    // Phase 1: Geometry
    for (const p of this.parts) {
      p.buildGeometry();
    }

    // Phase 2: Materials
    for (const p of this.parts) {
      p.applyMaterials(this.mats);
    }

    // Phase 3: Micro-details (no-op for most parts in Plan 1)
    for (const p of this.parts) {
      p.addMicroDetails();
    }

    // Add all part groups to our group
    for (const p of this.parts) {
      this.group.add(p.group);
    }
  }

  update(dt: number, elapsed: number): void {
    for (const p of this.updatableParts) {
      p.update!(dt, elapsed);
    }
  }

  dispose(): void {
    for (const p of this.parts) {
      p.dispose();
    }
    super.dispose();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landmarks/bridge/BridgeAssembler.ts
git commit -m "feat: complete BridgeAssembler with all tower and cable parts registered"
```

---

## Task 19: Integration — Replace GoldenGateBridge in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace GoldenGateBridge with BridgeAssembler**

In `src/main.ts`, change the import and instantiation:

Replace:
```typescript
import { GoldenGateBridge } from '@/landmarks/GoldenGateBridge';
```
With:
```typescript
import { BridgeAssembler } from '@/landmarks/bridge/BridgeAssembler';
```

Replace:
```typescript
const ggb = new GoldenGateBridge(mats);
```
With:
```typescript
const ggb = new BridgeAssembler(mats);
```

In the game loop, add the bridge update call. Find the `loop.register` callback and add:
```typescript
// After birds.update(dt, elapsed);
ggb.update(dt, elapsed);
```

- [ ] **Step 2: Verify dev server runs and bridge renders**

Run: `npm run dev`
Expected: Bridge renders with new cruciform tower columns, arched portals, cell structures, Art Deco panels, detailed saddles, elliptical piers, aviation lights, maintenance access, 61-strand cable, cable bands, paired suspenders, and cable anchorages. All using expanded PBR materials.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate BridgeAssembler replacing monolithic GoldenGateBridge"
```

---

## Task 20: Cleanup — Remove Old GoldenGateBridge.ts

**Files:**
- Remove: `src/landmarks/GoldenGateBridge.ts`

- [ ] **Step 1: Delete old file after verifying new system works**

```bash
git rm src/landmarks/GoldenGateBridge.ts
```

- [ ] **Step 2: Verify no remaining imports reference the old file**

Run: `npx tsc --noEmit`
Expected: No errors (the old file should have no remaining importers)

- [ ] **Step 3: Final commit**

```bash
git commit -m "refactor: remove legacy GoldenGateBridge.ts, fully replaced by BridgeAssembler"
```

---

## Follow-Up Plans

This plan delivers **13 parts** (8 towers + 5 cables) with the expanded PBR material system. The remaining work:

**Plan 2: Deck & Approaches** (12 parts)
- D1–D7: Stiffening truss, floor system, road surface, sidewalk/railing, light standards, drainage, expansion joints
- A1–A5: Fort Point arch, anchorages, toll plaza, approach viaducts

**Plan 3: Micro-Details & Environment** (5 parts)
- S3: Rivet system, splice plates, weld beads, gusset plates
- E1–E2: Water interaction, atmospheric effects
