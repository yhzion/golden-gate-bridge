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
 * Large particle system with wind-driven shader animation and CPU-side wrapping.
 */
export class FogTendrils extends BaseBridgePart {
  private fogMaterial!: THREE.ShaderMaterial;
  private positionArray!: Float32Array;
  private basePositionZ!: Float32Array;

  constructor() {
    super('FogTendrils');
  }

  buildGeometry(): void {
    this.positionArray = new Float32Array(PARTICLE_COUNT * 3);
    this.basePositionZ = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = X_MIN + Math.random() * (X_MAX - X_MIN);
      const y = Y_MIN + Math.random() * (Y_MAX - Y_MIN);
      const z = Z_MIN + Math.random() * (Z_MAX - Z_MIN);

      this.positionArray[i * 3 + 0] = x;
      this.positionArray[i * 3 + 1] = y;
      this.positionArray[i * 3 + 2] = z;
      this.basePositionZ[i] = z;
    }

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.positionArray, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);

    this.fogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uWind: { value: new THREE.Vector3(0.0, 0.0, 2.0) },
        uOpacity: { value: 0.35 },
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uWind;

        void main() {
          // Offset position by wind * time (wrapping handled CPU-side)
          vec3 pos = position + uWind * uTime;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // Size attenuation: larger points when closer
          gl_PointSize = mix(30.0, 60.0, clamp(1.0 - length(mvPosition.xyz) / 2000.0, 0.0, 1.0));
          gl_PointSize *= (500.0 / -mvPosition.z);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uOpacity;

        void main() {
          // Soft white circle with distance-based alpha falloff
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);

          // Discard outside circle
          if (dist > 0.5) discard;

          // Soft falloff from center
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

  update(dt: number, elapsed: number): void {
    this.fogMaterial.uniforms['uTime'].value = elapsed;

    // Wind speed along Z axis (matches uWind.z)
    const windZ = 2.0;
    const zRange = Z_MAX - Z_MIN;

    // Update CPU-side positions for wrapping
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positionArray[i * 3 + 2] += windZ * dt;

      // Wrap particles that drift past Z_MAX back to Z_MIN
      if (this.positionArray[i * 3 + 2] > Z_MAX) {
        this.positionArray[i * 3 + 2] -= zRange;
      }
    }

    // Sync position buffer (note: the shader also adds wind*time, so we zero out
    // by resetting positions. Instead we manage positions fully CPU-side and keep
    // uTime=0 for the shader wind offset to avoid double-counting.)
    // Strategy: keep positions updated CPU-side; set uTime=0 so shader adds no extra drift.
    this.fogMaterial.uniforms['uTime'].value = 0.0;

    const points = this.group.children[0] as THREE.Points;
    const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }
}
