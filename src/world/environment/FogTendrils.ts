import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';

const PARTICLE_COUNT = 3000;
const X_MIN = -50;
const X_MAX = 50;
const Y_MIN = 30;
const Y_MAX = 120;
const Z_MIN = -400;
const Z_MAX = 1700;

/**
 * E2a — FogTendrils
 * Advection fog particles flowing through the cable harps along the bridge axis.
 * Large particle system with wind-driven shader animation and GPU-side wrapping.
 */
export class FogTendrils extends BaseBridgePart {
  private fogMaterial!: THREE.ShaderMaterial;

  constructor() {
    super('FogTendrils');
  }

  buildGeometry(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = X_MIN + Math.random() * (X_MAX - X_MIN);
      positions[i * 3 + 1] = Y_MIN + Math.random() * (Y_MAX - Y_MIN);
      positions[i * 3 + 2] = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.fogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uWindZ: { value: 2.0 },
        uZMin: { value: Z_MIN as number },
        uZRange: { value: (Z_MAX - Z_MIN) as number },
        uOpacity: { value: 0.35 },
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uWindZ;
        uniform float uZMin;
        uniform float uZRange;

        void main() {
          vec3 pos = position;
          pos.z = uZMin + mod(pos.z - uZMin + uWindZ * uTime, uZRange);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          gl_PointSize = mix(30.0, 60.0, clamp(1.0 - length(mvPosition.xyz) / 2000.0, 0.0, 1.0));
          gl_PointSize *= (500.0 / -mvPosition.z);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uOpacity;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          float alpha = uOpacity * smoothstep(0.5, 0.05, dist);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, this.fogMaterial);
    this.group.add(points);
  }

  update(_dt: number, elapsed: number): void {
    this.fogMaterial.uniforms['uTime'].value = elapsed;
  }
}
