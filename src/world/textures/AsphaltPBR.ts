import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface AsphaltTextureSet {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext('2d')!, img: c.getContext('2d')!.createImageData(size, size) };
}

/**
 * Generates realistic asphalt PBR textures with:
 * - Aggregate particles (gravel/stone chips)
 * - Tar binder variation
 * - Micro-cracks and wear patterns
 * - Oil stain patches
 */
export function generateAsphaltTextures(size = 1024): AsphaltTextureSet {
  // --- Color Map ---
  const col = makeCanvas(size);
  const colD = col.img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Base asphalt tone (dark gray)
      const baseGray = 38;

      // Large-scale color variation (tar binder patches)
      const tarVariation = (fbm(x * 0.004, y * 0.004, 3) - 0.5) * 14;

      // Medium aggregate stones
      const stoneNoise = hash2(x * 0.8, y * 0.8);
      const stoneBright = stoneNoise > 0.82 ? (stoneNoise - 0.82) * 180 : 0;

      // Fine aggregate texture
      const fineGrit = (hash2(x * 2.1, y * 2.1) - 0.5) * 12;

      // Worn tire tracks (subtle lighter strips at lane centers)
      const wearPattern = fbm(x * 0.002, y * 0.015, 2);
      const wearBright = wearPattern > 0.55 ? (wearPattern - 0.55) * 15 : 0;

      // Oil stains (dark blotches)
      const oilStain = fbm(x * 0.006 + 99, y * 0.006 + 99, 3);
      const oilDark = oilStain > 0.65 ? -(oilStain - 0.65) * 20 : 0;

      // Patching (slightly different color asphalt patches)
      const patch = fbm(x * 0.003 + 200, y * 0.003 + 200, 2);
      const patchTone = patch > 0.7 ? 8 : 0;

      const gray = Math.min(255, Math.max(0,
        baseGray + tarVariation + stoneBright + fineGrit + wearBright + oilDark + patchTone));

      // Slight warm tone to match real asphalt (not pure gray)
      colD[i] = Math.min(255, gray + 2) | 0;
      colD[i + 1] = gray | 0;
      colD[i + 2] = Math.max(0, gray - 2) | 0;
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

      // Large aggregate bumps
      const aggX = hash2(x * 0.7, y * 0.7);
      const aggY = hash2(x * 0.7 + 50, y * 0.7 + 50);
      if (aggX > 0.78) {
        dx += (aggX - 0.78) * 2.5;
        dy += (aggY - 0.5) * 0.8;
      }

      // Medium aggregate
      dx += (hash2(x * 1.5, y * 1.5) - 0.5) * 0.35;
      dy += (hash2(x * 1.5 + 77, y * 1.5 + 77) - 0.5) * 0.35;

      // Fine grain texture (high frequency)
      dx += (hash2(x * 3.0, y * 3.0) - 0.5) * 0.15;
      dy += (hash2(x * 3.0 + 33, y * 3.0 + 33) - 0.5) * 0.15;

      // Gentle undulation (road surface imperfections)
      dx += (fbm(x * 0.01, y * 0.01, 3) - 0.5) * 0.25;
      dy += (fbm(x * 0.01 + 100, y * 0.01 + 100, 3) - 0.5) * 0.25;

      // Micro-cracks
      const crackVal = fbm(x * 0.02, y * 0.04, 4);
      if (crackVal > 0.68 && crackVal < 0.72) {
        dx += 0.6;
        dy += 0.3;
      }

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

      // Base roughness (asphalt is quite rough)
      const base = 0.85;

      // Aggregate variation
      const aggRough = (hash2(x * 0.8, y * 0.8) - 0.5) * 0.15;

      // Worn tire paths are smoother
      const wearSmooth = fbm(x * 0.002, y * 0.015, 2);
      const wearDelta = wearSmooth > 0.55 ? -(wearSmooth - 0.55) * 0.25 : 0;

      // Oil stains are smoother/shinier
      const oilSmooth = fbm(x * 0.006 + 99, y * 0.006 + 99, 3);
      const oilDelta = oilSmooth > 0.65 ? -(oilSmooth - 0.65) * 0.4 : 0;

      const val = Math.min(1, Math.max(0, base + aggRough + wearDelta + oilDelta));
      const b = (val * 255) | 0;
      rouD[i] = b; rouD[i + 1] = b; rouD[i + 2] = b; rouD[i + 3] = 255;
    }
  }
  rou.ctx.putImageData(rou.img, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  return {
    colorMap: wrap(col.canvas),
    normalMap: wrap(nor.canvas),
    roughnessMap: wrap(rou.canvas),
  };
}
