import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import { terrainH } from '@/world/TerrainGenerator';

const MAP_W = 100, MAP_H = 100;
const MAP_MIN_X = -1800, MAP_MAX_X = 2200;
const MAP_MIN_Z = -2200, MAP_MAX_Z = 3800;

export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private bg: ImageData;

  constructor() {
    const el = document.getElementById('minimap')!;
    const canvas = document.createElement('canvas');
    canvas.width = MAP_W;
    canvas.height = MAP_H;
    el.appendChild(canvas);
    this.ctx = canvas.getContext('2d')!;

    // Pre-render terrain
    const img = this.ctx.createImageData(MAP_W, MAP_H);
    const d = img.data;
    for (let py = 0; py < MAP_H; py++) {
      for (let px = 0; px < MAP_W; px++) {
        const wx = MAP_MIN_X + (px / MAP_W) * (MAP_MAX_X - MAP_MIN_X);
        const wz = MAP_MAX_Z - (py / MAP_H) * (MAP_MAX_Z - MAP_MIN_Z);
        const h = terrainH(wx, wz);
        const i = (py * MAP_W + px) * 4;
        if (h > 2) {
          const elev = Math.min(1, h / 200);
          d[i] = (60 + elev * 80) | 0;
          d[i + 1] = (90 + elev * 40) | 0;
          d[i + 2] = (40 + elev * 30) | 0;
        } else {
          d[i] = 10; d[i + 1] = 35 + (py & 1); d[i + 2] = 55;
        }
        d[i + 3] = 255;
      }
    }
    this.ctx.putImageData(img, 0, 0);

    // Bridge line
    this.ctx.strokeStyle = '#c04530';
    this.ctx.lineWidth = 2;
    const bx = (0 - MAP_MIN_X) / (MAP_MAX_X - MAP_MIN_X) * MAP_W;
    const bz1 = (1 - (-BRIDGE.sideSpan - MAP_MIN_Z) / (MAP_MAX_Z - MAP_MIN_Z)) * MAP_H;
    const bz2 = (1 - (BRIDGE.mainSpan + BRIDGE.sideSpan - MAP_MIN_Z) / (MAP_MAX_Z - MAP_MIN_Z)) * MAP_H;
    this.ctx.beginPath();
    this.ctx.moveTo(bx, bz1);
    this.ctx.lineTo(bx, bz2);
    this.ctx.stroke();

    // Tower markers
    this.ctx.fillStyle = '#c04530';
    for (const tz of [0, BRIDGE.mainSpan]) {
      const ty = (1 - (tz - MAP_MIN_Z) / (MAP_MAX_Z - MAP_MIN_Z)) * MAP_H;
      this.ctx.fillRect(bx - 2, ty - 1, 5, 3);
    }

    this.bg = this.ctx.getImageData(0, 0, MAP_W, MAP_H);
  }

  update(camera: THREE.Camera) {
    this.ctx.putImageData(this.bg, 0, 0);
    const cx = ((camera.position.x - MAP_MIN_X) / (MAP_MAX_X - MAP_MIN_X)) * MAP_W;
    const cy = (1 - (camera.position.z - MAP_MIN_Z) / (MAP_MAX_Z - MAP_MIN_Z)) * MAP_H;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + dir.x * 12, cy - dir.z * 12);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    this.ctx.stroke();
  }
}
