import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GodRaysPass } from './GodRaysPass';
import { LensFlarePass } from './LensFlarePass';
import type { LightingManager } from '@/lighting/LightingManager';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { WeatherState } from '@/atmosphere/WeatherSystem';

const ColorGradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = (c.rgb - 0.5) * 1.02 + 0.5;
      vec2 uv = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(uv * 0.4, uv * 0.4);
      c.rgb *= smoothstep(0.0, 1.0, vig);
      gl_FragColor = c;
    }
  `,
};

export class PostFXPipeline {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  godRays: GodRaysPass;
  lensFlare: LensFlarePass;

  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private lightingManager: LightingManager | null;
  private renderPass: RenderPass;

  // Scratch objects to avoid per-frame allocations
  private _sunDir = new THREE.Vector3();
  private _sunWorldPos = new THREE.Vector3();
  private _ndc = new THREE.Vector3();
  private _screenPos = new THREE.Vector2();
  private _cachedPositions: THREE.Vector3[] = [];
  private _cachedColors: THREE.Color[] = [];
  private _cachedIntensities: number[] = [];
  private _screenPositions: THREE.Vector2[] = [];
  private _screenColors: THREE.Color[] = [];
  private _screenIntensities: number[] = [];
  // Pre-allocated pool for screen positions (max 8 lights)
  private _screenPosPool: THREE.Vector2[] = Array.from({ length: 8 }, () => new THREE.Vector2());

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    lightingManager: LightingManager | null = null,
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.lightingManager = lightingManager;

    this.composer = new EffectComposer(renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.godRays = new GodRaysPass();
    this.godRays.enabled = false;
    this.composer.addPass(this.godRays);

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.08, 0.3, 0.95,
    );
    this.composer.addPass(this.bloom);

    this.lensFlare = new LensFlarePass();
    this.lensFlare.enabled = false;
    this.composer.addPass(this.lensFlare);

    this.composer.addPass(new ShaderPass(ColorGradeShader));
    this.composer.addPass(new OutputPass());
  }

  updateLighting(timeState: TimeState, weatherState: WeatherState): void {
    if (!this.lightingManager) return;

    const nightFactor = 1 - THREE.MathUtils.clamp(timeState.sunIntensity / 1.0, 0, 1);
    const tier = this.lightingManager.qualityTier.getCurrentTier();

    if (nightFactor > 0.5) {
      this.bloom.enabled = true;
      this.bloom.threshold = 0.85;
      this.bloom.strength = 0.12;
    } else if (nightFactor > 0.2) {
      this.bloom.enabled = true;
      this.bloom.threshold = 0.9;
      this.bloom.strength = 0.06;
    } else {
      this.bloom.enabled = false;
    }

    // Cache light queries once per frame (avoids repeated clone/spread allocations)
    const needsLights = nightFactor > 0.2 && tier !== 'low';
    if (needsLights) {
      this._cachedPositions = this.lightingManager.getLightPositions();
      this._cachedColors = this.lightingManager.getLightColors();
      this._cachedIntensities = this.lightingManager.getLightIntensities();
    }

    const godRayEnabled = this.godRays.isGodRaysEnabled()
      && tier === 'high'
      && (nightFactor > 0.5 || timeState.sunElevation < 15);
    this.godRays.enabled = godRayEnabled;

    if (godRayEnabled) {
      if (timeState.sunElevation > 0 && nightFactor < 0.5) {
        this._sunDir.setFromSphericalCoords(
          1,
          THREE.MathUtils.degToRad(90 - timeState.sunElevation),
          THREE.MathUtils.degToRad(timeState.sunAzimuth),
        );
        this._sunWorldPos.copy(this._sunDir).multiplyScalar(5000).add(this.camera.position);
        this.godRays.setLightWorldPos(this._sunWorldPos, this.camera);
        this.godRays.setIntensity(0.3);
      } else if (nightFactor > 0.5) {
        if (this._cachedPositions.length > 0) {
          this.godRays.setLightWorldPos(this._cachedPositions[0], this.camera);
          this.godRays.setIntensity(0.15);
        }
      } else {
        this.godRays.setIntensity(0);
      }
    }

    const flareEnabled = nightFactor > 0.3 && tier !== 'low';
    this.lensFlare.enabled = flareEnabled;

    if (flareEnabled) {
      let flareCount = 0;

      for (let i = 0; i < this._cachedPositions.length; i++) {
        this._ndc.copy(this._cachedPositions[i]).project(this.camera);
        if (this._ndc.z > 1 || Math.abs(this._ndc.x) > 1.2 || Math.abs(this._ndc.y) > 1.2) continue;
        this._screenPosPool[flareCount].set(this._ndc.x * 0.5 + 0.5, this._ndc.y * 0.5 + 0.5);
        this._screenPositions[flareCount] = this._screenPosPool[flareCount];
        this._screenColors[flareCount] = this._cachedColors[i];
        this._screenIntensities[flareCount] = this._cachedIntensities[i] * nightFactor * 0.03;
        flareCount++;
      }
      this._screenPositions.length = flareCount;
      this._screenColors.length = flareCount;
      this._screenIntensities.length = flareCount;
      this.lensFlare.setFlares(this._screenPositions, this._screenColors, this._screenIntensities);
    }
  }

  render(): void {
    this.composer.render();
  }

  resize(): void {
    const w = innerWidth;
    const h = innerHeight;
    this.composer.setSize(w, h);
  }

  dispose(): void {
    this.godRays.dispose();
    this.lensFlare.dispose();
  }
}
