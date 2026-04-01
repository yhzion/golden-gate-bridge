// src/atmosphere/celestial/MilkyWay.ts

export class MilkyWay {
  static readonly GLSL = /* glsl */ `
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

      float mwAngle = atan(dir.z, dir.x);
      float galacticLat = abs(sin(mwAngle * 0.5 + 0.3) * 0.8 - altitude * 0.3);
      float band = smoothstep(0.35, 0.0, galacticLat);

      vec2 mwUV = vec2(mwAngle * 2.0, altitude * 4.0);
      float noise = mwFbm(mwUV * 3.0) * mwFbm(mwUV * 7.0 + 5.0);
      float brightness = band * noise * 2.5;

      vec3 mwColor = mix(
        vec3(0.15, 0.18, 0.25),
        vec3(0.25, 0.22, 0.18),
        mwFbm(mwUV * 1.5 + 10.0)
      );

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

      float moonDim = 1.0 - moonlightFactor * 0.8;
      float pollDim = max(0.0, 1.0 - lightPollution * 1.2);

      brightness *= visibility * moonDim * pollDim;
      brightness *= smoothstep(-0.02, 0.15, altitude);

      return mwColor * brightness;
    }
  `;
}
