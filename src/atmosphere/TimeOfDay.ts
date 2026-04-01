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
}

interface TimeKeyframe {
  hour: number;
  sunElevation: number;
  sunAzimuth: number;
  sunColor: [number, number, number]; // RGB
  sunIntensity: number;
  ambientIntensity: number;
  turbidity: number;
  rayleigh: number;
  fogDensity: number;
  fogColor: [number, number, number];
  windowEmissive: number;
  streetLightEmissive: number;
  exposure: number;
}

const KEYFRAMES: TimeKeyframe[] = [
  // Night (00:00)
  { hour: 0, sunElevation: -30, sunAzimuth: 0, sunColor: [0.1, 0.1, 0.2], sunIntensity: 0, ambientIntensity: 0.06, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 0.35 },
  // Pre-dawn (04:30)
  { hour: 4.5, sunElevation: -10, sunAzimuth: 80, sunColor: [0.3, 0.15, 0.1], sunIntensity: 0.1, ambientIntensity: 0.1, turbidity: 4, rayleigh: 1.5, fogDensity: 0.00013, fogColor: [0.15, 0.1, 0.12], windowEmissive: 0.6, streetLightEmissive: 0.8, exposure: 0.38 },
  // Dawn (06:00)
  { hour: 6, sunElevation: 5, sunAzimuth: 95, sunColor: [1.0, 0.6, 0.3], sunIntensity: 0.6, ambientIntensity: 0.2, turbidity: 6, rayleigh: 2.5, fogDensity: 0.00012, fogColor: [0.7, 0.45, 0.3], windowEmissive: 0.3, streetLightEmissive: 0.3, exposure: 0.42 },
  // Morning (08:00)
  { hour: 8, sunElevation: 25, sunAzimuth: 120, sunColor: [1.0, 0.9, 0.75], sunIntensity: 1.0, ambientIntensity: 0.35, turbidity: 5, rayleigh: 2.0, fogDensity: 0.00008, fogColor: [0.75, 0.72, 0.65], windowEmissive: 0.05, streetLightEmissive: 0.0, exposure: 0.45 },
  // Noon (12:00)
  { hour: 12, sunElevation: 55, sunAzimuth: 180, sunColor: [1.0, 0.98, 0.92], sunIntensity: 1.1, ambientIntensity: 0.4, turbidity: 5, rayleigh: 1.8, fogDensity: 0.00006, fogColor: [0.78, 0.75, 0.68], windowEmissive: 0.0, streetLightEmissive: 0.0, exposure: 0.48 },
  // Afternoon (16:00)
  { hour: 16, sunElevation: 30, sunAzimuth: 240, sunColor: [1.0, 0.92, 0.78], sunIntensity: 1.0, ambientIntensity: 0.35, turbidity: 6, rayleigh: 2.0, fogDensity: 0.00008, fogColor: [0.8, 0.72, 0.58], windowEmissive: 0.05, streetLightEmissive: 0.0, exposure: 0.46 },
  // Golden hour (18:30)
  { hour: 18.5, sunElevation: 8, sunAzimuth: 265, sunColor: [1.0, 0.55, 0.2], sunIntensity: 0.7, ambientIntensity: 0.25, turbidity: 8, rayleigh: 3.0, fogDensity: 0.0001, fogColor: [0.85, 0.55, 0.3], windowEmissive: 0.25, streetLightEmissive: 0.2, exposure: 0.42 },
  // Dusk (20:00)
  { hour: 20, sunElevation: -5, sunAzimuth: 280, sunColor: [0.5, 0.2, 0.1], sunIntensity: 0.15, ambientIntensity: 0.12, turbidity: 4, rayleigh: 1.5, fogDensity: 0.00013, fogColor: [0.2, 0.12, 0.15], windowEmissive: 0.7, streetLightEmissive: 0.9, exposure: 0.38 },
  // Night (22:00)
  { hour: 22, sunElevation: -30, sunAzimuth: 300, sunColor: [0.1, 0.1, 0.2], sunIntensity: 0, ambientIntensity: 0.06, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 0.35 },
  // Night wrap (24:00 = 0:00)
  { hour: 24, sunElevation: -30, sunAzimuth: 360, sunColor: [0.1, 0.1, 0.2], sunIntensity: 0, ambientIntensity: 0.06, turbidity: 2, rayleigh: 0.5, fogDensity: 0.00015, fogColor: [0.05, 0.05, 0.1], windowEmissive: 0.9, streetLightEmissive: 1.0, exposure: 0.35 },
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
      turbidity: lerp(a.turbidity, b.turbidity, t),
      rayleigh: lerp(a.rayleigh, b.rayleigh, t),
      fogDensity: lerp(a.fogDensity, b.fogDensity, t),
      fogColor: lerpColor(a.fogColor, b.fogColor, t),
      windowEmissive: lerp(a.windowEmissive, b.windowEmissive, t),
      streetLightEmissive: lerp(a.streetLightEmissive, b.streetLightEmissive, t),
      exposure: lerp(a.exposure, b.exposure, t),
    };
  }
}
