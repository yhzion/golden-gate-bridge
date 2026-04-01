# Cinematic Lighting System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full cinematic lighting system to the Golden Gate Bridge 3D project with structural tower uplights, cable accents, road PointLights, aviation strobes, volumetric fog, god rays, lens flares, and an adaptive quality tier system.

**Architecture:** A `LightingManager` orchestrates four subsystems (`StructuralLights`, `RoadLights`, `SafetyLights`, `QualityTier`) and feeds light positions to three new post-processing passes (`VolumetricFogPass`, `GodRaysPass`, `LensFlarePass`). All systems are driven by the existing `TimeOfDay` and `WeatherSystem` state each frame.

**Tech Stack:** Three.js r183, TypeScript, Vite, custom GLSL shaders, EffectComposer (three/examples/jsm)

**Spec:** `docs/superpowers/specs/2026-04-01-cinematic-lighting-system-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/lighting/QualityTier.ts` | FPS monitoring, rolling average, tier transitions with cooldown |
| `src/lighting/StructuralLights.ts` | Tower SpotLight ×4, pier RectAreaLight ×2, saddle PointLight ×4, shadow budget |
| `src/lighting/RoadLights.ts` | Street lamp PointLight pool with LOD distance culling |
| `src/lighting/SafetyLights.ts` | Aviation beacon strobe, vehicle headlight PointLights |
| `src/lighting/LightingManager.ts` | Owns all subsystems, update loop, provides light positions to PostFX |
| `src/postfx/VolumetricFogPass.ts` | Full-screen ray-marching fog shader (half/full-res) |
| `src/postfx/GodRaysPass.ts` | Radial blur light shaft post-process |
| `src/postfx/LensFlarePass.ts` | Screen-space lens flare sprites |

### Modified files

| File | Change |
|------|--------|
| `src/postfx/PostFXPipeline.ts` | Accept `LightingManager`, insert 3 new passes, expose bloom for dynamic control |
| `src/main.ts` | Create `LightingManager`, wire into game loop, pass to `PostFXPipeline` |
| `src/engine/InputManager.ts` | Add `L`, `V`, `G` key bindings with callbacks |
| `src/ui/HUD.ts` | Show quality tier and FPS counter |
| `src/atmosphere/MaterialUpdater.ts` | Delegate emissive updates to `LightingManager` when present |

---

## Task 1: QualityTier module

**Files:**
- Create: `src/lighting/QualityTier.ts`

- [ ] **Step 1: Create `QualityTier` with FPS sampling and tier logic**

```typescript
// src/lighting/QualityTier.ts
export type Tier = 'low' | 'medium' | 'high';
export type TierMode = 'auto' | 'manual';

export class QualityTier {
  private targetFPS: number;
  private mode: TierMode = 'auto';
  private currentTier: Tier = 'high';
  private manualTier: Tier = 'high';
  private samples: number[] = [];
  private maxSamples = 60;
  private cooldown = 0;
  private cooldownDuration = 2; // seconds
  private listeners: ((tier: Tier) => void)[] = [];

  constructor(targetFPS = 50) {
    this.targetFPS = targetFPS;
  }

  sample(dt: number): void {
    if (dt <= 0) return;
    const fps = 1 / dt;
    this.samples.push(fps);
    if (this.samples.length > this.maxSamples) this.samples.shift();

    if (this.mode === 'manual') return;

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    if (this.samples.length < 30) return;

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    let next: Tier;
    if (avg >= this.targetFPS) next = 'high';
    else if (avg >= 30) next = 'medium';
    else next = 'low';

    if (next !== this.currentTier) {
      this.currentTier = next;
      this.cooldown = this.cooldownDuration;
      for (const cb of this.listeners) cb(next);
    }
  }

  getCurrentTier(): Tier {
    return this.mode === 'manual' ? this.manualTier : this.currentTier;
  }

  getAverageFPS(): number {
    if (this.samples.length === 0) return 60;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  getMode(): TierMode {
    return this.mode;
  }

  onTierChange(callback: (tier: Tier) => void): void {
    this.listeners.push(callback);
  }

  setMode(mode: TierMode): void {
    this.mode = mode;
  }

  setManualTier(tier: Tier): void {
    this.manualTier = tier;
    if (this.mode === 'manual') {
      for (const cb of this.listeners) cb(tier);
    }
  }

  /** Cycle: low → medium → high → auto */
  cycleManual(): string {
    if (this.mode === 'auto') {
      this.mode = 'manual';
      this.manualTier = 'low';
    } else if (this.manualTier === 'low') {
      this.manualTier = 'medium';
    } else if (this.manualTier === 'medium') {
      this.manualTier = 'high';
    } else {
      this.mode = 'auto';
      return 'AUTO';
    }
    for (const cb of this.listeners) cb(this.manualTier);
    return this.manualTier.toUpperCase();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `QualityTier.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lighting/QualityTier.ts
git commit -m "feat(lighting): add QualityTier FPS monitoring module"
```

---

## Task 2: StructuralLights module

**Files:**
- Create: `src/lighting/StructuralLights.ts`

- [ ] **Step 1: Create `StructuralLights` with tower SpotLights, pier RectAreaLights, saddle PointLights**

```typescript
// src/lighting/StructuralLights.ts
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

export class StructuralLights {
  private towerSpots: THREE.SpotLight[] = [];
  private pierRects: THREE.RectAreaLight[] = [];
  private saddlePoints: THREE.PointLight[] = [];
  private group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    RectAreaLightUniformsLib.init();

    const colSpacing = BRIDGE.deckW / 2 + 2;
    const towerZs = [0, BRIDGE.mainSpan];

    // 4 SpotLights: 2 per tower (one per side), pointing up
    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const spot = new THREE.SpotLight(0xffb347, 0, 300, Math.PI / 8, 0.6, 1.5);
        spot.position.set(side * colSpacing, -5, tz);
        spot.target.position.set(side * colSpacing * 0.85, BRIDGE.towerH + 20, tz);
        spot.castShadow = false; // managed by shadow budget
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.camera.near = 5;
        spot.shadow.camera.far = 300;
        scene.add(spot.target);
        this.group.add(spot);
        this.towerSpots.push(spot);
      }
    }

    // 2 RectAreaLights: one per tower pier, below water surface
    for (const tz of towerZs) {
      const rect = new THREE.RectAreaLight(0xffb347, 0, 30, 10);
      rect.position.set(0, -2, tz);
      rect.lookAt(0, -20, tz);
      this.group.add(rect);
      this.pierRects.push(rect);
    }

    // 4 PointLights: cable saddle points (top of each tower, each side)
    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const pl = new THREE.PointLight(0xffcc88, 0, 50, 2);
        pl.position.set(side * colSpacing, BRIDGE.towerH + 6, tz);
        this.group.add(pl);
        this.saddlePoints.push(pl);
      }
    }

    scene.add(this.group);
  }

  update(dt: number, time: TimeState, tier: Tier): void {
    // nightFactor: 0 = day, 1 = full night
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.8, 0, 1);
    // Lights only active when nightFactor > 0.3 (roughly Blue Hour start)
    const lightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.3, 0.6);

    // Tower SpotLights
    const spotIntensity = lightFactor * 1.5;
    for (const spot of this.towerSpots) {
      spot.intensity = spotIntensity;
    }

    // Pier RectAreaLights
    const rectIntensity = lightFactor * 0.8;
    for (const rect of this.pierRects) {
      rect.intensity = rectIntensity;
    }

    // Saddle PointLights
    const saddleIntensity = lightFactor * 0.5;
    for (const pl of this.saddlePoints) {
      pl.intensity = saddleIntensity;
    }

    // Tier-based: disable RectAreaLights on medium/low
    const enableRect = tier === 'high';
    for (const rect of this.pierRects) {
      rect.visible = enableRect;
    }
  }

  /** Update shadow budget: enable castShadow on closest N spots */
  updateShadowBudget(cameraPos: THREE.Vector3, maxShadows: number): void {
    const sorted = this.towerSpots
      .map((s, i) => ({ spot: s, dist: cameraPos.distanceTo(s.position), idx: i }))
      .sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].spot.castShadow = i < maxShadows;
    }
  }

  getTowerLightPositions(): THREE.Vector3[] {
    return this.towerSpots.map(s => s.position.clone());
  }

  getTowerLightColors(): THREE.Color[] {
    return this.towerSpots.map(s => s.color.clone());
  }

  getTowerLightIntensities(): number[] {
    return this.towerSpots.map(s => s.intensity);
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    for (const s of this.towerSpots) {
      s.dispose();
      s.target.parent?.remove(s.target);
    }
    for (const r of this.pierRects) r.dispose();
    for (const p of this.saddlePoints) p.dispose();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `StructuralLights.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lighting/StructuralLights.ts
git commit -m "feat(lighting): add StructuralLights with tower/pier/saddle lights"
```

---

## Task 3: RoadLights module

**Files:**
- Create: `src/lighting/RoadLights.ts`

- [ ] **Step 1: Create `RoadLights` with LOD-managed PointLight pool for street lamps**

```typescript
// src/lighting/RoadLights.ts
import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

const LIGHT_SPACING = 50;
const LIGHT_COLOR = 0xffddaa; // 3000K warm
const MAX_POOL = 20;

interface LampPosition {
  pos: THREE.Vector3;
}

export class RoadLights {
  private lampPositions: LampPosition[] = [];
  private pool: THREE.PointLight[] = [];
  private activeCount = 0;

  constructor(scene: THREE.Scene) {
    // Compute all lamp positions (matching GoldenGateBridge.createDeck street lights)
    const len = BRIDGE.mainSpan + BRIDGE.sideSpan * 2;
    const startZ = -BRIDGE.sideSpan;
    const numLights = Math.floor(len / LIGHT_SPACING);

    for (const side of [-1, 1]) {
      for (let i = 0; i < numLights; i++) {
        const lz = startZ + i * LIGHT_SPACING + LIGHT_SPACING / 2;
        const lx = side * (BRIDGE.deckW / 2 + 0.8 + 0.8);
        const ly = BRIDGE.deckH + 4.55;
        this.lampPositions.push({ pos: new THREE.Vector3(lx, ly, lz) });
      }
    }

    // Create PointLight pool
    for (let i = 0; i < MAX_POOL; i++) {
      const pl = new THREE.PointLight(LIGHT_COLOR, 0, 30, 2);
      pl.visible = false;
      scene.add(pl);
      this.pool.push(pl);
    }
  }

  update(dt: number, time: TimeState, tier: Tier, cameraPos: THREE.Vector3): void {
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.8, 0, 1);
    const lightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.2, 0.5);

    if (lightFactor < 0.01) {
      // Daytime: all off
      for (const pl of this.pool) pl.visible = false;
      this.activeCount = 0;
      return;
    }

    // Determine max active lights by tier
    const maxActive = tier === 'high' ? 20 : tier === 'medium' ? 8 : 4;

    // Sort lamp positions by distance to camera
    const sorted = this.lampPositions
      .map((lp, i) => ({ lp, dist: cameraPos.distanceTo(lp.pos), idx: i }))
      .sort((a, b) => a.dist - b.dist);

    // Assign nearest lamps to pool
    const count = Math.min(maxActive, this.pool.length, sorted.length);
    for (let i = 0; i < this.pool.length; i++) {
      if (i < count && sorted[i].dist < 1000) {
        this.pool[i].visible = true;
        this.pool[i].position.copy(sorted[i].lp.pos);
        this.pool[i].intensity = lightFactor * 0.8;
      } else {
        this.pool[i].visible = false;
      }
    }
    this.activeCount = count;
  }

  getActiveLightPositions(): THREE.Vector3[] {
    return this.pool.filter(p => p.visible).map(p => p.position.clone());
  }

  getActiveLightColors(): THREE.Color[] {
    return this.pool.filter(p => p.visible).map(p => p.color.clone());
  }

  getActiveLightIntensities(): number[] {
    return this.pool.filter(p => p.visible).map(p => p.intensity);
  }

  dispose(): void {
    for (const pl of this.pool) {
      pl.parent?.remove(pl);
      pl.dispose();
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `RoadLights.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lighting/RoadLights.ts
git commit -m "feat(lighting): add RoadLights with LOD PointLight pool"
```

---

## Task 4: SafetyLights module

**Files:**
- Create: `src/lighting/SafetyLights.ts`

- [ ] **Step 1: Create `SafetyLights` with aviation strobe and vehicle headlight PointLights**

```typescript
// src/lighting/SafetyLights.ts
import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

export class SafetyLights {
  private aviationMaterials: THREE.MeshStandardMaterial[] = [];
  private headlightPool: THREE.PointLight[] = [];
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    // Find aviation beacon materials by traversing scene
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive && mat.emissive.r > 0.8 && mat.emissive.g < 0.2 && mat.emissive.b < 0.2) {
          if (!this.aviationMaterials.includes(mat)) {
            this.aviationMaterials.push(mat);
          }
        }
      }
    });

    // Vehicle headlight PointLight pool (max 4)
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffffee, 0, 40, 2);
      pl.visible = false;
      scene.add(pl);
      this.headlightPool.push(pl);
    }
  }

  update(dt: number, time: TimeState, tier: Tier, elapsed: number): void {
    this.elapsed = elapsed;
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.8, 0, 1);

    // Aviation strobe
    const strobePeriod = nightFactor > 0.5 ? 0.8 : 1.5;
    const strobePhase = (elapsed % strobePeriod) / strobePeriod;
    const strobeIntensity = 0.5 + 2.5 * Math.pow(Math.max(0, Math.sin(strobePhase * Math.PI * 2)), 4);

    for (const mat of this.aviationMaterials) {
      mat.emissiveIntensity = strobeIntensity;
    }

    // Vehicle headlights: only at night, only on low tier = 0, medium = 2, high = 4
    const headlightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.3, 0.6);
    const maxHeadlights = tier === 'high' ? 4 : tier === 'medium' ? 2 : 0;

    for (let i = 0; i < this.headlightPool.length; i++) {
      this.headlightPool[i].visible = i < maxHeadlights && headlightFactor > 0.01;
      this.headlightPool[i].intensity = headlightFactor * 0.6;
    }
  }

  /** Call from LightingManager to position headlights near camera-closest vehicles */
  setHeadlightPositions(positions: THREE.Vector3[]): void {
    for (let i = 0; i < this.headlightPool.length; i++) {
      if (i < positions.length) {
        this.headlightPool[i].position.copy(positions[i]);
      }
    }
  }

  dispose(): void {
    for (const pl of this.headlightPool) {
      pl.parent?.remove(pl);
      pl.dispose();
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `SafetyLights.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lighting/SafetyLights.ts
git commit -m "feat(lighting): add SafetyLights with aviation strobe and headlights"
```

---

## Task 5: LightingManager module

**Files:**
- Create: `src/lighting/LightingManager.ts`

- [ ] **Step 1: Create `LightingManager` that orchestrates all subsystems**

```typescript
// src/lighting/LightingManager.ts
import * as THREE from 'three';
import { QualityTier, type Tier, type TierMode } from './QualityTier';
import { StructuralLights } from './StructuralLights';
import { RoadLights } from './RoadLights';
import { SafetyLights } from './SafetyLights';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { WeatherState } from '@/atmosphere/WeatherSystem';

export class LightingManager {
  readonly qualityTier: QualityTier;
  private structural: StructuralLights;
  private road: RoadLights;
  private safety: SafetyLights;
  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;
    this.qualityTier = new QualityTier(50);
    this.structural = new StructuralLights(scene);
    this.road = new RoadLights(scene);
    this.safety = new SafetyLights(scene);

    this.qualityTier.onTierChange((tier) => {
      this.applyTier(tier);
    });
  }

  update(dt: number, elapsed: number, timeState: TimeState, weatherState: WeatherState): void {
    this.qualityTier.sample(dt);
    const tier = this.qualityTier.getCurrentTier();
    const camPos = this.camera.position;

    this.structural.update(dt, timeState, tier);
    this.road.update(dt, timeState, tier, camPos);
    this.safety.update(dt, timeState, tier, elapsed);

    // Shadow budget: HIGH = 2, MEDIUM = 0, LOW = 0
    const maxShadows = tier === 'high' ? 2 : 0;
    this.structural.updateShadowBudget(camPos, maxShadows);
  }

  private applyTier(tier: Tier): void {
    // Tier changes are handled per-frame in each subsystem's update
    // This callback is for logging or UI updates
  }

  /** Get all active light positions for post-processing passes (max 8) */
  getLightPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    positions.push(...this.structural.getTowerLightPositions());
    positions.push(...this.road.getActiveLightPositions());
    return positions.slice(0, 8);
  }

  /** Get matching colors for getLightPositions() */
  getLightColors(): THREE.Color[] {
    const colors: THREE.Color[] = [];
    colors.push(...this.structural.getTowerLightColors());
    colors.push(...this.road.getActiveLightColors());
    return colors.slice(0, 8);
  }

  /** Get matching intensities for getLightPositions() */
  getLightIntensities(): number[] {
    const intensities: number[] = [];
    intensities.push(...this.structural.getTowerLightIntensities());
    intensities.push(...this.road.getActiveLightIntensities());
    return intensities.slice(0, 8);
  }

  setQualityTier(tier: Tier | 'auto'): void {
    if (tier === 'auto') {
      this.qualityTier.setMode('auto');
    } else {
      this.qualityTier.setMode('manual');
      this.qualityTier.setManualTier(tier);
    }
  }

  cycleQualityTier(): string {
    return this.qualityTier.cycleManual();
  }

  dispose(): void {
    this.structural.dispose();
    this.road.dispose();
    this.safety.dispose();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `LightingManager.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lighting/LightingManager.ts
git commit -m "feat(lighting): add LightingManager orchestrator"
```

---

## Task 6: VolumetricFogPass

**Files:**
- Create: `src/postfx/VolumetricFogPass.ts`

- [ ] **Step 1: Create `VolumetricFogPass` with ray-marching fog shader**

```typescript
// src/postfx/VolumetricFogPass.ts
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const MAX_LIGHTS = 8;

const VolumetricFogShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    cameraNear: { value: 0.5 },
    cameraFar: { value: 80000 },
    cameraPosition: { value: new THREE.Vector3() },
    inverseProjection: { value: new THREE.Matrix4() },
    inverseView: { value: new THREE.Matrix4() },
    lightPositions: { value: new Array(MAX_LIGHTS).fill(null).map(() => new THREE.Vector3()) },
    lightColors: { value: new Array(MAX_LIGHTS).fill(null).map(() => new THREE.Vector3(1, 0.8, 0.5)) },
    lightIntensities: { value: new Float32Array(MAX_LIGHTS) },
    numActiveLights: { value: 0 },
    fogDensity: { value: 0.0003 },
    fogColor: { value: new THREE.Vector3(0.5, 0.5, 0.6) },
    anisotropy: { value: 0.7 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 cameraPosition;
    uniform mat4 inverseProjection;
    uniform mat4 inverseView;
    uniform vec3 lightPositions[${MAX_LIGHTS}];
    uniform vec3 lightColors[${MAX_LIGHTS}];
    uniform float lightIntensities[${MAX_LIGHTS}];
    uniform int numActiveLights;
    uniform float fogDensity;
    uniform vec3 fogColor;
    uniform float anisotropy;
    uniform float time;

    varying vec2 vUv;

    // Hash for dithering
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float linearizeDepth(float d) {
      return cameraNear * cameraFar / (cameraFar - d * (cameraFar - cameraNear));
    }

    // Henyey-Greenstein phase function
    float hgPhase(float cosTheta, float g) {
      float g2 = g * g;
      return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
    }

    vec3 worldPosFromDepth(vec2 uv, float depth) {
      vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      vec4 viewPos = inverseProjection * clipPos;
      viewPos /= viewPos.w;
      vec4 worldPos = inverseView * viewPos;
      return worldPos.xyz;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float depth = texture2D(tDepth, vUv).r;

      if (depth >= 1.0) {
        gl_FragColor = color;
        return;
      }

      vec3 worldPos = worldPosFromDepth(vUv, depth);
      vec3 rayDir = normalize(worldPos - cameraPosition);
      float totalDist = length(worldPos - cameraPosition);

      // Dithered offset to reduce banding
      float dither = hash(vUv * vec2(1920.0, 1080.0) + time * 100.0);

      const int STEPS = 16;
      float stepSize = totalDist / float(STEPS);
      vec3 scattered = vec3(0.0);
      float transmittance = 1.0;

      for (int i = 0; i < STEPS; i++) {
        float t = (float(i) + dither) * stepSize;
        vec3 samplePos = cameraPosition + rayDir * t;

        // Beer-Lambert extinction
        float extinction = fogDensity * stepSize;
        transmittance *= exp(-extinction);

        // Accumulate scattering from each light
        for (int j = 0; j < ${MAX_LIGHTS}; j++) {
          if (j >= numActiveLights) break;
          vec3 toLight = lightPositions[j] - samplePos;
          float lightDist = length(toLight);
          vec3 lightDir = toLight / lightDist;

          float attenuation = lightIntensities[j] / (1.0 + lightDist * lightDist * 0.001);
          float cosTheta = dot(rayDir, lightDir);
          float phase = hgPhase(cosTheta, anisotropy);

          scattered += lightColors[j] * attenuation * phase * fogDensity * stepSize * transmittance;
        }
      }

      vec3 result = color.rgb * transmittance + scattered + fogColor * (1.0 - transmittance) * 0.1;
      gl_FragColor = vec4(result, color.a);
    }
  `,
};

export class VolumetricFogPass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;
  private depthTexture: THREE.DepthTexture | null = null;
  private _enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, private camera: THREE.Camera) {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(VolumetricFogShader.uniforms),
      vertexShader: VolumetricFogShader.vertexShader,
      fragmentShader: VolumetricFogShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setDepthTexture(depthTexture: THREE.DepthTexture): void {
    this.depthTexture = depthTexture;
    this.material.uniforms['tDepth'].value = depthTexture;
  }

  setLights(positions: THREE.Vector3[], colors: THREE.Color[], intensities: number[]): void {
    const u = this.material.uniforms;
    const count = Math.min(positions.length, MAX_LIGHTS);
    u['numActiveLights'].value = count;
    for (let i = 0; i < count; i++) {
      (u['lightPositions'].value as THREE.Vector3[])[i].copy(positions[i]);
      const c = colors[i];
      (u['lightColors'].value as THREE.Vector3[])[i].set(c.r, c.g, c.b);
      (u['lightIntensities'].value as Float32Array)[i] = intensities[i];
    }
  }

  setFogParams(density: number, color: THREE.Color, anisotropy: number): void {
    this.material.uniforms['fogDensity'].value = density;
    (this.material.uniforms['fogColor'].value as THREE.Vector3).set(color.r, color.g, color.b);
    this.material.uniforms['anisotropy'].value = anisotropy;
  }

  setVolumetricEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.enabled = enabled;
  }

  isVolumetricEnabled(): boolean {
    return this._enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const u = this.material.uniforms;
    u['tDiffuse'].value = readBuffer.texture;
    u['cameraNear'].value = (this.camera as THREE.PerspectiveCamera).near;
    u['cameraFar'].value = (this.camera as THREE.PerspectiveCamera).far;
    (u['cameraPosition'].value as THREE.Vector3).copy(this.camera.position);
    (u['inverseProjection'].value as THREE.Matrix4).copy(this.camera.projectionMatrixInverse);
    (u['inverseView'].value as THREE.Matrix4).copy(this.camera.matrixWorld);
    u['time'].value = performance.now() * 0.001;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    this.fsQuad.render(renderer);
  }

  dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `VolumetricFogPass.ts`

- [ ] **Step 3: Commit**

```bash
git add src/postfx/VolumetricFogPass.ts
git commit -m "feat(postfx): add VolumetricFogPass with ray-marching shader"
```

---

## Task 7: GodRaysPass

**Files:**
- Create: `src/postfx/GodRaysPass.ts`

- [ ] **Step 1: Create `GodRaysPass` with radial blur shader**

```typescript
// src/postfx/GodRaysPass.ts
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    lightScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    exposure: { value: 0.3 },
    decay: { value: 0.96 },
    density: { value: 0.8 },
    weight: { value: 0.4 },
    samples: { value: 6 },
    lightVisible: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 lightScreenPos;
    uniform float exposure;
    uniform float decay;
    uniform float density;
    uniform float weight;
    uniform int samples;
    uniform float lightVisible;

    varying vec2 vUv;

    void main() {
      vec4 origColor = texture2D(tDiffuse, vUv);

      if (lightVisible < 0.01) {
        gl_FragColor = origColor;
        return;
      }

      vec2 deltaUV = (vUv - lightScreenPos) * density / float(samples);
      vec2 uv = vUv;
      vec3 godRay = vec3(0.0);
      float illuminationDecay = 1.0;

      for (int i = 0; i < 6; i++) {
        if (i >= samples) break;
        uv -= deltaUV;
        vec3 sampleColor = texture2D(tDiffuse, uv).rgb;
        // Extract bright regions
        float brightness = dot(sampleColor, vec3(0.299, 0.587, 0.114));
        float mask = smoothstep(0.6, 1.0, brightness);
        sampleColor *= mask;
        sampleColor *= illuminationDecay * weight;
        godRay += sampleColor;
        illuminationDecay *= decay;
      }

      vec3 result = origColor.rgb + godRay * exposure * lightVisible;
      gl_FragColor = vec4(result, origColor.a);
    }
  `,
};

export class GodRaysPass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;
  private _enabled = true;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(GodRaysShader.uniforms),
      vertexShader: GodRaysShader.vertexShader,
      fragmentShader: GodRaysShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  /** Project a world-space light position to screen coordinates */
  setLightWorldPos(worldPos: THREE.Vector3, camera: THREE.Camera): void {
    const ndc = worldPos.clone().project(camera);
    // Check if light is behind camera
    if (ndc.z > 1) {
      this.material.uniforms['lightVisible'].value = 0;
      return;
    }
    this.material.uniforms['lightScreenPos'].value.set(
      ndc.x * 0.5 + 0.5,
      ndc.y * 0.5 + 0.5,
    );
  }

  setIntensity(intensity: number): void {
    this.material.uniforms['lightVisible'].value = THREE.MathUtils.clamp(intensity, 0, 1);
  }

  setGodRaysEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.enabled = enabled;
  }

  isGodRaysEnabled(): boolean {
    return this._enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.material.uniforms['tDiffuse'].value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    this.fsQuad.render(renderer);
  }

  dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `GodRaysPass.ts`

- [ ] **Step 3: Commit**

```bash
git add src/postfx/GodRaysPass.ts
git commit -m "feat(postfx): add GodRaysPass with radial blur shader"
```

---

## Task 8: LensFlarePass

**Files:**
- Create: `src/postfx/LensFlarePass.ts`

- [ ] **Step 1: Create `LensFlarePass` with screen-space flare sprites**

```typescript
// src/postfx/LensFlarePass.ts
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const MAX_FLARES = 8;

const LensFlareShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    flarePositions: { value: new Array(MAX_FLARES).fill(null).map(() => new THREE.Vector2()) },
    flareColors: { value: new Array(MAX_FLARES).fill(null).map(() => new THREE.Vector3(1, 0.9, 0.7)) },
    flareIntensities: { value: new Float32Array(MAX_FLARES) },
    numFlares: { value: 0 },
    aspectRatio: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 flarePositions[${MAX_FLARES}];
    uniform vec3 flareColors[${MAX_FLARES}];
    uniform float flareIntensities[${MAX_FLARES}];
    uniform int numFlares;
    uniform float aspectRatio;

    varying vec2 vUv;

    // Star flare pattern
    float starFlare(vec2 uv, vec2 center, float size) {
      vec2 d = (uv - center) * vec2(aspectRatio, 1.0);
      float dist = length(d);
      float core = exp(-dist * dist / (size * size * 0.002));
      // 4-point star
      float angle = atan(d.y, d.x);
      float star = pow(abs(cos(angle * 2.0)), 40.0) * exp(-dist / (size * 0.15));
      // Anamorphic horizontal streak
      float streak = exp(-abs(d.y) / (size * 0.003)) * exp(-abs(d.x) / (size * 0.08));
      return core * 0.6 + star * 0.25 + streak * 0.15;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 flare = vec3(0.0);

      for (int i = 0; i < ${MAX_FLARES}; i++) {
        if (i >= numFlares) break;
        if (flareIntensities[i] < 0.01) continue;
        float f = starFlare(vUv, flarePositions[i], 1.0);
        flare += flareColors[i] * f * flareIntensities[i];
      }

      gl_FragColor = vec4(color.rgb + flare, color.a);
    }
  `,
};

export class LensFlarePass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(LensFlareShader.uniforms),
      vertexShader: LensFlareShader.vertexShader,
      fragmentShader: LensFlareShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setFlares(
    positions: THREE.Vector2[],
    colors: THREE.Color[],
    intensities: number[],
  ): void {
    const u = this.material.uniforms;
    const count = Math.min(positions.length, MAX_FLARES);
    u['numFlares'].value = count;
    for (let i = 0; i < count; i++) {
      (u['flarePositions'].value as THREE.Vector2[])[i].copy(positions[i]);
      const c = colors[i];
      (u['flareColors'].value as THREE.Vector3[])[i].set(c.r, c.g, c.b);
      (u['flareIntensities'].value as Float32Array)[i] = intensities[i];
    }
    u['aspectRatio'].value = innerWidth / innerHeight;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.material.uniforms['tDiffuse'].value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    this.fsQuad.render(renderer);
  }

  dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `LensFlarePass.ts`

- [ ] **Step 3: Commit**

```bash
git add src/postfx/LensFlarePass.ts
git commit -m "feat(postfx): add LensFlarePass with screen-space star flares"
```

---

## Task 9: Modify PostFXPipeline to integrate new passes

**Files:**
- Modify: `src/postfx/PostFXPipeline.ts`

- [ ] **Step 1: Update PostFXPipeline to accept LightingManager and integrate all new passes**

Replace the entire content of `src/postfx/PostFXPipeline.ts` with:

```typescript
// src/postfx/PostFXPipeline.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VolumetricFogPass } from './VolumetricFogPass';
import { GodRaysPass } from './GodRaysPass';
import { LensFlarePass } from './LensFlarePass';
import type { LightingManager } from '@/lighting/LightingManager';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { WeatherState } from '@/atmosphere/WeatherSystem';

const ColorGradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = (c.rgb - 0.5) * 1.02 + 0.5;
      vec2 uv = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(uv * 0.4, uv * 0.4);
      c.rgb *= smoothstep(0.0, 1.0, vig);
      gl_FragColor = c;
    }
  `,
};

export class PostFXPipeline {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  volumetricFog: VolumetricFogPass;
  godRays: GodRaysPass;
  lensFlare: LensFlarePass;

  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private lightingManager: LightingManager | null;
  private depthRenderTarget: THREE.WebGLRenderTarget;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    lightingManager: LightingManager | null = null,
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.lightingManager = lightingManager;

    // Depth render target for volumetric fog
    this.depthRenderTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
      depthTexture: new THREE.DepthTexture(innerWidth, innerHeight),
      depthBuffer: true,
    });
    this.depthRenderTarget.depthTexture.format = THREE.DepthFormat;
    this.depthRenderTarget.depthTexture.type = THREE.UnsignedIntType;

    this.composer = new EffectComposer(renderer);

    // 1. Scene render
    this.composer.addPass(new RenderPass(scene, camera));

    // 2. Volumetric Fog
    this.volumetricFog = new VolumetricFogPass(renderer, camera);
    this.volumetricFog.setDepthTexture(this.depthRenderTarget.depthTexture);
    this.volumetricFog.enabled = false; // Enabled when nightFactor > 0
    this.composer.addPass(this.volumetricFog);

    // 3. God Rays
    this.godRays = new GodRaysPass();
    this.godRays.enabled = false;
    this.composer.addPass(this.godRays);

    // 4. Bloom
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.08, 0.3, 0.95,
    );
    this.composer.addPass(this.bloom);

    // 5. Lens Flare
    this.lensFlare = new LensFlarePass();
    this.lensFlare.enabled = false;
    this.composer.addPass(this.lensFlare);

    // 6. Color Grade + Vignette
    this.composer.addPass(new ShaderPass(ColorGradeShader));

    // 7. Output
    this.composer.addPass(new OutputPass());
  }

  /** Call before render each frame to update dynamic parameters */
  updateLighting(timeState: TimeState, weatherState: WeatherState): void {
    if (!this.lightingManager) return;

    const nightFactor = 1 - THREE.MathUtils.clamp(timeState.sunIntensity / 0.8, 0, 1);
    const tier = this.lightingManager.qualityTier.getCurrentTier();

    // Update bloom dynamically
    const fogActive = weatherState.fogMultiplier > 2;
    if (nightFactor > 0.7 && fogActive) {
      this.bloom.threshold = 0.2;
      this.bloom.strength = 1.2;
    } else if (nightFactor > 0.5) {
      this.bloom.threshold = 0.4;
      this.bloom.strength = 0.8;
    } else if (nightFactor > 0.2) {
      this.bloom.threshold = 0.6;
      this.bloom.strength = 0.5;
    } else {
      this.bloom.threshold = 0.9;
      this.bloom.strength = 0.3;
    }

    // Volumetric fog: only at night, HIGH/MEDIUM tier
    const volEnabled = this.volumetricFog.isVolumetricEnabled()
      && nightFactor > 0.2
      && tier !== 'low';
    this.volumetricFog.enabled = volEnabled;

    if (volEnabled) {
      const positions = this.lightingManager.getLightPositions();
      const colors = this.lightingManager.getLightColors();
      const intensities = this.lightingManager.getLightIntensities();
      this.volumetricFog.setLights(positions, colors, intensities);

      const baseDensity = timeState.fogDensity * weatherState.fogMultiplier;
      const volDensity = baseDensity * (nightFactor > 0.5 ? 3.0 : 1.0);
      this.volumetricFog.setFogParams(
        volDensity,
        timeState.fogColor,
        0.7,
      );
    }

    // God rays: fog + night
    const godRayEnabled = this.godRays.isGodRaysEnabled()
      && tier === 'high'
      && (nightFactor > 0.5 || timeState.sunElevation < 15);
    this.godRays.enabled = godRayEnabled;

    if (godRayEnabled) {
      if (timeState.sunElevation > 0 && nightFactor < 0.5) {
        // Daytime sun god rays
        const sunDir = new THREE.Vector3().setFromSphericalCoords(
          1,
          THREE.MathUtils.degToRad(90 - timeState.sunElevation),
          THREE.MathUtils.degToRad(timeState.sunAzimuth),
        );
        const sunWorldPos = sunDir.multiplyScalar(5000).add(this.camera.position);
        this.godRays.setLightWorldPos(sunWorldPos, this.camera);
        this.godRays.setIntensity(0.3);
      } else if (nightFactor > 0.5 && weatherState.fogMultiplier > 2) {
        // Night fog: god rays from closest tower spotlight
        const positions = this.lightingManager.getLightPositions();
        if (positions.length > 0) {
          this.godRays.setLightWorldPos(positions[0], this.camera);
          this.godRays.setIntensity(0.8);
        }
      } else {
        this.godRays.setIntensity(0);
      }
    }

    // Lens flare: night only, HIGH/MEDIUM tier
    const flareEnabled = nightFactor > 0.3 && tier !== 'low';
    this.lensFlare.enabled = flareEnabled;

    if (flareEnabled) {
      const positions = this.lightingManager.getLightPositions();
      const colors = this.lightingManager.getLightColors();
      const intensities = this.lightingManager.getLightIntensities();
      const screenPositions: THREE.Vector2[] = [];
      const screenColors: THREE.Color[] = [];
      const screenIntensities: number[] = [];

      for (let i = 0; i < positions.length; i++) {
        const ndc = positions[i].clone().project(this.camera);
        if (ndc.z > 1 || Math.abs(ndc.x) > 1.2 || Math.abs(ndc.y) > 1.2) continue;
        screenPositions.push(new THREE.Vector2(ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5));
        screenColors.push(colors[i]);
        screenIntensities.push(intensities[i] * nightFactor * 0.15);
      }
      this.lensFlare.setFlares(screenPositions, screenColors, screenIntensities);
    }
  }

  /** Render depth to separate target (for volumetric fog), then compose */
  render(): void {
    // Render depth pass if volumetric fog is active
    if (this.volumetricFog.enabled) {
      const currentRT = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.depthRenderTarget);
      this.renderer.render(this.composer.passes[0] as any, this.camera);
      this.renderer.setRenderTarget(currentRT);
    }

    this.composer.render();
  }

  resize(): void {
    const w = innerWidth;
    const h = innerHeight;
    this.composer.setSize(w, h);
    this.depthRenderTarget.setSize(w, h);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `PostFXPipeline.ts`

- [ ] **Step 3: Commit**

```bash
git add src/postfx/PostFXPipeline.ts
git commit -m "feat(postfx): integrate volumetric fog, god rays, lens flare into pipeline"
```

---

## Task 10: Update InputManager with L/V/G key bindings

**Files:**
- Modify: `src/engine/InputManager.ts`

- [ ] **Step 1: Add lighting control callbacks to InputManager**

In `src/engine/InputManager.ts`, add a new callback field and key handlers:

Add after line 34 (`private onToggleFog: (() => void) | null = null;`):

```typescript
  private onLightingKey: ((key: 'L' | 'V' | 'G') => void) | null = null;
```

Replace the `setCallbacks` method (line 61-64) with:

```typescript
  setCallbacks(
    onViewpoint: (n: number) => void,
    onToggleFog: () => void,
    onLightingKey?: (key: 'L' | 'V' | 'G') => void,
  ) {
    this.onViewpoint = onViewpoint;
    this.onToggleFog = onToggleFog;
    this.onLightingKey = onLightingKey ?? null;
  }
```

In the `onKeyDown` handler, add after line 119 (`if (e.code === 'KeyF') this.onToggleFog?.();`):

```typescript
    if (e.code === 'KeyL') this.onLightingKey?.('L');
    if (e.code === 'KeyV') this.onLightingKey?.('V');
    if (e.code === 'KeyG') this.onLightingKey?.('G');
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/engine/InputManager.ts
git commit -m "feat(input): add L/V/G key bindings for lighting controls"
```

---

## Task 11: Update HUD with quality tier and FPS display

**Files:**
- Modify: `src/ui/HUD.ts`

- [ ] **Step 1: Extend HUD to show quality tier and FPS**

Replace the entire content of `src/ui/HUD.ts` with:

```typescript
// src/ui/HUD.ts
import type { ControlState } from '@/engine/InputManager';

export class HUD {
  private speedEl: HTMLElement | null;
  private altEl: HTMLElement | null;
  private posEl: HTMLElement | null;
  private tierEl: HTMLElement | null;
  private fpsEl: HTMLElement | null;

  constructor() {
    this.speedEl = document.getElementById('hud-speed');
    this.altEl = document.getElementById('hud-alt');
    this.posEl = document.getElementById('hud-pos');
    this.tierEl = document.getElementById('hud-tier');
    this.fpsEl = document.getElementById('hud-fps');

    // Create tier/fps elements if they don't exist in HTML
    if (!this.tierEl) {
      const hud = document.getElementById('hud');
      if (hud) {
        const tierDiv = document.createElement('div');
        tierDiv.id = 'hud-tier';
        tierDiv.style.cssText = 'position:absolute;bottom:12px;left:12px;font-size:11px;opacity:0.7;';
        hud.appendChild(tierDiv);
        this.tierEl = tierDiv;
      }
    }
    if (!this.fpsEl) {
      const hud = document.getElementById('hud');
      if (hud) {
        const fpsDiv = document.createElement('div');
        fpsDiv.id = 'hud-fps';
        fpsDiv.style.cssText = 'position:absolute;bottom:12px;right:12px;font-size:11px;opacity:0.7;';
        hud.appendChild(fpsDiv);
        this.fpsEl = fpsDiv;
      }
    }
  }

  update(
    ctrl: ControlState,
    cameraPos: { x: number; y: number; z: number },
    tierLabel?: string,
    fps?: number,
  ) {
    if (this.speedEl) this.speedEl.textContent = String(Math.round(ctrl.speed * (ctrl.boost ? 3 : 1)));
    if (this.altEl) this.altEl.textContent = String(Math.round(cameraPos.y));
    if (this.posEl) this.posEl.textContent = `${Math.round(cameraPos.x)}, ${Math.round(cameraPos.z)}`;
    if (this.tierEl && tierLabel !== undefined) this.tierEl.textContent = `Quality: ${tierLabel}`;
    if (this.fpsEl && fps !== undefined) this.fpsEl.textContent = `${Math.round(fps)} FPS`;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/HUD.ts
git commit -m "feat(ui): add quality tier and FPS display to HUD"
```

---

## Task 12: Wire everything together in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Import LightingManager and wire into game loop**

Replace the entire content of `src/main.ts` with:

```typescript
import * as THREE from 'three';
import { SceneManager } from '@/engine/SceneManager';
import { GameLoop } from '@/engine/GameLoop';
import { InputManager } from '@/engine/InputManager';
import { PostFXPipeline } from '@/postfx/PostFXPipeline';
import { createMaterials } from '@/world/Materials';
import { SkyController } from '@/world/SkyController';
import { createWater } from '@/world/Water';
import { createLighting } from '@/world/Lighting';
import { createTerrain } from '@/world/TerrainGenerator';
import { GoldenGateBridge } from '@/landmarks/GoldenGateBridge';
import { landmarkRegistry } from '@/landmarks/index';
import { FlightCamera } from '@/camera/FlightCamera';
import { VehicleSystem } from '@/traffic/VehicleSystem';
import { Cityscape } from '@/traffic/Cityscape';
import { BirdSystem } from '@/traffic/BirdSystem';
import { TimeOfDay } from '@/atmosphere/TimeOfDay';
import { WeatherSystem, WeatherType } from '@/atmosphere/WeatherSystem';
import { MaterialUpdater } from '@/atmosphere/MaterialUpdater';
import { NightSky } from '@/atmosphere/NightSky';
import { LightingManager } from '@/lighting/LightingManager';
import { HUD } from '@/ui/HUD';

function init() {
  const prog = document.getElementById('prog') as HTMLElement;
  prog.style.width = '10%';

  // Engine core
  const sm = new SceneManager();
  prog.style.width = '20%';

  // Materials
  const mats = createMaterials();
  prog.style.width = '25%';

  // Sky & Water
  const skyCtrl = new SkyController(sm);
  const water = createWater(sm.scene);
  prog.style.width = '35%';

  skyCtrl.updateSun(12, 235, water);
  const sunLight = createLighting(sm.scene);
  prog.style.width = '45%';

  // Terrain
  createTerrain(sm.scene);
  prog.style.width = '55%';

  // Landmarks
  const ggb = new GoldenGateBridge(mats);
  landmarkRegistry.register(ggb);
  landmarkRegistry.buildAll();
  landmarkRegistry.addAllTo(sm.scene);
  prog.style.width = '65%';

  // Cityscape
  const cityscape = new Cityscape();
  cityscape.build(sm.scene);

  const vehicles = new VehicleSystem();
  vehicles.build(sm.scene);

  const birds = new BirdSystem();
  birds.build(sm.scene);
  prog.style.width = '75%';

  // Atmosphere
  const timeOfDay = new TimeOfDay(17);
  const weatherSystem = new WeatherSystem();
  const matUpdater = new MaterialUpdater(sm, water, skyCtrl.sky, sunLight);
  const nightSky = new NightSky();
  sm.scene.add(nightSky.mesh);
  prog.style.width = '80%';

  // Cinematic Lighting System
  const lightingManager = new LightingManager(sm.scene, sm.camera);

  // Input + Camera
  const input = new InputManager(sm.renderer.domElement);
  const flight = new FlightCamera(sm.camera, input.ctrl);

  input.setCallbacks(
    (n) => {
      flight.autoFly = false;
      if (n === 7) { weatherSystem.setWeather(WeatherType.Clear); return; }
      if (n === 8) { weatherSystem.setWeather(WeatherType.Fog); return; }
      if (n === 9) { weatherSystem.setWeather(WeatherType.Rain); return; }
      flight.goToViewpoint(n);
    },
    () => {
      timeOfDay.paused = !timeOfDay.paused;
    },
    (key) => {
      if (key === 'L') {
        lightingManager.cycleQualityTier();
      } else if (key === 'V') {
        const vf = postfx.volumetricFog;
        vf.setVolumetricEnabled(!vf.isVolumetricEnabled());
      } else if (key === 'G') {
        const gr = postfx.godRays;
        gr.setGodRaysEnabled(!gr.isGodRaysEnabled());
      }
    },
  );

  // UI
  const helpToggle = document.getElementById('helpToggle');
  const controlsHelp = document.getElementById('controlsHelp');
  if (helpToggle && controlsHelp) {
    helpToggle.addEventListener('click', () => {
      controlsHelp.classList.toggle('show');
    });
  }

  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      sm.renderer.domElement.requestPointerLock();
    });
  }

  const hud = new HUD();
  prog.style.width = '90%';

  // PostFX with lighting manager
  const postfx = new PostFXPipeline(sm.renderer, sm.scene, sm.camera, lightingManager);
  window.addEventListener('resize', () => postfx.resize());

  // Game loop
  const loop = new GameLoop();

  loop.register((dt, elapsed) => {
    water.material.uniforms['time'].value = elapsed * 0.4;

    // Atmosphere
    const timeState = timeOfDay.update(dt);
    const weatherState = weatherSystem.update(dt);
    matUpdater.update(timeState, weatherState, dt);

    const nightFactor = 1 - Math.min(1, Math.max(0, timeState.sunIntensity / 0.8));
    nightSky.update(nightFactor, elapsed);

    // Cinematic lighting
    lightingManager.update(dt, elapsed, timeState, weatherState);
    postfx.updateLighting(timeState, weatherState);

    // Camera + entities
    flight.update(dt);
    vehicles.update(dt);
    cityscape.update(dt, elapsed);
    birds.update(dt, elapsed);

    // UI
    const qt = lightingManager.qualityTier;
    const tierLabel = qt.getMode() === 'auto'
      ? `AUTO (${qt.getCurrentTier().toUpperCase()})`
      : qt.getCurrentTier().toUpperCase();
    hud.update(input.ctrl, sm.camera.position, tierLabel, qt.getAverageFPS());
  });

  loop.setRender(() => postfx.render());
  prog.style.width = '100%';

  // Hide loading
  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => (loading.style.display = 'none'), 1500);
    }
  }, 500);

  loop.start();
}

init();
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run the dev server and verify visually**

Run: `npm run dev`
Expected: The app starts, the bridge renders. At hour 17 (golden hour), structural lights are off. Pressing F to advance time, lights should turn on during Blue Hour. Press L to cycle quality tier, V to toggle volumetric fog, G to toggle god rays.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire cinematic lighting system into main game loop"
```

---

## Task 13: Update MaterialUpdater to avoid conflicting emissive updates

**Files:**
- Modify: `src/atmosphere/MaterialUpdater.ts`

- [ ] **Step 1: Skip aviation emissive updates since SafetyLights now handles them**

In `src/atmosphere/MaterialUpdater.ts`, the `update` method loop (starting at line 124) updates `isAviation` materials' emissiveIntensity. Since `SafetyLights` now controls aviation beacon strobe, we need to skip those materials in `MaterialUpdater`.

Replace lines 137-144 (the `if (entry.isAviation)` block):

```typescript
      if (entry.isAviation) {
        // Aviation red beacons: brighter at night
        entry.mat.emissiveIntensity = THREE.MathUtils.lerp(
          entry.baseEmissiveIntensity * 0.5,
          entry.baseEmissiveIntensity * 3.0,
          nightFactor,
        );
      }
```

With:

```typescript
      // Aviation beacons are now controlled by SafetyLights strobe system
      // (skip emissive update for isAviation materials)
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/MaterialUpdater.ts
git commit -m "refactor: delegate aviation beacon emissive to SafetyLights"
```

---

## Task 14: Final integration test

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build completes with no errors

- [ ] **Step 2: Run dev server and test all lighting scenarios**

Run: `npm run dev`

Test checklist:
- Golden Hour (17:00): Only natural light, bright orange bridge
- Blue Hour (19:00): Tower SpotLights fade in, amber vs blue sky contrast
- Night (22:00): All lights at full intensity, Bloom enhanced
- Press `8` for Fog weather: Volumetric scattering visible around lights
- Press `L` to cycle quality tiers: observe lights turning on/off
- Press `V` to toggle volumetric fog
- Press `G` to toggle god rays
- HUD shows Quality tier and FPS
- Aviation beacons strobe (pulsing red)

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete cinematic lighting system integration"
```
