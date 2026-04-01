import * as THREE from 'three';
import { fbm, hash2 } from '@/utils/noise';

export interface WeatheringParams {
  age: number;
  saltExposure: number;
  moistureZone: number;
}

export function generateWeatheringOverlay(
  size: number,
  params: WeatheringParams,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      const rustNoise = fbm(nx * 8, ny * 8, 4);
      const rustGravity = ny * 0.3;
      const rustChance = rustNoise * params.age * 0.6 + rustGravity * params.saltExposure;
      const isRust = rustChance > 0.55;

      const saltNoise = fbm(nx * 12 + 50, ny * 12 + 50, 3);
      const isSalt = saltNoise * params.saltExposure > 0.6;

      const peelNoise = fbm(nx * 6 + 100, ny * 6 + 100, 4);
      const isPeeling = peelNoise * params.age > 0.65;

      const streakNoise = hash2(Math.floor(nx * 30), 0) * fbm(nx * 2, ny * 15, 3);
      const isStreak = streakNoise * params.moistureZone > 0.5;

      d[i] = isRust ? Math.floor(rustChance * 255) : 0;
      d[i + 1] = isSalt ? Math.floor(saltNoise * 200) : 0;
      d[i + 2] = isPeeling ? Math.floor(peelNoise * 180) : 0;
      d[i + 3] = isStreak ? Math.floor(streakNoise * 150) : 0;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
