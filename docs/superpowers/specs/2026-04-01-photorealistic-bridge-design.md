# Photorealistic Golden Gate Bridge — Design Spec

## Overview

Rebuild the Golden Gate Bridge 3D model to photorealistic quality within the existing Three.js/WebGL application. The bridge is decomposed into 30 parts across 6 structural groups, built in 4 phases (Geometry → Texture → Micro-detail → Environment), with 5 expert domains providing verification.

**Goal:** Photo-indistinguishable rendering. Maximum quality, performance unconstrained.

**Approach:** Hybrid Part-Based + Layer Phases — modular code (one class per part) built in 4 sequential phases matching priority order.

---

## Expert Panel & Roles

| Expert | Color | Lead Parts | Role |
|--------|-------|------------|------|
| Architect (Joseph Strauss) | Red | 6 | Structural proportions, Art Deco design language, load path logic |
| 3D Modeler | Blue | 4 | Accurate cross-sections, topology quality, UV mapping |
| 3D Designer | Purple | 6 | PBR material authoring, weathering, lighting response |
| Construction Expert | Gold | 10 | Connection details, fastener patterns, fabrication logic |
| Urban Planner | Green | 1 (+7 verify) | Geographic accuracy, road configuration, landscape context |

Each part has a **lead expert** (domain authority) and a **verify expert** (realism check).

---

## Part Taxonomy — 6 Groups, 30 Parts

### Group 1: Towers (8 parts)

| ID | Part | Description | Lead | Verify |
|----|------|-------------|------|--------|
| T1 | Tower Shaft | Main columns with Art Deco stepback profile. 5-section taper, cruciform cross-section | Architect | 3D Modeler |
| T2 | Portal Struts | Horizontal cross-braces with vehicle passage openings (4 per tower) | Architect | Construction |
| T3 | Cell Structure | Internal cellular grid visible through tower face. X-bracing within cells | 3D Modeler | Construction |
| T4 | Art Deco Panels | Recessed chevron panels between cells. Vertical fluting at column corners. Stepped crown molding | Architect | 3D Designer |
| T5 | Tower Cap & Saddle | Stepped pyramidal cap plates, cable saddle housing with roller mechanism | Construction | Architect |
| T6 | Pier & Fender | Elliptical concrete caisson (south), shorter rock-founded (north). Steel fender ring | Construction | Architect |
| T7 | Aviation Lights | Red obstruction lights + platforms at tower top | 3D Designer | Construction |
| T8 | Maintenance Access | Elevator housing, ladder rungs, inspection catwalks on tower face | Construction | 3D Modeler |

### Group 2: Cable System (5 parts)

| ID | Part | Description | Lead | Verify |
|----|------|-------------|------|--------|
| C1 | Main Cable | 27,572 wires in 61 strands. 0.92m diameter. Surface shows strand wrapping pattern | 3D Modeler | Construction |
| C2 | Cable Band | Cast steel clamps every 15.2m. Two half-shells bolted together, ~0.6m wide | Construction | 3D Modeler |
| C3 | Suspender Ropes | Paired wire ropes with socket connections at deck and cable band | 3D Modeler | Construction |
| C4 | Cable Saddle | Roller saddle at tower top allowing cable movement under load | Construction | Architect |
| C5 | Cable Anchorage | Massive concrete housing with splay chamber where strands fan out to eyebars | Architect | Construction |

### Group 3: Deck System (7 parts)

| ID | Part | Description | Lead | Verify |
|----|------|-------------|------|--------|
| D1 | Stiffening Truss | Warren truss with verticals. L/T/I-section members (not boxes) | 3D Modeler | Construction |
| D2 | Floor System | I-beam floor beams with web stiffeners. Rolled W-shape stringers. Gusset plates | Construction | 3D Modeler |
| D3 | Road Surface | Slightly crowned orthotropic deck. 6 lanes. Movable median barrier (zipper system) | 3D Designer | Urban Planner |
| D4 | Sidewalk & Railing | East (pedestrian) + west (bicycle) sidewalks. Art Deco railing with vertical pickets | Architect | Urban Planner |
| D5 | Light Standards | Art Deco lamp posts: tapered octagonal shaft, scrolled bracket arm, prismatic lantern | Architect | 3D Designer |
| D6 | Drainage & Utilities | Scuppers in deck curb, drain pipes, utility conduits under deck | Construction | 3D Modeler |
| D7 | Expansion Joints | Finger joints at tower locations allowing thermal movement | Construction | Architect |

### Group 4: Approaches & Anchorages (5 parts)

| ID | Part | Description | Lead | Verify |
|----|------|-------------|------|--------|
| A1 | Fort Point Arch | Steel lattice truss arch spanning Fort Point. Visible bracing and diagonal members | Architect | Urban Planner |
| A2 | SF Anchorage | South anchorage: stepped concrete mass with Art Deco facade, cable entry portals | Construction | Architect |
| A3 | Marin Anchorage | North anchorage embedded in hillside rock | Construction | Urban Planner |
| A4 | Toll Plaza | Modern open-road tolling gantries (post-2013 renovation) | Urban Planner | Architect |
| A5 | Approach Viaducts | Concrete approach spans with supporting columns | Construction | 3D Modeler |

### Group 5: Surface Detail System (3 parts)

| ID | Part | Description | Lead | Verify |
|----|------|-------------|------|--------|
| S1 | Steel PBR Stack | International Orange PBR: base color, roughness, metalness, normal, AO, clearcoat, weathering | 3D Designer | Construction |
| S2 | Concrete PBR Stack | Aged concrete: form marks, water staining, algae, crack patterns, efflorescence | 3D Designer | Construction |
| S3 | Fastener Details | Rivet heads (hot-driven dome), bolted splice plates, weld bead textures, gusset plates | Construction | 3D Designer |

### Group 6: Environmental Context (2 parts)

| ID | Part | Description | Lead | Verify |
|----|------|-------------|------|--------|
| E1 | Water Interaction | Pier wake, tidal foam, wave refraction around fender, wet surface reflections | 3D Designer | Urban Planner |
| E2 | Atmospheric Effects | Fog tendrils through cables, rain streaks, sun glint on wet paint, golden hour raking light | 3D Designer | Urban Planner |

---

## Build Phases

### Phase 1: Geometry Rebuild

Replace all BoxGeometry primitives with accurate cross-sections and profiles.

| Part | Current Geometry | Target Geometry | Three.js Approach |
|------|-----------------|-----------------|-------------------|
| T1. Tower Shaft | BoxGeometry ×5 sections | Cruciform cross-section with stepback taper. 4 flanges creating + shape. 10m base → 5.5m top | `ExtrudeGeometry` with custom Shape per section |
| T2. Portal Struts | BoxGeometry ×5 braces | Arched portal openings. Box-girder cross-section with rounded corners | `ExtrudeGeometry` + `ShapeGeometry` arch cutout |
| T3. Cell Structure | BoxGeometry ribs | Grid of rectangular cells with X-bracing. 21 cells vertically per column | `InstancedMesh` for cell frames + diagonal bars |
| T4. Art Deco Panels | None | Recessed chevron panels, vertical fluting, stepped crown molding | `ExtrudeGeometry` with beveled Shape profiles |
| T5. Cap & Saddle | BoxGeometry | Stepped pyramidal cap. Grooved saddle casting with cable channel | Custom `BufferGeometry` |
| T6. Pier & Fender | BoxGeometry | Elliptical caisson with stepped base (south). Shorter rock-founded (north). Steel fender ring | `LatheGeometry` + `TorusGeometry` |
| T7. Aviation Lights | SphereGeometry | Detailed light housing with platform | Enhanced geometry + emissive material |
| T8. Maintenance Access | None | Elevator housing, ladder rungs, catwalks | `InstancedMesh` for repetitive elements |
| C1. Main Cable | TubeGeometry r=0.46 | 0.92m diameter showing 61-strand bundle pattern | `TubeGeometry` r=0.46 + strand normal map |
| C2. Cable Band | None | Cast steel clamp, two half-shells, ~0.6m wide | `InstancedMesh` with `TorusGeometry` segment |
| C3. Suspenders | CylinderGeometry r=0.04 | Paired wire ropes with socket fittings | Paired `CylinderGeometry` + socket meshes |
| C4. Cable Saddle | BoxGeometry | Roller saddle with grooved channel | Custom `BufferGeometry` |
| C5. Cable Anchorage | BoxGeometry blocks | Stepped concrete with Art Deco facade, cable entry portals | Custom `BufferGeometry` + `ExtrudeGeometry` portals |
| D1. Stiffening Truss | BoxGeometry chords/diags | Warren truss. I-section chords, L-angle diagonals | `ExtrudeGeometry` with I/L/T profiles |
| D2. Floor System | InstancedMesh boxes | I-beam floor beams with web stiffeners. W-shape stringers | `ExtrudeGeometry` I-beam + `InstancedMesh` |
| D3. Road Surface | BoxGeometry + CanvasTexture | Crowned profile. Movable median barrier | `ExtrudeGeometry` crowned Shape + barrier `InstancedMesh` |
| D4. Sidewalk & Railing | BoxGeometry | Art Deco railing with pickets and curved top rail. Concrete sidewalk | `InstancedMesh` pickets + `TubeGeometry` rail |
| D5. Light Standards | Merged cylinder+box | Tapered octagonal shaft, scrolled bracket, prismatic lantern | `LatheGeometry` + `ExtrudeGeometry` + `BoxGeometry` |
| A1. Fort Point Arch | TorusGeometry (solid) | Lattice truss arch with visible bracing and diagonal members | `TubeGeometry` chords + `InstancedMesh` lattice |
| A2-A3. Anchorages | BoxGeometry blocks | Stepped concrete mass with Art Deco facade treatment. Cable entry portals | Custom `BufferGeometry` stepped profile |
| A4. Toll Plaza | None | Open-road tolling gantries | `BoxGeometry` + `CylinderGeometry` composite |
| A5. Approach Viaducts | BoxGeometry slabs | Concrete spans with shaped columns | `ExtrudeGeometry` column profiles |

**Shared Geometry Utilities:**

- `profiles/IBeamProfile.ts` — Parametric I-beam cross-section Shape (D1 chords, D2 floor beams)
- `profiles/LAngleProfile.ts` — L-angle section Shape (D1 diagonals, T3 cell bracing)
- `profiles/CruciformProfile.ts` — + shaped cross-section for T1 tower columns

### Phase 2: PBR Material Stack

Full PBR pipeline with procedural 1024px+ textures and multi-layer weathering.

**S1. Steel PBR Stack:**
- Base Color: International Orange (#c04530) with subtle variation from repaint history
- Roughness Map (1024px): 0.4–0.7 range. Smoother where recently painted, rougher at edges/joints
- Metalness Map (1024px): 0.2–0.5. Higher where paint is thin exposing steel
- Normal Map (1024px): Rivet heads on 64px grid, plate seams, rolled steel grain direction
- AO Map: Baked ambient occlusion for recesses, cell interiors, under flanges
- Clearcoat: 0.05–0.15 varying. Fresh paint areas glossier
- Weathering Layer: Rust bleeding at bolt holes, salt spray deposits, paint peeling near water

**S2. Concrete PBR Stack:**
- Base Color: Warm grey (#999088) with water stain streaks
- Roughness Map (1024px): 0.7–0.95. Very rough overall, smoother at form-worked surfaces
- Metalness: 0 everywhere
- Normal Map (1024px): Board-formed texture, aggregate exposure, crack networks
- AO Map: Deep recesses at stepped forms, under pier overhangs
- Weathering Layer: Green algae below high-water mark, efflorescence, water streak patterns

**Asphalt PBR:**
- Base Color: Dark grey (#2a2a2a) with tire track wear patterns
- Roughness: 0.85–0.95. Smoother in wheel paths
- Normal Map: Aggregate texture, patch repairs, thermal crack patterns
- Lane Markings: Separate pass with retroreflective bead texture

**Cable PBR:**
- Base Color: International Orange, slightly darker than tower (more paint coats)
- Normal Map: Helical strand wrapping pattern (61 strands)
- Roughness: 0.35–0.55 (smoother than structural steel)
- Metalness: 0.3–0.5

**Expanded BridgeMaterials Interface:**

```typescript
interface BridgeMaterials {
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
}
```

### Phase 3: Micro-Details

**Fasteners:**
- Hot-driven rivet heads (dome profile, 25mm dia) — geometry for close-range, normal map for distant
- High-strength bolts at splice plates
- Weld bead texture at modern repair areas
- Gusset plates at truss node connections

**Access & Safety:**
- Maintenance catwalks under deck (InstancedMesh)
- Tower elevator enclosure
- Ladder rungs on tower face (InstancedMesh)
- Cable hand-rope safety lines
- Aircraft warning light platforms

**Utilities & Function:**
- Drain scuppers in deck curb
- Utility conduit runs
- Expansion joint fingers
- Movable median barrier segments
- Traffic sensors and cameras

### Phase 4: Environmental Realism

**E1. Water Interaction:**
- Pier wake: V-shaped turbulence pattern downstream
- Tidal foam accumulation at pier base
- Wave refraction around fender ring
- Wet surface reflections on pier concrete below splash zone
- Subsurface scattering in wave crests

**E2. Atmospheric Effects:**
- Advection fog flowing through cable harps (volumetric particles)
- Rain streak accumulation on vertical steel surfaces
- Sun glint on wet International Orange paint
- Golden hour warm light raking across tower stepbacks
- Specular highlights on cable strands from low-angle sun
- Heat haze shimmer above road surface (summer)

---

## Code Architecture

### Directory Structure

```
src/
├── landmarks/
│   ├── bridge/
│   │   ├── BridgeAssembler.ts
│   │   ├── towers/
│   │   │   ├── TowerShaft.ts          # T1
│   │   │   ├── TowerPortals.ts        # T2
│   │   │   ├── TowerCells.ts          # T3
│   │   │   ├── ArtDecoPanels.ts       # T4
│   │   │   ├── TowerCap.ts            # T5
│   │   │   ├── PierAndFender.ts       # T6
│   │   │   ├── AviationLights.ts      # T7
│   │   │   └── MaintenanceAccess.ts   # T8
│   │   ├── cables/
│   │   │   ├── MainCable.ts           # C1
│   │   │   ├── CableBand.ts           # C2
│   │   │   ├── Suspenders.ts          # C3
│   │   │   ├── CableSaddle.ts         # C4
│   │   │   └── CableAnchorage.ts      # C5
│   │   ├── deck/
│   │   │   ├── StiffeningTruss.ts     # D1
│   │   │   ├── FloorSystem.ts         # D2
│   │   │   ├── RoadSurface.ts         # D3
│   │   │   ├── SidewalkRailing.ts     # D4
│   │   │   ├── LightStandards.ts      # D5
│   │   │   ├── DrainageUtilities.ts   # D6
│   │   │   └── ExpansionJoints.ts     # D7
│   │   ├── approaches/
│   │   │   ├── FortPointArch.ts       # A1
│   │   │   ├── SFAnchorage.ts         # A2
│   │   │   ├── MarinAnchorage.ts      # A3
│   │   │   ├── TollPlaza.ts           # A4
│   │   │   └── ApproachViaducts.ts    # A5
│   │   └── micro/
│   │       ├── RivetSystem.ts         # S3a
│   │       ├── SplicePlates.ts        # S3b
│   │       ├── WeldBeads.ts           # S3c
│   │       └── GussetPlates.ts        # S3d
│   ├── BaseLandmark.ts
│   └── index.ts
├── world/
│   ├── Materials.ts                   # Expanded PBR material factory
│   ├── textures/
│   │   ├── SteelPBR.ts               # S1
│   │   ├── ConcretePBR.ts            # S2
│   │   ├── AsphaltPBR.ts
│   │   ├── CablePBR.ts
│   │   └── WeatheringLayer.ts
│   ├── environment/
│   │   ├── PierWake.ts               # E1a
│   │   ├── TidalFoam.ts              # E1b
│   │   ├── WetSurface.ts             # E1c
│   │   └── FogTendrils.ts            # E2a
│   └── profiles/
│       ├── IBeamProfile.ts
│       ├── LAngleProfile.ts
│       └── CruciformProfile.ts
```

### Core Interface

```typescript
interface BridgePart {
  readonly name: string;
  readonly group: THREE.Group;
  buildGeometry(): void;
  applyMaterials(mats: BridgeMaterials): void;
  addMicroDetails(): void;
  update?(dt: number, elapsed: number): void;
  dispose(): void;
}
```

### BridgeAssembler

Replaces current `GoldenGateBridge.ts`. Orchestrates all 30 parts through the 4-phase lifecycle: `buildGeometry()` → `applyMaterials()` → `addMicroDetails()` → adds all groups to scene. Parts with dynamic behavior (E1, E2) receive `update()` calls each frame.

### Expert Verification Checklist (per part)

| Expert | Criteria |
|--------|----------|
| Architect | Proportions match real dimensions (±5%). Art Deco language consistent. Structural logic correct |
| 3D Modeler | No degenerate triangles. Correct UV mapping. Outward normals. Smooth edge flow |
| 3D Designer | Physically plausible PBR values. Realistic weathering distribution. No hard texture seams |
| Construction | Structurally correct connections. Accurate rivet/bolt patterns. Logical fabrication sequence |
| Urban Planner | Geographically correct context. Current road configuration. Accurate landscape relationship |

---

## Key Dimensions Reference

From `src/config/bridge.ts` and real-world data:

| Parameter | Value | Source |
|-----------|-------|--------|
| Main span | 1,280m | Config |
| Side spans | 343m each | Config |
| Total length | 1,966m | Config |
| Deck height | 67m above water | Config |
| Deck width | 27.4m | Config |
| Tower height | 227m above water | Config |
| Main cable diameter | 0.92m (36.375 in) | Real |
| Cable sag | 84m at midspan | Config |
| Suspender spacing | 15.2m | Config |
| Color | #c04530 International Orange | Config |
| Lanes | 6 (3 each direction, movable median) | Real |
| Tower column cross-section | Cruciform, ~10m × 5.5m at base | Real |
| Rivet diameter | 25mm (1 inch) | Real |
| Cable strands | 61 | Real |
| Wires per cable | 27,572 | Real |
