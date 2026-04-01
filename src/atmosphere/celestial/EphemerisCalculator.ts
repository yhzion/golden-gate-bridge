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
const LAT = 37.8 * Math.PI / 180;
const LON = -122.4 * Math.PI / 180;
const SIN_LAT = Math.sin(LAT);
const COS_LAT = Math.cos(LAT);

const J2000 = 2451545.0;
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

function gmst(jd: number): number {
  const T = (jd - J2000) / 36525;
  let theta = 280.46061837 + 360.98564736629 * (jd - J2000)
    + 0.000387933 * T * T - T * T * T / 38710000;
  theta = ((theta % 360) + 360) % 360;
  return theta * DEG;
}

function equatorialToHorizontal(ra: number, dec: number, lst: number): CelestialPosition {
  const ha = lst - ra;
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const cosHa = Math.cos(ha);
  const sinHa = Math.sin(ha);

  const sinAlt = sinDec * SIN_LAT + cosDec * COS_LAT * cosHa;
  const altitude = Math.asin(sinAlt);

  let azimuth = Math.atan2(-cosDec * sinHa, sinDec * COS_LAT - cosDec * SIN_LAT * cosHa);
  azimuth = normalizeAngle(azimuth);

  return { azimuth, altitude };
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  return E;
}

function calculateMoon(jd: number, lst: number): MoonState {
  const daysSinceJ2000 = jd - J2000;

  const L = normalizeAngle((218.316 + 13.176396 * daysSinceJ2000) * DEG);
  const M = normalizeAngle((134.963 + 13.064993 * daysSinceJ2000) * DEG);
  const F = normalizeAngle((93.272 + 13.229350 * daysSinceJ2000) * DEG);

  const eclLon = L + 6.289 * DEG * Math.sin(M);
  const eclLat = 5.128 * DEG * Math.sin(F);

  const obliquity = 23.4393 * DEG;
  const cosObl = Math.cos(obliquity);
  const sinObl = Math.sin(obliquity);
  const sinLon = Math.sin(eclLon);
  const cosLon = Math.cos(eclLon);
  const cosLat = Math.cos(eclLat);

  const ra = Math.atan2(sinLon * cosObl - Math.tan(eclLat) * sinObl, cosLon);
  const dec = Math.asin(Math.sin(eclLat) * cosObl + cosLat * sinObl * sinLon);

  const pos = equatorialToHorizontal(ra, dec, lst);

  const daysSinceNewMoon = jd - NEW_MOON_JD;
  const phase = ((daysSinceNewMoon % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(phase * TWO_PI)) / 2;

  return { ...pos, phase, illumination };
}

interface OrbitalElements {
  a: number; e: number; I: number; L: number; wBar: number; omega: number;
  aRate: number; eRate: number; IRate: number; LRate: number; wBarRate: number; omegaRate: number;
}

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

const EARTH_ELEMENTS: OrbitalElements = {
  a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166,
  wBar: 102.93768193, omega: 0.0,
  aRate: 0.00000562, eRate: -0.00004392, IRate: -0.01294668,
  LRate: 35999.37244981, wBarRate: 0.32327364, omegaRate: 0.0,
};

const PLANET_COLORS: Record<string, [number, number, number]> = {
  venus: [1.0, 1.0, 0.94], mars: [1.0, 0.4, 0.27],
  jupiter: [1.0, 0.93, 0.8], saturn: [1.0, 0.91, 0.67],
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

  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosO = Math.cos(omega), sinO = Math.sin(omega);
  const cosI = Math.cos(I), sinI = Math.sin(I);

  const x = (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb;
  const y = (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb;
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  return [x, y, z];
}

function calculatePlanets(jd: number, lst: number): PlanetState[] {
  const T = (jd - J2000) / 36525;
  const obliquity = 23.4393 * DEG;
  const cosObl = Math.cos(obliquity);
  const sinObl = Math.sin(obliquity);

  const [ex, ey, ez] = heliocentricPosition(EARTH_ELEMENTS, T);
  const results: PlanetState[] = [];

  for (const [name, el] of Object.entries(PLANET_ELEMENTS)) {
    const [px, py, pz] = heliocentricPosition(el, T);
    const gx = px - ex, gy = py - ey, gz = pz - ez;
    const eqX = gx;
    const eqY = gy * cosObl - gz * sinObl;
    const eqZ = gy * sinObl + gz * cosObl;

    const ra = Math.atan2(eqY, eqX);
    const dec = Math.atan2(eqZ, Math.sqrt(eqX * eqX + eqY * eqY));
    const pos = equatorialToHorizontal(ra, dec, lst);
    const [cr, cg, cb] = PLANET_COLORS[name];

    results.push({
      ...pos, name: name as PlanetState['name'],
      magnitude: PLANET_BASE_MAGNITUDES[name],
      color: new THREE.Color(cr, cg, cb),
    });
  }
  return results;
}

export class EphemerisCalculator {
  private cache: EphemerisResult | null = null;
  private cacheTime = 0;
  private static CACHE_INTERVAL = 30;

  calculate(date: Date, hour: number): EphemerisResult {
    const now = date.getTime() / 1000;
    if (this.cache && Math.abs(now - this.cacheTime) < EphemerisCalculator.CACHE_INTERVAL) {
      return this.cache;
    }

    const jd = dateToJD(date);
    const jdDate = Math.floor(jd - 0.5) + 0.5;
    const jdWithGameHour = jdDate + hour / 24;
    const lst = gmst(jdWithGameHour) + LON;

    const moon = calculateMoon(jd, lst);
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
