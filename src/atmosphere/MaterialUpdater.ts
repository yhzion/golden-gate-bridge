import * as THREE from 'three';
import type { TimeState } from './TimeOfDay';
import type { WeatherState } from './WeatherSystem';
import type { Water } from 'three/examples/jsm/objects/Water.js';
import type { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { SceneManager } from '@/engine/SceneManager';

interface CachedMaterial {
  mat: THREE.MeshStandardMaterial;
  baseEmissiveIntensity: number;
  /** Ratio relative to timeState.envMapIntensity (e.g. bridge=1.0, cable=0.75) */
  envMapRatio: number;
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
  private envUpdateTimer = 0;

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

      // Compute envMap ratio from original baseEnvMapIntensity
      // Bridge steel was 0.4, cable was 0.3 → ratios 1.0 and 0.75
      // Materials without envMap have intensity 0 or 1 (default) — ratio stays as-is
      const baseEnv = mat.envMapIntensity ?? 1;
      const envMapRatio = baseEnv > 0 ? baseEnv / 0.4 : 0;

      this.cached.push({
        mat,
        baseEmissiveIntensity: mat.emissiveIntensity,
        envMapRatio,
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

    // Sky uniforms
    const skyU = this.sky.material.uniforms;
    skyU['sunPosition'].value.copy(sunDir);
    skyU['turbidity'].value = time.turbidity;
    skyU['rayleigh'].value = time.rayleigh;

    // Regenerate environment map every ~2 seconds so reflections match current sky
    this.envUpdateTimer += dt;
    if (this.envUpdateTimer > 2.0) {
      this.envUpdateTimer = 0;
      if (this.sm.envTarget) this.sm.envTarget.dispose();
      this.sm.sceneEnv.add(this.sky);
      this.sm.envTarget = this.sm.pmremGen.fromScene(this.sm.sceneEnv);
      this.scene.add(this.sky);
      this.scene.environment = this.sm.envTarget.texture;
    }

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
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.8, 0, 1);

    // Update cached materials
    for (const entry of this.cached) {
      // EnvMap intensity from TimeOfDay keyframes (replaces old nightFactor-based logic)
      entry.mat.envMapIntensity = time.envMapIntensity * entry.envMapRatio;

      if (entry.isLight) {
        // Street lanterns: amber glow at night (like real GGB HPS 250W amber lamps)
        entry.mat.emissiveIntensity = THREE.MathUtils.lerp(
          entry.baseEmissiveIntensity * 0.1,
          entry.baseEmissiveIntensity * 2.5,
          nightFactor,
        );
      }

      if (entry.isAviation) {
        // Aviation red beacons: brighter at night
        entry.mat.emissiveIntensity = THREE.MathUtils.lerp(
          entry.baseEmissiveIntensity * 0.5,
          entry.baseEmissiveIntensity * 3.0,
          nightFactor,
        );
      }
    }
  }
}
