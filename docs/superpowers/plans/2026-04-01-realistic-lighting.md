# Realistic Lighting Rebalancing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate daytime overexposure by rebalancing sun-to-fill light ratios from ~1:1 to physically correct ~4:1, making the scene photorealistic.

**Architecture:** Add `hemisphereIntensity` and `envMapIntensity` as new TimeOfDay keyframe parameters. Update all existing lighting values to physically motivated levels. MaterialUpdater dynamically applies these new parameters per frame.

**Tech Stack:** Three.js, TypeScript, Vite

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/atmosphere/TimeOfDay.ts` | Modify | Add 2 new fields to `TimeState` and `TimeKeyframe`, update all keyframe values, add lerp for new fields |
| `src/world/Lighting.ts` | Modify | Return hemisphere light reference, adjust initial intensity |
| `src/atmosphere/MaterialUpdater.ts` | Modify | Accept hemisphere light, update it per frame, use timeState-based envMap intensity |
| `src/main.ts` | Modify | Pass hemisphere light to MaterialUpdater constructor |

---

### Task 1: Add new fields to TimeOfDay

**Files:**
- Modify: `src/atmosphere/TimeOfDay.ts`

- [ ] **Step 1: Add fields to TimeState interface (lines 3-30)**

Add two new fields after `exposure`:

```typescript
export interface TimeState {
  /** 0-24 hours */
  hour: number;
  /** Sun elevation in degrees (-30 to 60+) */
  sunElevation: number;
  /** Sun azimuth in degrees */
  sunAzimuth: number;
  /** Sun color temperature */
  sunColor: THREE.Color;
  /** Sun light intensity */
  sunIntensity: number;
  /** Ambient light intensity */
  ambientIntensity: number;
  /** Hemisphere light intensity */
  hemisphereIntensity: number;
  /** Sky turbidity */
  turbidity: number;
  /** Sky rayleigh */
  rayleigh: number;
  /** Fog density */
  fogDensity: number;
  /** Fog color */
  fogColor: THREE.Color;
  /** Window emissive intensity 0-1 */
  windowEmissive: number;
  /** Street light emissive intensity 0-1 */
  streetLightEmissive: number;
  /** Exposure multiplier */
  exposure: number;
  /** Environment map intensity */
  envMapIntensity: number;
}
```

- [ ] **Step 2: Add fields to TimeKeyframe interface (lines 32-46)**

```typescript
interface TimeKeyframe {
  hour: number;
  sunElevation: number;
  sunAzimuth: number;
  sunColor: [number, number, number];
  sunIntensity: number;
  ambientIntensity: number;
  hemisphereIntensity: number;
  turbidity: number;
  rayleigh: number;
  fogDensity: number;
  fogColor: [number, number, number];
  windowEmissive: number;
  streetLightEmissive: number;
  exposure: number;
  envMapIntensity: number;
}
```

- [ ] **Step 3: Replace entire KEYFRAMES array with rebalanced values (lines 48-69)**

```typescript
const KEYFRAMES: TimeKeyframe[] = [
  // Night (00:00)
  { hour: 0, sunElevation: -30, sunAzimuth: 0, sunColor: [0.1, 0.1, 0.2], sunIntensity: 0, ambientIntensity: 0.04, hemisphereIntensity: 0.06, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 0.30, envMapIntensity: 0.05 },
  // Pre-dawn (04:30)
  { hour: 4.5, sunElevation: -10, sunAzimuth: 80, sunColor: [0.3, 0.15, 0.1], sunIntensity: 0.08, ambientIntensity: 0.06, hemisphereIntensity: 0.10, turbidity: 4, rayleigh: 1.5, fogDensity: 0.00013, fogColor: [0.15, 0.1, 0.12], windowEmissive: 0.6, streetLightEmissive: 0.8, exposure: 0.32, envMapIntensity: 0.08 },
  // Dawn (06:00)
  { hour: 6, sunElevation: 5, sunAzimuth: 95, sunColor: [1.0, 0.6, 0.3], sunIntensity: 0.4, ambientIntensity: 0.08, hemisphereIntensity: 0.12, turbidity: 6, rayleigh: 2.5, fogDensity: 0.00012, fogColor: [0.7, 0.45, 0.3], windowEmissive: 0.3, streetLightEmissive: 0.3, exposure: 0.35, envMapIntensity: 0.15 },
  // Morning (08:00)
  { hour: 8, sunElevation: 25, sunAzimuth: 120, sunColor: [1.0, 0.9, 0.75], sunIntensity: 0.7, ambientIntensity: 0.10, hemisphereIntensity: 0.12, turbidity: 5, rayleigh: 2.0, fogDensity: 0.00008, fogColor: [0.75, 0.72, 0.65], windowEmissive: 0.05, streetLightEmissive: 0.0, exposure: 0.35, envMapIntensity: 0.20 },
  // Noon (12:00)
  { hour: 12, sunElevation: 55, sunAzimuth: 180, sunColor: [1.0, 0.98, 0.92], sunIntensity: 0.8, ambientIntensity: 0.10, hemisphereIntensity: 0.10, turbidity: 5, rayleigh: 1.8, fogDensity: 0.00006, fogColor: [0.78, 0.75, 0.68], windowEmissive: 0.0, streetLightEmissive: 0.0, exposure: 0.33, envMapIntensity: 0.20 },
  // Afternoon (16:00)
  { hour: 16, sunElevation: 30, sunAzimuth: 240, sunColor: [1.0, 0.92, 0.78], sunIntensity: 0.7, ambientIntensity: 0.10, hemisphereIntensity: 0.12, turbidity: 6, rayleigh: 2.0, fogDensity: 0.00008, fogColor: [0.8, 0.72, 0.58], windowEmissive: 0.05, streetLightEmissive: 0.0, exposure: 0.35, envMapIntensity: 0.20 },
  // Golden hour (18:30)
  { hour: 18.5, sunElevation: 8, sunAzimuth: 265, sunColor: [1.0, 0.55, 0.2], sunIntensity: 0.45, ambientIntensity: 0.10, hemisphereIntensity: 0.15, turbidity: 8, rayleigh: 3.0, fogDensity: 0.0001, fogColor: [0.85, 0.55, 0.3], windowEmissive: 0.25, streetLightEmissive: 0.2, exposure: 0.36, envMapIntensity: 0.25 },
  // Dusk (20:00)
  { hour: 20, sunElevation: -5, sunAzimuth: 280, sunColor: [0.5, 0.2, 0.1], sunIntensity: 0.10, ambientIntensity: 0.06, hemisphereIntensity: 0.10, turbidity: 4, rayleigh: 1.5, fogDensity: 0.00013, fogColor: [0.2, 0.12, 0.15], windowEmissive: 0.7, streetLightEmissive: 0.9, exposure: 0.32, envMapIntensity: 0.10 },
  // Night (22:00)
  { hour: 22, sunElevation: -30, sunAzimuth: 300, sunColor: [0.1, 0.1, 0.2], sunIntensity: 0, ambientIntensity: 0.04, hemisphereIntensity: 0.06, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 0.30, envMapIntensity: 0.05 },
  // Night wrap (24:00 = 0:00)
  { hour: 24, sunElevation: -30, sunAzimuth: 360, sunColor: [0.1, 0.1, 0.2], sunIntensity: 0, ambientIntensity: 0.04, hemisphereIntensity: 0.06, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 0.30, envMapIntensity: 0.05 },
];
```

- [ ] **Step 4: Add new fields to computeState() return (lines 127-142)**

Add `hemisphereIntensity` and `envMapIntensity` to the return object:

```typescript
    return {
      hour: h,
      sunElevation: lerp(a.sunElevation, b.sunElevation, t),
      sunAzimuth: lerp(a.sunAzimuth, b.sunAzimuth, t),
      sunColor: lerpColor(a.sunColor, b.sunColor, t),
      sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
      ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, t),
      hemisphereIntensity: lerp(a.hemisphereIntensity, b.hemisphereIntensity, t),
      turbidity: lerp(a.turbidity, b.turbidity, t),
      rayleigh: lerp(a.rayleigh, b.rayleigh, t),
      fogDensity: lerp(a.fogDensity, b.fogDensity, t),
      fogColor: lerpColor(a.fogColor, b.fogColor, t),
      windowEmissive: lerp(a.windowEmissive, b.windowEmissive, t),
      streetLightEmissive: lerp(a.streetLightEmissive, b.streetLightEmissive, t),
      exposure: lerp(a.exposure, b.exposure, t),
      envMapIntensity: lerp(a.envMapIntensity, b.envMapIntensity, t),
    };
```

- [ ] **Step 5: Build and verify no type errors**

Run: `npx tsc --noEmit`
Expected: Errors in `MaterialUpdater.ts` and/or `main.ts` about missing properties — this is expected and will be fixed in subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add src/atmosphere/TimeOfDay.ts
git commit -m "feat: add hemisphereIntensity and envMapIntensity to TimeOfDay keyframes

Rebalance all lighting values for physically correct sun:fill ratios.
Noon sun:fill ratio changes from 1.1:1 to 4:1."
```

---

### Task 2: Expose hemisphere light from Lighting.ts

**Files:**
- Modify: `src/world/Lighting.ts`

- [ ] **Step 1: Return hemisphere light alongside sun, set initial intensity to 0.06**

Replace the entire file content:

```typescript
import * as THREE from 'three';

export interface LightingResult {
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
}

export function createLighting(scene: THREE.Scene): LightingResult {
  const sun = new THREE.DirectionalLight(0xffddbb, 1.5);
  sun.position.set(-600, 300, -400);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 3000;
  sun.shadow.camera.left = -1500;
  sun.shadow.camera.right = 1500;
  sun.shadow.camera.top = 400;
  sun.shadow.camera.bottom = -50;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.06);
  scene.add(hemisphere);

  scene.add(new THREE.AmbientLight(0x404050, 0.04));

  return { sun, hemisphere };
}
```

Note: Hemisphere initial intensity changed from `0.6` to `0.06` (night keyframe start value). Ambient initial intensity changed from `0.3` to `0.04` (night keyframe start value). Both are immediately overridden by MaterialUpdater on first frame.

- [ ] **Step 2: Commit**

```bash
git add src/world/Lighting.ts
git commit -m "refactor: expose hemisphere light and lower initial intensities

Return hemisphere light from createLighting so MaterialUpdater can
update it per frame. Initial values match night keyframe (0.06)."
```

---

### Task 3: Update MaterialUpdater to use new TimeState fields

**Files:**
- Modify: `src/atmosphere/MaterialUpdater.ts`

- [ ] **Step 1: Add hemisphere light to constructor and update logic**

Replace the full file content:

```typescript
import * as THREE from 'three';
import type { TimeState } from './TimeOfDay';
import type { WeatherState } from './WeatherSystem';
import type { Water } from 'three/examples/jsm/objects/Water.js';
import type { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { SceneManager } from '@/engine/SceneManager';

interface CachedMaterial {
  mat: THREE.MeshStandardMaterial;
  baseEmissiveIntensity: number;
  /** Ratio relative to timeState.envMapIntensity (e.g. bridge=1.0, cable=0.75) */
  envMapRatio: number;
  isLight: boolean;
  isAviation: boolean;
}

export class MaterialUpdater {
  private scene: THREE.Scene;
  private sm: SceneManager;
  private water: Water;
  private sky: Sky;
  private sunLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight | null = null;
  private cached: CachedMaterial[] = [];
  private cacheBuilt = false;
  private envUpdateTimer = 0;

  constructor(
    sm: SceneManager,
    water: Water,
    sky: Sky,
    sunLight: THREE.DirectionalLight,
    hemisphereLight: THREE.HemisphereLight,
  ) {
    this.sm = sm;
    this.scene = sm.scene;
    this.water = water;
    this.sky = sky;
    this.sunLight = sunLight;
    this.hemisphereLight = hemisphereLight;

    sm.scene.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        this.ambientLight = obj;
      }
    });
  }

  private buildCache() {
    if (this.cacheBuilt) return;
    this.cacheBuilt = true;

    const seen = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (!mat || Array.isArray(mat) || seen.has(mat)) return;
      seen.add(mat);

      // Detect emissive materials (lanterns, aviation lights, headlights)
      const hasEmissive = mat.emissiveIntensity > 0 && mat.emissive && mat.emissive.r + mat.emissive.g + mat.emissive.b > 0;
      const isAviation = hasEmissive && mat.emissive.r > 0.8 && mat.emissive.g < 0.2; // red
      const isLight = hasEmissive && !isAviation; // amber lanterns, headlights

      // Compute envMap ratio from original baseEnvMapIntensity
      // Bridge steel was 0.4, cable was 0.3 → ratios 1.0 and 0.75
      // Materials without envMap have intensity 0 or 1 (default) — ratio stays as-is
      const baseEnv = mat.envMapIntensity ?? 1;
      const envMapRatio = baseEnv > 0 ? baseEnv / 0.4 : 0;

      this.cached.push({
        mat,
        baseEmissiveIntensity: mat.emissiveIntensity,
        envMapRatio,
        isLight,
        isAviation,
      });
    });
  }

  update(time: TimeState, weather: WeatherState, dt: number) {
    this.buildCache();

    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - time.sunElevation);
    const theta = THREE.MathUtils.degToRad(time.sunAzimuth);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    // Sky uniforms
    const skyU = this.sky.material.uniforms;
    skyU['sunPosition'].value.copy(sunDir);
    skyU['turbidity'].value = time.turbidity;
    skyU['rayleigh'].value = time.rayleigh;

    // Regenerate environment map every ~2 seconds so reflections match current sky
    this.envUpdateTimer += dt;
    if (this.envUpdateTimer > 2.0) {
      this.envUpdateTimer = 0;
      if (this.sm.envTarget) this.sm.envTarget.dispose();
      this.sm.sceneEnv.add(this.sky);
      this.sm.envTarget = this.sm.pmremGen.fromScene(this.sm.sceneEnv);
      this.scene.add(this.sky);
      this.scene.environment = this.sm.envTarget.texture;
    }

    // Sun light
    this.sunLight.color.copy(time.sunColor);
    this.sunLight.intensity = time.sunIntensity;
    this.sunLight.position.copy(sunDir).multiplyScalar(600);

    // Ambient
    if (this.ambientLight) {
      this.ambientLight.intensity = time.ambientIntensity;
    }

    // Hemisphere
    this.hemisphereLight.intensity = time.hemisphereIntensity;

    // Water
    this.water.material.uniforms['sunDirection'].value.copy(sunDir).normalize();

    // Fog
    const fogDensity = time.fogDensity * weather.fogMultiplier;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = fogDensity;
      this.scene.fog.color.copy(time.fogColor);
    }

    // Exposure
    this.sm.renderer.toneMappingExposure = time.exposure;

    // Night factor: 0 = full day, 1 = full night
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.8, 0, 1);

    // Update cached materials
    for (const entry of this.cached) {
      // EnvMap intensity from TimeOfDay keyframes (replaces old nightFactor-based logic)
      entry.mat.envMapIntensity = time.envMapIntensity * entry.envMapRatio;

      if (entry.isLight) {
        // Street lanterns: amber glow at night (like real GGB HPS 250W amber lamps)
        entry.mat.emissiveIntensity = THREE.MathUtils.lerp(
          entry.baseEmissiveIntensity * 0.1,
          entry.baseEmissiveIntensity * 2.5,
          nightFactor,
        );
      }

      if (entry.isAviation) {
        // Aviation red beacons: brighter at night
        entry.mat.emissiveIntensity = THREE.MathUtils.lerp(
          entry.baseEmissiveIntensity * 0.5,
          entry.baseEmissiveIntensity * 3.0,
          nightFactor,
        );
      }
    }
  }
}
```

Key changes:
- Constructor accepts `hemisphereLight` parameter
- `CachedMaterial.baseEnvMapIntensity` replaced with `envMapRatio` (ratio relative to base 0.4)
- `this.hemisphereLight.intensity = time.hemisphereIntensity` added to update()
- envMap line changed from `baseEnvMapIntensity * (1 - nightFactor * 0.85)` to `time.envMapIntensity * entry.envMapRatio`

- [ ] **Step 2: Commit**

```bash
git add src/atmosphere/MaterialUpdater.ts
git commit -m "feat: dynamic hemisphere and envMap from TimeOfDay keyframes

MaterialUpdater now receives hemisphere light and updates its intensity
per frame. EnvMap intensity driven by TimeOfDay instead of nightFactor."
```

---

### Task 4: Wire up main.ts and verify

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update createLighting call and MaterialUpdater construction (lines 41, 69)**

Change line 41 from:
```typescript
  const sunLight = createLighting(sm.scene);
```
to:
```typescript
  const { sun: sunLight, hemisphere } = createLighting(sm.scene);
```

Change line 69 from:
```typescript
  const matUpdater = new MaterialUpdater(sm, water, skyCtrl.sky, sunLight);
```
to:
```typescript
  const matUpdater = new MaterialUpdater(sm, water, skyCtrl.sky, sunLight, hemisphere);
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors. All types should now align.

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`

Visual check at each time (press Space to pause time, then adjust):
1. **Noon (12:00):** Bridge should have visible shadows under deck. Sun-lit surfaces bright but not blown out. Shadow areas clearly darker than lit areas.
2. **Morning (8:00):** Warm directional light with good contrast. Fill light noticeably lower than direct.
3. **Golden hour (18:30):** Dramatic orange tones. Shadows long but scene still readable.
4. **Night (22:00):** Dark but street lanterns and aviation lights visible. Not pitch black.

If any time looks wrong, adjust the specific keyframe values in `TimeOfDay.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "wire hemisphere light through to MaterialUpdater

Complete the lighting rebalancing pipeline: Lighting.ts returns
hemisphere ref → main.ts passes it → MaterialUpdater updates per frame."
```

---

### Task 5: Final build verification

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build completes with no errors. Output in `dist/`.

- [ ] **Step 2: Commit all remaining changes (if any)**

If any tweaks were needed during visual verification, commit them:

```bash
git add -A
git commit -m "fix: fine-tune lighting keyframe values after visual review"
```
