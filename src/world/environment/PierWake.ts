import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE } from '@/config/bridge';

/**
 * E1a — PierWake
 * V-shaped wake turbulence downstream of each tower pier.
 * Uses a custom ShaderMaterial to animate foam on the water surface.
 */
export class PierWake extends BaseBridgePart {
  private readonly wakeUniforms: { uTime: THREE.IUniform<number>; uColor: THREE.IUniform<THREE.Color> }[] = [];

  constructor() {
    super('PierWake');
  }

  buildGeometry(): void {
    const pierZs = [0, BRIDGE.mainSpan];

    for (const pierZ of pierZs) {
      const uniforms = {
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
      };
      this.wakeUniforms.push(uniforms);

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */`
          uniform float uTime;

          varying vec2 vUv;
          varying float vDisplace;

          void main() {
            vUv = uv;

            vec3 pos = position;

            // Wave displacement on the water plane (y is up after rotateX)
            float wave1 = sin(pos.x * 0.4 + uTime * 2.0) * 0.25;
            float wave2 = cos(pos.z * 0.3 + uTime * 1.5) * 0.2;
            float wave3 = sin((pos.x + pos.z) * 0.25 + uTime * 2.8) * 0.15;

            // V-shape taper: stronger displacement near the pier, fading outward
            float dist = length(vec2(pos.x, pos.z));
            float taper = clamp(1.0 - dist / 40.0, 0.0, 1.0);

            pos.y += (wave1 + wave2 + wave3) * taper;
            vDisplace = (wave1 + wave2 + wave3) * taper;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform vec3 uColor;

          varying vec2 vUv;
          varying float vDisplace;

          void main() {
            // V-shaped foam pattern using UV
            vec2 centeredUv = vUv - vec2(0.5, 0.5);

            // V-shape: fade along width and fade at leading/trailing edges
            float vShape = 1.0 - abs(centeredUv.x) / (0.5 - abs(centeredUv.y) * 0.6 + 0.01);
            vShape = clamp(vShape, 0.0, 1.0);

            // Edge fade
            float edgeFadeX = 1.0 - smoothstep(0.3, 0.5, abs(centeredUv.x));
            float edgeFadeY = 1.0 - smoothstep(0.3, 0.5, abs(centeredUv.y));

            // Foam brightness from displacement
            float foam = clamp(vDisplace * 2.0 + 0.5, 0.0, 1.0);

            float alpha = vShape * edgeFadeX * edgeFadeY * (0.4 + foam * 0.5);

            gl_FragColor = vec4(uColor * (0.8 + foam * 0.2), alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const geo = new THREE.PlaneGeometry(40, 80, 20, 40);
      // Tilt flat onto the water surface
      geo.rotateX(-Math.PI / 2);

      const mesh = new THREE.Mesh(geo, material);
      // Position downstream of each pier (positive Z = downstream current direction)
      mesh.position.set(0, 0.05, pierZ + 20);
      mesh.receiveShadow = false;
      this.group.add(mesh);
    }
  }

  update(_dt: number, elapsed: number): void {
    for (const uniforms of this.wakeUniforms) {
      uniforms.uTime.value = elapsed;
    }
  }
}
