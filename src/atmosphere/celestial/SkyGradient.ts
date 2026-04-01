// src/atmosphere/celestial/SkyGradient.ts

const HOUR_DECAY: [number, number][] = [
  [19, 1.0], [21, 0.85], [23, 0.65],
  [25, 0.45], [27, 0.35], [29, 0.50],
];

function interpolateHourDecay(hour: number): number {
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

  static readonly GLSL = /* glsl */ `
    vec3 skyGradient(vec3 dir, float nightFactor, float lightPollution) {
      float altitude = dir.y;

      vec3 zenithColor = vec3(0.01, 0.015, 0.035);
      vec3 horizonColor = vec3(0.02, 0.025, 0.04);
      vec3 base = mix(horizonColor, zenithColor, smoothstep(0.0, 0.6, altitude));

      float downtownDir = smoothstep(-0.3, 0.5, -dir.z * 0.7 + dir.x * 0.3);
      float glowAltitude = smoothstep(0.4, 0.0, altitude);
      float glow = downtownDir * glowAltitude * lightPollution;

      vec3 glowColor = mix(
        vec3(0.12, 0.06, 0.02),
        vec3(0.10, 0.08, 0.06),
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
