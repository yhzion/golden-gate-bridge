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
  private _sunDir = new THREE.Vector3();
  private _waterColor = new THREE.Color();
  private _lastSunElevation = -999;
  private _lastSunAzimuth = -999;
  private _waterColorBase = new THREE.Color(0x0a3050);
  private _waterColorTarget = new THREE.Color(0x1a4a6a);

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

    // Sun position (reuse scratch vector)
    const phi = THREE.MathUtils.degToRad(90 - time.sunElevation);
    const theta = THREE.MathUtils.degToRad(time.sunAzimuth);
    const sunDir = this._sunDir.setFromSphericalCoords(1, phi, theta);

    // Only re-render shadow map when sun position changes meaningfully
    const elevDelta = Math.abs(time.sunElevation - this._lastSunElevation);
    const azDelta = Math.abs(time.sunAzimuth - this._lastSunAzimuth);
    if (elevDelta > 0.5 || azDelta > 0.5) {
      this._lastSunElevation = time.sunElevation;
      this._lastSunAzimuth = time.sunAzimuth;
      this.sm.renderer.shadowMap.needsUpdate = true;
    }

    // Sky uniforms (visual sky dome only, not used for lighting)
    const skyU = this.sky.material.uniforms;
    skyU['sunPosition'].value.copy(sunDir);
    skyU['turbidity'].value = time.turbidity;
    skyU['rayleigh'].value = time.rayleigh;

    // Sun light
    this.sunLight.color.copy(time.sunColor);
    this.sunLight.intensity = time.sunIntensity;
    this.sunLight.position.copy(sunDir).multiplyScalar(600);

    // Ambient — ensure minimum city-level ambient even at full night
    if (this.ambientLight) {
      this.ambientLight.intensity = Math.max(time.ambientIntensity, 0.25);
    }

    // Hemisphere
    this.hemisphereLight.intensity = time.hemisphereIntensity;

    // Exposure
    this.sm.renderer.toneMappingExposure = time.exposure;

    // Night factor: 0 = full day, 1 = full night
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 1.0, 0, 1);

    // Water — boost reflectivity at night for visible waves
    this.water.material.uniforms['sunDirection'].value.copy(sunDir).normalize();
    const waterDistortion = THREE.MathUtils.lerp(4.5, 6.0, nightFactor);
    this.water.material.uniforms['distortionScale'].value = waterDistortion;
    this._waterColor.copy(this._waterColorBase).lerp(this._waterColorTarget, nightFactor * 0.5);
    this.water.material.uniforms['waterColor'].value.copy(this._waterColor);

    // Hide Sky dome at night — celestial system provides the night sky
    this.sky.visible = nightFactor < 0.5;

    // Update cached materials
    for (const entry of this.cached) {
      if (entry.isLight) {
        // Off during day, boosted intensity at night
        entry.mat.emissiveIntensity = nightFactor * Math.min(entry.baseEmissiveIntensity * 2.0, 2.0);
      }

      // Allow some envMap contribution at night for ambient visibility
      entry.mat.envMapIntensity = time.envMapIntensity;

      // Aviation beacons are now controlled by SafetyLights strobe system
    }
  }
}
