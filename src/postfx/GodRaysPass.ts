import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    lightScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    exposure: { value: 0.3 },
    decay: { value: 0.96 },
    density: { value: 0.8 },
    weight: { value: 0.4 },
    samples: { value: 6 },
    lightVisible: { value: 0 },
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
    uniform vec2 lightScreenPos;
    uniform float exposure;
    uniform float decay;
    uniform float density;
    uniform float weight;
    uniform int samples;
    uniform float lightVisible;

    varying vec2 vUv;

    void main() {
      vec4 origColor = texture2D(tDiffuse, vUv);

      if (lightVisible < 0.01) {
        gl_FragColor = origColor;
        return;
      }

      vec2 deltaUV = (vUv - lightScreenPos) * density / float(samples);
      vec2 uv = vUv;
      vec3 godRay = vec3(0.0);
      float illuminationDecay = 1.0;

      for (int i = 0; i < 6; i++) {
        if (i >= samples) break;
        uv -= deltaUV;
        vec3 sampleColor = texture2D(tDiffuse, uv).rgb;
        float brightness = dot(sampleColor, vec3(0.299, 0.587, 0.114));
        float mask = smoothstep(0.6, 1.0, brightness);
        sampleColor *= mask;
        sampleColor *= illuminationDecay * weight;
        godRay += sampleColor;
        illuminationDecay *= decay;
      }

      vec3 result = origColor.rgb + godRay * exposure * lightVisible;
      gl_FragColor = vec4(result, origColor.a);
    }
  `,
};

export class GodRaysPass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;
  private _enabled = true;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(GodRaysShader.uniforms),
      vertexShader: GodRaysShader.vertexShader,
      fragmentShader: GodRaysShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setLightWorldPos(worldPos: THREE.Vector3, camera: THREE.Camera): void {
    const ndc = worldPos.clone().project(camera);
    if (ndc.z > 1) {
      this.material.uniforms['lightVisible'].value = 0;
      return;
    }
    this.material.uniforms['lightScreenPos'].value.set(
      ndc.x * 0.5 + 0.5,
      ndc.y * 0.5 + 0.5,
    );
  }

  setIntensity(intensity: number): void {
    this.material.uniforms['lightVisible'].value = THREE.MathUtils.clamp(intensity, 0, 1);
  }

  setGodRaysEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.enabled = enabled;
  }

  isGodRaysEnabled(): boolean {
    return this._enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.material.uniforms['tDiffuse'].value = readBuffer.texture;

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
