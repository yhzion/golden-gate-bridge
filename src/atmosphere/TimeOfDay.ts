import * as THREE from 'three';

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

interface TimeKeyframe {
  hour: number;
  sunElevation: number;
  sunAzimuth: number;
  sunColor: [number, number, number]; // RGB
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

const KEYFRAMES: TimeKeyframe[] = [
  // Night (00:00)
  { hour: 0, sunElevation: -30, sunAzimuth: 0, sunColor: [0.05, 0.05, 0.12], sunIntensity: 0, ambientIntensity: 0.015, hemisphereIntensity: 0.02, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 1.0, envMapIntensity: 0.03 },
  // Pre-dawn (04:30)
  { hour: 4.5, sunElevation: -10, sunAzimuth: 80, sunColor: [0.25, 0.12, 0.08], sunIntensity: 0.03, ambientIntensity: 0.04, hemisphereIntensity: 0.05, turbidity: 3, rayleigh: 0.8, fogDensity: 0.00013, fogColor: [0.15, 0.1, 0.12], windowEmissive: 0.6, streetLightEmissive: 0.8, exposure: 1.0, envMapIntensity: 0.04 },
  // Dawn (06:00)
  { hour: 6, sunElevation: 5, sunAzimuth: 95, sunColor: [0.9, 0.5, 0.25], sunIntensity: 0.10, ambientIntensity: 0.05, hemisphereIntensity: 0.06, turbidity: 3, rayleigh: 0.8, fogDensity: 0.00012, fogColor: [0.7, 0.45, 0.3], windowEmissive: 0.3, streetLightEmissive: 0.3, exposure: 1.0, envMapIntensity: 0.06 },
  // Morning (08:00)
  { hour: 8, sunElevation: 25, sunAzimuth: 120, sunColor: [0.95, 0.85, 0.7], sunIntensity: 0.20, ambientIntensity: 0.06, hemisphereIntensity: 0.06, turbidity: 3, rayleigh: 0.8, fogDensity: 0.00008, fogColor: [0.75, 0.72, 0.65], windowEmissive: 0.05, streetLightEmissive: 0.0, exposure: 1.0, envMapIntensity: 0.08 },
  // Noon (12:00)
  { hour: 12, sunElevation: 55, sunAzimuth: 180, sunColor: [0.95, 0.93, 0.88], sunIntensity: 0.25, ambientIntensity: 0.06, hemisphereIntensity: 0.05, turbidity: 3, rayleigh: 0.6, fogDensity: 0.00006, fogColor: [0.78, 0.75, 0.68], windowEmissive: 0.0, streetLightEmissive: 0.0, exposure: 1.0, envMapIntensity: 0.08 },
  // Afternoon (16:00)
  { hour: 16, sunElevation: 30, sunAzimuth: 240, sunColor: [0.95, 0.88, 0.72], sunIntensity: 0.20, ambientIntensity: 0.06, hemisphereIntensity: 0.06, turbidity: 3, rayleigh: 0.8, fogDensity: 0.00008, fogColor: [0.8, 0.72, 0.58], windowEmissive: 0.05, streetLightEmissive: 0.0, exposure: 1.0, envMapIntensity: 0.08 },
  // Golden hour (18:30)
  { hour: 18.5, sunElevation: 8, sunAzimuth: 265, sunColor: [0.9, 0.45, 0.15], sunIntensity: 0.12, ambientIntensity: 0.05, hemisphereIntensity: 0.07, turbidity: 5, rayleigh: 1.2, fogDensity: 0.0001, fogColor: [0.85, 0.55, 0.3], windowEmissive: 0.25, streetLightEmissive: 0.2, exposure: 1.0, envMapIntensity: 0.08 },
  // Dusk (20:00)
  { hour: 20, sunElevation: -5, sunAzimuth: 280, sunColor: [0.4, 0.15, 0.08], sunIntensity: 0.04, ambientIntensity: 0.04, hemisphereIntensity: 0.05, turbidity: 3, rayleigh: 0.8, fogDensity: 0.00013, fogColor: [0.2, 0.12, 0.15], windowEmissive: 0.7, streetLightEmissive: 0.9, exposure: 1.0, envMapIntensity: 0.05 },
  // Night (22:00)
  { hour: 22, sunElevation: -30, sunAzimuth: 300, sunColor: [0.05, 0.05, 0.12], sunIntensity: 0, ambientIntensity: 0.015, hemisphereIntensity: 0.02, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 1.0, envMapIntensity: 0.03 },
  // Night wrap (24:00 = 0:00)
  { hour: 24, sunElevation: -30, sunAzimuth: 360, sunColor: [0.05, 0.05, 0.12], sunIntensity: 0, ambientIntensity: 0.015, hemisphereIntensity: 0.02, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 1.0, envMapIntensity: 0.03 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): THREE.Color {
  return new THREE.Color(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}

export class TimeOfDay {
  /** Current time in hours (0-24) */
  hour = 12;
  /** Time speed: 1 = real-time, 60 = 1 minute per real second, etc. */
  speed = 120; // 2 minutes per real second → full day in 12 minutes
  paused = false;

  private state: TimeState;

  constructor(startHour = 12) {
    this.hour = startHour;
    this.state = this.computeState();
  }

  setHour(h: number) {
    this.hour = h % 24;
    this.state = this.computeState();
  }

  update(dt: number): TimeState {
    if (!this.paused) {
      this.hour += (dt * this.speed) / 3600;
      if (this.hour >= 24) this.hour -= 24;
    }
    this.state = this.computeState();
    return this.state;
  }

  getState(): TimeState {
    return this.state;
  }

  private computeState(): TimeState {
    const h = this.hour;

    // Find the two keyframes to interpolate between
    let a = KEYFRAMES[0];
    let b = KEYFRAMES[1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (h >= KEYFRAMES[i].hour && h < KEYFRAMES[i + 1].hour) {
        a = KEYFRAMES[i];
        b = KEYFRAMES[i + 1];
        break;
      }
    }

    const t = (h - a.hour) / (b.hour - a.hour);

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
  }
}
