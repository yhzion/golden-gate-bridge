import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VolumetricFogPass } from './VolumetricFogPass';
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
  volumetricFog: VolumetricFogPass;
  godRays: GodRaysPass;
  lensFlare: LensFlarePass;

  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private lightingManager: LightingManager | null;
  private renderPass: RenderPass;
  private depthRenderTarget: THREE.WebGLRenderTarget;

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

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    lightingManager: LightingManager | null = null,
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.lightingManager = lightingManager;

    // Separate depth target for volumetric fog (only rendered when fog is active)
    const depthTex = new THREE.DepthTexture(innerWidth, innerHeight);
    depthTex.format = THREE.DepthFormat;
    depthTex.type = THREE.UnsignedIntType;
    this.depthRenderTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
      depthTexture: depthTex,
      depthBuffer: true,
    });

    this.composer = new EffectComposer(renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.volumetricFog = new VolumetricFogPass(renderer, camera);
    this.volumetricFog.setDepthTexture(depthTex);
    this.volumetricFog.enabled = false;
    this.composer.addPass(this.volumetricFog);

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

    const nightFactor = 1 - THREE.MathUtils.clamp(timeState.sunIntensity / 0.25, 0, 1);
    const tier = this.lightingManager.qualityTier.getCurrentTier();

    const fogActive = weatherState.fogMultiplier > 2;
    if (nightFactor > 0.7 && fogActive) {
      this.bloom.threshold = 0.2;
      this.bloom.strength = 1.2;
    } else if (nightFactor > 0.5) {
      this.bloom.threshold = 0.4;
      this.bloom.strength = 0.8;
    } else if (nightFactor > 0.2) {
      this.bloom.threshold = 0.6;
      this.bloom.strength = 0.5;
    } else {
      this.bloom.threshold = 0.9;
      this.bloom.strength = 0.3;
    }

    // Cache light queries once per frame (avoids repeated clone/spread allocations)
    const needsLights = nightFactor > 0.2 && tier !== 'low';
    if (needsLights) {
      this._cachedPositions = this.lightingManager.getLightPositions();
      this._cachedColors = this.lightingManager.getLightColors();
      this._cachedIntensities = this.lightingManager.getLightIntensities();
    }

    const volEnabled = this.volumetricFog.isVolumetricEnabled()
      && nightFactor > 0.2
      && tier !== 'low';
    this.volumetricFog.enabled = volEnabled;

    if (volEnabled) {
      this.volumetricFog.setLights(this._cachedPositions, this._cachedColors, this._cachedIntensities);

      const baseDensity = timeState.fogDensity * weatherState.fogMultiplier;
      const volDensity = baseDensity * (nightFactor > 0.5 ? 3.0 : 1.0);
      this.volumetricFog.setFogParams(volDensity, timeState.fogColor, 0.7);
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
      } else if (nightFactor > 0.5 && weatherState.fogMultiplier > 2) {
        if (this._cachedPositions.length > 0) {
          this.godRays.setLightWorldPos(this._cachedPositions[0], this.camera);
          this.godRays.setIntensity(0.8);
        }
      } else {
        this.godRays.setIntensity(0);
      }
    }

    const flareEnabled = nightFactor > 0.3 && tier !== 'low';
    this.lensFlare.enabled = flareEnabled;

    if (flareEnabled) {
      this._screenPositions.length = 0;
      this._screenColors.length = 0;
      this._screenIntensities.length = 0;

      for (let i = 0; i < this._cachedPositions.length; i++) {
        this._ndc.copy(this._cachedPositions[i]).project(this.camera);
        if (this._ndc.z > 1 || Math.abs(this._ndc.x) > 1.2 || Math.abs(this._ndc.y) > 1.2) continue;
        this._screenPos.set(this._ndc.x * 0.5 + 0.5, this._ndc.y * 0.5 + 0.5);
        this._screenPositions.push(this._screenPos.clone());
        this._screenColors.push(this._cachedColors[i]);
        this._screenIntensities.push(this._cachedIntensities[i] * nightFactor * 0.15);
      }
      this.lensFlare.setFlares(this._screenPositions, this._screenColors, this._screenIntensities);
    }
  }

  render(): void {
    if (this.volumetricFog.enabled) {
      const currentRT = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.depthRenderTarget);
      this.renderer.render(this.renderPass.scene, this.camera);
      this.renderer.setRenderTarget(currentRT);
    }
    this.composer.render();
  }

  resize(): void {
    const w = innerWidth;
    const h = innerHeight;
    this.composer.setSize(w, h);
    this.depthRenderTarget.setSize(w, h);
  }

  dispose(): void {
    this.depthRenderTarget.depthTexture?.dispose();
    this.depthRenderTarget.dispose();
    this.volumetricFog.dispose();
    this.godRays.dispose();
    this.lensFlare.dispose();
  }
}
