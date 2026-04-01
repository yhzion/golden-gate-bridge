import * as THREE from 'three';
import { QualityTier, type Tier, type TierMode } from './QualityTier';
import { StructuralLights } from './StructuralLights';
import { RoadLights } from './RoadLights';
import { SafetyLights } from './SafetyLights';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { WeatherState } from '@/atmosphere/WeatherSystem';

export class LightingManager {
  readonly qualityTier: QualityTier;
  private structural: StructuralLights;
  private road: RoadLights;
  private safety: SafetyLights;
  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;
    this.qualityTier = new QualityTier(50);
    this.structural = new StructuralLights(scene);
    this.road = new RoadLights(scene);
    this.safety = new SafetyLights(scene);

    this.qualityTier.onTierChange((tier) => {
      this.applyTier(tier);
    });
  }

  update(dt: number, elapsed: number, timeState: TimeState, weatherState: WeatherState): void {
    this.qualityTier.sample(dt);
    const tier = this.qualityTier.getCurrentTier();
    const camPos = this.camera.position;

    this.structural.update(dt, timeState, tier);
    this.road.update(dt, timeState, tier, camPos);
    this.safety.update(dt, timeState, tier, elapsed);

    const maxShadows = tier === 'high' ? 2 : 0;
    this.structural.updateShadowBudget(camPos, maxShadows);
  }

  private applyTier(tier: Tier): void {
    // Tier changes are handled per-frame in each subsystem's update
  }

  getLightPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    positions.push(...this.structural.getTowerLightPositions());
    positions.push(...this.road.getActiveLightPositions());
    return positions.slice(0, 8);
  }

  getLightColors(): THREE.Color[] {
    const colors: THREE.Color[] = [];
    colors.push(...this.structural.getTowerLightColors());
    colors.push(...this.road.getActiveLightColors());
    return colors.slice(0, 8);
  }

  getLightIntensities(): number[] {
    const intensities: number[] = [];
    intensities.push(...this.structural.getTowerLightIntensities());
    intensities.push(...this.road.getActiveLightIntensities());
    return intensities.slice(0, 8);
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
