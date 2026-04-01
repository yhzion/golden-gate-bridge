import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const MAX_FLARES = 8;

const LensFlareShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    flarePositions: { value: new Array(MAX_FLARES).fill(null).map(() => new THREE.Vector2()) },
    flareColors: { value: new Array(MAX_FLARES).fill(null).map(() => new THREE.Vector3(1, 0.9, 0.7)) },
    flareIntensities: { value: new Float32Array(MAX_FLARES) },
    numFlares: { value: 0 },
    aspectRatio: { value: 1.0 },
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
    uniform vec2 flarePositions[${MAX_FLARES}];
    uniform vec3 flareColors[${MAX_FLARES}];
    uniform float flareIntensities[${MAX_FLARES}];
    uniform int numFlares;
    uniform float aspectRatio;

    varying vec2 vUv;

    float starFlare(vec2 uv, vec2 center, float size) {
      vec2 d = (uv - center) * vec2(aspectRatio, 1.0);
      float dist = length(d);
      float core = exp(-dist * dist / (size * size * 0.002));
      float angle = atan(d.y, d.x);
      float star = pow(abs(cos(angle * 2.0)), 40.0) * exp(-dist / (size * 0.15));
      float streak = exp(-abs(d.y) / (size * 0.003)) * exp(-abs(d.x) / (size * 0.08));
      return core * 0.6 + star * 0.25 + streak * 0.15;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 flare = vec3(0.0);

      for (int i = 0; i < ${MAX_FLARES}; i++) {
        if (i >= numFlares) break;
        if (flareIntensities[i] < 0.01) continue;
        float f = starFlare(vUv, flarePositions[i], 1.0);
        flare += flareColors[i] * f * flareIntensities[i];
      }

      gl_FragColor = vec4(color.rgb + flare, color.a);
    }
  `,
};

export class LensFlarePass extends Pass {
  private fsQuad: FullScreenQuad;
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(LensFlareShader.uniforms),
      vertexShader: LensFlareShader.vertexShader,
      fragmentShader: LensFlareShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setFlares(
    positions: THREE.Vector2[],
    colors: THREE.Color[],
    intensities: number[],
  ): void {
    const u = this.material.uniforms;
    const count = Math.min(positions.length, MAX_FLARES);
    u['numFlares'].value = count;
    for (let i = 0; i < count; i++) {
      (u['flarePositions'].value as THREE.Vector2[])[i].copy(positions[i]);
      const c = colors[i];
      (u['flareColors'].value as THREE.Vector3[])[i].set(c.r, c.g, c.b);
      (u['flareIntensities'].value as Float32Array)[i] = intensities[i];
    }
    u['aspectRatio'].value = innerWidth / innerHeight;
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
