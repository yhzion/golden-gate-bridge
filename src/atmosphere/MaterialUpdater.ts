import * as THREE from 'three';
import type { TimeState } from './TimeOfDay';
import type { WeatherState } from './WeatherSystem';
import type { Water } from 'three/examples/jsm/objects/Water.js';
import type { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { SceneManager } from '@/engine/SceneManager';

interface CachedMaterial {
  mat: THREE.MeshStandardMaterial;
  baseEmissiveIntensity: number;
  isLight: boolean;
  isAviation: boolean;
}

export class MaterialUpdater {
  private scene: THREE.Scene;
  private sm: SceneManager;
  private water: Water;
  private sky: Sky;
  private sunLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight | null = null;
  private cached: CachedMaterial[] = [];
  private cacheBuilt = false;

  constructor(
    sm: SceneManager,
    water: Water,
    sky: Sky,
    sunLight: THREE.DirectionalLight,
    hemisphereLight: THREE.HemisphereLight,
  ) {
    this.sm = sm;
    this.scene = sm.scene;
    this.water = water;
    this.sky = sky;
    this.sunLight = sunLight;
    this.hemisphereLight = hemisphereLight;

    // Disable HDR environment map — use direct lighting only
    this.scene.environment = null;

    sm.scene.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        this.ambientLight = obj;
      }
    });
  }

  private buildCache() {
    if (this.cacheBuilt) return;
    this.cacheBuilt = true;

    const seen = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (!mat || Array.isArray(mat) || seen.has(mat)) return;
      seen.add(mat);

      // Detect emissive materials (lanterns, aviation lights, headlights)
      const hasEmissive = mat.emissiveIntensity > 0 && mat.emissive && mat.emissive.r + mat.emissive.g + mat.emissive.b > 0;
      const isAviation = hasEmissive && mat.emissive.r > 0.8 && mat.emissive.g < 0.2; // red
      const isLight = hasEmissive && !isAviation; // amber lanterns, headlights

      // Zero out envMap — no HDR environment reflections
      mat.envMapIntensity = 0;

      this.cached.push({
        mat,
        baseEmissiveIntensity: mat.emissiveIntensity,
        isLight,
        isAviation,
      });
    });
  }

  update(time: TimeState, weather: WeatherState, dt: number) {
    this.buildCache();

    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - time.sunElevation);
    const theta = THREE.MathUtils.degToRad(time.sunAzimuth);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    // Sky uniforms (visual sky dome only, not used for lighting)
    const skyU = this.sky.material.uniforms;
    skyU['sunPosition'].value.copy(sunDir);
    skyU['turbidity'].value = time.turbidity;
    skyU['rayleigh'].value = time.rayleigh;

    // Sun light
    this.sunLight.color.copy(time.sunColor);
    this.sunLight.intensity = time.sunIntensity;
    this.sunLight.position.copy(sunDir).multiplyScalar(600);

    // Ambient
    if (this.ambientLight) {
      this.ambientLight.intensity = time.ambientIntensity;
    }

    // Hemisphere
    this.hemisphereLight.intensity = time.hemisphereIntensity;

    // Water
    this.water.material.uniforms['sunDirection'].value.copy(sunDir).normalize();

    // Fog
    const fogDensity = time.fogDensity * weather.fogMultiplier;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = fogDensity;
      this.scene.fog.color.copy(time.fogColor);
    }

    // Exposure
    this.sm.renderer.toneMappingExposure = time.exposure;

    // Night factor: 0 = full day, 1 = full night
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.25, 0, 1);

    // Hide Sky dome at night — celestial system provides the night sky
    this.sky.visible = nightFactor < 0.5;

    // Update cached materials
    for (const entry of this.cached) {
      if (entry.isLight) {
        // Off during day, base intensity at night (clamped to LDR)
        entry.mat.emissiveIntensity = nightFactor * Math.min(entry.baseEmissiveIntensity, 0.9);
      }

      // Aviation beacons are now controlled by SafetyLights strobe system
    }
  }
}
