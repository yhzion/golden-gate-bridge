// src/atmosphere/celestial/StarField.ts

export class StarField {
  static readonly GLSL = /* glsl */ `
    float starHash(vec2 p) {
      float h = dot(p, vec2(127.1, 311.7));
      return fract(sin(h) * 43758.5453);
    }

    vec3 starSpectralColor(float h) {
      if (h < 0.10) return vec3(0.65, 0.75, 1.0);
      if (h < 0.40) return vec3(0.95, 0.95, 1.0);
      if (h < 0.65) return vec3(1.0, 0.95, 0.80);
      if (h < 0.85) return vec3(1.0, 0.82, 0.55);
      return vec3(1.0, 0.65, 0.45);
    }

    vec3 starField(
      vec3 dir,
      float nightFactor,
      float moonlightFactor,
      float lightPollution,
      float time,
      float constellationStars[63]
    ) {
      if (nightFactor < 0.20) return vec3(0.0);

      float altitude = dir.y;
      if (altitude < 0.0) return vec3(0.0);

      vec3 color = vec3(0.0);

      vec2 starUV = vec2(
        atan(dir.z, dir.x) * 3.0,
        asin(clamp(altitude, -1.0, 1.0)) * 6.0
      );

      float dimming = (1.0 - moonlightFactor * 0.6) * (1.0 - lightPollution * 0.5);

      // === BRIGHT STARS (Stage 1: nF 0.25+) ===
      float stage1 = smoothstep(0.25, 0.45, nightFactor);
      if (stage1 > 0.0) {
        float scale = 60.0;
        vec2 cell = floor(starUV * scale);
        vec2 cellUV = fract(starUV * scale);
        float h = starHash(cell + 100.0);

        if (h > 0.97) {
          vec2 starPos = vec2(starHash(cell * 1.3 + 0.5), starHash(cell * 2.7 + 0.8));
          float dist = length(cellUV - starPos);
          float brightness = smoothstep(0.018, 0.0, dist);

          float twinkle = 0.8 + 0.2 * sin(time * (1.5 + h * 1.5) + h * 50.0);
          brightness *= twinkle * stage1;

          float boost = constellationBoost(dir, constellationStars);
          brightness *= boost;

          vec3 sColor = starSpectralColor(starHash(cell * 3.1 + 0.7));
          color += sColor * brightness * 1.3;
        }
      }

      // === DIM STARS (Stage 2: nF 0.50+) ===
      float stage2 = smoothstep(0.50, 0.70, nightFactor);
      if (stage2 > 0.0) {
        for (int layer = 0; layer < 3; layer++) {
          float scale = 90.0 + float(layer) * 50.0;
          vec2 cell = floor(starUV * scale);
          vec2 cellUV = fract(starUV * scale);
          float h = starHash(cell + float(layer) * 200.0);

          float threshold = 0.93 - float(layer) * 0.02;
          threshold += lightPollution * 0.04;

          if (h > threshold) {
            vec2 starPos = vec2(starHash(cell * 1.3 + 0.5), starHash(cell * 2.7 + 0.8));
            float dist = length(cellUV - starPos);
            float starSize = 0.005 + (1.0 - threshold) * 0.008;
            float brightness = smoothstep(starSize, 0.0, dist);

            float twinkle = 0.6 + 0.4 * sin(time * (4.0 + h * 6.0) + h * 100.0);
            brightness *= twinkle * stage2 * dimming;

            float boost = constellationBoost(dir, constellationStars);
            brightness *= boost;

            vec3 sColor = starSpectralColor(starHash(cell * 3.1 + float(layer) * 50.0));
            color += sColor * brightness * (0.7 - float(layer) * 0.15);
          }
        }
      }

      color *= smoothstep(-0.02, 0.12, altitude);

      return color;
    }
  `;
}
