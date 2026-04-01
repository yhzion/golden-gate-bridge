import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface ConcreteTextureSet {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

export function generateConcreteTextures(size = 1024): ConcreteTextureSet {
  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
  }

  const col = makeCanvas();
  const colD = col.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = (fbm(x * 0.004, y * 0.004, 4) - 0.5) * 30;
      const streak = hash2(Math.floor(x / 20), 0);
      const streakDark = streak > 0.7 ? -15 * fbm(x * 0.01, y * 0.03, 2) : 0;
      const algae = y > size * 0.7 ? (y / size - 0.7) * 40 : 0;
      colD[i] = Math.min(255, Math.max(0, 153 + n + streakDark));
      colD[i + 1] = Math.min(255, Math.max(0, 144 + n + streakDark + algae * 0.5));
      colD[i + 2] = Math.min(255, Math.max(0, 136 + n + streakDark));
      colD[i + 3] = 255;
    }
  }
  col.ctx.putImageData(col.img, 0, 0);

  const nor = makeCanvas();
  const norD = nor.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;
      if (y % 128 < 3) dy += 0.5;
      dx += (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 0.5;
      dy += (fbm(x * 0.03 + 50, y * 0.03 + 50, 3) - 0.5) * 0.5;
      const crackVal = fbm(x * 0.008, y * 0.008, 5);
      if (Math.abs(crackVal - 0.5) < 0.02) {
        dx += (hash2(x * 0.1, y * 0.1) - 0.5) * 1.5;
        dy += (hash2(x * 0.1 + 33, y * 0.1 + 33) - 0.5) * 1.5;
      }
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      norD[i] = ((dx / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 1] = ((dy / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 2] = ((1 / len * 0.5 + 0.5) * 255) | 0;
      norD[i + 3] = 255;
    }
  }
  nor.ctx.putImageData(nor.img, 0, 0);

  const rou = makeCanvas();
  const rouD = rou.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const val = 0.82 + (fbm(x * 0.01, y * 0.01, 3) - 0.5) * 0.15;
      const b = (Math.min(0.95, Math.max(0.7, val)) * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  const ao = makeCanvas();
  const aoD = ao.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let occ = 1.0;
      if (y % 128 < 5) occ -= (5 - (y % 128)) * 0.04;
      occ += (fbm(x * 0.015, y * 0.015, 2) - 0.5) * 0.1;
      const b = (Math.min(1, Math.max(0, occ)) * 255) | 0;
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
    aoMap: wrap(ao.canvas),
  };
}
