import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface SteelTextureSet {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
}

export function generateSteelTextures(size = 1024): SteelTextureSet {
  // --- Color Map ---
  const col = makeCanvas(size);
  const colD = col.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const variation = (fbm(x * 0.005, y * 0.005, 3) - 0.5) * 20;
      const repaintPatch = fbm(x * 0.002, y * 0.002, 2);
      const bright = repaintPatch > 0.6 ? 10 : 0;
      colD[i] = Math.min(255, Math.max(0, 192 + variation + bright));
      colD[i + 1] = Math.min(255, Math.max(0, 69 + variation * 0.4));
      colD[i + 2] = Math.min(255, Math.max(0, 48 + variation * 0.3));
      colD[i + 3] = 255;
    }
  }
  col.ctx.putImageData(col.img, 0, 0);

  // --- Normal Map ---
  const nor = makeCanvas(size);
  const norD = nor.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;
      const rx = x % 64, ry = y % 64;
      const rivetDist = Math.sqrt((rx - 32) ** 2 + (ry - 32) ** 2);
      if (rivetDist < 5) {
        const rd = Math.max(0, 5 - rivetDist);
        dx += (rx - 32) * rd * 0.12;
        dy += (ry - 32) * rd * 0.12;
      }
      if (Math.abs(y % 128 - 64) < 2) dy += Math.abs(y % 128 - 64) < 1 ? 0.6 : -0.4;
      if (Math.abs(x % 256 - 128) < 2) dx += Math.abs(x % 256 - 128) < 1 ? 0.6 : -0.4;
      dx += (hash2(x * 0.3, y * 0.3) - 0.5) * 0.12;
      dy += (hash2(x * 0.3 + 100, y * 0.3 + 100) - 0.5) * 0.08;
      dx += (fbm(x * 0.05, y * 0.05, 2) - 0.5) * 0.15;
      dy += (fbm(x * 0.05 + 200, y * 0.05 + 200, 2) - 0.5) * 0.15;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      norD[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 3] = 255;
    }
  }
  nor.ctx.putImageData(nor.img, 0, 0);

  // --- Roughness Map ---
  const rou = makeCanvas(size);
  const rouD = rou.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const base = 0.5;
      const noise = (fbm(x * 0.008, y * 0.008, 3) - 0.5) * 0.3;
      const seamDist = Math.min(Math.abs(y % 128 - 64), Math.abs(x % 256 - 128));
      const seamBoost = seamDist < 4 ? 0.15 : 0;
      const val = Math.min(1, Math.max(0, base + noise + seamBoost));
      const b = (val * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  // --- Metalness Map ---
  const met = makeCanvas(size);
  const metD = met.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const base = 0.3;
      const worn = fbm(x * 0.01, y * 0.01, 3);
      const val = Math.min(0.5, base + (worn > 0.6 ? (worn - 0.6) * 0.5 : 0));
      const b = (val * 255) | 0;
      metD[i] = b; metD[i + 1] = b; metD[i + 2] = b; metD[i + 3] = 255;
    }
  }
  met.ctx.putImageData(met.img, 0, 0);

  // --- AO Map ---
  const ao = makeCanvas(size);
  const aoD = ao.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let occlusion = 1.0;
      const rx = x % 64, ry = y % 64;
      const rivetDist = Math.sqrt((rx - 32) ** 2 + (ry - 32) ** 2);
      if (rivetDist < 8) occlusion -= (8 - rivetDist) * 0.03;
      const seamDist = Math.min(Math.abs(y % 128 - 64), Math.abs(x % 256 - 128));
      if (seamDist < 6) occlusion -= (6 - seamDist) * 0.02;
      occlusion += (fbm(x * 0.02, y * 0.02, 2) - 0.5) * 0.08;
      const b = (Math.min(1, Math.max(0, occlusion)) * 255) | 0;
      aoD[i] = b; aoD[i + 1] = b; aoD[i + 2] = b; aoD[i + 3] = 255;
    }
  }
  ao.ctx.putImageData(ao.img, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return {
    colorMap: wrap(col.canvas),
    normalMap: wrap(nor.canvas),
    roughnessMap: wrap(rou.canvas),
    metalnessMap: wrap(met.canvas),
    aoMap: wrap(ao.canvas),
  };
}
