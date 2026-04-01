import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';
import { BRIDGE } from '@/config/bridge';

function generateProceduralNormal(size: number, type: 'steel' | 'concrete' | 'asphalt'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;

      if (type === 'steel') {
        const rx = x % 64, ry = y % 64;
        const rivetDist = Math.sqrt((rx - 32) ** 2 + (ry - 32) ** 2);
        if (rivetDist < 4) {
          const rd = Math.max(0, 4 - rivetDist);
          dx += (rx - 32) * rd * 0.15;
          dy += (ry - 32) * rd * 0.15;
        }
        if (Math.abs(y % 128 - 64) < 2) dy += (Math.abs(y % 128 - 64) < 1 ? 0.5 : -0.3);
        if (Math.abs(x % 256 - 128) < 2) dx += (Math.abs(x % 256 - 128) < 1 ? 0.5 : -0.3);
        dx += (hash2(x * 0.5, y * 0.5) - 0.5) * 0.15;
        dy += (hash2(x * 0.5 + 100, y * 0.5 + 100) - 0.5) * 0.15;
      } else if (type === 'concrete') {
        dx = (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 0.6;
        dy = (fbm(x * 0.03 + 50, y * 0.03 + 50, 3) - 0.5) * 0.6;
        if (y % 128 < 2) dy += 0.4;
      } else {
        dx = (hash2(x * 0.3, y * 0.3) - 0.5) * 0.3;
        dy = (hash2(x * 0.3 + 77, y * 0.3 + 77) - 0.5) * 0.3;
        dx += (fbm(x * 0.08, y * 0.08, 2) - 0.5) * 0.2;
        dy += (fbm(x * 0.08 + 33, y * 0.08 + 33, 2) - 0.5) * 0.2;
      }

      const len = Math.sqrt(dx * dx + dy * dy + 1);
      d[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      d[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      d[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export interface BridgeMaterials {
  bridge: THREE.MeshPhysicalMaterial;
  cable: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  road: THREE.MeshStandardMaterial;
}

export function createMaterials(): BridgeMaterials {
  const steelNorm = generateProceduralNormal(256, 'steel');
  steelNorm.repeat.set(8, 8);
  const concreteNorm = generateProceduralNormal(256, 'concrete');
  concreteNorm.repeat.set(4, 4);
  const asphaltNorm = generateProceduralNormal(256, 'asphalt');
  asphaltNorm.repeat.set(6, 12);

  return {
    bridge: new THREE.MeshPhysicalMaterial({
      color: BRIDGE.color, metalness: 0.3, roughness: 0.55,
      clearcoat: 0.05, clearcoatRoughness: 0.6, envMapIntensity: 0.4,
      normalMap: steelNorm, normalScale: new THREE.Vector2(0.4, 0.4),
    }),
    cable: new THREE.MeshStandardMaterial({
      color: BRIDGE.color, metalness: 0.4, roughness: 0.5,
      envMapIntensity: 0.3,
      normalMap: steelNorm, normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    concrete: new THREE.MeshStandardMaterial({
      color: 0x999088, roughness: 0.85, metalness: 0,
      normalMap: concreteNorm, normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    road: new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, roughness: 0.92, metalness: 0,
      normalMap: asphaltNorm, normalScale: new THREE.Vector2(0.3, 0.3),
    }),
  };
}
