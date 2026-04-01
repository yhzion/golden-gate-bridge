# SF Open World — Design Spec

**Date:** 2026-04-01
**Goal:** 브라우저 기반 샌프란시스코 전체(~8km 반경) 3D 비행 체험 데모. 포트폴리오/시네마틱 품질.
**Tech Stack:** Vite 6 + TypeScript 5.x + Three.js r170+ + Hybrid ECS

---

## 1. Project Overview

### 1.1 Objectives
- 현재 Golden Gate Bridge 3D 씬을 샌프란시스코 전체 도시로 확장
- 시네마틱 품질의 카메라 효과와 낮/밤/날씨 시스템
- 지속적으로 건물, 랜드마크, 상호작용 요소를 확장할 수 있는 모듈 아키텍처

### 1.2 Key Decisions
| Decision | Choice |
|----------|--------|
| Target | Portfolio/demo — cinematic city flight experience |
| Scale | Full San Francisco (~8km radius) |
| Build phases | A: Landmarks → B: City density → C: Atmosphere |
| Navigation | Free flight primary, cinematic focus |
| Camera | Cinematic paths + camera effects (DoF, motion blur, film grain) |
| Time/Weather | Day/night cycle + weather system (clear, fog, rain) |
| Performance | High-end target (latest GPU, 60fps) |
| Architecture | Hybrid — class-based landmarks + lightweight ECS for mass entities |

### 1.3 Current Codebase
Single `index.html` (1,694 lines) containing:
- Procedural noise system (fbm, smoothNoise)
- Physical materials with canvas-based normal maps
- Scene setup (Sky, Water, PMREMGenerator)
- Golden Gate Bridge (towers, deck, cables, suspenders, anchorages)
- Terrain (5 patches with vertex coloring)
- Cityscape (downtown boxes, Alcatraz, boats, fog volumes)
- Traffic (80 instanced cars with lane logic)
- Flight controls (pointer lock, collision detection)
- Minimap (canvas 2D overlay)
- Post-processing (bloom, color grading, vignette)

---

## 2. System Architecture

### 2.1 Layer Overview
7 layers with unidirectional dependencies:

```
┌─────────────────────────────────────────────────────────────┐
│  ENGINE CORE                                                 │
│  GameLoop · SceneManager · AssetLoader · Renderer · PostFX  │
│  Pipeline · InputManager                                     │
├──────────────────────────┬──────────────────────────────────┤
│  WORLD (chunk-based)     │  ATMOSPHERE (environment)         │
│  ChunkManager            │  TimeOfDay                        │
│  LODController           │  WeatherSystem                    │
│  TerrainGenerator        │  SkyController                    │
│  Water · RoadNetwork     │  FogSystem · LightingRig          │
│  VegetationSystem        │  MaterialUpdater ←── cross-cuts   │
├────────────┬─────────────┼──────────────────────────────────┤
│  LANDMARKS │  CITY        │  TRAFFIC (lightweight ECS)       │
│  (classes) │  (procedural)│  VehicleSystem                   │
│  GoldenGate│  BuildingFac.│  PedestrianSystem                │
│  Transamer.│  InstancePool│  BoatSystem                      │
│  CoitTower │  BlockGen.   │  BirdSystem                      │
│  Alcatraz  │  StreetFurn. │                                  │
├────────────┴─────────────┴──────────────────────────────────┤
│  CAMERA & CINEMATIC           │  UI (Vanilla DOM)            │
│  FlightCamera                 │  HUD                         │
│  CinematicDirector            │  Minimap                     │
│  CameraEffects                │  LoadingScreen               │
└───────────────────────────────┴──────────────────────────────┘
```

### 2.2 Data Flow (per frame)
1. `GameLoop.tick(dt)` → `ChunkManager.update(cameraPos)` → load/unload chunks
2. `GameLoop.tick(dt)` → `TimeOfDay.advance(dt)` → `MaterialUpdater.apply(sunAngle, weatherState)`
3. `GameLoop.tick(dt)` → `VehicleSystem.update(dt)` → InstancedMesh batch update
4. `GameLoop.tick(dt)` → `CameraEffects.update(velocity, altitude)` → PostFX params
5. `Renderer.render()` → PostFX Pipeline (Bloom → DoF → MotionBlur → ColorGrade → FilmGrain)

### 2.3 Directory Structure
```
src/
├── engine/
│   ├── GameLoop.ts          # requestAnimationFrame wrapper, dt clamping
│   ├── SceneManager.ts      # Three.js scene, camera, renderer setup
│   ├── AssetLoader.ts       # Texture/model loading with progress
│   └── InputManager.ts      # Keyboard, mouse, pointer lock
├── world/
│   ├── ChunkManager.ts      # Dynamic chunk load/unload based on camera
│   ├── LODController.ts     # Distance-based LOD switching
│   ├── TerrainGenerator.ts  # Procedural terrain (from current terrainH)
│   ├── Water.ts             # Water plane with custom normals
│   ├── RoadNetwork.ts       # Street grid generation per chunk
│   └── VegetationSystem.ts  # Instanced trees/shrubs
├── landmarks/
│   ├── BaseLandmark.ts      # Abstract base class
│   ├── GoldenGateBridge.ts  # Current bridge code extracted
│   ├── TransamericaPyramid.ts
│   ├── CoitTower.ts
│   ├── Alcatraz.ts
│   ├── PierThirtyNine.ts
│   └── index.ts             # LandmarkRegistry
├── city/
│   ├── BuildingFactory.ts   # Parametric building generation
│   ├── BuildingTypes.ts     # Highrise, MidRise, Victorian, Industrial, Wharf
│   ├── InstancedPool.ts     # InstancedMesh pool manager per building type
│   ├── BlockGenerator.ts    # City block layout (buildings + gaps + setbacks)
│   ├── StreetFurniture.ts   # Street lights, signs, benches
│   └── ZoneMap.ts           # zoneAt(x,z) → zone config
├── traffic/
│   ├── TrafficWorld.ts      # Lightweight ECS world for mass entities
│   ├── components.ts        # Position, Velocity, MeshRef, Lane...
│   ├── VehicleSystem.ts     # Car movement, lane logic (from current code)
│   ├── BoatSystem.ts        # Boat bobbing and movement
│   └── BirdSystem.ts        # Seagull flocking
├── atmosphere/
│   ├── TimeOfDay.ts         # Sun angle, color temperature, ambient
│   ├── WeatherSystem.ts     # State machine: Clear ↔ Fog ↔ Rain
│   ├── SkyController.ts     # Three.js Sky uniforms driven by time
│   ├── FogSystem.ts         # Fog density/color driven by weather
│   ├── LightingRig.ts       # Directional + hemisphere + ambient lights
│   └── MaterialUpdater.ts   # Cross-cutting: updates all materials per frame
├── camera/
│   ├── CameraDirector.ts    # Mode switching (flight/cinematic/orbit)
│   ├── FlightCamera.ts      # WASD flight with inertia (from current code)
│   ├── CinematicDirector.ts # Spline-based path playback
│   ├── OrbitCamera.ts       # Landmark-centered orbit
│   ├── CameraEffects.ts     # Speed/altitude reactive PostFX params
│   └── paths/               # JSON cinematic path definitions
│       ├── golden-gate-sunrise.json
│       ├── downtown-flyover.json
│       └── bay-panorama.json
├── postfx/
│   ├── PostFXPipeline.ts    # EffectComposer setup and management
│   ├── MotionBlurPass.ts    # Velocity-based motion blur
│   ├── FilmGrainPass.ts     # Subtle noise + vignette
│   └── RainDropPass.ts      # Lens rain drops (weather: rain)
├── ui/
│   ├── HUD.ts               # Speed, altitude, position display
│   ├── Minimap.ts           # Canvas 2D minimap (from current code)
│   └── LoadingScreen.ts     # Progress bar loading UI
├── utils/
│   ├── noise.ts             # fbm, smoothNoise, hash2 (from current code)
│   └── math.ts              # Shared math utilities
├── config/
│   ├── bridge.ts            # Bridge dimensions (current B object)
│   ├── zones.ts             # Zone definitions (JSON-like config)
│   └── weather.ts           # Weather state parameters
└── main.ts                  # Entry point: init all systems, start loop
```

---

## 3. Chunk System

### 3.1 Grid Specs
- **Chunk size:** 500m × 500m
- **Total grid:** 16 × 16 = 256 chunks (8km × 8km)
- **Origin:** Golden Gate Bridge center at chunk (8, 10)

### 3.2 LOD Levels
| Level | Range from camera | Active count | Content |
|-------|-------------------|-------------|---------|
| LOD 0 | 0 – 750m | ~9 chunks | Full detail: individual buildings, road textures, street furniture, vegetation |
| LOD 1 | 750m – 1500m | ~16 chunks | Simplified: building silhouettes, no street furniture, merged geometry |
| LOD 2 | 1500m+ | ~231 chunks | Billboard: height-only colored boxes, skyline silhouette |

### 3.3 Lifecycle
1. **IDLE** → camera approaches load distance → **LOADING**
   - Terrain mesh generation (CPU, immediate)
   - Building placement calculation (seed-based deterministic)
   - InstancedMesh matrix insertion
2. **LOADING** → complete → **ACTIVE**
   - LOD level determines detail
3. **ACTIVE** → camera exceeds unload distance → **UNLOADING**
   - Mesh dispose(), matrix pool removal
   - **Hysteresis:** unload at 120% of load distance to prevent flickering

### 3.4 Deterministic Generation
`chunkSeed(cx, cz)` produces identical buildings for the same chunk coordinates every time. No persistence needed — unload and reload yields the same city.

---

## 4. City Generation

### 4.1 Building Types
| Type | Height | Style | Zone |
|------|--------|-------|------|
| Highrise | 30–250m | Glass curtain wall | Financial District |
| MidRise | 10–30m | Concrete/brick | SoMa, Mission |
| Victorian | 8–15m | Bay windows, painted | Marina, Pacific Heights |
| Industrial | 5–15m | Warehouse, flat roof | SoMa, Dogpatch |
| Wharf | 5–10m | Timber frame | Fisherman's Wharf |

### 4.2 Zone Map
`zoneAt(x, z)` function returns zone configuration based on world coordinates. Same approach as current `terrainH()`.

Zones: Financial District, Marina/Pacific Heights, SoMa/Mission, Fisherman's Wharf, Sunset/Richmond, Presidio (park), Marin Headlands (nature).

### 4.3 Instancing Strategy
Buildings of the same type share an `InstancedMesh`. One draw call per type per LOD level. Estimated ~200 total draw calls at any time.

---

## 5. Atmosphere System

### 5.1 Time of Day
Continuous 24-hour cycle with 6 phases:
- **Night** (00:00–04:00): Sun below horizon, window emissive high, stars
- **Dawn** (04:00–06:30): Warm orange transition, emissive fading
- **Day** (06:30–16:00): Full daylight, minimal emissive
- **Afternoon** (16:00–18:00): Slightly warm, lengthening shadows
- **Golden Hour** (18:00–20:00): Intense warm tones, dramatic shadows
- **Dusk** (20:00–22:00): Rapid dimming, lights turning on

Parameters interpolated: sun elevation, sun color, ambient intensity, fog color, fog density, window emissive, street light emissive.

### 5.2 Weather States
Three states with smooth interpolation during transitions:

**Clear:** Standard Rayleigh sky, minimal fog, sharp shadows, reflective water.

**SF Fog (Karl):** Heavy volumetric fog (density 0.0004), overcast gradient sky, diffuse shadows, muted gray-blue water. Golden Gate partially obscured — iconic SF visual.

**Rain:** Dark overcast, medium fog, near-invisible shadows, agitated dark water, wet surface reflections (road roughness drops to 0.3). RainDropPass adds lens droplets.

### 5.3 MaterialUpdater (Cross-Cutting Resolver)
Single system that traverses scene materials each frame and adjusts:
- Landmark emissives (aviation warning lights brightness)
- Building window emissive (night: random on/off pattern)
- Terrain vertex color correction (night: darken, golden hour: warm)
- Water uniforms (waterColor, sunDirection, distortionScale)
- Vehicle headlights (auto-on at dusk)
- Street lights (auto-on at sunset)

Modules do NOT know about MaterialUpdater. It finds materials via scene traversal. Zero inter-module coupling for time/weather.

---

## 6. PostFX Pipeline

```
RenderPass → Bloom → DoF → MotionBlur → ColorGrade → FilmGrain → Output
                                                        ↑
                                          (Rain: RainDropPass inserted before FilmGrain)
```

### Conditional Activation
| Pass | Condition | Reason |
|------|-----------|--------|
| Bloom | Always | Street lights, windows, sun reflections |
| DoF (BokehPass) | Altitude < 100m | Meaningless at high altitude |
| Motion Blur | Speed > 30 m/s | No blur when stationary |
| Color Grade | Always | Time-of-day LUT |
| Film Grain | Always | Subtle cinematic texture |
| RainDrop | Weather = Rain | Lens water droplets |

---

## 7. Camera System

### 7.1 Three Modes
**Free Flight:** Current WASD controls evolved. Additions:
- Altitude-based speed scaling (higher = faster for natural scale perception)
- FOV expansion during boost (60° → 75°)
- Smooth damping (current 0.90 maintained)

**Cinematic Path:** JSON-defined drone tour routes.
- CatmullRomCurve3 spline interpolation
- Ease-in/out speed curves
- Auto look-at target tracking
- Auto time-of-day and weather setting per path

**Orbit Viewpoint:** Current `autoFly` evolved.
- Select landmark target (number keys)
- Adjustable radius, altitude, speed
- Suitable for screensaver/exhibition mode

### 7.2 CameraEffects (Speed/Altitude Reactive)
Speed-based: Motion blur intensity, FOV change, subtle chromatic aberration at extreme speed.
Altitude-based: DoF strength (shallow at low altitude), fog falloff (rise above fog at high altitude), color temperature (cooler at height).

### 7.3 Viewpoints
Preset viewpoints (number keys):
1. **Overview** — Classic wide shot from southwest
2. **Deck Level** — Road-level view on the bridge
3. **Tower Top** — From top of south tower
4. **Cable Pass** — Following the main cable arc
5. **Aerial** — High altitude bird's eye
6. **Water Level** — Low over the bay surface

---

## 8. Extensibility Architecture

### 8.1 Registry Pattern
Central `GameWorld` holds four registries:

**LandmarkRegistry:** `register(id, LandmarkClass)` — New landmark = create class extending `BaseLandmark`, implement `build()`, register.

**BuildingRegistry:** `register(type, factoryFn)` — New building type = write factory function, register. ChunkManager picks it up automatically.

**ZoneRegistry:** `register(id, zoneConfig)` — New zone = JSON config defining building type distribution, density, height range. No code changes.

**WeatherRegistry:** `register(id, weatherParams)` — New weather = parameter set (fog density, sky color, shadow intensity, etc.).

### 8.2 Adding Content
To add a new landmark (e.g., Bay Bridge):
1. Create `src/landmarks/BayBridge.ts` extending `BaseLandmark`
2. Add `registry.register('bay-bridge', BayBridge)` in `src/landmarks/index.ts`
3. Done. ChunkManager places it at specified coordinates. MaterialUpdater handles time/weather automatically.

To add a new building type:
1. Write factory function in `src/city/BuildingTypes.ts`
2. Register in BuildingRegistry
3. Reference from zone configs

To add a new cinematic path:
1. Create JSON file in `src/camera/paths/`
2. CinematicDirector auto-discovers on load.

---

## 9. Build Phases

### Phase A: Landmarks + Foundation
- Vite + TypeScript project setup
- Extract current code into module structure
- ChunkManager with basic LOD (terrain only)
- GoldenGateBridge as first landmark module
- 3–5 additional SF landmarks (TransamericaPyramid, CoitTower, Alcatraz, Pier39)
- Current flight controls migrated

### Phase B: City Density
- BuildingFactory with 5 building types
- ZoneMap implementation
- InstancedPool for efficient rendering
- RoadNetwork per chunk
- VegetationSystem
- Traffic system (ECS migration from current instanced cars)

### Phase C: Atmosphere + Cinematic
- TimeOfDay with full day/night cycle
- WeatherSystem (Clear, Fog, Rain)
- MaterialUpdater cross-cutting integration
- Full PostFX pipeline (DoF, MotionBlur, FilmGrain, RainDrop)
- CinematicDirector with JSON paths
- CameraEffects (speed/altitude reactive)
- OrbitCamera mode

---

## 10. Performance Budget

Target: 60fps on high-end GPU (RTX 3070+ / M1 Pro+)

| Metric | Budget |
|--------|--------|
| Draw calls | < 250 |
| Triangles | < 2M visible |
| Texture memory | < 512MB |
| JS heap | < 256MB |
| Chunk load time | < 100ms per chunk |
| PostFX overhead | < 4ms per frame |
