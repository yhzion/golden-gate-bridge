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
