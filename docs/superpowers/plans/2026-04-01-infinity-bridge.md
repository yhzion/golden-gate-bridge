# Infinity Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Golden Gate Bridge into an infinite driving experience with a high-quality Porsche Boxster soft-top, seamless tile looping, diverse NPC traffic, and rich night lighting.

**Architecture:** A 3-tile continuous scroll system renders the bridge as repeatable ~1,623m segments. DriveMode orchestrates a PlayerCar (GLTF Boxster), DriverCamera (1st/3rd person), InfinityTileManager (tile cycling + world recentering), and dynamic spawn systems (NPC vehicles, boats, birds). The existing cinematic mode remains intact.

**Tech Stack:** Three.js r183, TypeScript, Vite, GLTFLoader for vehicle models

**Spec:** `docs/superpowers/specs/2026-04-01-infinity-bridge-design.md`

---

## File Structure

```
src/
  drive/
    DriveMode.ts            # Mode state machine, entry/exit, orchestrates all drive subsystems
    InfinityTileManager.ts  # 3-tile cycling, LOD towers, world recentering
    DriverCamera.ts         # 1st/3rd person camera, mouse look, orbital
    PlayerCar.ts            # GLTF Boxster loader, lights, wheel animation
  landmarks/bridge/
    BridgeTile.ts           # Builds one repeatable bridge segment (~1,623m)
    LODTower.ts             # Simplified tower silhouette for distance rendering
  traffic/
    NPCVehicleSystem.ts     # GLTF-based diverse NPC vehicles with lights
    BoatSystem.ts           # Boats with navigation lights
  ui/
    DriveHUD.ts             # Minimal speed/view HUD for drive mode
```

**Existing files modified:**
- `src/main.ts` — Add DriveMode initialization + mode toggle
- `src/config/bridge.ts` — Add tile/infinity constants
- `index.html` — Add DRIVE mode button + DriveHUD markup

---

## Task 1: Bridge Config — Infinity Constants

**Files:**
- Modify: `src/config/bridge.ts`

- [ ] **Step 1: Add infinity tile constants to bridge config**

```typescript
// Add at end of src/config/bridge.ts

export const TILE = {
  /** Length of one repeatable tile: mainSpan + sideSpan */
  length: BRIDGE.mainSpan + BRIDGE.sideSpan,  // 1623m
  /** Tower Z positions within a tile (relative to tile start) */
  towerZs: [0, BRIDGE.sideSpan, BRIDGE.sideSpan + BRIDGE.mainSpan],  // [0, 343, 1623]
  /** Number of active full-detail tiles */
  activeTiles: 3,
  /** Number of LOD towers beyond active tiles (each direction) */
  lodTowerCount: 4,
  /** Distance at which LOD towers fade to invisible */
  lodFadeEnd: 6500,
  /** World recentering threshold */
  recenterThreshold: 5000,
} as const;

export const DRIVE = {
  /** Player speed in m/s (~90 km/h) */
  speed: 25,
  /** Player lane index (right lane 2, 0-indexed) */
  laneIdx: 4,  // LANES[4] = 3.75
  /** Camera height above road for 1st person */
  eyeH: 1.2,
  /** 3rd person camera offset behind car */
  thirdPersonBack: 5,
  /** 3rd person camera offset above car */
  thirdPersonUp: 2,
} as const;
```

- [ ] **Step 2: Verify config compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/config/bridge.ts
git commit -m "feat(config): add infinity tile and drive mode constants"
```

---

## Task 2: BridgeTile — Repeatable Bridge Segment

**Files:**
- Create: `src/landmarks/bridge/BridgeTile.ts`
- Read (reference only): `src/landmarks/bridge/towers/TowerShaft.ts`, `src/landmarks/bridge/cables/MainCable.ts`, `src/landmarks/bridge/cables/Suspenders.ts`, `src/landmarks/bridge/deck/DeckSurface.ts`, `src/landmarks/bridge/deck/StiffeningTruss.ts`, `src/landmarks/bridge/deck/LightStandards.ts`, `src/landmarks/bridge/deck/SidewalkRailing.ts`, `src/landmarks/bridge/towers/TowerPortals.ts`, `src/landmarks/bridge/towers/TowerCells.ts`, `src/landmarks/bridge/towers/TowerCap.ts`

A BridgeTile builds one repeatable segment containing 3 towers, cables, suspenders, deck, truss, lights, and railing. All geometry is positioned relative to `startZ` so tiles can be placed at any offset.

- [ ] **Step 1: Create BridgeTile class skeleton**

Read the existing bridge part files listed above to understand exact geometry construction patterns (cruciform profile, cable catenary math, suspender placement, deck surface, truss diagonals, light standards). Then create `src/landmarks/bridge/BridgeTile.ts`:

```typescript
import * as THREE from 'three';
import { BRIDGE, TOWER, CABLE, DECK, TILE, LANES } from '../../config/bridge';
import type { BridgeMaterials } from '../../world/Materials';

/**
 * One repeatable bridge segment (~1,623m) containing:
 * - 3 towers (full detail with portals, cells, caps)
 * - 2 cable spans (main + side)
 * - Suspender cables
 * - Deck surface with lane markings
 * - Stiffening truss (both sides)
 * - Sidewalk railing
 * - Street lights
 *
 * All geometry is local to the tile's Group.
 * Position the tile by setting group.position.z = startZ.
 */
export class BridgeTile {
  readonly group = new THREE.Group();
  private geometries: THREE.BufferGeometry[] = [];
  private meshes: THREE.Mesh[] = [];

  constructor(private mats: BridgeMaterials) {}

  build(): void {
    this.buildTowers();
    this.buildCables();
    this.buildSuspenders();
    this.buildDeck();
    this.buildTruss();
    this.buildRailing();
    this.buildLights();
  }

  /** Set tile world position (Z offset) */
  setOffset(z: number): void {
    this.group.position.z = z;
  }

  private buildTowers(): void {
    // Build 3 towers at TILE.towerZs relative positions
    // Replicate TowerShaft cruciform geometry + TowerPortals + TowerCells + TowerCap
    // Use the exact same createCruciformShape, section configs, and portal Y positions
    // from the existing tower parts
  }

  private buildCables(): void {
    // Build 2 cable spans (side span + main span) on both sides (±cableX)
    // Replicate MainCable catenary math:
    // Main span: height = cableSag + (towerH - cableSag) * (2t-1)²
    // Side span: lerp(50, towerH, t) + -30*sin(π*t)
    // Use TubeGeometry around CatmullRomCurve3
  }

  private buildSuspenders(): void {
    // InstancedMesh for suspender ropes
    // Every CABLE.suspSpacing along both spans
    // Height from cable Y to deckH
    // Replicate Suspenders.ts math for cable Y functions
  }

  private buildDeck(): void {
    // PlaneGeometry road surface at deckH
    // Lane markings (center yellow, edge white, dashed dividers)
    // Replicate DeckSurface.ts patterns
  }

  private buildTruss(): void {
    // Both sides: top chord, bottom chord, diagonals, verticals
    // Replicate StiffeningTruss.ts Warren pattern
  }

  private buildRailing(): void {
    // Both sidewalk edges: rail + pickets
    // Replicate SidewalkRailing.ts
  }

  private buildLights(): void {
    // InstancedMesh: shaft + arm + lantern at DECK.lightSpacing intervals
    // Replicate LightStandards.ts
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.geometries.length = 0;
    this.meshes.length = 0;
  }

  /** Reset for object pool reuse (just reposition, no rebuild needed) */
  recycle(newOffsetZ: number): void {
    this.setOffset(newOffsetZ);
  }
}
```

- [ ] **Step 2: Implement buildTowers()**

Read `src/landmarks/bridge/towers/TowerShaft.ts` and replicate the cruciform extrusion logic. Read `TowerPortals.ts`, `TowerCells.ts`, `TowerCap.ts` for portal struts, cell grid, and cap geometry. Build all 3 towers at local Z positions `TILE.towerZs[0]`, `TILE.towerZs[1]`, `TILE.towerZs[2]`.

Key geometry from TowerShaft:
- 2 columns per tower at `x = ±TOWER.colSpacing/2`
- 5 sections per column with cruciform cross-section (use `createCruciformShape` from `src/world/profiles/CruciformProfile.ts`)
- Each section: `ExtrudeGeometry(shape, { depth: section.h })`, rotated `-π/2` on X to be vertical
- Material: `mats.towerSteel`

Include portals at `TOWER.portalYs`, cell divisions at `TOWER.cellH` spacing, and tower caps.

- [ ] **Step 3: Implement buildCables()**

Read `src/landmarks/bridge/cables/MainCable.ts` and replicate the catenary curve math. For one tile, build:
- Side span cable (towerZs[0] to towerZs[1], 343m)
- Main span cable (towerZs[1] to towerZs[2], 1280m)
- Both sides: `x = ±(TOWER.colSpacing/2)`

Cable height functions:
```typescript
// Main span: t goes 0→1 over 1280m
const mainY = (t: number) => {
  const u = 2 * t - 1;
  return CABLE.mainR + BRIDGE.cableSag + (BRIDGE.towerH - BRIDGE.cableSag) * u * u;
};

// Side span: t goes 0→1 over 343m
const sideY = (t: number) => {
  const base = THREE.MathUtils.lerp(50, BRIDGE.towerH, t);
  return base + (-30) * Math.sin(Math.PI * t);
};
```

Use `TubeGeometry(new THREE.CatmullRomCurve3(points), segments, CABLE.mainR, 12)`.

- [ ] **Step 4: Implement buildSuspenders()**

Read `src/landmarks/bridge/cables/Suspenders.ts`. Use InstancedMesh for all suspender ropes in the tile.
- Spacing: every `CABLE.suspSpacing` (15.2m) along both spans
- Height per suspender: `cableY(t) - BRIDGE.deckH - 2`
- Two ropes per hanger, offset by `±CABLE.suspPairGap/2` in X
- Geometry: `CylinderGeometry(CABLE.suspR, CABLE.suspR, 1, 6)` scaled to height

- [ ] **Step 5: Implement buildDeck()**

Read `src/landmarks/bridge/deck/DeckSurface.ts`. Build:
- Road plane: `PlaneGeometry(BRIDGE.deckW - 2, TILE.length)` at `y = BRIDGE.deckH + 0.02`
- Sidewalks: Two `PlaneGeometry(1.8, TILE.length)` at `y = BRIDGE.deckH + 0.08`
- Lane markings: Center double yellow, edge whites, dashed dividers via InstancedMesh

- [ ] **Step 6: Implement buildTruss()**

Read `src/landmarks/bridge/deck/StiffeningTruss.ts`. Build Warren truss on both sides:
- Top chord at `y = deckH`, bottom chord at `y = deckH - trussH`
- Diagonals: InstancedMesh, two per panel, ascending + descending
- Verticals: InstancedMesh at each panel point
- `x = ±BRIDGE.deckW/2`

- [ ] **Step 7: Implement buildRailing() and buildLights()**

Read `src/landmarks/bridge/deck/SidewalkRailing.ts` and `src/landmarks/bridge/deck/LightStandards.ts`.
- Railing: rail bar + vertical pickets at `DECK.railPicketSpacing`
- Lights: shaft + arm + lantern InstancedMesh at `DECK.lightSpacing` (50m)

- [ ] **Step 8: Verify tile renders correctly**

In `src/main.ts`, temporarily add after bridge build:
```typescript
import { BridgeTile } from './landmarks/bridge/BridgeTile';
const testTile = new BridgeTile(mats);
testTile.build();
testTile.setOffset(2000); // Place beyond original bridge
sm.scene.add(testTile.group);
```

Run: `npm run dev`
Expected: A second bridge segment appears starting at z=2000, visually matching the original bridge. Verify towers, cables, deck, truss all look correct.

- [ ] **Step 9: Remove test code and commit**

Remove the temporary test code from main.ts.

```bash
git add src/landmarks/bridge/BridgeTile.ts
git commit -m "feat(bridge): add BridgeTile for repeatable bridge segments"
```

---

## Task 3: LODTower — Distance Tower Silhouette

**Files:**
- Create: `src/landmarks/bridge/LODTower.ts`

- [ ] **Step 1: Create LODTower class**

A simplified tower mesh (~1/10 polygon count) for rendering beyond active tiles. Only shows the tower silhouette and a thin cable line.

```typescript
import * as THREE from 'three';
import { BRIDGE, TOWER, CABLE } from '../../config/bridge';
import type { BridgeMaterials } from '../../world/Materials';

/**
 * Simplified tower for distance rendering.
 * ~1/10 polygon count of full tower.
 * Shows: 2 column boxes + 2 cross-struts + thin cable line.
 */
export class LODTower {
  readonly group = new THREE.Group();
  private static sharedGeo: THREE.BufferGeometry | null = null;

  constructor(mats: BridgeMaterials) {
    if (!LODTower.sharedGeo) {
      LODTower.sharedGeo = this.createMergedGeometry();
    }
    const mesh = new THREE.Mesh(LODTower.sharedGeo, mats.towerSteel);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.group.add(mesh);
  }

  private createMergedGeometry(): THREE.BufferGeometry {
    const geos: THREE.BufferGeometry[] = [];
    const halfCol = TOWER.colSpacing / 2;

    // Two simplified columns (box instead of cruciform)
    for (const side of [-1, 1]) {
      const col = new THREE.BoxGeometry(
        TOWER.baseW * 0.8, BRIDGE.towerH, TOWER.baseD * 0.8
      );
      col.translate(side * halfCol, BRIDGE.towerH / 2, 0);
      geos.push(col);
    }

    // Two cross-struts (at portal heights)
    for (const py of [TOWER.portalYs[0], TOWER.portalYs[2]]) {
      const strut = new THREE.BoxGeometry(TOWER.colSpacing, TOWER.portalH, TOWER.baseD * 0.6);
      strut.translate(0, py, 0);
      geos.push(strut);
    }

    const merged = THREE.BufferGeometryUtils.mergeGeometries(geos);
    for (const g of geos) g.dispose();
    return merged;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
```

- [ ] **Step 2: Verify LODTower compiles and looks reasonable**

Temporarily add to main.ts:
```typescript
import { LODTower } from './landmarks/bridge/LODTower';
const lod = new LODTower(mats);
lod.setPosition(0, 0, 3000);
sm.scene.add(lod.group);
```

Run: `npm run dev`, fly to z=3000 and verify a simplified tower shape appears. Remove test code.

- [ ] **Step 3: Commit**

```bash
git add src/landmarks/bridge/LODTower.ts
git commit -m "feat(bridge): add LODTower simplified silhouette for distance rendering"
```

---

## Task 4: InfinityTileManager — Tile Cycling & Recentering

**Files:**
- Create: `src/drive/InfinityTileManager.ts`

- [ ] **Step 1: Create InfinityTileManager**

```typescript
import * as THREE from 'three';
import { TILE } from '../config/bridge';
import { BridgeTile } from '../landmarks/bridge/BridgeTile';
import { LODTower } from '../landmarks/bridge/LODTower';
import type { BridgeMaterials } from '../world/Materials';

/**
 * Manages 3 active BridgeTiles + LOD towers for infinite scrolling.
 *
 * Tiles are indexed by their start-Z in tile units:
 *   tileIndex * TILE.length = worldZ of tile start
 *
 * When the player crosses into a new tile:
 *   - The trailing tile is recycled and placed ahead
 *   - LOD towers are repositioned accordingly
 *
 * World recentering shifts ALL objects back toward origin
 * when player exceeds TILE.recenterThreshold.
 */
export class InfinityTileManager {
  readonly group = new THREE.Group();

  private tiles: BridgeTile[] = [];
  private tileIndices: number[] = [];  // which tile index each slot holds
  private lodTowers: LODTower[] = [];
  private lodGroup = new THREE.Group();

  private currentTileIndex = 0;
  private totalOffset = 0;  // accumulated recentering offset

  constructor(private mats: BridgeMaterials) {}

  build(scene: THREE.Scene): void {
    // Create 3 active tiles centered on index 0
    for (let i = -1; i <= 1; i++) {
      const tile = new BridgeTile(this.mats);
      tile.build();
      tile.setOffset(i * TILE.length);
      this.tiles.push(tile);
      this.tileIndices.push(i);
      this.group.add(tile.group);
    }

    // Create LOD towers for distance (both directions)
    for (let i = 0; i < TILE.lodTowerCount * 2; i++) {
      const lod = new LODTower(this.mats);
      this.lodTowers.push(lod);
      this.lodGroup.add(lod.group);
    }
    this.updateLODPositions();

    scene.add(this.group);
    scene.add(this.lodGroup);
  }

  /**
   * Call each frame with the player's current Z position.
   * Returns a recentering offset if recentering occurred (0 otherwise).
   * Caller must apply returned offset to camera, player car, and all other objects.
   */
  update(playerZ: number): number {
    // Determine which tile the player is in
    const newIndex = Math.floor(playerZ / TILE.length);

    if (newIndex !== this.currentTileIndex) {
      this.currentTileIndex = newIndex;
      this.recycleTiles();
      this.updateLODPositions();
    }

    // World recentering
    if (Math.abs(playerZ) > TILE.recenterThreshold) {
      const shift = -this.currentTileIndex * TILE.length;
      this.applyRecenter(shift);
      this.currentTileIndex = 0;
      this.totalOffset += shift;
      return shift;
    }

    return 0;
  }

  private recycleTiles(): void {
    const needed = [this.currentTileIndex - 1, this.currentTileIndex, this.currentTileIndex + 1];

    for (let slot = 0; slot < 3; slot++) {
      if (this.tileIndices[slot] !== needed[slot]) {
        this.tileIndices[slot] = needed[slot];
        this.tiles[slot].recycle(needed[slot] * TILE.length);
      }
    }
  }

  private updateLODPositions(): void {
    // Place LOD towers beyond active tiles in both directions
    const behindStart = (this.currentTileIndex - 2) * TILE.length;
    const aheadStart = (this.currentTileIndex + 2) * TILE.length;
    let idx = 0;

    // Behind (going backward)
    for (let i = 0; i < TILE.lodTowerCount; i++) {
      const z = behindStart - i * TILE.length;
      // Each tile has 3 towers; place LOD at middle tower position
      this.lodTowers[idx].setPosition(0, 0, z + TILE.towerZs[1]);
      idx++;
    }

    // Ahead (going forward)
    for (let i = 0; i < TILE.lodTowerCount; i++) {
      const z = aheadStart + i * TILE.length;
      this.lodTowers[idx].setPosition(0, 0, z + TILE.towerZs[1]);
      idx++;
    }
  }

  private applyRecenter(shift: number): void {
    // Shift tile group
    this.group.position.z += shift;

    // Update tile offsets
    for (let i = 0; i < 3; i++) {
      this.tileIndices[i] = i - 1; // reset to [-1, 0, 1]
      this.tiles[i].setOffset(this.tileIndices[i] * TILE.length);
    }
    this.group.position.z = 0;

    // Shift LOD group
    for (const lod of this.lodTowers) {
      lod.group.position.z += shift;
    }

    this.updateLODPositions();
  }

  dispose(): void {
    for (const t of this.tiles) t.dispose();
    for (const l of this.lodTowers) l.dispose();
    this.group.removeFromParent();
    this.lodGroup.removeFromParent();
  }
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/drive/InfinityTileManager.ts
git commit -m "feat(drive): add InfinityTileManager for 3-tile cycling and recentering"
```

---

## Task 5: PlayerCar — Porsche Boxster GLTF Loader

**Files:**
- Create: `src/drive/PlayerCar.ts`

- [ ] **Step 1: Search for and download a Porsche Boxster GLTF model**

Search Sketchfab for a high-quality Porsche Boxster (soft-top, open) GLTF model with:
- Interior detail (dashboard, steering wheel, seats)
- PBR textures
- CC license

If no Boxster available, search for: Porsche 718 Spyder, Porsche 718 Boxster, or any Porsche open-top convertible.

Download the GLB file to `public/models/cars/player/boxster.glb`.

Also search for an alternative if the first model lacks interior detail.

- [ ] **Step 2: Create PlayerCar class**

```typescript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BRIDGE, DRIVE, LANES } from '../config/bridge';

/**
 * Player's Porsche Boxster.
 * Loads GLTF model, manages headlights/taillights, wheel rotation.
 */
export class PlayerCar {
  readonly group = new THREE.Group();
  private model: THREE.Group | null = null;
  private wheels: THREE.Object3D[] = [];
  private headlights: THREE.SpotLight[] = [];
  private taillights: THREE.PointLight[] = [];
  private dashLight: THREE.PointLight | null = null;
  private loaded = false;

  /** World Z position (updated each frame) */
  z = 0;

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/models/cars/player/boxster.glb');
    this.model = gltf.scene;

    // Normalize model: find bounding box, scale to ~4.4m length (Boxster length)
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const targetLength = 4.4;
    const scale = targetLength / Math.max(size.x, size.y, size.z);
    this.model.scale.setScalar(scale);

    // Center model at origin
    box.setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.position.sub(center);
    this.model.position.y -= box.min.y; // place on ground

    // Find wheel meshes by name patterns (common GLTF naming)
    this.model.traverse((child) => {
      if (child.name.toLowerCase().includes('wheel') && child instanceof THREE.Mesh) {
        this.wheels.push(child);
      }
      // Enable shadows
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Add headlights (2x SpotLight)
    for (const side of [-0.6, 0.6]) {
      const spot = new THREE.SpotLight(0xfff5e0, 0, 80, Math.PI / 6, 0.5, 1.5);
      spot.position.set(side, 0.6, 2.2);
      spot.target.position.set(side, 0, 20);
      this.model.add(spot);
      this.model.add(spot.target);
      this.headlights.push(spot);
    }

    // Add taillights (2x PointLight)
    for (const side of [-0.6, 0.6]) {
      const pl = new THREE.PointLight(0xff2200, 0, 15);
      pl.position.set(side, 0.5, -2.1);
      this.model.add(pl);
      this.taillights.push(pl);
    }

    // Dashboard ambient light (1st person visibility)
    this.dashLight = new THREE.PointLight(0x334455, 0, 2);
    this.dashLight.position.set(0, 0.8, 0.5);
    this.model.add(this.dashLight);

    this.group.add(this.model);
    this.loaded = true;
  }

  /** Place car on the bridge deck in the configured lane */
  positionOnDeck(): void {
    const laneX = LANES[DRIVE.laneIdx];
    this.group.position.set(laneX, BRIDGE.deckH + 0.01, this.z);
  }

  /** Update each frame */
  update(dt: number, nightFactor: number): void {
    if (!this.loaded) return;

    // Move forward
    this.z += DRIVE.speed * dt;
    this.positionOnDeck();

    // Rotate wheels (circumference-based)
    const wheelRadius = 0.33;
    const angularSpeed = DRIVE.speed / wheelRadius;
    for (const w of this.wheels) {
      w.rotation.x += angularSpeed * dt;
    }

    // Lights: on at night, off during day
    const headIntensity = nightFactor > 0.3 ? THREE.MathUtils.lerp(0, 50, nightFactor) : 0;
    const tailIntensity = nightFactor > 0.3 ? THREE.MathUtils.lerp(0, 5, nightFactor) : 0;
    const dashIntensity = nightFactor > 0.3 ? THREE.MathUtils.lerp(0, 0.5, nightFactor) : 0;

    for (const h of this.headlights) h.intensity = headIntensity;
    for (const t of this.taillights) t.intensity = tailIntensity;
    if (this.dashLight) this.dashLight.intensity = dashIntensity;
  }

  /** Apply recentering offset */
  applyRecenter(shift: number): void {
    this.z += shift;
    this.positionOnDeck();
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const h of this.headlights) h.dispose();
    for (const t of this.taillights) t.dispose();
    this.dashLight?.dispose();
  }
}
```

- [ ] **Step 3: Verify GLTF loads and model appears**

Temporarily add to main.ts:
```typescript
import { PlayerCar } from './drive/PlayerCar';
const car = new PlayerCar();
car.load().then(() => {
  car.z = 640;
  car.positionOnDeck();
  sm.scene.add(car.group);
});
```

Run: `npm run dev`, fly to z=640, deck level. Verify the Boxster model sits on the road correctly.

If model orientation is wrong (facing sideways, upside down, etc.), adjust the rotation in `load()` after scaling. Remove test code.

- [ ] **Step 4: Commit**

```bash
git add src/drive/PlayerCar.ts public/models/cars/player/
git commit -m "feat(drive): add PlayerCar with GLTF Boxster, lights, wheel animation"
```

---

## Task 6: DriverCamera — 1st/3rd Person Views

**Files:**
- Create: `src/drive/DriverCamera.ts`

- [ ] **Step 1: Create DriverCamera class**

```typescript
import * as THREE from 'three';
import { DRIVE, BRIDGE, LANES } from '../config/bridge';

export type ViewMode = 'first' | 'third';

/**
 * Drive mode camera with 1st person (cockpit) and 3rd person (chase) views.
 * Mouse controls free-look in both modes.
 * Car always drives straight — only the camera rotates.
 */
export class DriverCamera {
  viewMode: ViewMode = 'third';

  private yaw = 0;    // horizontal angle (radians)
  private pitch = 0;  // vertical angle (radians)
  private readonly sensitivity = 0.002;

  // 3rd person orbital
  private orbitalYaw = 0;
  private orbitalPitch = 0.15; // slight downward angle

  constructor(
    private camera: THREE.PerspectiveCamera,
    private carGroup: THREE.Group,
  ) {}

  /** Call on pointerlockchange with mousemove deltas */
  onMouseMove(dx: number, dy: number): void {
    if (this.viewMode === 'first') {
      this.yaw -= dx * this.sensitivity;
      this.pitch -= dy * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 6, Math.PI / 3);
    } else {
      this.orbitalYaw -= dx * this.sensitivity;
      this.orbitalPitch -= dy * this.sensitivity;
      this.orbitalPitch = THREE.MathUtils.clamp(this.orbitalPitch, -0.1, Math.PI / 3);
    }
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'first' ? 'third' : 'first';
    // Reset look angles on switch
    this.yaw = 0;
    this.pitch = 0;
    this.orbitalYaw = 0;
    this.orbitalPitch = 0.15;
  }

  update(): void {
    const carPos = this.carGroup.position;

    if (this.viewMode === 'first') {
      // Camera at driver's eye height
      this.camera.position.set(
        carPos.x - 0.3,  // slightly left (driver's seat)
        carPos.y + DRIVE.eyeH,
        carPos.z,
      );

      // Look direction based on yaw/pitch from forward (+Z)
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.camera.lookAt(
        this.camera.position.x + dir.x,
        this.camera.position.y + dir.y,
        this.camera.position.z + dir.z,
      );
    } else {
      // 3rd person: orbit around car
      const dist = DRIVE.thirdPersonBack;
      const height = DRIVE.thirdPersonUp;

      this.camera.position.set(
        carPos.x + Math.sin(this.orbitalYaw) * dist,
        carPos.y + height + Math.sin(this.orbitalPitch) * dist,
        carPos.z - Math.cos(this.orbitalYaw) * dist,
      );
      this.camera.lookAt(carPos.x, carPos.y + 1.0, carPos.z);
    }
  }

  /** Reset camera state */
  reset(): void {
    this.yaw = 0;
    this.pitch = 0;
    this.orbitalYaw = 0;
    this.orbitalPitch = 0.15;
    this.viewMode = 'third';
  }
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/drive/DriverCamera.ts
git commit -m "feat(drive): add DriverCamera with 1st/3rd person mouse look"
```

---

## Task 7: NPCVehicleSystem — Diverse GLTF Traffic

**Files:**
- Create: `src/traffic/NPCVehicleSystem.ts`

- [ ] **Step 1: Search and download NPC vehicle GLTF models**

Search Sketchfab for 8-10 high-quality car models (CC license, GLTF/GLB format, PBR textures). Target variety:

| # | Brand/Type | Search Term | Notes |
|---|-----------|-------------|-------|
| 1 | Audi sedan | "Audi A4 GLTF" | Sedan |
| 2 | Mercedes sedan | "Mercedes C-Class GLTF" | Sedan |
| 3 | BMW sedan | "BMW 3 series GLTF" | Sedan |
| 4 | Tesla SUV | "Tesla Model Y GLTF" | SUV |
| 5 | Toyota SUV | "Toyota RAV4 GLTF" | SUV |
| 6 | Porsche sports | "Porsche 911 GLTF" | Sports |
| 7 | Ford pickup | "Ford F-150 GLTF" | Truck |
| 8 | Honda sedan | "Honda Civic GLTF" | Sedan |
| 9 | Audi SUV | "Audi Q5 GLTF" | SUV |
| 10 | BMW SUV | "BMW X3 GLTF" | SUV |

Download each to `public/models/cars/npc/<name>.glb`.

If specific brands unavailable, use realistic generic car models with similar silhouettes. Quality matters — each must look like a real car at close range.

- [ ] **Step 2: Create NPCVehicleSystem class**

```typescript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BRIDGE, DRIVE, LANES, TILE } from '../config/bridge';

interface NPCCar {
  group: THREE.Group;
  modelIndex: number;
  z: number;
  x: number;           // lane X
  speed: number;        // m/s, signed (positive = forward)
  dir: 1 | -1;
  headlights: THREE.PointLight[];
  taillights: THREE.PointLight[];
  active: boolean;
}

interface CarModel {
  scene: THREE.Group;
  length: number;  // computed from bounding box
}

const NPC_MODELS = [
  '/models/cars/npc/audi-sedan.glb',
  '/models/cars/npc/mercedes-sedan.glb',
  '/models/cars/npc/bmw-sedan.glb',
  '/models/cars/npc/tesla-suv.glb',
  '/models/cars/npc/toyota-suv.glb',
  '/models/cars/npc/porsche-911.glb',
  '/models/cars/npc/ford-pickup.glb',
  '/models/cars/npc/honda-civic.glb',
];

const MAX_NPC = 20;
const SPAWN_RANGE = 800;  // spawn within this distance ahead
const DESPAWN_RANGE = 200; // despawn this far behind player

/**
 * Spawns diverse GLTF NPC vehicles on the bridge.
 * Vehicles appear from fog ahead/behind and disappear into fog.
 * Opposite-lane vehicles approach head-on.
 * Same-lane vehicles drive slightly faster/slower.
 */
export class NPCVehicleSystem {
  readonly group = new THREE.Group();
  private models: CarModel[] = [];
  private cars: NPCCar[] = [];
  private spawnTimer = 0;
  private loaded = false;

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    for (const path of NPC_MODELS) {
      try {
        const gltf = await loader.loadAsync(path);
        const scene = gltf.scene;

        // Normalize to ~4.5m length
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4.5 / maxDim;
        scene.scale.setScalar(scale);

        // Ground the model
        box.setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        scene.position.sub(center);
        scene.position.y -= box.min.y;

        // Enable shadows
        scene.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        this.models.push({ scene, length: size.z * scale });
      } catch (e) {
        console.warn(`Failed to load NPC model: ${path}`, e);
      }
    }
    this.loaded = this.models.length > 0;
  }

  update(dt: number, playerZ: number, nightFactor: number): void {
    if (!this.loaded) return;

    // Spawn timer (Poisson-like: random interval 5-20s)
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.activeCount() < MAX_NPC) {
      this.spawnCar(playerZ, nightFactor);
      this.spawnTimer = 5 + Math.random() * 15;
    }

    // Update positions & despawn
    for (const car of this.cars) {
      if (!car.active) continue;

      car.z += car.speed * dt;
      car.group.position.z = car.z;

      // Despawn if too far behind player
      const relZ = car.z - playerZ;
      if ((car.dir === 1 && relZ < -DESPAWN_RANGE) ||
          (car.dir === -1 && relZ > SPAWN_RANGE + 200)) {
        this.deactivateCar(car);
      }
    }
  }

  private spawnCar(playerZ: number, nightFactor: number): void {
    const modelIdx = Math.floor(Math.random() * this.models.length);
    const model = this.models[modelIdx];

    // Decide direction: 60% same direction, 40% opposite
    const dir: 1 | -1 = Math.random() < 0.6 ? 1 : -1;

    // Pick lane
    let laneIdx: number;
    if (dir === 1) {
      // Same direction: lanes 3, 4, 5 (right side), avoid player lane
      const sameLanes = [3, 4, 5].filter(i => i !== DRIVE.laneIdx);
      laneIdx = sameLanes[Math.floor(Math.random() * sameLanes.length)];
    } else {
      // Opposite: lanes 0, 1, 2
      laneIdx = Math.floor(Math.random() * 3);
    }

    const x = LANES[laneIdx];

    // Spawn position: ahead in fog for same dir, ahead for opposite dir
    const z = dir === 1
      ? playerZ + SPAWN_RANGE + Math.random() * 200
      : playerZ + SPAWN_RANGE + Math.random() * 400;

    // Speed with variation
    const baseSpeed = dir === 1 ? DRIVE.speed : -DRIVE.speed;
    const variation = (Math.random() - 0.5) * 6; // ±3 m/s (~±10 km/h)
    const speed = baseSpeed + variation;

    // Clone model
    const clone = model.scene.clone(true);
    if (dir === -1) clone.rotation.y = Math.PI; // face opposite direction

    const group = new THREE.Group();
    group.add(clone);
    group.position.set(x, BRIDGE.deckH + 0.01, z);

    // Add lights
    const headlights: THREE.PointLight[] = [];
    const taillights: THREE.PointLight[] = [];

    const headIntensity = nightFactor > 0.3 ? 30 : 0;
    const tailIntensity = nightFactor > 0.3 ? 3 : 0;

    for (const side of [-0.5, 0.5]) {
      const hl = new THREE.PointLight(0xfff5e0, headIntensity, 40);
      hl.position.set(side, 0.6, 2.0 * dir);
      group.add(hl);
      headlights.push(hl);

      const tl = new THREE.PointLight(0xff2200, tailIntensity, 15);
      tl.position.set(side, 0.5, -2.0 * dir);
      group.add(tl);
      taillights.push(tl);
    }

    // Find or create car slot
    let car = this.cars.find(c => !c.active);
    if (!car) {
      car = { group, modelIndex: modelIdx, z, x, speed, dir, headlights, taillights, active: true };
      this.cars.push(car);
    } else {
      // Reuse slot
      car.group.removeFromParent();
      car.group = group;
      car.modelIndex = modelIdx;
      car.z = z;
      car.x = x;
      car.speed = speed;
      car.dir = dir;
      car.headlights = headlights;
      car.taillights = taillights;
      car.active = true;
    }

    this.group.add(group);
  }

  private deactivateCar(car: NPCCar): void {
    car.active = false;
    car.group.removeFromParent();
    for (const l of car.headlights) l.dispose();
    for (const l of car.taillights) l.dispose();
  }

  private activeCount(): number {
    return this.cars.filter(c => c.active).length;
  }

  /** Apply recentering offset to all active cars */
  applyRecenter(shift: number): void {
    for (const car of this.cars) {
      if (!car.active) continue;
      car.z += shift;
      car.group.position.z = car.z;
    }
  }

  dispose(): void {
    for (const car of this.cars) {
      if (car.active) this.deactivateCar(car);
    }
    this.group.removeFromParent();
  }
}
```

- [ ] **Step 3: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/traffic/NPCVehicleSystem.ts public/models/cars/npc/
git commit -m "feat(traffic): add NPCVehicleSystem with diverse GLTF car models"
```

---

## Task 8: BoatSystem — Boats with Navigation Lights

**Files:**
- Create: `src/traffic/BoatSystem.ts`

- [ ] **Step 1: Create BoatSystem**

Reuse the boat construction approach from `src/traffic/Cityscape.ts` (LatheGeometry hull, BoxGeometry deck/cabin) but add navigation lights and dynamic spawn/despawn relative to player position.

```typescript
import * as THREE from 'three';
import { BRIDGE } from '../config/bridge';

interface Boat {
  group: THREE.Group;
  x: number;
  z: number;
  speed: number;   // m/s along X axis
  dir: 1 | -1;
  phase: number;   // bob phase
  portLight: THREE.PointLight;   // red, left
  starboardLight: THREE.PointLight; // green, right
  sternLight: THREE.PointLight;    // white, rear
  cabinEmissive: THREE.MeshStandardMaterial;
  active: boolean;
}

const MAX_BOATS = 5;
const BOAT_SPAWN_RANGE = 600;

/**
 * Simple procedural boats on the water surface with navigation lights.
 * Boats drift slowly perpendicular to the bridge.
 */
export class BoatSystem {
  readonly group = new THREE.Group();
  private boats: Boat[] = [];
  private spawnTimer = 3;
  private hullGeo: THREE.BufferGeometry;
  private deckGeo: THREE.BufferGeometry;
  private cabinGeo: THREE.BufferGeometry;

  constructor() {
    // Shared geometries (same as Cityscape approach)
    const hullProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(3, 0.3),
      new THREE.Vector2(3.5, 1.5),
      new THREE.Vector2(2.5, 3),
      new THREE.Vector2(0, 3.5),
    ];
    this.hullGeo = new THREE.LatheGeometry(hullProfile, 12);
    this.deckGeo = new THREE.BoxGeometry(5, 0.2, 8);
    this.cabinGeo = new THREE.BoxGeometry(3, 2.5, 4);
  }

  update(dt: number, elapsed: number, playerZ: number, nightFactor: number): void {
    // Spawn
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.activeCount() < MAX_BOATS) {
      this.spawnBoat(playerZ, nightFactor);
      this.spawnTimer = 8 + Math.random() * 15;
    }

    // Update
    for (const b of this.boats) {
      if (!b.active) continue;

      b.x += b.speed * dt;
      b.group.position.x = b.x;

      // Bobbing
      b.group.position.y = -0.5 + Math.sin(elapsed * 0.5 + b.phase) * 0.3;
      b.group.rotation.z = Math.sin(elapsed * 0.3 + b.phase) * 0.03;

      // Night lights
      const intensity = nightFactor > 0.3 ? nightFactor : 0;
      b.portLight.intensity = intensity * 2;
      b.starboardLight.intensity = intensity * 2;
      b.sternLight.intensity = intensity * 1.5;
      b.cabinEmissive.emissiveIntensity = intensity * 0.8;

      // Despawn if too far from player Z
      if (Math.abs(b.z - playerZ) > BOAT_SPAWN_RANGE + 200) {
        b.active = false;
        b.group.removeFromParent();
      }
    }
  }

  private spawnBoat(playerZ: number, nightFactor: number): void {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const x = dir === 1 ? -300 - Math.random() * 100 : 300 + Math.random() * 100;
    const z = playerZ + (Math.random() - 0.3) * BOAT_SPAWN_RANGE;
    const speed = dir * (1 + Math.random() * 2); // 1-3 m/s (~2-6 knots)

    const group = new THREE.Group();

    // Hull
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
    const hull = new THREE.Mesh(this.hullGeo, hullMat);
    hull.scale.set(1, 0.6, 1);
    group.add(hull);

    // Deck
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const deck = new THREE.Mesh(this.deckGeo, deckMat);
    deck.position.y = 1.8;
    group.add(deck);

    // Cabin with emissive windows
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x556677,
      roughness: 0.5,
      emissive: new THREE.Color(0xffcc66),
      emissiveIntensity: 0,
    });
    const cabin = new THREE.Mesh(this.cabinGeo, cabinMat);
    cabin.position.y = 3.2;
    group.add(cabin);

    // Navigation lights
    const portLight = new THREE.PointLight(0xff0000, 0, 20);   // Red (port/left)
    portLight.position.set(-3, 2, 0);
    group.add(portLight);

    const starboardLight = new THREE.PointLight(0x00ff00, 0, 20); // Green (starboard/right)
    starboardLight.position.set(3, 2, 0);
    group.add(starboardLight);

    const sternLight = new THREE.PointLight(0xffffff, 0, 15);    // White (stern)
    sternLight.position.set(0, 2.5, -4);
    group.add(sternLight);

    group.position.set(x, -0.5, z);
    if (dir === -1) group.rotation.y = Math.PI;

    this.group.add(group);
    this.boats.push({
      group, x, z, speed, dir,
      phase: Math.random() * Math.PI * 2,
      portLight, starboardLight, sternLight,
      cabinEmissive: cabinMat,
      active: true,
    });
  }

  private activeCount(): number {
    return this.boats.filter(b => b.active).length;
  }

  applyRecenter(shift: number): void {
    for (const b of this.boats) {
      if (!b.active) continue;
      b.z += shift;
      b.group.position.z = b.z;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.hullGeo.dispose();
    this.deckGeo.dispose();
    this.cabinGeo.dispose();
  }
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/traffic/BoatSystem.ts
git commit -m "feat(traffic): add BoatSystem with navigation lights and bobbing"
```

---

## Task 9: DriveHUD — Minimal UI Overlay

**Files:**
- Modify: `index.html`
- Create: `src/ui/DriveHUD.ts`

- [ ] **Step 1: Add drive mode HTML to index.html**

Read `index.html` to find the exact structure, then add after the existing overlay div:

```html
<!-- Drive Mode Button (add alongside existing FLY button area) -->
<button id="driveBtn" style="
  position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
  background:rgba(192,69,48,0.85); color:#fff; border:none;
  padding:10px 28px; font:600 14px/1 system-ui; letter-spacing:2px;
  cursor:pointer; border-radius:4px; z-index:20; backdrop-filter:blur(6px);
">DRIVE</button>

<!-- Drive HUD -->
<div id="drive-hud" style="
  display:none; position:fixed; bottom:24px; left:24px;
  color:#fff; font:500 14px/1.6 system-ui; z-index:15;
  background:rgba(0,0,0,0.4); padding:10px 16px; border-radius:6px;
  backdrop-filter:blur(6px);
">
  <div><span style="opacity:0.6">SPEED</span> <span id="drive-speed">90</span> km/h</div>
  <div><span style="opacity:0.6">VIEW</span> <span id="drive-view">3RD</span></div>
</div>
```

- [ ] **Step 2: Create DriveHUD class**

```typescript
/**
 * Minimal HUD for drive mode: speed and view mode display.
 */
export class DriveHUD {
  private el: HTMLElement;
  private speedEl: HTMLElement;
  private viewEl: HTMLElement;

  constructor() {
    this.el = document.getElementById('drive-hud')!;
    this.speedEl = document.getElementById('drive-speed')!;
    this.viewEl = document.getElementById('drive-view')!;
  }

  show(): void {
    this.el.style.display = 'block';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  update(speedMs: number, viewMode: 'first' | 'third'): void {
    this.speedEl.textContent = Math.round(speedMs * 3.6).toString();
    this.viewEl.textContent = viewMode === 'first' ? '1ST' : '3RD';
  }
}
```

- [ ] **Step 3: Verify HTML renders correctly**

Run: `npm run dev`
Expected: "DRIVE" button appears below the existing "FLY" button. Drive HUD is hidden. No layout breakage.

- [ ] **Step 4: Commit**

```bash
git add src/ui/DriveHUD.ts index.html
git commit -m "feat(ui): add drive mode button and minimal DriveHUD"
```

---

## Task 10: DriveMode — Master Orchestrator

**Files:**
- Create: `src/drive/DriveMode.ts`

- [ ] **Step 1: Create DriveMode class**

This is the central orchestrator that wires together all drive subsystems.

```typescript
import * as THREE from 'three';
import { InfinityTileManager } from './InfinityTileManager';
import { PlayerCar } from './PlayerCar';
import { DriverCamera } from './DriverCamera';
import { NPCVehicleSystem } from '../traffic/NPCVehicleSystem';
import { BoatSystem } from '../traffic/BoatSystem';
import { DriveHUD } from '../ui/DriveHUD';
import { DRIVE } from '../config/bridge';
import type { BridgeMaterials } from '../world/Materials';
import type { TimeState } from '../atmosphere/TimeOfDay';

/**
 * DriveMode orchestrates the infinity bridge driving experience.
 *
 * Lifecycle:
 *   1. constructor() — creates subsystems
 *   2. load() — async loads GLTF models
 *   3. enter() — activates drive mode (hides original bridge, shows tiles, locks pointer)
 *   4. update() — per-frame updates
 *   5. exit() — deactivates drive mode (restores original scene)
 */
export class DriveMode {
  private tileManager: InfinityTileManager;
  private playerCar: PlayerCar;
  private driverCamera: DriverCamera;
  private npcVehicles: NPCVehicleSystem;
  private boats: BoatSystem;
  private hud: DriveHUD;

  private active = false;
  private originalBridgeGroup: THREE.Group | null = null;
  private originalCityscape: THREE.Group | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private mats: BridgeMaterials,
  ) {
    this.tileManager = new InfinityTileManager(mats);
    this.playerCar = new PlayerCar();
    this.driverCamera = new DriverCamera(camera, this.playerCar.group);
    this.npcVehicles = new NPCVehicleSystem();
    this.boats = new BoatSystem();
    this.hud = new DriveHUD();
  }

  async load(): Promise<void> {
    await Promise.all([
      this.playerCar.load(),
      this.npcVehicles.load(),
    ]);
  }

  isActive(): boolean {
    return this.active;
  }

  enter(bridgeGroup: THREE.Group, cityscapeGroup?: THREE.Group): void {
    if (this.active) return;
    this.active = true;

    // Hide original bridge and cityscape
    this.originalBridgeGroup = bridgeGroup;
    bridgeGroup.visible = false;
    if (cityscapeGroup) {
      this.originalCityscape = cityscapeGroup;
      cityscapeGroup.visible = false;
    }

    // Build infinity tiles
    this.tileManager.build(this.scene);

    // Place player car
    this.playerCar.z = 0;
    this.playerCar.positionOnDeck();
    this.scene.add(this.playerCar.group);

    // Add NPC systems
    this.scene.add(this.npcVehicles.group);
    this.scene.add(this.boats.group);

    // Show HUD
    this.hud.show();

    // Request pointer lock
    document.body.requestPointerLock();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;

    // Restore original bridge
    if (this.originalBridgeGroup) {
      this.originalBridgeGroup.visible = true;
    }
    if (this.originalCityscape) {
      this.originalCityscape.visible = true;
    }

    // Remove drive systems from scene
    this.tileManager.dispose();
    this.playerCar.group.removeFromParent();
    this.npcVehicles.dispose();
    this.boats.dispose();

    // Hide HUD
    this.hud.hide();

    // Exit pointer lock
    document.exitPointerLock();

    // Reset camera
    this.driverCamera.reset();
  }

  onMouseMove(dx: number, dy: number): void {
    if (!this.active) return;
    this.driverCamera.onMouseMove(dx, dy);
  }

  onKeyDown(key: string): void {
    if (!this.active) return;
    if (key === 'v' || key === 'V') {
      this.driverCamera.toggleView();
    }
  }

  update(dt: number, elapsed: number, timeState: TimeState): void {
    if (!this.active) return;

    const nightFactor = timeState.streetLightEmissive; // 0 = day, 1 = night

    // Update player car (moves forward)
    this.playerCar.update(dt, nightFactor);

    // Update tile manager (may trigger recentering)
    const recenterShift = this.tileManager.update(this.playerCar.z);
    if (recenterShift !== 0) {
      this.playerCar.applyRecenter(recenterShift);
      this.npcVehicles.applyRecenter(recenterShift);
      this.boats.applyRecenter(recenterShift);
    }

    // Update camera (after car position is final)
    this.driverCamera.update();

    // Update NPC systems
    this.npcVehicles.update(dt, this.playerCar.z, nightFactor);
    this.boats.update(dt, elapsed, this.playerCar.z, nightFactor);

    // Update HUD
    this.hud.update(DRIVE.speed, this.driverCamera.viewMode);
  }

  dispose(): void {
    this.exit();
  }
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/drive/DriveMode.ts
git commit -m "feat(drive): add DriveMode orchestrator"
```

---

## Task 11: main.ts Integration

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Read current main.ts fully**

Read `src/main.ts` to understand the exact initialization order and variable names.

- [ ] **Step 2: Add DriveMode initialization and mode toggle**

Add after the existing system initialization (after PostFX pipeline setup):

```typescript
import { DriveMode } from './drive/DriveMode';

// --- In the init function, after postfx setup ---

// Drive mode
const driveMode = new DriveMode(sm.scene, sm.camera, mats);
driveMode.load(); // async, non-blocking

// Drive button handler
const driveBtn = document.getElementById('driveBtn')!;
driveBtn.addEventListener('click', () => {
  if (driveMode.isActive()) {
    driveMode.exit();
    driveBtn.textContent = 'DRIVE';
  } else {
    driveMode.enter(bridge.group, cityscape.group);
    driveBtn.textContent = 'EXIT DRIVE';
  }
});
```

- [ ] **Step 3: Add drive mode to the game loop**

In the game loop registration section, add the driveMode update:

```typescript
// Inside the loop.register callback, after existing updates:
if (driveMode.isActive()) {
  driveMode.update(dt, elapsed, timeState);
}
```

- [ ] **Step 4: Wire mouse and keyboard events to DriveMode**

Add mouse move handler (pointer lock already used by FlightCamera — share the event):

```typescript
// Add alongside existing input event handling
document.addEventListener('mousemove', (e) => {
  if (driveMode.isActive()) {
    driveMode.onMouseMove(e.movementX, e.movementY);
  }
});

document.addEventListener('keydown', (e) => {
  if (driveMode.isActive()) {
    driveMode.onKeyDown(e.key);
  }
  // 'M' key toggles drive mode
  if (e.key === 'm' || e.key === 'M') {
    if (driveMode.isActive()) {
      driveMode.exit();
      driveBtn.textContent = 'DRIVE';
    } else {
      driveMode.enter(bridge.group, cityscape.group);
      driveBtn.textContent = 'EXIT DRIVE';
    }
  }
});
```

- [ ] **Step 5: Disable FlightCamera when in drive mode**

Wrap the existing FlightCamera update with a condition:

```typescript
// In the game loop, change the camera update to:
if (!driveMode.isActive()) {
  flightCamera.update(dt);
}
```

- [ ] **Step 6: Hide flight HUD and show drive HUD on mode switch**

Ensure the existing `#hud` (flight HUD) is hidden when drive mode is active, and the `#drive-hud` is shown. Add to the game loop:

```typescript
// HUD visibility toggle
const flightHud = document.getElementById('hud')!;
flightHud.style.display = driveMode.isActive() ? 'none' : '';
```

- [ ] **Step 7: Full visual verification**

Run: `npm run dev`

Verify:
1. Page loads normally with original bridge visible
2. "DRIVE" button is visible
3. Clicking "DRIVE" → original bridge hides, infinity tiles appear, Boxster visible on road
4. Mouse moves camera (1st or 3rd person depending on default)
5. `V` key toggles between 1st and 3rd person
6. Car drives forward continuously, tiles scroll seamlessly
7. NPC vehicles spawn and despawn naturally
8. `M` key or "EXIT DRIVE" button returns to cinematic mode
9. Original bridge reappears

- [ ] **Step 8: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate DriveMode into main game loop with mode toggle"
```

---

## Task 12: Night Lighting & Atmosphere Polish

**Files:**
- Modify: `src/drive/DriveMode.ts`
- Modify: `src/postfx/PostFXPipeline.ts` (if bloom adjustments needed)

- [ ] **Step 1: Verify night lighting on bridge tiles**

Run `npm run dev`, enter drive mode, press `F` to advance time to nighttime.

Check:
- Bridge street lights (LightStandards) glow with warm light
- Tower aviation lights blink red
- Player Boxster headlights illuminate the road ahead
- Player taillights glow red (visible in 3rd person)
- NPC vehicle lights visible
- Boat navigation lights visible (red port, green starboard)

- [ ] **Step 2: Adjust bloom for drive mode night**

Read `src/postfx/PostFXPipeline.ts` and check how `updateLighting()` controls bloom. If needed, increase bloom strength during nighttime drive mode for a more atmospheric feel:

In `PostFXPipeline.ts`, the bloom is already controlled by `nightFactor`:
```typescript
// Night: threshold = 0.5, strength = 0.5
```

This should be sufficient. If lights look too flat, adjust the threshold down to 0.4 for more glow. Verify visually.

- [ ] **Step 3: Verify fog interaction with lights**

At night, check that:
- Distant tower lights create a soft glow in the fog
- Approaching NPC headlights gradually brighten through fog
- The overall atmosphere feels moody and immersive

If fog is too dense or too thin, adjust `FogExp2` density in drive mode. In `DriveMode.enter()`:

```typescript
// Store original fog density and adjust for infinity mode
const fog = this.scene.fog as THREE.FogExp2;
this.originalFogDensity = fog.density;
fog.density = 0.00006; // slightly less dense for longer visibility
```

And in `exit()`:
```typescript
const fog = this.scene.fog as THREE.FogExp2;
fog.density = this.originalFogDensity;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(drive): polish night lighting and fog for drive mode atmosphere"
```

---

## Task 13: Seamless Tile Transition Polish

**Files:**
- Modify: `src/landmarks/bridge/BridgeTile.ts`
- Modify: `src/drive/InfinityTileManager.ts`

- [ ] **Step 1: Visual inspection of tile boundaries**

Run `npm run dev`, enter drive mode (3rd person), and carefully watch as the car crosses tile boundaries (every ~1,623m). Look for:
- Deck surface seams (gap or overlap)
- Cable discontinuity at tile edges
- Truss misalignment
- Street light spacing irregularity
- Lane marking dash pattern break

- [ ] **Step 2: Fix any visible seams**

Common fixes:
- **Deck gap**: Extend deck PlaneGeometry by 0.1m on each end (overlap instead of gap)
- **Cable discontinuity**: Ensure cable endpoints match exactly at tile boundaries (tower center positions)
- **Truss pattern**: Ensure panel count is exact integer for tile length
- **Lane dashes**: Ensure dash pattern aligns at tile boundaries (dash period should divide tile length evenly, or use modulo-based dash positioning)

For lane marking alignment, in `BridgeTile.buildDeck()`:
```typescript
// Dash period = 12m (3m dash + 9m gap)
// TILE.length / 12 = 1623 / 12 = 135.25 → not exact
// Fix: adjust gap to make it divide evenly
// 1623 / 135 = 12.022... close enough, or use 1623/136 = 11.93
// Better: keep dash period and accept that dashes may cross tile boundary
// → extend dashes 12m beyond tile length on each side (they'll be hidden by next tile's deck)
```

- [ ] **Step 3: Verify fix**

Run `npm run dev`, drive through multiple tile transitions. All boundaries should be imperceptible.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(drive): ensure seamless tile transitions at boundaries"
```

---

## Task 14: Bird System Integration for Drive Mode

**Files:**
- Modify: `src/traffic/BirdSystem.ts`
- Modify: `src/drive/DriveMode.ts`

- [ ] **Step 1: Read BirdSystem.ts**

Read `src/traffic/BirdSystem.ts` to understand current bird orbit behavior.

- [ ] **Step 2: Add player-relative spawning to BirdSystem**

Currently birds orbit around fixed positions. For drive mode, add a method to reposition birds relative to the player:

```typescript
// Add to BirdSystem class:

/** Reposition all bird orbits around a new center Z */
repositionAround(centerZ: number): void {
  for (const b of this.birds) {
    b.cz = centerZ + (Math.random() - 0.5) * 600;
    b.cx = (Math.random() - 0.5) * 400;
    b.height = 80 + Math.random() * 60;
    b.radius = 30 + Math.random() * 50;
  }
}

/** Apply recentering offset */
applyRecenter(shift: number): void {
  for (const b of this.birds) {
    b.cz += shift;
  }
}
```

- [ ] **Step 3: Integrate birds into DriveMode**

In `DriveMode.update()`, periodically reposition birds that are too far from the player:

```typescript
// In DriveMode constructor, store reference to birdSystem
// In DriveMode.update():
this.birdSystem.update(dt, elapsed, timeState);

// Reposition birds that drifted too far
// (simple approach: reposition all every 30 seconds)
this.birdRepositionTimer -= dt;
if (this.birdRepositionTimer <= 0) {
  this.birdSystem.repositionAround(this.playerCar.z);
  this.birdRepositionTimer = 30;
}

// Apply recentering
if (recenterShift !== 0) {
  this.birdSystem.applyRecenter(recenterShift);
}
```

- [ ] **Step 4: Verify birds appear in drive mode**

Run: `npm run dev`, enter drive mode. Birds should orbit nearby in flocks, with new groups appearing as you drive forward. They should disappear at night.

- [ ] **Step 5: Commit**

```bash
git add src/traffic/BirdSystem.ts src/drive/DriveMode.ts
git commit -m "feat(drive): integrate BirdSystem with player-relative spawning"
```

---

## Task 15: Final Integration & Cleanup

**Files:**
- Modify: `src/main.ts`
- Modify: `src/drive/DriveMode.ts`

- [ ] **Step 1: Disable terrain and cityscape in drive mode**

The terrain is already returning empty geometry. Cityscape (boats) should be hidden in drive mode — already handled in `DriveMode.enter()` which hides `cityscapeGroup`. Verify this works correctly.

- [ ] **Step 2: Ensure water surface extends infinitely**

Read `src/world/Water.ts`. The water plane is 30,000×30,000m — large enough for infinity mode. No changes needed. Verify the water remains visible in all directions during drive mode.

- [ ] **Step 3: Full end-to-end test**

Run: `npm run dev`

**Cinematic mode checks:**
- [ ] Original bridge renders correctly
- [ ] Camera presets (1-6) work
- [ ] Time of day cycling works
- [ ] All existing features intact

**Drive mode checks:**
- [ ] Click "DRIVE" → mode switches cleanly
- [ ] Boxster appears on road, high quality, soft-top visible
- [ ] 3rd person: car visible from behind, drives straight
- [ ] 1st person (V key): dashboard/interior visible, road ahead
- [ ] Mouse look works in both views
- [ ] Tiles scroll seamlessly — no visible boundaries
- [ ] Towers repeat into the distance, fade into fog
- [ ] NPC vehicles appear/disappear naturally, diverse models
- [ ] Boats visible on water with bobbing motion
- [ ] Night: all lights work (headlights, taillights, street lights, boat lights, tower lights)
- [ ] Night: bloom creates atmospheric glow
- [ ] Birds orbit nearby during daytime
- [ ] Speed/view HUD displays correctly
- [ ] Press M or "EXIT DRIVE" → clean return to cinematic mode
- [ ] No performance drops or frame spikes at tile transitions

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete Infinity Bridge with drive mode, infinite tiling, and night lighting"
```
