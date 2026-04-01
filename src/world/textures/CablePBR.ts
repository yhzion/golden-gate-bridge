import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface CableTextureSet {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function generateCableTextures(size = 1024): CableTextureSet {
  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
  }

  const nor = makeCanvas();
  const norD = nor.img.data;
  const strandCount = 61;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let dx = 0, dy = 0;
      const angle = Math.PI * 0.15;
      const u = x * Math.cos(angle) + y * Math.sin(angle);
      const strandPhase = (u % (size / strandCount)) / (size / strandCount);
      if (strandPhase < 0.08 || strandPhase > 0.92) {
        const groove = strandPhase < 0.08 ? strandPhase / 0.08 : (1 - strandPhase) / 0.08;
        dx += Math.cos(angle) * (1 - groove) * 0.8;
        dy += Math.sin(angle) * (1 - groove) * 0.8;
      }
      dx += (hash2(x * 0.5, y * 0.5) - 0.5) * 0.08;
      dy += (hash2(x * 0.5 + 77, y * 0.5 + 77) - 0.5) * 0.06;
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
      const val = 0.42 + (fbm(x * 0.01, y * 0.01, 2) - 0.5) * 0.15;
      const b = (Math.min(0.55, Math.max(0.35, val)) * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return { normalMap: wrap(nor.canvas), roughnessMap: wrap(rou.canvas) };
}
