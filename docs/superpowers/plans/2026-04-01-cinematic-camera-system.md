# Cinematic Camera System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single orbital auto-fly and 6 static viewpoints with 6 cinematic camera shots that loop continuously in a CF-style showcase, while keeping free-flight (drive) mode.

**Architecture:** A `CinematicShot` class evaluates a pair of CatmullRom splines (position + lookAt) over time. A `CinematicDirector` sequences shots with crossfade transitions in an infinite loop. `FlightCamera` delegates to the director when cinematic mode is active and falls back to free-flight when pointer lock is engaged.

**Tech Stack:** Three.js (`CatmullRomCurve3`, `Vector3`, `Quaternion`), TypeScript, Vite

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/camera/CinematicShot.ts` (create) | Single shot: builds two CatmullRom splines from keyframes, samples position+lookAt at time t |
| `src/camera/CinematicDirector.ts` (create) | Sequences shots in a loop, manages crossfade transitions, applies camera transforms |
| `src/camera/shots.ts` (create) | Pure data: 6 `ShotConfig` objects with keyframe coordinates |
| `src/camera/FlightCamera.ts` (modify) | Remove VIEWPOINTS/goToViewpoint/autoFly orbit; integrate CinematicDirector |
| `src/engine/InputManager.ts` (modify) | Remove digit 1-6 viewpoint dispatch; keep 7/8/9 weather keys |
| `src/main.ts` (modify) | Wire CinematicDirector into FlightCamera; simplify viewpoint callback |
| `index.html` (modify) | Update controls help text (remove "1-6 Viewpoints") |

---

### Task 1: Create CinematicShot

**Files:**
- Create: `src/camera/CinematicShot.ts`

- [ ] **Step 1: Create CinematicShot class**

```typescript
// src/camera/CinematicShot.ts
import * as THREE from 'three';

export interface ShotKeyframe {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface ShotConfig {
  name: string;
  duration: number;
  keyframes: ShotKeyframe[];
  easing?: 'linear' | 'easeInOut';
}

export class CinematicShot {
  readonly name: string;
  readonly duration: number;
  private positionCurve: THREE.CatmullRomCurve3;
  private lookAtCurve: THREE.CatmullRomCurve3;
  private easing: 'linear' | 'easeInOut';

  private _pos = new THREE.Vector3();
  private _look = new THREE.Vector3();

  constructor(config: ShotConfig) {
    this.name = config.name;
    this.duration = config.duration;
    this.easing = config.easing ?? 'easeInOut';

    this.positionCurve = new THREE.CatmullRomCurve3(
      config.keyframes.map(kf => new THREE.Vector3(...kf.position)),
    );
    this.lookAtCurve = new THREE.CatmullRomCurve3(
      config.keyframes.map(kf => new THREE.Vector3(...kf.lookAt)),
    );
  }

  /** Sample at time t (0..1). Returns reusable refs — copy if you need to keep them. */
  sample(t: number): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const e = this.easing === 'easeInOut' ? t * t * (3 - 2 * t) : t;
    this.positionCurve.getPoint(e, this._pos);
    this.lookAtCurve.getPoint(e, this._look);
    return { position: this._pos, lookAt: this._look };
  }

  /** Position at t=0 */
  get startPosition(): THREE.Vector3 {
    return this.positionCurve.getPoint(0);
  }

  /** LookAt at t=0 */
  get startLookAt(): THREE.Vector3 {
    return this.lookAtCurve.getPoint(0);
  }

  /** Position at t=1 */
  get endPosition(): THREE.Vector3 {
    return this.positionCurve.getPoint(1);
  }

  /** LookAt at t=1 */
  get endLookAt(): THREE.Vector3 {
    return this.lookAtCurve.getPoint(1);
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/camera/CinematicShot.ts
git commit -m "feat(camera): add CinematicShot spline-based shot class"
```

---

### Task 2: Create Shot Data

**Files:**
- Create: `src/camera/shots.ts`

- [ ] **Step 1: Define 6 cinematic shots**

```typescript
// src/camera/shots.ts
import type { ShotConfig } from './CinematicShot';

export const CINEMATIC_SHOTS: ShotConfig[] = [
  {
    name: 'DRAMATIC REVEAL',
    duration: 12,
    keyframes: [
      { position: [-300, 8, -500],   lookAt: [0, 67, 400] },
      { position: [-200, 40, -200],  lookAt: [0, 67, 500] },
      { position: [-120, 90, 100],   lookAt: [0, 80, 640] },
      { position: [-80, 150, 400],   lookAt: [0, 100, 640] },
    ],
  },
  {
    name: 'TOWER FLY-BY',
    duration: 10,
    keyframes: [
      { position: [40, 60, -100],    lookAt: [0, 150, 0] },
      { position: [25, 120, -20],    lookAt: [0, 200, 0] },
      { position: [-10, 200, 30],    lookAt: [0, 227, 0] },
      { position: [-40, 180, 120],   lookAt: [0, 150, 300] },
    ],
  },
  {
    name: 'DECK DRIVE-THROUGH',
    duration: 14,
    easing: 'linear',
    keyframes: [
      { position: [3, 72, -250],     lookAt: [3, 70, 200] },
      { position: [3, 72, 200],      lookAt: [3, 70, 600] },
      { position: [3, 72, 640],      lookAt: [3, 70, 1000] },
      { position: [3, 72, 1100],     lookAt: [3, 70, 1400] },
      { position: [3, 72, 1500],     lookAt: [3, 70, 1800] },
    ],
  },
  {
    name: 'CABLE RIDE',
    duration: 12,
    keyframes: [
      { position: [16, 72, -200],    lookAt: [16, 100, 0] },
      { position: [16, 110, 100],    lookAt: [16, 180, 0] },
      { position: [16, 200, -20],    lookAt: [0, 227, 0] },
      { position: [16, 160, 300],    lookAt: [0, 100, 640] },
      { position: [16, 90, 640],     lookAt: [0, 80, 640] },
    ],
  },
  {
    name: 'UNDER THE BRIDGE',
    duration: 10,
    keyframes: [
      { position: [50, 12, -100],    lookAt: [0, 60, 200] },
      { position: [30, 15, 200],     lookAt: [0, 67, 400] },
      { position: [-10, 18, 640],    lookAt: [0, 67, 640] },
      { position: [-40, 15, 1100],   lookAt: [0, 67, 900] },
    ],
  },
  {
    name: 'AERIAL PANORAMA',
    duration: 14,
    keyframes: [
      { position: [-600, 350, -200], lookAt: [0, 50, 640] },
      { position: [-400, 380, 640],  lookAt: [0, 50, 640] },
      { position: [-100, 360, 1500], lookAt: [0, 50, 640] },
      { position: [300, 340, 1200],  lookAt: [0, 50, 640] },
      { position: [400, 320, 400],   lookAt: [0, 50, 640] },
    ],
  },
];
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/camera/shots.ts
git commit -m "feat(camera): define 6 cinematic shot keyframes"
```

---

### Task 3: Create CinematicDirector

**Files:**
- Create: `src/camera/CinematicDirector.ts`

- [ ] **Step 1: Create CinematicDirector class**

```typescript
// src/camera/CinematicDirector.ts
import * as THREE from 'three';
import { CinematicShot } from './CinematicShot';
import type { ShotConfig } from './CinematicShot';

const CROSSFADE_DURATION = 2; // seconds

export class CinematicDirector {
  private shots: CinematicShot[];
  private currentIndex = 0;
  private shotTime = 0;
  isActive = true;

  // Crossfade state
  private crossfading = false;
  private crossfadeTime = 0;
  private fadeFromPos = new THREE.Vector3();
  private fadeFromLook = new THREE.Vector3();
  private fadeToPos = new THREE.Vector3();
  private fadeToLook = new THREE.Vector3();

  // Reusable temps
  private _pos = new THREE.Vector3();
  private _look = new THREE.Vector3();
  private _obj = new THREE.Object3D();

  // Shot name callback
  onShotChange: ((name: string) => void) | null = null;

  constructor(configs: ShotConfig[]) {
    this.shots = configs.map(c => new CinematicShot(c));
  }

  /** Call once per frame. Returns true if it updated the camera. */
  update(dt: number, camera: THREE.Camera): boolean {
    if (!this.isActive || this.shots.length === 0) return false;

    if (this.crossfading) {
      this.crossfadeTime += dt;
      const t = Math.min(this.crossfadeTime / CROSSFADE_DURATION, 1);
      const e = t * t * (3 - 2 * t); // smoothstep

      this._pos.lerpVectors(this.fadeFromPos, this.fadeToPos, e);
      this._look.lerpVectors(this.fadeFromLook, this.fadeToLook, e);

      camera.position.copy(this._pos);
      this._obj.position.copy(this._pos);
      this._obj.lookAt(this._look);
      camera.quaternion.copy(this._obj.quaternion);

      if (t >= 1) {
        this.crossfading = false;
        this.shotTime = 0;
        this.onShotChange?.(this.shots[this.currentIndex].name);
      }
      return true;
    }

    const shot = this.shots[this.currentIndex];
    this.shotTime += dt;
    const t = Math.min(this.shotTime / shot.duration, 1);
    const { position, lookAt } = shot.sample(t);

    camera.position.copy(position);
    this._obj.position.copy(position);
    this._obj.lookAt(lookAt);
    camera.quaternion.copy(this._obj.quaternion);

    if (t >= 1) {
      this.startCrossfade();
    }

    return true;
  }

  private startCrossfade() {
    const currentShot = this.shots[this.currentIndex];
    this.fadeFromPos.copy(currentShot.endPosition);
    this.fadeFromLook.copy(currentShot.endLookAt);

    this.currentIndex = (this.currentIndex + 1) % this.shots.length;

    const nextShot = this.shots[this.currentIndex];
    this.fadeToPos.copy(nextShot.startPosition);
    this.fadeToLook.copy(nextShot.startLookAt);

    this.crossfading = true;
    this.crossfadeTime = 0;
  }

  /** Resume cinematic from the beginning of the next logical shot */
  resume() {
    this.isActive = true;
    this.shotTime = 0;
    this.crossfading = false;
    this.onShotChange?.(this.shots[this.currentIndex].name);
  }

  pause() {
    this.isActive = false;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/camera/CinematicDirector.ts
git commit -m "feat(camera): add CinematicDirector shot sequencer with crossfade"
```

---

### Task 4: Refactor FlightCamera — Remove Viewpoints, Integrate Director

**Files:**
- Modify: `src/camera/FlightCamera.ts`

- [ ] **Step 1: Rewrite FlightCamera**

Replace the entire content of `src/camera/FlightCamera.ts` with:

```typescript
// src/camera/FlightCamera.ts
import * as THREE from 'three';
import type { ControlState } from '@/engine/InputManager';
import { BRIDGE } from '@/config/bridge';
import { terrainH } from '@/world/TerrainGenerator';
import { CinematicDirector } from './CinematicDirector';
import { CINEMATIC_SHOTS } from './shots';

export class FlightCamera {
  private camera: THREE.Camera;
  private ctrl: ControlState;
  readonly director: CinematicDirector;

  constructor(camera: THREE.Camera, ctrl: ControlState) {
    this.camera = camera;
    this.ctrl = ctrl;
    ctrl.euler.set(-0.15, 2.3, 0);
    camera.quaternion.setFromEuler(ctrl.euler);

    this.director = new CinematicDirector(CINEMATIC_SHOTS);
  }

  /** Enter free-flight mode (pointer lock acquired) */
  enterFreeFlight() {
    this.director.pause();
  }

  /** Return to cinematic mode (pointer lock released) */
  enterCinematic() {
    this.director.resume();
  }

  update(dt: number) {
    // Cinematic mode — director drives the camera
    if (this.director.update(dt, this.camera)) {
      this.ctrl.euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      return;
    }

    // Free flight
    this.camera.quaternion.setFromEuler(this.ctrl.euler);
    const spd = this.ctrl.speed * (this.ctrl.boost ? 3 : 1) * dt;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();

    if (this.ctrl.fwd) this.ctrl.vel.addScaledVector(dir, spd);
    if (this.ctrl.back) this.ctrl.vel.addScaledVector(dir, -spd);
    if (this.ctrl.right) this.ctrl.vel.addScaledVector(right, spd);
    if (this.ctrl.left) this.ctrl.vel.addScaledVector(right, -spd);
    if (this.ctrl.up) this.ctrl.vel.y += spd;
    if (this.ctrl.down) this.ctrl.vel.y -= spd;

    const maxStep = 10;
    if (this.ctrl.vel.length() > maxStep) this.ctrl.vel.setLength(maxStep);

    this.camera.position.add(this.ctrl.vel);
    this.ctrl.vel.multiplyScalar(this.ctrl.damping);

    // Collisions
    const px = this.camera.position.x;
    const py = this.camera.position.y;
    const pz = this.camera.position.z;
    const B = BRIDGE;

    // Bridge deck
    if (pz > -B.sideSpan && pz < B.mainSpan + B.sideSpan && Math.abs(px) < B.deckW / 2 + 3) {
      if (py > B.deckH - 6 && py < B.deckH + 3) {
        this.camera.position.y = B.deckH + 3;
        this.ctrl.vel.y = Math.max(0, this.ctrl.vel.y);
      } else if (py < B.deckH - 6 && py > B.deckH - 12) {
        this.camera.position.y = B.deckH - 12;
        this.ctrl.vel.y = Math.min(0, this.ctrl.vel.y);
      }
    }

    // Tower legs
    const colSpacing = B.deckW / 2 + 2;
    const legHW = 5, legHD = 4;
    for (const tz of [0, B.mainSpan]) {
      for (const side of [-1, 1]) {
        const legX = side * colSpacing;
        const dx = Math.abs(px - legX), dz = Math.abs(pz - tz);
        if (dx < legHW && dz < legHD && py < B.towerH + 5) {
          const penX = legHW - dx, penZ = legHD - dz;
          if (penX < penZ) {
            this.camera.position.x = legX + Math.sign(px - legX) * legHW;
            this.ctrl.vel.x = 0;
          } else {
            this.camera.position.z = tz + Math.sign(pz - tz) * legHD;
            this.ctrl.vel.z = 0;
          }
        }
      }
    }

    // Terrain
    const tH = terrainH(px, pz);
    if (py < tH + 3) { this.camera.position.y = tH + 3; this.ctrl.vel.y = Math.max(0, this.ctrl.vel.y); }
    if (this.camera.position.y < 2) { this.camera.position.y = 2; this.ctrl.vel.y = 0; }
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors (there will be errors in main.ts due to removed API — fixed in Task 6)

- [ ] **Step 3: Commit**

```bash
git add src/camera/FlightCamera.ts
git commit -m "refactor(camera): replace viewpoints/autoFly with CinematicDirector"
```

---

### Task 5: Update InputManager — Remove Viewpoint Keys

**Files:**
- Modify: `src/engine/InputManager.ts`

- [ ] **Step 1: Simplify onViewpoint callback to weather-only**

In `src/engine/InputManager.ts`, change the `setCallbacks` method signature and the `onKeyDown` digit handling. The viewpoint callback is renamed to `onWeatherKey` and only fires for keys 7/8/9:

Replace the `onViewpoint` field and related code:

Replace `private onViewpoint: ((n: number) => void) | null = null;` with:

```typescript
  private onWeatherKey: ((n: number) => void) | null = null;
```

Replace the `setCallbacks` method:

```typescript
  setCallbacks(
    onWeatherKey: (n: number) => void,
    onToggleFog: () => void,
    onLightingKey?: (key: 'L' | 'V' | 'G') => void,
  ) {
    this.onWeatherKey = onWeatherKey;
    this.onToggleFog = onToggleFog;
    this.onLightingKey = onLightingKey ?? null;
  }
```

Replace the digit key handling in `onKeyDown` (the line `if (e.code >= 'Digit1' && e.code <= 'Digit9')`) with:

```typescript
    if (e.code >= 'Digit7' && e.code <= 'Digit9') {
      this.onWeatherKey?.(+e.code.slice(5));
    }
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: errors in `main.ts` only (callback signature changed — fixed in Task 6)

- [ ] **Step 3: Commit**

```bash
git add src/engine/InputManager.ts
git commit -m "refactor(input): remove viewpoint keys 1-6, keep weather keys 7-9"
```

---

### Task 6: Update main.ts — Wire Everything Together

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update main.ts wiring**

Replace the `input.setCallbacks(...)` block (lines 81-99) with:

```typescript
  input.setCallbacks(
    (n) => {
      if (n === 7) { weatherSystem.setWeather(WeatherType.Clear); return; }
      if (n === 8) { weatherSystem.setWeather(WeatherType.Fog); return; }
      if (n === 9) { weatherSystem.setWeather(WeatherType.Rain); return; }
    },
    () => {
      timeOfDay.paused = !timeOfDay.paused;
    },
    (key) => {
      if (key === 'L') {
        lightingManager.cycleQualityTier();
      } else if (key === 'G') {
        const gr = postfx.godRays;
        gr.setGodRaysEnabled(!gr.isGodRaysEnabled());
      }
    },
  );
```

Add pointer lock mode switching after the `input.setCallbacks` block. Find the existing `onPointerLockChange` handling in `InputManager` — the mode switch needs to happen in `main.ts` via the existing `pointerlockchange` event. Add after the `input.setCallbacks(...)` block:

```typescript
  // Cinematic ↔ free-flight mode switch
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === sm.renderer.domElement) {
      flight.enterFreeFlight();
    } else {
      flight.enterCinematic();
    }
  });

  // Shot name display
  const shotLabel = document.getElementById('viewpoint-label');
  flight.director.onShotChange = (name) => {
    if (shotLabel) {
      shotLabel.textContent = name;
      shotLabel.style.opacity = '1';
      setTimeout(() => (shotLabel.style.opacity = '0'), 2000);
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run dev server and visually verify**

Run: `npx vite --open`
Expected: Page loads, cinematic camera loops through 6 shots, clicking enters free-flight, ESC returns to cinematic.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat(camera): wire cinematic director into main loop"
```

---

### Task 7: Update HTML — Remove Viewpoint References

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update controls help text**

In `index.html`, replace the controls grid line:

```html
    <span>1 - 6</span><span>Viewpoints</span>
```

with:

```html
    <span>7 / 8 / 9</span><span>Clear / Fog / Rain</span>
```

Wait — that line already exists separately. Remove the `1 - 6 Viewpoints` line entirely, and also remove the duplicate `7 / 8 / 9` line if present. The final controls grid should be:

```html
  <div class="controls-grid" id="controlsHelp">
    <span>W A S D</span><span>Move</span>
    <span>Mouse</span><span>Look around</span>
    <span>Space / Q</span><span>Up / Down</span>
    <span>Shift</span><span>Boost (3x)</span>
    <span>Scroll</span><span>Adjust speed</span>
    <span>7 / 8 / 9</span><span>Clear / Fog / Rain</span>
    <span>F</span><span>Pause/Play time</span>
    <span>ESC</span><span>Exit 1st person</span>
  </div>
```

- [ ] **Step 2: Verify visual**

Reload the page. Controls help should no longer mention viewpoints 1-6.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix(ui): remove viewpoint key references from controls help"
```

---

### Task 8: Visual Tuning Pass

This is an interactive tuning task — fly through each shot and adjust keyframes if needed.

**Files:**
- Modify: `src/camera/shots.ts` (keyframe adjustments)

- [ ] **Step 1: Run dev server**

Run: `npx vite --open`

- [ ] **Step 2: Watch full loop and note issues**

Watch all 6 shots plus crossfade transitions. Check for:
- Camera clipping through bridge geometry
- Jerky transitions between shots
- Unnatural speed changes
- Shots where the bridge isn't framed well

- [ ] **Step 3: Adjust keyframes as needed**

Modify keyframe positions/lookAt values in `src/camera/shots.ts` to fix any issues found.

- [ ] **Step 4: Commit tuning**

```bash
git add src/camera/shots.ts
git commit -m "fix(camera): tune cinematic shot keyframes"
```
