import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

const LIGHT_SPACING = 50;
const LIGHT_COLOR = 0xffddaa;
const MAX_POOL = 30;

interface LampPosition {
  pos: THREE.Vector3;
}

export class RoadLights {
  private lampPositions: LampPosition[] = [];
  private pool: THREE.PointLight[] = [];
  private activeCount = 0;
  private sortBuffer: { pos: THREE.Vector3; dist: number }[] = [];
  private _cachedPositions: THREE.Vector3[] = [];
  private _cachedColors: THREE.Color[] = [];
  private _cachedIntensities: number[] = [];

  constructor(scene: THREE.Scene) {
    const len = BRIDGE.mainSpan + BRIDGE.sideSpan * 2;
    const startZ = -BRIDGE.sideSpan;
    const numLights = Math.floor(len / LIGHT_SPACING);

    for (const side of [-1, 1]) {
      for (let i = 0; i < numLights; i++) {
        const lz = startZ + i * LIGHT_SPACING + LIGHT_SPACING / 2;
        const lx = side * (BRIDGE.deckW / 2 + 0.8 + 0.8);
        const ly = BRIDGE.deckH + 4.55;
        const pos = new THREE.Vector3(lx, ly, lz);
        this.lampPositions.push({ pos });
        this.sortBuffer.push({ pos, dist: 0 });
      }
    }

    for (let i = 0; i < MAX_POOL; i++) {
      const pl = new THREE.PointLight(LIGHT_COLOR, 0, 600, 0.5);
      pl.visible = false;
      scene.add(pl);
      this.pool.push(pl);
    }
  }

  update(dt: number, time: TimeState, tier: Tier, cameraPos: THREE.Vector3): void {
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 1.0, 0, 1);
    const lightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.2, 0.5);

    if (lightFactor < 0.01) {
      for (const pl of this.pool) pl.visible = false;
      this.activeCount = 0;
      return;
    }

    const maxActive = tier === 'high' ? 30 : tier === 'medium' ? 14 : 6;

    // Update distances in-place, then sort (no per-frame allocations)
    for (let i = 0; i < this.sortBuffer.length; i++) {
      this.sortBuffer[i].dist = cameraPos.distanceTo(this.sortBuffer[i].pos);
    }
    this.sortBuffer.sort((a, b) => a.dist - b.dist);

    const count = Math.min(maxActive, this.pool.length, this.sortBuffer.length);
    for (let i = 0; i < this.pool.length; i++) {
      if (i < count && this.sortBuffer[i].dist < 1000) {
        this.pool[i].visible = true;
        this.pool[i].position.copy(this.sortBuffer[i].pos);
        this.pool[i].intensity = lightFactor * 0.4;
      } else {
        this.pool[i].visible = false;
      }
    }
    this.activeCount = count;
  }

  getActiveLightPositions(): THREE.Vector3[] {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].visible) this._cachedPositions[count++] = this.pool[i].position;
    }
    this._cachedPositions.length = count;
    return this._cachedPositions;
  }

  getActiveLightColors(): THREE.Color[] {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].visible) this._cachedColors[count++] = this.pool[i].color;
    }
    this._cachedColors.length = count;
    return this._cachedColors;
  }

  getActiveLightIntensities(): number[] {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].visible) this._cachedIntensities[count++] = this.pool[i].intensity;
    }
    this._cachedIntensities.length = count;
    return this._cachedIntensities;
  }

  dispose(): void {
    for (const pl of this.pool) {
      pl.parent?.remove(pl);
      pl.dispose();
    }
  }
}
