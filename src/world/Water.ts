import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { fbm } from '@/utils/noise';

function generateWaterNormals(size = 512): THREE.CanvasTexture {
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
      const scales = [
        { s: 0.015, amp: 4.0 },
        { s: 0.04, amp: 2.5 },
        { s: 0.1, amp: 1.2 },
        { s: 0.25, amp: 0.5 },
      ];
      for (const { s, amp } of scales) {
        dx += (fbm((x + 1) * s, y * s, 3) - fbm((x - 1) * s, y * s, 3)) * amp;
        dy += (fbm(x * s, (y + 1) * s, 3) - fbm(x * s, (y - 1) * s, 3)) * amp;
      }
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      d[i] = ((-dx / len + 1) * 0.5 * 255) | 0;
      d[i + 1] = ((-dy / len + 1) * 0.5 * 255) | 0;
      d[i + 2] = ((1 / len + 1) * 0.5 * 200 + 55) | 0;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createWater(scene: THREE.Scene): Water {
  const normals = generateWaterNormals(512);
  const geo = new THREE.PlaneGeometry(200000, 200000);
  const water = new Water(geo, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normals,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xfff5e0,
    waterColor: 0x0a3050,
    distortionScale: 4.5,
    alpha: 0.85,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.5;
  scene.add(water);
  return water;
}
