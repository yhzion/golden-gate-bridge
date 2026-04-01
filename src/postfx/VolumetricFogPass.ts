import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const MAX_LIGHTS = 8;

const VolumetricFogShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    cameraNear: { value: 0.5 },
    cameraFar: { value: 80000 },
    cameraPosition: { value: new THREE.Vector3() },
    inverseProjection: { value: new THREE.Matrix4() },
    inverseView: { value: new THREE.Matrix4() },
    lightPositions: { value: new Array(MAX_LIGHTS).fill(null).map(() => new THREE.Vector3()) },
    lightColors: { value: new Array(MAX_LIGHTS).fill(null).map(() => new THREE.Vector3(1, 0.8, 0.5)) },
    lightIntensities: { value: new Float32Array(MAX_LIGHTS) },
    numActiveLights: { value: 0 },
    fogDensity: { value: 0.0003 },
    fogColor: { value: new THREE.Vector3(0.5, 0.5, 0.6) },
    anisotropy: { value: 0.7 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 cameraPosition;
    uniform mat4 inverseProjection;
    uniform mat4 inverseView;
    uniform vec3 lightPositions[${MAX_LIGHTS}];
    uniform vec3 lightColors[${MAX_LIGHTS}];
    uniform float lightIntensities[${MAX_LIGHTS}];
    uniform int numActiveLights;
    uniform float fogDensity;
    uniform vec3 fogColor;
    uniform float anisotropy;
    uniform float time;

    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float linearizeDepth(float d) {
      return cameraNear * cameraFar / (cameraFar - d * (cameraFar - cameraNear));
    }

    float hgPhase(float cosTheta, float g) {
      float g2 = g * g;
      return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
    }

    vec3 worldPosFromDepth(vec2 uv, float depth) {
      vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      vec4 viewPos = inverseProjection * clipPos;
      viewPos /= viewPos.w;
      vec4 worldPos = inverseView * viewPos;
      return worldPos.xyz;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float depth = texture2D(tDepth, vUv).r;

      if (depth >= 1.0) {
        gl_FragColor = color;
        return;
      }

      vec3 worldPos = worldPosFromDepth(vUv, depth);
      vec3 rayDir = normalize(worldPos - cameraPosition);
      float totalDist = length(worldPos - cameraPosition);

      float dither = hash(vUv * vec2(1920.0, 1080.0) + time * 100.0);

      const int STEPS = 16;
      float stepSize = totalDist / float(STEPS);
      vec3 scattered = vec3(0.0);
      float transmittance = 1.0;

      for (int i = 0; i < STEPS; i++) {
        float t = (float(i) + dither) * stepSize;
        vec3 samplePos = cameraPosition + rayDir * t;

        float extinction = fogDensity * stepSize;
        transmittance *= exp(-extinction);

        for (int j = 0; j < ${MAX_LIGHTS}; j++) {
          if (j >= numActiveLights) break;
          vec3 toLight = lightPositions[j] - samplePos;
          float lightDist = length(toLight);
          vec3 lightDir = toLight / lightDist;

          float attenuation = lightIntensities[j] / (1.0 + lightDist * lightDist * 0.001);
          float cosTheta = dot(rayDir, lightDir);
          float phase = hgPhase(cosTheta, anisotropy);

          scattered += lightColors[j] * attenuation * phase * fogDensity * stepSize * transmittance;
        }
      }

      vec3 result = color.rgb * transmittance + scattered + fogColor * (1.0 - transmittance) * 0.1;
      gl_FragColor = vec4(result, color.a);
    }
  `,
};

export class VolumetricFogPass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;
  private depthTexture: THREE.DepthTexture | null = null;
  private _enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, private camera: THREE.Camera) {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(VolumetricFogShader.uniforms),
      vertexShader: VolumetricFogShader.vertexShader,
      fragmentShader: VolumetricFogShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setDepthTexture(depthTexture: THREE.DepthTexture): void {
    this.depthTexture = depthTexture;
    this.material.uniforms['tDepth'].value = depthTexture;
  }

  setLights(positions: THREE.Vector3[], colors: THREE.Color[], intensities: number[]): void {
    const u = this.material.uniforms;
    const count = Math.min(positions.length, MAX_LIGHTS);
    u['numActiveLights'].value = count;
    for (let i = 0; i < count; i++) {
      (u['lightPositions'].value as THREE.Vector3[])[i].copy(positions[i]);
      const c = colors[i];
      (u['lightColors'].value as THREE.Vector3[])[i].set(c.r, c.g, c.b);
      (u['lightIntensities'].value as Float32Array)[i] = intensities[i];
    }
  }

  setFogParams(density: number, color: THREE.Color, anisotropy: number): void {
    this.material.uniforms['fogDensity'].value = density;
    (this.material.uniforms['fogColor'].value as THREE.Vector3).set(color.r, color.g, color.b);
    this.material.uniforms['anisotropy'].value = anisotropy;
  }

  setVolumetricEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.enabled = enabled;
  }

  isVolumetricEnabled(): boolean {
    return this._enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const u = this.material.uniforms;
    u['tDiffuse'].value = readBuffer.texture;
    u['cameraNear'].value = (this.camera as THREE.PerspectiveCamera).near;
    u['cameraFar'].value = (this.camera as THREE.PerspectiveCamera).far;
    (u['cameraPosition'].value as THREE.Vector3).copy(this.camera.position);
    (u['inverseProjection'].value as THREE.Matrix4).copy(this.camera.projectionMatrixInverse);
    (u['inverseView'].value as THREE.Matrix4).copy(this.camera.matrixWorld);
    u['time'].value = performance.now() * 0.001;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }
    this.fsQuad.render(renderer);
  }

  dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
