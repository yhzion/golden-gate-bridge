import * as THREE from 'three';
import { BaseBridgePart } from '@/landmarks/bridge/BridgePart';
import { BRIDGE } from '@/config/bridge';

const PARTICLES_PER_PIER = 200;

/**
 * E1b — TidalFoam
 * Animated foam ring at the base of each tower pier.
 * Includes a pulsing torus mesh and a particle system for splash effect.
 */
export class TidalFoam extends BaseBridgePart {
  private readonly torusMeshes: THREE.Mesh[] = [];
  private readonly particleMaterials: THREE.ShaderMaterial[] = [];

  constructor() {
    super('TidalFoam');
  }

  buildGeometry(): void {
    const pierZs = [0, BRIDGE.mainSpan];

    for (const pierZ of pierZs) {
      // --- Foam ring torus ---
      const torusGeo = new THREE.TorusGeometry(8, 1.5, 8, 24);
      const torusMat = new THREE.MeshStandardMaterial({
        color: 0xddeeff,
        roughness: 0.6,
        metalness: 0.0,
        transparent: true,
        opacity: 0.75,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.position.set(0, 0.1, pierZ);
      torus.rotation.x = Math.PI / 2;
      this.group.add(torus);
      this.torusMeshes.push(torus);

      // --- Particle splash system (GPU-driven rotation) ---
      const posArray = new Float32Array(PARTICLES_PER_PIER * 3);
      const phaseArray = new Float32Array(PARTICLES_PER_PIER);

      for (let i = 0; i < PARTICLES_PER_PIER; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 7;
        posArray[i * 3 + 0] = Math.cos(angle) * radius;
        posArray[i * 3 + 1] = Math.random() * 1.5;
        posArray[i * 3 + 2] = Math.sin(angle) * radius;
        phaseArray[i] = Math.random() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      geo.setAttribute('phase', new THREE.BufferAttribute(phaseArray, 1));

      const particleMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0.0 },
          uPierZ: { value: pierZ as number },
          uRotSpeed: { value: 0.08 },
        },
        vertexShader: /* glsl */`
          attribute float phase;

          uniform float uTime;
          uniform float uPierZ;
          uniform float uRotSpeed;

          varying float vAlpha;

          void main() {
            vAlpha = 0.3 + 0.7 * abs(sin(uTime * 1.2 + phase));

            // Rotate XZ around pier center on GPU
            float angle = uRotSpeed * uTime;
            float cs = cos(angle);
            float sn = sin(angle);
            vec3 pos = position;
            float rx = pos.x * cs - pos.z * sn;
            float rz = pos.x * sn + pos.z * cs;
            pos.x = rx;
            pos.z = rz + uPierZ;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */`
          varying float vAlpha;

          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float alpha = vAlpha * smoothstep(0.5, 0.1, dist);
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, particleMat);
      this.group.add(points);

      this.particleMaterials.push(particleMat);
    }
  }

  update(_dt: number, elapsed: number): void {
    const scale = 1.0 + 0.15 * Math.sin(elapsed * 1.8);
    for (const torus of this.torusMeshes) {
      torus.scale.setScalar(scale);
    }

    for (const mat of this.particleMaterials) {
      mat.uniforms['uTime'].value = elapsed;
    }
  }
}
