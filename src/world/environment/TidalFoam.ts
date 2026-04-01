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
  private readonly particleSystems: {
    points: THREE.Points;
    positions: Float32Array;
    alphas: Float32Array;
    material: THREE.ShaderMaterial;
    alphaAttr: THREE.BufferAttribute;
  }[] = [];

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
      torus.rotation.x = Math.PI / 2; // lay flat on water
      this.group.add(torus);
      this.torusMeshes.push(torus);

      // --- Particle splash system ---
      const posArray = new Float32Array(PARTICLES_PER_PIER * 3);
      const alphaArray = new Float32Array(PARTICLES_PER_PIER);
      const phaseArray = new Float32Array(PARTICLES_PER_PIER);

      for (let i = 0; i < PARTICLES_PER_PIER; i++) {
        // Ring pattern: random angle, radius 5–12, small height variation
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 7;
        posArray[i * 3 + 0] = Math.cos(angle) * radius;
        posArray[i * 3 + 1] = Math.random() * 1.5;
        posArray[i * 3 + 2] = pierZ + Math.sin(angle) * radius;
        alphaArray[i] = Math.random();
        phaseArray[i] = Math.random() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const alphaAttr = new THREE.BufferAttribute(alphaArray, 1);
      geo.setAttribute('alpha', alphaAttr);
      geo.setAttribute('phase', new THREE.BufferAttribute(phaseArray, 1));

      const particleMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0.0 },
        },
        vertexShader: /* glsl */`
          attribute float alpha;
          attribute float phase;

          uniform float uTime;

          varying float vAlpha;

          void main() {
            vAlpha = 0.3 + 0.7 * abs(sin(uTime * 1.2 + phase));

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */`
          varying float vAlpha;

          void main() {
            // Soft circular point sprite
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

      this.particleSystems.push({
        points,
        positions: posArray,
        alphas: alphaArray,
        material: particleMat,
        alphaAttr,
      });
    }
  }

  update(_dt: number, elapsed: number): void {
    // Pulse torus scale
    const scale = 1.0 + 0.15 * Math.sin(elapsed * 1.8);
    for (const torus of this.torusMeshes) {
      torus.scale.setScalar(scale);
    }

    // Update particle system time uniform and slowly rotate positions
    for (let pi = 0; pi < this.particleSystems.length; pi++) {
      const sys = this.particleSystems[pi];
      const pierZ = pi === 0 ? 0 : BRIDGE.mainSpan;

      // Update uTime uniform in the shader
      (sys.material.uniforms['uTime'] as THREE.IUniform<number>).value = elapsed;

      // Slowly rotate particle positions around the pier center
      const rotSpeed = 0.08; // radians per second
      const sinR = Math.sin(rotSpeed * _dt);
      const cosR = Math.cos(rotSpeed * _dt);

      for (let i = 0; i < PARTICLES_PER_PIER; i++) {
        const ix = i * 3;
        const x = sys.positions[ix];
        const z = sys.positions[ix + 2] - pierZ;

        sys.positions[ix] = x * cosR - z * sinR;
        sys.positions[ix + 2] = pierZ + (x * sinR + z * cosR);
      }

      const posAttr = sys.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.array = sys.positions;
      posAttr.needsUpdate = true;
    }
  }
}
