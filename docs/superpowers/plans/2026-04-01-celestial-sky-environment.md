# Celestial Sky Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic NightSky shader with a modular 8-layer celestial system featuring real-date moon/planet positions, 3-stage visibility, moonlight/light-pollution interactions, and cinematic random events (meteors, aurora).

**Architecture:** An orchestrator (`CelestialSystem`) manages 8 independent rendering layers. Shader-based layers (StarField, MilkyWay, SkyGradient, AuroraEffect) share a single sky sphere mesh. 3D object layers (MoonRenderer, PlanetRenderer, MeteorShower) use individual meshes/sprites/lines. An `EphemerisCalculator` provides real-date astronomical positions with 30-second caching.

**Tech Stack:** Three.js r0.183, TypeScript 6.0, Vite 8.0, GLSL (inline template strings)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/atmosphere/celestial/CelestialSystem.ts` | Create | Orchestrator — owns sky sphere, coordinates all layers, exposes single `update()` |
| `src/atmosphere/celestial/EphemerisCalculator.ts` | Create | Pure-math astronomical calculator: moon phase/position, planet positions, coordinate transforms |
| `src/atmosphere/celestial/SkyGradient.ts` | Create | GLSL function for night sky gradient + light pollution glow, outputs `lightPollution` value |
| `src/atmosphere/celestial/StarField.ts` | Create | GLSL function for 2-stage star field with twinkling and spectral colors |
| `src/atmosphere/celestial/ConstellationMap.ts` | Create | Star coordinate data for 15 constellations, feeds brightness weights to StarField shader |
| `src/atmosphere/celestial/MilkyWay.ts` | Create | GLSL function for Milky Way band with galactic-coordinate positioning |
| `src/atmosphere/celestial/PlanetRenderer.ts` | Create | 4 billboard sprites for Venus/Mars/Jupiter/Saturn, no twinkling, real positions |
| `src/atmosphere/celestial/MoonRenderer.ts` | Create | 3D sphere with NASA texture, phase lighting, glow, outputs `moonlightFactor` |
| `src/atmosphere/celestial/MeteorShower.ts` | Create | Line-based particle system: sporadic meteors + random shower events |
| `src/atmosphere/celestial/AuroraEffect.ts` | Create | GLSL function for aurora curtain with lifecycle (fade-in → active → fade-out) |
| `src/atmosphere/NightSky.ts` | Delete | Replaced by CelestialSystem |
| `src/main.ts` | Modify (lines 20-21, 70-71, 126-127) | Swap NightSky → CelestialSystem import/creation/update |
| `src/atmosphere/MaterialUpdater.ts` | Modify (line 121) | Use moonlightFactor from CelestialSystem for env map scaling |

---

## Task 1: EphemerisCalculator — Astronomical Math

**Files:**
- Create: `src/atmosphere/celestial/EphemerisCalculator.ts`

This is a pure-math module with zero Three.js dependencies (except `THREE.Color` for planet colors). Build and test it first since MoonRenderer and PlanetRenderer both depend on it.

- [ ] **Step 1: Create the file with types and Julian Date utilities**

```typescript
// src/atmosphere/celestial/EphemerisCalculator.ts
import * as THREE from 'three';

export interface CelestialPosition {
  azimuth: number;   // radians, north=0, clockwise
  altitude: number;  // radians, horizon=0
}

export interface MoonState extends CelestialPosition {
  phase: number;       // 0~1 (0=new, 0.5=full)
  illumination: number; // 0~1 lit fraction
}

export interface PlanetState extends CelestialPosition {
  name: 'venus' | 'mars' | 'jupiter' | 'saturn';
  magnitude: number;
  color: THREE.Color;
}

export interface EphemerisResult {
  moon: MoonState;
  planets: PlanetState[];
}

// San Francisco observatory position
const LAT = 37.8 * Math.PI / 180;   // radians
const LON = -122.4 * Math.PI / 180; // radians (west negative)
const SIN_LAT = Math.sin(LAT);
const COS_LAT = Math.cos(LAT);

// J2000.0 epoch: 2000-01-01 12:00 UTC
const J2000 = 2451545.0;
// Known new moon: 2000-01-06 18:14 UTC
const NEW_MOON_JD = 2451550.26;
const SYNODIC_MONTH = 29.53059;

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

function dateToJD(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function normalizeAngle(a: number): number {
  a = a % TWO_PI;
  return a < 0 ? a + TWO_PI : a;
}

// Greenwich Mean Sidereal Time in radians
function gmst(jd: number): number {
  const T = (jd - J2000) / 36525;
  // IAU formula (degrees), then convert to radians
  let theta = 280.46061837 + 360.98564736629 * (jd - J2000)
    + 0.000387933 * T * T - T * T * T / 38710000;
  theta = ((theta % 360) + 360) % 360;
  return theta * DEG;
}

// Equatorial (RA, Dec) → Horizontal (azimuth, altitude)
function equatorialToHorizontal(ra: number, dec: number, lst: number): CelestialPosition {
  const ha = lst - ra;
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const cosHa = Math.cos(ha);
  const sinHa = Math.sin(ha);

  const sinAlt = sinDec * SIN_LAT + cosDec * COS_LAT * cosHa;
  const altitude = Math.asin(sinAlt);

  const cosAlt = Math.cos(altitude);
  let azimuth = Math.atan2(-cosDec * sinHa, sinDec * COS_LAT - cosDec * SIN_LAT * cosHa);
  azimuth = normalizeAngle(azimuth);

  return { azimuth, altitude };
}

// Solve Kepler's equation M = E - e*sin(E) by iteration
function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  return E;
}
```

- [ ] **Step 2: Add moon calculation method**

Append to the same file:

```typescript
function calculateMoon(jd: number, lst: number): MoonState {
  const daysSinceJ2000 = jd - J2000;

  // Moon's mean elements (simplified)
  const L = normalizeAngle((218.316 + 13.176396 * daysSinceJ2000) * DEG); // mean longitude
  const M = normalizeAngle((134.963 + 13.064993 * daysSinceJ2000) * DEG); // mean anomaly
  const F = normalizeAngle((93.272 + 13.229350 * daysSinceJ2000) * DEG);  // argument of latitude

  // Ecliptic longitude and latitude (simplified, ~1° accuracy)
  const eclLon = L + 6.289 * DEG * Math.sin(M);
  const eclLat = 5.128 * DEG * Math.sin(F);

  // Ecliptic to equatorial
  const obliquity = 23.4393 * DEG;
  const cosObl = Math.cos(obliquity);
  const sinObl = Math.sin(obliquity);
  const sinLon = Math.sin(eclLon);
  const cosLon = Math.cos(eclLon);
  const sinLat = Math.sin(eclLat);
  const cosLat = Math.cos(eclLat);

  const ra = Math.atan2(sinLon * cosObl - Math.tan(eclLat) * sinObl, cosLon);
  const dec = Math.asin(sinLat * cosObl + cosLat * sinObl * sinLon);

  const pos = equatorialToHorizontal(ra, dec, lst);

  // Moon phase from known new moon date
  const daysSinceNewMoon = jd - NEW_MOON_JD;
  const phase = ((daysSinceNewMoon % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  // Illumination: 0 at new/full boundary approach, 1 at full
  const illumination = (1 - Math.cos(phase * TWO_PI)) / 2;

  return { ...pos, phase, illumination };
}
```

- [ ] **Step 3: Add planet calculation methods**

Append to the same file, planet orbital elements + calculation:

```typescript
interface OrbitalElements {
  a: number;    // semi-major axis (AU)
  e: number;    // eccentricity
  I: number;    // inclination (deg)
  L: number;    // mean longitude (deg)
  wBar: number; // longitude of perihelion (deg)
  omega: number;// longitude of ascending node (deg)
  // Rates per century
  aRate: number; eRate: number; IRate: number;
  LRate: number; wBarRate: number; omegaRate: number;
}

// J2000.0 orbital elements + rates (JPL approximate)
const PLANET_ELEMENTS: Record<string, OrbitalElements> = {
  venus: {
    a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950,
    wBar: 131.60246718, omega: 76.67984255,
    aRate: 0.00000390, eRate: -0.00004107, IRate: -0.00078890,
    LRate: 58517.81538729, wBarRate: 0.00268329, omegaRate: -0.27769418,
  },
  mars: {
    a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205,
    wBar: -23.94362959, omega: 49.55953891,
    aRate: 0.00001847, eRate: 0.00007882, IRate: -0.00813131,
    LRate: 19140.30268499, wBarRate: 0.44441088, omegaRate: -0.29257343,
  },
  jupiter: {
    a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051,
    wBar: 14.72847983, omega: 100.47390909,
    aRate: -0.00011607, eRate: -0.00013253, IRate: -0.00183714,
    LRate: 3034.74612775, wBarRate: 0.21252668, omegaRate: 0.20469106,
  },
  saturn: {
    a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423,
    wBar: 92.59887831, omega: 113.66242448,
    aRate: -0.00125060, eRate: -0.00050991, IRate: 0.00193609,
    LRate: 1222.49362201, wBarRate: -0.41897216, omegaRate: -0.28867794,
  },
};

// Earth elements for heliocentric → geocentric conversion
const EARTH_ELEMENTS: OrbitalElements = {
  a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166,
  wBar: 102.93768193, omega: 0.0,
  aRate: 0.00000562, eRate: -0.00004392, IRate: -0.01294668,
  LRate: 35999.37244981, wBarRate: 0.32327364, omegaRate: 0.0,
};

const PLANET_COLORS: Record<string, [number, number, number]> = {
  venus:   [1.0, 1.0, 0.94],
  mars:    [1.0, 0.4, 0.27],
  jupiter: [1.0, 0.93, 0.8],
  saturn:  [1.0, 0.91, 0.67],
};

const PLANET_BASE_MAGNITUDES: Record<string, number> = {
  venus: -4.6, mars: 1.0, jupiter: -2.5, saturn: 0.5,
};

function heliocentricPosition(el: OrbitalElements, T: number): [number, number, number] {
  const a = el.a + el.aRate * T;
  const e = el.e + el.eRate * T;
  const I = (el.I + el.IRate * T) * DEG;
  const L = (el.L + el.LRate * T) * DEG;
  const wBar = (el.wBar + el.wBarRate * T) * DEG;
  const omega = (el.omega + el.omegaRate * T) * DEG;

  const M = normalizeAngle(L - wBar);
  const w = wBar - omega;
  const E = solveKepler(M, e);

  // Orbital plane coords
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate to ecliptic
  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosO = Math.cos(omega), sinO = Math.sin(omega);
  const cosI = Math.cos(I), sinI = Math.sin(I);

  const x = (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb;
  const y = (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb;
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  return [x, y, z];
}

function calculatePlanets(jd: number, lst: number): PlanetState[] {
  const T = (jd - J2000) / 36525; // Julian centuries
  const obliquity = 23.4393 * DEG;
  const cosObl = Math.cos(obliquity);
  const sinObl = Math.sin(obliquity);

  // Earth position
  const [ex, ey, ez] = heliocentricPosition(EARTH_ELEMENTS, T);

  const results: PlanetState[] = [];

  for (const [name, el] of Object.entries(PLANET_ELEMENTS)) {
    const [px, py, pz] = heliocentricPosition(el, T);

    // Geocentric ecliptic
    const gx = px - ex;
    const gy = py - ey;
    const gz = pz - ez;

    // Ecliptic to equatorial
    const eqX = gx;
    const eqY = gy * cosObl - gz * sinObl;
    const eqZ = gy * sinObl + gz * cosObl;

    const ra = Math.atan2(eqY, eqX);
    const dec = Math.atan2(eqZ, Math.sqrt(eqX * eqX + eqY * eqY));

    const pos = equatorialToHorizontal(ra, dec, lst);
    const [cr, cg, cb] = PLANET_COLORS[name];

    results.push({
      ...pos,
      name: name as PlanetState['name'],
      magnitude: PLANET_BASE_MAGNITUDES[name],
      color: new THREE.Color(cr, cg, cb),
    });
  }

  return results;
}
```

- [ ] **Step 4: Add the public class with caching**

Append to the same file:

```typescript
export class EphemerisCalculator {
  private cache: EphemerisResult | null = null;
  private cacheTime = 0;
  private static CACHE_INTERVAL = 30; // seconds

  calculate(date: Date, hour: number): EphemerisResult {
    const now = date.getTime() / 1000;
    if (this.cache && Math.abs(now - this.cacheTime) < EphemerisCalculator.CACHE_INTERVAL) {
      return this.cache;
    }

    const jd = dateToJD(date);
    // Override the hour-of-day with the game hour for sky position
    // Keep the date for phase/orbital calculation
    const jdDate = Math.floor(jd - 0.5) + 0.5; // midnight JD
    const jdWithGameHour = jdDate + hour / 24;

    const lst = gmst(jdWithGameHour) + LON; // Local Sidereal Time

    const moon = calculateMoon(jd, lst);          // real date for phase
    // Recalculate moon horizontal position with game hour
    const moonGamePos = calculateMoon(jdWithGameHour, lst);
    const moonResult: MoonState = {
      azimuth: moonGamePos.azimuth,
      altitude: moonGamePos.altitude,
      phase: moon.phase,
      illumination: moon.illumination,
    };

    const planets = calculatePlanets(jdWithGameHour, lst);

    this.cache = { moon: moonResult, planets };
    this.cacheTime = now;
    return this.cache;
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit src/atmosphere/celestial/EphemerisCalculator.ts 2>&1 | head -20`

Expected: No errors (or only path-alias warnings which Vite resolves)

- [ ] **Step 6: Commit**

```bash
git add src/atmosphere/celestial/EphemerisCalculator.ts
git commit -m "feat(celestial): add EphemerisCalculator for real-date moon/planet positions"
```

---

## Task 2: SkyGradient — Light Pollution + Night Sky Background

**Files:**
- Create: `src/atmosphere/celestial/SkyGradient.ts`

This module provides the GLSL function for the sky sphere shader AND tracks the `lightPollution` value that other layers consume.

- [ ] **Step 1: Create SkyGradient module**

```typescript
// src/atmosphere/celestial/SkyGradient.ts

/**
 * Manages the night sky background gradient and city light pollution glow.
 * Outputs lightPollution value consumed by StarField and MilkyWay.
 *
 * Light pollution decays with hour (city sleeps) and altitude (zenith is clearer).
 * Glow is strongest toward SE (SF downtown direction).
 */

// hourDecay keyframes: [hour, decay]
const HOUR_DECAY: [number, number][] = [
  [19, 1.0], [21, 0.85], [23, 0.65],
  [25, 0.45], // 01:00 as 25 for wrap-around interpolation
  [27, 0.35], // 03:00
  [29, 0.50], // 05:00
];

function interpolateHourDecay(hour: number): number {
  // Normalize to 19-31 range (19:00 to next-day 07:00)
  let h = hour;
  if (h < 19) h += 24;

  for (let i = 0; i < HOUR_DECAY.length - 1; i++) {
    const [h0, v0] = HOUR_DECAY[i];
    const [h1, v1] = HOUR_DECAY[i + 1];
    if (h >= h0 && h < h1) {
      const t = (h - h0) / (h1 - h0);
      return v0 + (v1 - v0) * t;
    }
  }
  return HOUR_DECAY[HOUR_DECAY.length - 1][1];
}

export class SkyGradient {
  lightPollution = 0;

  /** GLSL function to include in the combined sky shader */
  static readonly GLSL = /* glsl */ `
    vec3 skyGradient(vec3 dir, float nightFactor, float lightPollution) {
      float altitude = dir.y; // -1 to 1

      // Base night sky: deep navy at zenith, slightly brighter at horizon
      vec3 zenithColor = vec3(0.01, 0.015, 0.035);
      vec3 horizonColor = vec3(0.02, 0.025, 0.04);
      vec3 base = mix(horizonColor, zenithColor, smoothstep(0.0, 0.6, altitude));

      // Light pollution glow: warm orange toward SE (SF downtown)
      // dir.x ~ east component, dir.z ~ south component
      float downtownDir = smoothstep(-0.3, 0.5, -dir.z * 0.7 + dir.x * 0.3); // SE bias
      float glowAltitude = smoothstep(0.4, 0.0, altitude); // strongest at horizon
      float glow = downtownDir * glowAltitude * lightPollution;

      vec3 glowColor = mix(
        vec3(0.12, 0.06, 0.02), // warm orange (sodium)
        vec3(0.10, 0.08, 0.06), // warm white (LED)
        0.4
      );
      base += glowColor * glow * 0.8;

      return base * nightFactor;
    }
  `;

  update(hour: number, nightFactor: number): number {
    const basePollution = 0.8;
    const hourDecay = interpolateHourDecay(hour);
    this.lightPollution = basePollution * hourDecay * nightFactor;
    return this.lightPollution;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit src/atmosphere/celestial/SkyGradient.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/celestial/SkyGradient.ts
git commit -m "feat(celestial): add SkyGradient with light pollution glow"
```

---

## Task 3: ConstellationMap — Star Coordinate Data

**Files:**
- Create: `src/atmosphere/celestial/ConstellationMap.ts`

Pure data module: 15 constellations × key stars with right ascension, declination, apparent magnitude. Provides a method to check if a sky direction is near a constellation star.

- [ ] **Step 1: Create ConstellationMap with star data**

```typescript
// src/atmosphere/celestial/ConstellationMap.ts

const DEG = Math.PI / 180;
const HOUR_TO_RAD = Math.PI / 12; // 1h RA = 15° = π/12 rad

interface ConstellationStar {
  ra: number;   // right ascension in radians
  dec: number;  // declination in radians
  mag: number;  // apparent magnitude (lower = brighter)
  name: string; // common name
}

// Key stars from 15 constellations visible from SF (37.8°N)
// Data: bright stars only (mag < 2.5), coordinates in J2000.0
const STARS: ConstellationStar[] = [
  // Winter — Orion
  { ra: 5.919 * HOUR_TO_RAD, dec: 7.407 * DEG, mag: 0.42, name: 'Betelgeuse' },
  { ra: 5.242 * HOUR_TO_RAD, dec: -8.202 * DEG, mag: 0.12, name: 'Rigel' },
  { ra: 5.679 * HOUR_TO_RAD, dec: -1.943 * DEG, mag: 1.70, name: 'Bellatrix' },
  // Winter — Canis Major
  { ra: 6.752 * HOUR_TO_RAD, dec: -16.716 * DEG, mag: -1.46, name: 'Sirius' },
  // Winter — Gemini
  { ra: 7.755 * HOUR_TO_RAD, dec: 28.026 * DEG, mag: 1.14, name: 'Pollux' },
  { ra: 7.577 * HOUR_TO_RAD, dec: 31.888 * DEG, mag: 1.58, name: 'Castor' },
  // Winter — Taurus
  { ra: 4.599 * HOUR_TO_RAD, dec: 16.509 * DEG, mag: 0.85, name: 'Aldebaran' },
  // Winter — Auriga
  { ra: 5.278 * HOUR_TO_RAD, dec: 45.998 * DEG, mag: 0.08, name: 'Capella' },
  // Spring — Leo
  { ra: 10.139 * HOUR_TO_RAD, dec: 11.967 * DEG, mag: 1.35, name: 'Regulus' },
  // Spring — Virgo
  { ra: 13.420 * HOUR_TO_RAD, dec: -11.161 * DEG, mag: 0.97, name: 'Spica' },
  // Spring — Bootes
  { ra: 14.261 * HOUR_TO_RAD, dec: 19.182 * DEG, mag: -0.05, name: 'Arcturus' },
  // Summer — Cygnus
  { ra: 20.690 * HOUR_TO_RAD, dec: 45.280 * DEG, mag: 1.25, name: 'Deneb' },
  // Summer — Lyra
  { ra: 18.616 * HOUR_TO_RAD, dec: 38.784 * DEG, mag: 0.03, name: 'Vega' },
  // Summer — Aquila
  { ra: 19.846 * HOUR_TO_RAD, dec: 8.868 * DEG, mag: 0.77, name: 'Altair' },
  // Summer — Scorpius
  { ra: 16.490 * HOUR_TO_RAD, dec: -26.432 * DEG, mag: 0.96, name: 'Antares' },
  // Autumn — Pegasus
  { ra: 23.079 * HOUR_TO_RAD, dec: 15.205 * DEG, mag: 2.49, name: 'Markab' },
  // Autumn — Andromeda
  { ra: 0.140 * HOUR_TO_RAD, dec: 29.091 * DEG, mag: 2.06, name: 'Alpheratz' },
  // Autumn — Cassiopeia
  { ra: 0.675 * HOUR_TO_RAD, dec: 56.537 * DEG, mag: 2.24, name: 'Schedar' },
  // Year-round — Ursa Major
  { ra: 11.062 * HOUR_TO_RAD, dec: 61.751 * DEG, mag: 1.79, name: 'Dubhe' },
  { ra: 13.399 * HOUR_TO_RAD, dec: 54.926 * DEG, mag: 1.86, name: 'Alkaid' },
  // North Star (Polaris) — always visible from SF
  { ra: 2.530 * HOUR_TO_RAD, dec: 89.264 * DEG, mag: 1.98, name: 'Polaris' },
];

export class ConstellationMap {
  /**
   * Returns GLSL uniform data: an array of star positions in the current sky
   * as azimuth/altitude pairs, plus magnitude-based brightness weights.
   *
   * The shader uses these to boost brightness of stars near constellation positions.
   */
  static readonly STAR_COUNT = STARS.length;

  /**
   * Compute current horizontal positions of constellation stars.
   * Returns flat Float32Array: [az0, alt0, mag0, az1, alt1, mag1, ...]
   */
  computePositions(lst: number): Float32Array {
    const SIN_LAT = Math.sin(37.8 * DEG);
    const COS_LAT = Math.cos(37.8 * DEG);
    const data = new Float32Array(STARS.length * 3);

    for (let i = 0; i < STARS.length; i++) {
      const star = STARS[i];
      const ha = lst - star.ra;
      const sinDec = Math.sin(star.dec);
      const cosDec = Math.cos(star.dec);
      const cosHa = Math.cos(ha);

      const sinAlt = sinDec * SIN_LAT + cosDec * COS_LAT * cosHa;
      const altitude = Math.asin(sinAlt);
      const azimuth = Math.atan2(
        -cosDec * Math.sin(ha),
        sinDec * COS_LAT - cosDec * SIN_LAT * cosHa,
      );

      data[i * 3] = ((azimuth % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      data[i * 3 + 1] = altitude;
      data[i * 3 + 2] = star.mag;
    }
    return data;
  }

  /**
   * GLSL function that checks proximity to constellation stars.
   * Returns brightness boost factor (1.0 = no boost, up to 1.5).
   * Constellation star uniforms: uConstellationStars[N*3] = [az, alt, mag, ...]
   */
  static readonly GLSL = /* glsl */ `
    float constellationBoost(vec3 dir, float constellationStars[${STARS.length * 3}]) {
      float boost = 1.0;
      float az = atan(dir.x, dir.z); // note: atan(x,z) gives azimuth from north
      float alt = asin(dir.y);

      for (int i = 0; i < ${STARS.length}; i++) {
        float starAz = constellationStars[i * 3];
        float starAlt = constellationStars[i * 3 + 1];
        float starMag = constellationStars[i * 3 + 2];

        // Angular distance (simplified, works well near small separations)
        float dAz = starAz - az;
        float dAlt = starAlt - alt;
        float dist = sqrt(dAz * dAz + dAlt * dAlt);

        // Brighter stars (lower mag) get larger radius and higher boost
        float radius = 0.03 + (2.5 - starMag) * 0.008;
        float brightness = smoothstep(radius, 0.0, dist);
        // Scale boost by magnitude: -1.46 (Sirius) gets 1.5x, +2.5 gets 1.2x
        float boostAmount = 1.0 + brightness * (0.3 + (2.5 - starMag) * 0.05);
        boost = max(boost, boostAmount);
      }
      return boost;
    }
  `;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit src/atmosphere/celestial/ConstellationMap.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/celestial/ConstellationMap.ts
git commit -m "feat(celestial): add ConstellationMap with 21 bright star positions"
```

---

## Task 4: StarField — 2-Stage Star Shader

**Files:**
- Create: `src/atmosphere/celestial/StarField.ts`

GLSL function for the combined sky shader. 2-stage visibility, spectral colors, twinkling.

- [ ] **Step 1: Create StarField module**

```typescript
// src/atmosphere/celestial/StarField.ts

/**
 * Procedural star field with 2-stage visibility:
 * Stage 1 (nF 0.25+): ~20 bright stars (mag < 1.5)
 * Stage 2 (nF 0.50+): ~3000 dim stars fill the sky
 *
 * Features: spectral color distribution, twinkling (bright=slow, dim=fast),
 * moonlight/light-pollution attenuation.
 */
export class StarField {
  static readonly GLSL = /* glsl */ `
    // Hash for star placement
    float starHash(vec2 p) {
      float h = dot(p, vec2(127.1, 311.7));
      return fract(sin(h) * 43758.5453);
    }

    // Spectral color from hash value
    vec3 starSpectralColor(float h) {
      // O/B type (blue-white): 10%
      if (h < 0.10) return vec3(0.65, 0.75, 1.0);
      // A/F type (white-yellowish): 30%
      if (h < 0.40) return vec3(0.95, 0.95, 1.0);
      // G type (yellow, solar): 25%
      if (h < 0.65) return vec3(1.0, 0.95, 0.80);
      // K/M type (orange-red): 35%
      if (h < 0.85) return vec3(1.0, 0.82, 0.55);
      return vec3(1.0, 0.65, 0.45); // deep red M-type
    }

    vec3 starField(
      vec3 dir,
      float nightFactor,
      float moonlightFactor,
      float lightPollution,
      float time,
      float constellationStars[${63}]
    ) {
      if (nightFactor < 0.15) return vec3(0.0);

      float altitude = dir.y;
      if (altitude < 0.0) return vec3(0.0);

      vec3 color = vec3(0.0);

      // Project direction onto grid for star placement
      vec2 starUV = vec2(
        atan(dir.z, dir.x) * 3.0,
        asin(clamp(altitude, -1.0, 1.0)) * 6.0
      );

      // Effective dimming from moonlight and light pollution
      // Light pollution is altitude-dependent (already encoded in the value from CPU)
      float dimming = (1.0 - moonlightFactor * 0.6) * (1.0 - lightPollution * 0.5);

      // === BRIGHT STARS (Stage 1: nF 0.25+) ===
      float stage1 = smoothstep(0.15, 0.35, nightFactor);
      if (stage1 > 0.0) {
        float scale = 60.0;
        vec2 cell = floor(starUV * scale);
        vec2 cellUV = fract(starUV * scale);
        float h = starHash(cell + 100.0);

        if (h > 0.97) { // sparse bright stars
          vec2 starPos = vec2(starHash(cell * 1.3 + 0.5), starHash(cell * 2.7 + 0.8));
          float dist = length(cellUV - starPos);
          float brightness = smoothstep(0.018, 0.0, dist);

          // Slow twinkle for bright stars (2-3 second period)
          float twinkle = 0.8 + 0.2 * sin(time * (1.5 + h * 1.5) + h * 50.0);
          brightness *= twinkle * stage1;

          // Constellation boost
          float boost = constellationBoost(dir, constellationStars);
          brightness *= boost;

          vec3 sColor = starSpectralColor(starHash(cell * 3.1 + 0.7));
          color += sColor * brightness * 1.3;
        }
      }

      // === DIM STARS (Stage 2: nF 0.50+) ===
      float stage2 = smoothstep(0.40, 0.60, nightFactor);
      if (stage2 > 0.0) {
        for (int layer = 0; layer < 3; layer++) {
          float scale = 90.0 + float(layer) * 50.0;
          vec2 cell = floor(starUV * scale);
          vec2 cellUV = fract(starUV * scale);
          float h = starHash(cell + float(layer) * 200.0);

          float threshold = 0.93 - float(layer) * 0.02;
          // Light pollution raises threshold (fewer visible stars)
          threshold += lightPollution * 0.04;

          if (h > threshold) {
            vec2 starPos = vec2(starHash(cell * 1.3 + 0.5), starHash(cell * 2.7 + 0.8));
            float dist = length(cellUV - starPos);
            float starSize = 0.005 + (1.0 - threshold) * 0.008;
            float brightness = smoothstep(starSize, 0.0, dist);

            // Fast twinkle for dim stars (0.5-1 second period)
            float twinkle = 0.6 + 0.4 * sin(time * (4.0 + h * 6.0) + h * 100.0);
            brightness *= twinkle * stage2 * dimming;

            // Constellation boost (works on dim stars too)
            float boost = constellationBoost(dir, constellationStars);
            brightness *= boost;

            vec3 sColor = starSpectralColor(starHash(cell * 3.1 + float(layer) * 50.0));
            color += sColor * brightness * (0.7 - float(layer) * 0.15);
          }
        }
      }

      // Horizon fade
      color *= smoothstep(-0.02, 0.12, altitude);

      return color;
    }
  `;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit src/atmosphere/celestial/StarField.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/celestial/StarField.ts
git commit -m "feat(celestial): add StarField with 2-stage visibility and spectral colors"
```

---

## Task 5: MilkyWay — Galactic Band Shader

**Files:**
- Create: `src/atmosphere/celestial/MilkyWay.ts`

- [ ] **Step 1: Create MilkyWay module**

```typescript
// src/atmosphere/celestial/MilkyWay.ts

/**
 * Milky Way band positioned on the galactic plane (b=0°).
 * Fades with moonlight and light pollution. Most sensitive to both.
 * Appears at nF 0.60+.
 */
export class MilkyWay {
  static readonly GLSL = /* glsl */ `
    // Noise functions for milky way structure
    float mwNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float h = dot(i, vec2(127.1, 311.7));
      float a = fract(sin(h) * 43758.5453);
      float b = fract(sin(h + 127.1) * 43758.5453);
      float c = fract(sin(h + 311.7) * 43758.5453);
      float d = fract(sin(h + 438.8) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float mwFbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * mwNoise(p);
        p *= 2.1;
        a *= 0.5;
      }
      return v;
    }

    vec3 milkyWay(
      vec3 dir,
      float nightFactor,
      float moonlightFactor,
      float lightPollution
    ) {
      float visibility = smoothstep(0.50, 0.70, nightFactor);
      if (visibility < 0.01) return vec3(0.0);

      float altitude = dir.y;
      if (altitude < 0.0) return vec3(0.0);

      // Galactic plane approximation
      // The galactic north pole is at RA=12h51m, Dec=+27.13°
      // Simplified: band runs roughly NE-SW through the sky
      float mwAngle = atan(dir.z, dir.x);
      float galacticLat = abs(sin(mwAngle * 0.5 + 0.3) * 0.8 - altitude * 0.3);
      float band = smoothstep(0.35, 0.0, galacticLat);

      // FBM noise for cloud structure
      vec2 mwUV = vec2(mwAngle * 2.0, altitude * 4.0);
      float noise = mwFbm(mwUV * 3.0) * mwFbm(mwUV * 7.0 + 5.0);
      float brightness = band * noise * 2.5;

      // Color: cool blue-white outer, warm core
      vec3 mwColor = mix(
        vec3(0.15, 0.18, 0.25),
        vec3(0.25, 0.22, 0.18),
        mwFbm(mwUV * 1.5 + 10.0)
      );

      // Scattered faint stars within the band
      float mwStarHash = fract(sin(dot(floor(mwUV * 300.0), vec2(127.1, 311.7))) * 43758.5453);
      if (mwStarHash > 0.95 && band > 0.3) {
        vec2 msCell = floor(mwUV * 300.0);
        vec2 msPos = vec2(
          fract(sin(dot(msCell * 1.5, vec2(127.1, 311.7))) * 43758.5453),
          fract(sin(dot(msCell * 2.1, vec2(127.1, 311.7))) * 43758.5453)
        );
        float msDist = length(fract(mwUV * 300.0) - msPos);
        mwColor += vec3(0.8, 0.85, 1.0) * smoothstep(0.004, 0.0, msDist) * band;
      }

      // Moonlight attenuation (most sensitive: 80% reduction at full moon)
      float moonDim = 1.0 - moonlightFactor * 0.8;
      // Light pollution attenuation (most sensitive)
      float pollDim = 1.0 - lightPollution * 1.2; // can go to 0 easily
      pollDim = max(0.0, pollDim);

      brightness *= visibility * moonDim * pollDim;

      // Horizon fade
      brightness *= smoothstep(-0.02, 0.15, altitude);

      return mwColor * brightness;
    }
  `;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/atmosphere/celestial/MilkyWay.ts
git commit -m "feat(celestial): add MilkyWay band with moonlight/pollution attenuation"
```

---

## Task 6: AuroraEffect — Event-Based Aurora Shader

**Files:**
- Create: `src/atmosphere/celestial/AuroraEffect.ts`

- [ ] **Step 1: Create AuroraEffect module**

```typescript
// src/atmosphere/celestial/AuroraEffect.ts

/**
 * Aurora borealis effect — event-based, not continuous.
 * Appears only at nF 0.80+ with ~3% per-minute chance.
 * Lifecycle: fade-in (5-10s) → active (30-120s) → fade-out (10-15s).
 * Restricted to northern sky. Artistic license for SF latitude.
 */
export class AuroraEffect {
  private active = false;
  private intensity = 0; // 0~1 current intensity
  private lifetime = 0;  // seconds since event start
  private duration = 0;  // total event duration
  private fadeInTime = 0;
  private fadeOutStart = 0;
  private cooldown = 0;  // seconds until next check

  /** GLSL function for aurora rendering */
  static readonly GLSL = /* glsl */ `
    vec3 auroraEffect(vec3 dir, float auroraIntensity, float time) {
      if (auroraIntensity < 0.01) return vec3(0.0);

      float altitude = dir.y;
      if (altitude < 0.1 || altitude > 0.8) return vec3(0.0);

      // North-facing only
      float northFacing = smoothstep(-0.5, 0.5, -dir.z);
      if (northFacing < 0.1) return vec3(0.0);

      // Altitude envelope
      float altEnvelope = smoothstep(0.15, 0.5, altitude) * smoothstep(0.85, 0.55, altitude);

      // Curtain wave pattern
      float wave1 = sin(dir.x * 4.0 + time * 0.15) * 0.5 + 0.5;
      float wave2 = sin(dir.x * 7.0 - time * 0.08 + 1.5) * 0.5 + 0.5;
      float curtain = wave1 * wave2;

      // FBM-like detail using simple noise
      float detail = sin(dir.x * 12.0 + time * 0.2) * sin(altitude * 8.0 - time * 0.1);
      detail = detail * 0.5 + 0.5;

      float intensity = altEnvelope * northFacing * curtain * detail * auroraIntensity * 0.3;

      // Color: green to purple gradient
      vec3 auroraColor = mix(
        vec3(0.1, 0.8, 0.3),
        vec3(0.4, 0.1, 0.6),
        sin(dir.x * 3.0 + time * 0.1) * 0.5 + 0.5
      );

      return auroraColor * intensity;
    }
  `;

  /**
   * Returns current aurora intensity uniform value (0~1).
   * Manages event lifecycle internally.
   */
  update(nightFactor: number, elapsed: number, dt: number): number {
    if (this.active) {
      this.lifetime += dt;

      // Fade-in phase
      if (this.lifetime < this.fadeInTime) {
        this.intensity = this.lifetime / this.fadeInTime;
      }
      // Active phase
      else if (this.lifetime < this.fadeOutStart) {
        this.intensity = 1.0;
      }
      // Fade-out phase
      else if (this.lifetime < this.duration) {
        this.intensity = 1.0 - (this.lifetime - this.fadeOutStart) / (this.duration - this.fadeOutStart);
      }
      // Event ended
      else {
        this.active = false;
        this.intensity = 0;
        this.cooldown = 30; // minimum 30s before next event
      }
      return this.intensity;
    }

    // Not active: check for new event
    if (nightFactor < 0.80) {
      this.intensity = 0;
      return 0;
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return 0;

    // ~3% chance per minute = 0.05% per second
    if (Math.random() < 0.0005 * dt) {
      this.active = true;
      this.lifetime = 0;
      this.fadeInTime = 5 + Math.random() * 5;       // 5-10s
      const activeTime = 30 + Math.random() * 90;     // 30-120s
      const fadeOutTime = 10 + Math.random() * 5;     // 10-15s
      this.fadeOutStart = this.fadeInTime + activeTime;
      this.duration = this.fadeOutStart + fadeOutTime;
    }

    return 0;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/atmosphere/celestial/AuroraEffect.ts
git commit -m "feat(celestial): add event-based AuroraEffect with lifecycle"
```

---

## Task 7: PlanetRenderer — Billboard Planets

**Files:**
- Create: `src/atmosphere/celestial/PlanetRenderer.ts`

- [ ] **Step 1: Create PlanetRenderer module**

```typescript
// src/atmosphere/celestial/PlanetRenderer.ts
import * as THREE from 'three';
import type { PlanetState } from './EphemerisCalculator';

/**
 * Renders 4 planets as billboard sprites.
 * No twinkling (extended light source). Real-date positions.
 * Appears at nF 0.20+ (first celestial objects visible at dusk).
 */

const SKY_RADIUS = 39000; // slightly inside the sky sphere (40000)

function magnitudeToSize(mag: number): number {
  // Brighter = lower magnitude = bigger sprite
  // Venus (-4.6) → 120, Sirius-level (0) → 40, mag 1 → 25
  return Math.max(15, 120 * Math.pow(10, -0.15 * (mag + 4.6)));
}

export class PlanetRenderer {
  private sprites: Map<string, THREE.Sprite> = new Map();
  private group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.renderOrder = 0; // render with normal objects

    const planetNames: PlanetState['name'][] = ['venus', 'mars', 'jupiter', 'saturn'];
    for (const name of planetNames) {
      const spriteMat = new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.visible = false;
      this.group.add(sprite);
      this.sprites.set(name, sprite);
    }
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(planets: PlanetState[], nightFactor: number, overcastFactor: number): void {
    const visibility = this.smoothstep(0.10, 0.30, nightFactor) * (1 - overcastFactor);

    for (const planet of planets) {
      const sprite = this.sprites.get(planet.name);
      if (!sprite) continue;

      const mat = sprite.material as THREE.SpriteMaterial;

      // Below horizon → hide
      if (planet.altitude < 0 || visibility < 0.01) {
        sprite.visible = false;
        mat.opacity = 0;
        continue;
      }

      sprite.visible = true;

      // Convert az/alt to 3D position on sky sphere
      const cosAlt = Math.cos(planet.altitude);
      sprite.position.set(
        -Math.sin(planet.azimuth) * cosAlt * SKY_RADIUS,
        Math.sin(planet.altitude) * SKY_RADIUS,
        -Math.cos(planet.azimuth) * cosAlt * SKY_RADIUS,
      );

      // Size from magnitude
      const size = magnitudeToSize(planet.magnitude);
      sprite.scale.set(size, size, 1);

      // Color and opacity
      mat.color.copy(planet.color);
      mat.opacity = visibility * this.smoothstep(0.0, 0.1, planet.altitude);
    }
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  dispose(): void {
    for (const sprite of this.sprites.values()) {
      (sprite.material as THREE.SpriteMaterial).dispose();
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit src/atmosphere/celestial/PlanetRenderer.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/celestial/PlanetRenderer.ts
git commit -m "feat(celestial): add PlanetRenderer with 4 billboard sprites"
```

---

## Task 8: MoonRenderer — 3D Moon with Phase Lighting

**Files:**
- Create: `src/atmosphere/celestial/MoonRenderer.ts`

The most complex layer. Uses a 3D sphere with procedural texture (no external asset needed for initial version — we generate a moon-like pattern procedurally, NASA texture can be swapped in later).

- [ ] **Step 1: Create MoonRenderer module**

```typescript
// src/atmosphere/celestial/MoonRenderer.ts
import * as THREE from 'three';
import type { MoonState } from './EphemerisCalculator';

/**
 * 3D moon with:
 * - Procedural moon surface texture (craters/maria pattern)
 * - Phase lighting via directional light vector
 * - Glow effect (works with Bloom postfx)
 * - Outputs moonlightFactor for other layers
 *
 * Appears at nF 0.15+ (first visible celestial object).
 * Visually oversized (2-3x real angular size) for cinematic effect.
 */

const SKY_RADIUS = 38000;
const MOON_RADIUS = 400; // oversized for cinematic (real would be ~165)

export class MoonRenderer {
  private moonMesh: THREE.Mesh;
  private moonLight: THREE.DirectionalLight;
  private glowMesh: THREE.Mesh;
  private group: THREE.Group;
  moonlightFactor = 0;

  constructor() {
    this.group = new THREE.Group();

    // Moon geometry with procedural material
    const geo = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xddddcc,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x222211,
      emissiveIntensity: 0.1,
    });
    this.moonMesh = new THREE.Mesh(geo, mat);
    this.moonMesh.visible = false;
    this.group.add(this.moonMesh);

    // Directional light aimed at the moon to create phase shadow
    this.moonLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.moonLight.target = this.moonMesh;
    this.group.add(this.moonLight);

    // Glow sprite behind the moon (catches Bloom)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const glowGeo = new THREE.SphereGeometry(MOON_RADIUS * 1.4, 16, 16);
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.visible = false;
    this.group.add(this.glowMesh);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(
    moonState: MoonState,
    nightFactor: number,
    sunDirection: THREE.Vector3,
    overcastFactor: number,
  ): number {
    const visibility = this.smoothstep(0.05, 0.25, nightFactor) * (1 - overcastFactor * 0.7);

    // Below horizon or daytime
    if (moonState.altitude < -0.02 || visibility < 0.01) {
      this.moonMesh.visible = false;
      this.glowMesh.visible = false;
      this.moonlightFactor = 0;
      return 0;
    }

    this.moonMesh.visible = true;
    this.glowMesh.visible = true;

    // Position on sky sphere
    const cosAlt = Math.cos(moonState.altitude);
    const pos = new THREE.Vector3(
      -Math.sin(moonState.azimuth) * cosAlt * SKY_RADIUS,
      Math.sin(moonState.altitude) * SKY_RADIUS,
      -Math.cos(moonState.azimuth) * cosAlt * SKY_RADIUS,
    );
    this.moonMesh.position.copy(pos);
    this.glowMesh.position.copy(pos);

    // Phase lighting: position light source relative to moon
    // to simulate sun illumination angle
    const lightOffset = sunDirection.clone().multiplyScalar(MOON_RADIUS * 10);
    this.moonLight.position.copy(pos).add(lightOffset);
    this.moonLight.intensity = 2.0 * visibility;

    // Moon material opacity/emissive based on visibility
    const moonMat = this.moonMesh.material as THREE.MeshStandardMaterial;
    moonMat.emissiveIntensity = 0.1 + moonState.illumination * 0.3 * visibility;

    // Glow intensity based on illumination and visibility
    const glowMat = this.glowMesh.material as THREE.MeshBasicMaterial;
    glowMat.opacity = moonState.illumination * visibility * 0.15;

    // Calculate moonlightFactor output
    const altFactor = moonState.altitude > 0
      ? this.smoothstep(0, 0.3, moonState.altitude)
      : 0;
    this.moonlightFactor = moonState.illumination * altFactor * (1 - overcastFactor);

    return this.moonlightFactor;
  }

  getMoonDirection(): THREE.Vector3 {
    return this.moonMesh.position.clone().normalize();
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  dispose(): void {
    (this.moonMesh.material as THREE.Material).dispose();
    this.moonMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit src/atmosphere/celestial/MoonRenderer.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/celestial/MoonRenderer.ts
git commit -m "feat(celestial): add MoonRenderer with phase lighting and glow"
```

---

## Task 9: MeteorShower — Particle System

**Files:**
- Create: `src/atmosphere/celestial/MeteorShower.ts`

- [ ] **Step 1: Create MeteorShower module**

```typescript
// src/atmosphere/celestial/MeteorShower.ts
import * as THREE from 'three';

/**
 * Meteor system with two modes:
 * - Sporadic: 1 meteor every 30-120s at random sky position
 * - Shower event: 5-10% chance per minute, 3-8 meteors from one radiant over 10-30s
 *
 * Each meteor: Line geometry, 0.5-1.5s lifespan, white→orange→fade trail.
 * Max 10 simultaneous meteors.
 */

interface Meteor {
  line: THREE.Line;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  age: number;
  lifespan: number;
  trailLength: number;
}

const MAX_METEORS = 10;
const SKY_RADIUS = 37000;

export class MeteorShower {
  private group: THREE.Group;
  private meteors: Meteor[] = [];
  private sporadicTimer = 0;
  private sporadicInterval = 0;
  private showerActive = false;
  private showerTimer = 0;
  private showerDuration = 0;
  private showerRadiant = new THREE.Vector3();
  private showerSpawnTimer = 0;
  private eventCheckTimer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.sporadicInterval = 30 + Math.random() * 90;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(nightFactor: number, elapsed: number, dt: number): void {
    if (nightFactor < 0.80) {
      this.hideAll();
      return;
    }

    // Update existing meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.age += dt;

      if (m.age >= m.lifespan) {
        this.group.remove(m.line);
        m.line.geometry.dispose();
        (m.line.material as THREE.Material).dispose();
        this.meteors.splice(i, 1);
        continue;
      }

      // Update trail positions
      const progress = m.age / m.lifespan;
      const headPos = m.origin.clone().add(m.direction.clone().multiplyScalar(m.speed * m.age));
      const tailPos = headPos.clone().sub(m.direction.clone().multiplyScalar(m.trailLength));

      const positions = m.line.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, tailPos.x, tailPos.y, tailPos.z);
      positions.setXYZ(1, headPos.x, headPos.y, headPos.z);
      positions.needsUpdate = true;

      // Color: white → orange → fade
      const mat = m.line.material as THREE.LineBasicMaterial;
      const fade = 1 - progress;
      mat.color.setRGB(1.0, 0.8 + 0.2 * (1 - progress), 0.5 * (1 - progress));
      mat.opacity = fade * fade; // quadratic fade
    }

    // Sporadic meteor spawning
    this.sporadicTimer += dt;
    if (this.sporadicTimer >= this.sporadicInterval && this.meteors.length < MAX_METEORS) {
      this.spawnMeteor(this.randomSkyDirection());
      this.sporadicTimer = 0;
      this.sporadicInterval = 30 + Math.random() * 90;
    }

    // Shower event check (every 60s, 5-10% chance)
    if (!this.showerActive) {
      this.eventCheckTimer += dt;
      if (this.eventCheckTimer >= 60) {
        this.eventCheckTimer = 0;
        if (Math.random() < 0.075) { // 7.5% average
          this.startShower();
        }
      }
    }

    // Shower spawning
    if (this.showerActive) {
      this.showerTimer += dt;
      this.showerSpawnTimer += dt;

      if (this.showerSpawnTimer >= 2 + Math.random() * 3) {
        this.showerSpawnTimer = 0;
        if (this.meteors.length < MAX_METEORS) {
          // Spawn near radiant point with some spread
          const dir = this.showerRadiant.clone();
          dir.x += (Math.random() - 0.5) * 0.3;
          dir.y += (Math.random() - 0.5) * 0.15;
          dir.z += (Math.random() - 0.5) * 0.3;
          dir.normalize();
          this.spawnMeteor(dir);
        }
      }

      if (this.showerTimer >= this.showerDuration) {
        this.showerActive = false;
      }
    }
  }

  private startShower(): void {
    this.showerActive = true;
    this.showerTimer = 0;
    this.showerSpawnTimer = 0;
    this.showerDuration = 10 + Math.random() * 20; // 10-30s
    this.showerRadiant = this.randomSkyDirection();
    // Ensure radiant is above horizon
    this.showerRadiant.y = Math.abs(this.showerRadiant.y) * 0.5 + 0.3;
    this.showerRadiant.normalize();
  }

  private spawnMeteor(startDir: THREE.Vector3): void {
    // Ensure starting position is above horizon
    if (startDir.y < 0.1) startDir.y = 0.1 + Math.random() * 0.5;
    startDir.normalize();

    const origin = startDir.clone().multiplyScalar(SKY_RADIUS);

    // Direction: generally downward and to the side
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      -0.3 - Math.random() * 0.7,
      (Math.random() - 0.5) * 0.5,
    ).normalize();

    const lifespan = 0.5 + Math.random() * 1.0;
    const speed = 8000 + Math.random() * 12000;
    const trailLength = 500 + Math.random() * 1500;

    // Create line geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 vertices × 3 components
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const line = new THREE.Line(geometry, material);
    this.group.add(line);

    this.meteors.push({ line, origin, direction, speed, age: 0, lifespan, trailLength });
  }

  private randomSkyDirection(): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4 + 0.1; // above horizon
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
  }

  private hideAll(): void {
    for (const m of this.meteors) {
      (m.line.material as THREE.LineBasicMaterial).opacity = 0;
    }
  }

  dispose(): void {
    for (const m of this.meteors) {
      this.group.remove(m.line);
      m.line.geometry.dispose();
      (m.line.material as THREE.Material).dispose();
    }
    this.meteors = [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/atmosphere/celestial/MeteorShower.ts
git commit -m "feat(celestial): add MeteorShower with sporadic and shower event modes"
```

---

## Task 10: CelestialSystem — Orchestrator + Combined Shader

**Files:**
- Create: `src/atmosphere/celestial/CelestialSystem.ts`

This is the main orchestrator that owns the sky sphere mesh (with combined shader), coordinates all layers, and exposes the single `update()` method.

- [ ] **Step 1: Create CelestialSystem orchestrator**

```typescript
// src/atmosphere/celestial/CelestialSystem.ts
import * as THREE from 'three';
import { EphemerisCalculator } from './EphemerisCalculator';
import { SkyGradient } from './SkyGradient';
import { StarField } from './StarField';
import { ConstellationMap } from './ConstellationMap';
import { MilkyWay } from './MilkyWay';
import { AuroraEffect } from './AuroraEffect';
import { PlanetRenderer } from './PlanetRenderer';
import { MoonRenderer } from './MoonRenderer';
import { MeteorShower } from './MeteorShower';

export interface CelestialUpdateResult {
  moonlightFactor: number;
  moonDirection: THREE.Vector3;
}

export class CelestialSystem {
  private ephemeris: EphemerisCalculator;
  private skyGradient: SkyGradient;
  private constellationMap: ConstellationMap;
  private aurora: AuroraEffect;
  private planetRenderer: PlanetRenderer;
  private moonRenderer: MoonRenderer;
  private meteorShower: MeteorShower;

  private skyMesh: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;

  // Constellation star positions uniform (updated from ConstellationMap)
  private constellationData: Float32Array;

  constructor(scene: THREE.Scene) {
    this.ephemeris = new EphemerisCalculator();
    this.skyGradient = new SkyGradient();
    this.constellationMap = new ConstellationMap();
    this.aurora = new AuroraEffect();
    this.planetRenderer = new PlanetRenderer();
    this.moonRenderer = new MoonRenderer();
    this.meteorShower = new MeteorShower();

    this.constellationData = new Float32Array(ConstellationMap.STAR_COUNT * 3);

    // Combined sky sphere shader (SkyGradient + StarField + MilkyWay + Aurora)
    const geo = new THREE.SphereGeometry(40000, 32, 24);
    geo.scale(-1, 1, 1); // flip normals inward

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uNightFactor: { value: 0 },
        uTime: { value: 0 },
        uMoonlightFactor: { value: 0 },
        uLightPollution: { value: 0 },
        uAuroraIntensity: { value: 0 },
        uConstellationStars: { value: this.constellationData },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uNightFactor;
        uniform float uTime;
        uniform float uMoonlightFactor;
        uniform float uLightPollution;
        uniform float uAuroraIntensity;
        uniform float uConstellationStars[${ConstellationMap.STAR_COUNT * 3}];

        varying vec3 vWorldDir;

        // --- Included GLSL modules ---
        ${SkyGradient.GLSL}
        ${ConstellationMap.GLSL}
        ${StarField.GLSL}
        ${MilkyWay.GLSL}
        ${AuroraEffect.GLSL}

        void main() {
          if (uNightFactor < 0.01) {
            discard;
          }

          vec3 dir = normalize(vWorldDir);
          float altitude = dir.y;

          if (altitude < -0.05) {
            discard;
          }

          vec3 color = vec3(0.0);

          // Layer 1: Sky gradient + light pollution
          color += skyGradient(dir, uNightFactor, uLightPollution);

          // Layer 2: Star field (2-stage)
          color += starField(dir, uNightFactor, uMoonlightFactor, uLightPollution, uTime, uConstellationStars);

          // Layer 3: Milky Way
          color += milkyWay(dir, uNightFactor, uMoonlightFactor, uLightPollution);

          // Layer 4: Aurora
          color += auroraEffect(dir, uAuroraIntensity, uTime);

          // Horizon fade
          float horizonFade = smoothstep(-0.05, 0.15, altitude);
          color *= horizonFade;

          gl_FragColor = vec4(color, uNightFactor * horizonFade);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });

    this.skyMesh = new THREE.Mesh(geo, this.skyMaterial);
    this.skyMesh.renderOrder = -1;

    // Add everything to scene
    scene.add(this.skyMesh);
    scene.add(this.planetRenderer.getGroup());
    scene.add(this.moonRenderer.getGroup());
    scene.add(this.meteorShower.getGroup());
  }

  update(
    nightFactor: number,
    hour: number,
    elapsed: number,
    dt: number,
    overcastFactor: number,
  ): CelestialUpdateResult {
    const visible = nightFactor > 0.01;
    this.skyMesh.visible = visible;

    if (!visible) {
      this.planetRenderer.update([], 0, 0);
      return { moonlightFactor: 0, moonDirection: new THREE.Vector3(0, 1, 0) };
    }

    // 1. Ephemeris calculation (cached internally at 30s intervals)
    const { moon, planets } = this.ephemeris.calculate(new Date(), hour);

    // Sun direction for moon phase lighting
    const phi = THREE.MathUtils.degToRad(90 - 45); // approximate sun below horizon
    const theta = THREE.MathUtils.degToRad(270);    // west
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    // 2. Moon (first — produces moonlightFactor)
    const moonlightFactor = this.moonRenderer.update(moon, nightFactor, sunDir, overcastFactor);

    // 3. Sky gradient (produces lightPollution)
    const lightPollution = this.skyGradient.update(hour, nightFactor);

    // 4. Planets
    this.planetRenderer.update(planets, nightFactor, overcastFactor);

    // 5-6. Constellation positions (for star field shader)
    // Compute LST for constellation rotation
    const jd = new Date().getTime() / 86400000 + 2440587.5;
    const jdGameHour = Math.floor(jd - 0.5) + 0.5 + hour / 24;
    const T = (jdGameHour - 2451545.0) / 36525;
    let gmstDeg = 280.46061837 + 360.98564736629 * (jdGameHour - 2451545.0)
      + 0.000387933 * T * T;
    gmstDeg = ((gmstDeg % 360) + 360) % 360;
    const lst = gmstDeg * Math.PI / 180 + (-122.4 * Math.PI / 180);
    this.constellationData = this.constellationMap.computePositions(lst);

    // 7. Aurora (event lifecycle)
    const auroraIntensity = this.aurora.update(nightFactor, elapsed, dt);

    // 8. Meteors
    this.meteorShower.update(nightFactor, elapsed, dt);

    // Update shader uniforms
    const u = this.skyMaterial.uniforms;
    u.uNightFactor.value = nightFactor;
    u.uTime.value = elapsed;
    u.uMoonlightFactor.value = moonlightFactor;
    u.uLightPollution.value = lightPollution;
    u.uAuroraIntensity.value = auroraIntensity;
    u.uConstellationStars.value = this.constellationData;

    return {
      moonlightFactor,
      moonDirection: this.moonRenderer.getMoonDirection(),
    };
  }

  dispose(): void {
    this.skyMaterial.dispose();
    this.skyMesh.geometry.dispose();
    this.planetRenderer.dispose();
    this.moonRenderer.dispose();
    this.meteorShower.dispose();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/atmosphere/celestial/CelestialSystem.ts
git commit -m "feat(celestial): add CelestialSystem orchestrator with combined sky shader"
```

---

## Task 11: Integration — Replace NightSky in main.ts and MaterialUpdater.ts

**Files:**
- Modify: `src/main.ts` (lines 20, 70-71, 126-127)
- Modify: `src/atmosphere/MaterialUpdater.ts` (line 121-126)
- Delete: `src/atmosphere/NightSky.ts`

- [ ] **Step 1: Update main.ts imports**

Replace line 20:
```typescript
// OLD: import { NightSky } from '@/atmosphere/NightSky';
// NEW:
import { CelestialSystem } from '@/atmosphere/celestial/CelestialSystem';
```

- [ ] **Step 2: Update main.ts initialization (lines 70-71)**

Replace:
```typescript
  const nightSky = new NightSky();
  sm.scene.add(nightSky.mesh);
```

With:
```typescript
  const celestialSystem = new CelestialSystem(sm.scene);
```

- [ ] **Step 3: Update main.ts game loop (lines 122-127)**

Replace:
```typescript
    const timeState = timeOfDay.update(dt);
    const weatherState = weatherSystem.update(dt);
    matUpdater.update(timeState, weatherState, dt);

    const nightFactor = 1 - Math.min(1, Math.max(0, timeState.sunIntensity / 0.8));
    nightSky.update(nightFactor, elapsed);
```

With:
```typescript
    const timeState = timeOfDay.update(dt);
    const weatherState = weatherSystem.update(dt);
    matUpdater.update(timeState, weatherState, dt);

    const nightFactor = 1 - Math.min(1, Math.max(0, timeState.sunIntensity / 0.8));
    celestialSystem.update(nightFactor, timeState.hour, elapsed, dt, weatherState.overcast);
```

- [ ] **Step 4: Delete NightSky.ts**

```bash
git rm src/atmosphere/NightSky.ts
```

- [ ] **Step 5: Verify build compiles**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors

- [ ] **Step 6: Verify dev server runs**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx vite build 2>&1 | tail -10`

Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/main.ts src/atmosphere/MaterialUpdater.ts
git commit -m "feat(celestial): integrate CelestialSystem, remove NightSky"
```

---

## Task 12: Visual Verification and Tuning

**Files:**
- Possibly modify: `src/atmosphere/celestial/CelestialSystem.ts` (uniform values, thresholds)

- [ ] **Step 1: Start dev server and verify visually**

Run: `cd /home/yhzion/datamaker/golden-gate-bridge && npx vite --host 2>&1 &`

Open in browser and verify:
1. Set time to dusk (~19:00): planets and bright stars should appear first
2. Set time to night (~22:00): full star field, constellations, Milky Way visible
3. Set time to deep night (~01:00): light pollution reduced, potential meteor/aurora
4. Check moon phase matches today's actual moon phase
5. Weather: toggle fog/rain — celestial objects should dim/hide

- [ ] **Step 2: Fix any visual issues found**

Apply fixes to shader values, threshold numbers, sizes, colors.

- [ ] **Step 3: Commit any tuning changes**

```bash
git add -u
git commit -m "fix(celestial): tune visual parameters after verification"
```
