import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
      // Subtle contrast only — no color shift
      c.rgb = (c.rgb - 0.5) * 1.02 + 0.5;
      // Vignette
      vec2 uv = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(uv * 0.4, uv * 0.4);
      c.rgb *= smoothstep(0.0, 1.0, vig);
      gl_FragColor = c;
    }
  `,
};

export class PostFXPipeline {
  composer: EffectComposer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.08, 0.3, 0.95, // Minimal bloom: strength, radius, threshold
    );
    this.composer.addPass(bloom);
    this.composer.addPass(new ShaderPass(ColorGradeShader));
    this.composer.addPass(new OutputPass());
  }

  render() {
    this.composer.render();
  }

  resize() {
    this.composer.setSize(innerWidth, innerHeight);
  }
}
