import * as THREE from 'three';
import { QualityTier, type Tier } from './QualityTier';
import { StructuralLights } from './StructuralLights';
import { RoadLights } from './RoadLights';
import { SafetyLights } from './SafetyLights';
import type { TimeState } from '@/atmosphere/TimeOfDay';
export class LightingManager {
  readonly qualityTier: QualityTier;
  private structural: StructuralLights;
  private road: RoadLights;
  private safety: SafetyLights;
  private camera: THREE.Camera;
  private _positions: THREE.Vector3[] = [];
  private _colors: THREE.Color[] = [];
  private _intensities: number[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;
    this.qualityTier = new QualityTier(50);
    this.structural = new StructuralLights(scene);
    this.road = new RoadLights(scene);
    this.safety = new SafetyLights(scene);
  }

  update(dt: number, elapsed: number, timeState: TimeState): void {
    this.qualityTier.sample(dt);
    const tier = this.qualityTier.getCurrentTier();
    const camPos = this.camera.position;

    this.structural.update(dt, timeState, tier);
    this.road.update(dt, timeState, tier, camPos);
    this.safety.update(dt, timeState, tier, elapsed);

    const maxShadows = tier === 'high' ? 2 : 0;
    this.structural.updateShadowBudget(camPos, maxShadows);
  }

  private _mergeArrays<T>(a: T[], b: T[], out: T[], max: number): T[] {
    let count = 0;
    for (let i = 0; i < a.length && count < max; i++) out[count++] = a[i];
    for (let i = 0; i < b.length && count < max; i++) out[count++] = b[i];
    out.length = count;
    return out;
  }

  getLightPositions(): THREE.Vector3[] {
    return this._mergeArrays(
      this.structural.getTowerLightPositions(),
      this.road.getActiveLightPositions(),
      this._positions, 8,
    );
  }

  getLightColors(): THREE.Color[] {
    return this._mergeArrays(
      this.structural.getTowerLightColors(),
      this.road.getActiveLightColors(),
      this._colors, 8,
    );
  }

  getLightIntensities(): number[] {
    return this._mergeArrays(
      this.structural.getTowerLightIntensities(),
      this.road.getActiveLightIntensities(),
      this._intensities, 8,
    );
  }

  setQualityTier(tier: Tier | 'auto'): void {
    if (tier === 'auto') {
      this.qualityTier.setMode('auto');
    } else {
      this.qualityTier.setMode('manual');
      this.qualityTier.setManualTier(tier);
    }
  }

  cycleQualityTier(): string {
    return this.qualityTier.cycleManual();
  }

  dispose(): void {
    this.structural.dispose();
    this.road.dispose();
    this.safety.dispose();
  }
}
