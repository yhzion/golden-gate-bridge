import * as THREE from 'three';
import { seededRandom } from '@/utils/noise';

/**
 * Procedural night sky sphere with:
 * - ~2000 stars (winter constellations emphasis)
 * - Milky Way band
 * - Subtle aurora borealis (rare at SF latitude but artistic license)
 * Fades in/out based on nightFactor.
 */
export class NightSky {
  mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    const geo = new THREE.SphereGeometry(40000, 32, 24);
    // Flip normals inward so we see the inside
    geo.scale(-1, 1, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uNightFactor: { value: 0.0 },
        uTime: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vWorldPos = normalize(position);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uNightFactor;
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        // Hash functions for procedural stars
        float hash(vec2 p) {
          float h = dot(p, vec2(127.1, 311.7));
          return fract(sin(h) * 43758.5453);
        }

        float hash3(vec3 p) {
          float h = dot(p, vec3(127.1, 311.7, 74.7));
          return fract(sin(h) * 43758.5453);
        }

        // Smooth noise for milky way
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.1;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          if (uNightFactor < 0.01) {
            discard;
          }

          vec3 dir = normalize(vWorldPos);
          float altitude = dir.y; // -1 to 1

          // Only render above horizon
          if (altitude < -0.05) {
            discard;
          }

          vec3 color = vec3(0.0);

          // === STARS ===
          // Project direction onto a grid for star placement
          vec2 starUV = vec2(atan(dir.z, dir.x) * 3.0, asin(clamp(altitude, -1.0, 1.0)) * 6.0);

          // Multiple star layers for different sizes
          for (int layer = 0; layer < 3; layer++) {
            float scale = 80.0 + float(layer) * 40.0;
            vec2 cell = floor(starUV * scale);
            vec2 cellUV = fract(starUV * scale);

            float starHash = hash(cell + float(layer) * 100.0);

            // Only some cells have stars
            float threshold = 0.92 - float(layer) * 0.03; // fewer big stars, more small
            if (starHash > threshold) {
              // Star position within cell
              vec2 starPos = vec2(hash(cell * 1.3 + 0.5), hash(cell * 2.7 + 0.8));
              float dist = length(cellUV - starPos);

              float starSize = (1.0 - threshold) * 0.015 + 0.002;
              float brightness = smoothstep(starSize, 0.0, dist);

              // Twinkle
              float twinkle = 0.7 + 0.3 * sin(uTime * (2.0 + starHash * 3.0) + starHash * 100.0);
              brightness *= twinkle;

              // Star color: mostly white, some blue, some orange
              vec3 starColor = vec3(1.0);
              if (starHash > 0.97) {
                starColor = vec3(0.7, 0.8, 1.0); // blue-white (Rigel, Sirius)
              } else if (starHash > 0.96) {
                starColor = vec3(1.0, 0.85, 0.6); // orange (Betelgeuse)
              } else if (starHash > 0.95) {
                starColor = vec3(1.0, 0.95, 0.8); // warm white (Aldebaran)
              }

              color += starColor * brightness * (1.0 - float(layer) * 0.3);
            }
          }

          // === WINTER CONSTELLATIONS (brighter star clusters) ===
          // Orion belt area (roughly south, mid-altitude in winter)
          float orionAngle = atan(dir.z, dir.x);
          float orionAlt = altitude;
          // Place Orion in south sky around altitude 0.3-0.5
          float orionDist = length(vec2(orionAngle - 0.5, orionAlt - 0.4));
          if (orionDist < 0.3) {
            // Brighter stars in this region
            vec2 oCell = floor(starUV * 200.0);
            float oHash = hash(oCell + 999.0);
            if (oHash > 0.985) {
              vec2 oPos = vec2(hash(oCell * 1.1 + 0.2), hash(oCell * 2.3 + 0.6));
              float oDist = length(fract(starUV * 200.0) - oPos);
              float oBright = smoothstep(0.008, 0.0, oDist) * 1.5;
              color += vec3(0.9, 0.95, 1.0) * oBright;
            }
          }

          // === MILKY WAY ===
          // Band across the sky (roughly north-south at SF latitude)
          float mwAngle = atan(dir.z, dir.x);
          float mwDist = abs(sin(mwAngle * 0.5 + 0.3) * 0.8 - altitude * 0.3);
          float mwBand = smoothstep(0.35, 0.0, mwDist);

          // Add noise to milky way
          vec2 mwUV = vec2(mwAngle * 2.0, altitude * 4.0);
          float mwNoise = fbm(mwUV * 3.0) * fbm(mwUV * 7.0 + 5.0);
          float mwBright = mwBand * mwNoise * 2.5;

          // Milky way color: soft blue-white with warm core
          vec3 mwColor = mix(
            vec3(0.15, 0.18, 0.25), // cool outer
            vec3(0.25, 0.22, 0.18), // warm core
            fbm(mwUV * 1.5 + 10.0)
          );
          color += mwColor * mwBright;

          // Add scattered faint stars in milky way band
          float mwStars = hash(floor(starUV * 300.0));
          if (mwStars > 0.95 && mwBand > 0.3) {
            vec2 msPos = vec2(hash(floor(starUV * 300.0) * 1.5), hash(floor(starUV * 300.0) * 2.1));
            float msDist = length(fract(starUV * 300.0) - msPos);
            color += vec3(0.8, 0.85, 1.0) * smoothstep(0.004, 0.0, msDist) * mwBand;
          }

          // === AURORA BOREALIS ===
          // Subtle green/purple curtain in the north sky
          // SF is too far south for real aurora, but artistic license for visual impact
          float auroraLat = smoothstep(0.15, 0.6, altitude) * smoothstep(0.9, 0.6, altitude);
          float auroraNorth = smoothstep(-0.5, 0.5, -dir.z); // north-facing

          float auroraWave = sin(dir.x * 4.0 + uTime * 0.15) * 0.5 + 0.5;
          auroraWave *= sin(dir.x * 7.0 - uTime * 0.08 + 1.5) * 0.5 + 0.5;

          float auroraIntensity = auroraLat * auroraNorth * auroraWave;
          auroraIntensity *= fbm(vec2(dir.x * 3.0 + uTime * 0.05, altitude * 5.0)) * 1.5;
          auroraIntensity = max(0.0, auroraIntensity) * 0.25; // keep subtle

          vec3 auroraColor = mix(
            vec3(0.1, 0.8, 0.3),  // green
            vec3(0.4, 0.1, 0.6),  // purple
            sin(dir.x * 3.0 + uTime * 0.1) * 0.5 + 0.5
          );
          color += auroraColor * auroraIntensity;

          // Fade with night factor and horizon
          float horizonFade = smoothstep(-0.05, 0.15, altitude);
          color *= uNightFactor * horizonFade;

          // Very subtle dark blue base for night sky (not pure black)
          vec3 nightBase = vec3(0.01, 0.015, 0.03) * uNightFactor * horizonFade;
          color += nightBase;

          gl_FragColor = vec4(color, uNightFactor * horizonFade);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = -1; // Render before everything else
  }

  update(nightFactor: number, elapsed: number) {
    this.material.uniforms.uNightFactor.value = nightFactor;
    this.material.uniforms.uTime.value = elapsed;
    this.mesh.visible = nightFactor > 0.01;
  }
}
