import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

/**
 * StructuralLights — soft ambient glow on towers and piers.
 * All lights are PointLights for omnidirectional, gentle illumination.
 * Only car headlights (SafetyLights) should use directional beams.
 */
export class StructuralLights {
  private towerLights: THREE.PointLight[] = [];
  private saddlePoints: THREE.PointLight[] = [];
  private group = new THREE.Group();
  private _cachedPositions: THREE.Vector3[] = [];
  private _cachedColors: THREE.Color[] = [];
  private _cachedIntensities: number[] = [];

  constructor(scene: THREE.Scene) {
    const colSpacing = BRIDGE.deckW / 2 + 2;
    const towerZs = [0, BRIDGE.mainSpan];

    // Tower base wash lights — soft PointLights instead of SpotLights
    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const pl = new THREE.PointLight(0xffb347, 0, 800, 0.3);
        pl.position.set(side * colSpacing, 10, tz);
        pl.castShadow = false;
        this.group.add(pl);
        this.towerLights.push(pl);
      }
    }

    // Mid-tower accent lights — gentle glow at portal height
    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const pl = new THREE.PointLight(0xffb347, 0, 600, 0.3);
        pl.position.set(side * colSpacing, 120, tz);
        pl.castShadow = false;
        this.group.add(pl);
        this.towerLights.push(pl);
      }
    }

    // Cable saddle lights — soft glow at tower tops
    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const pl = new THREE.PointLight(0xffcc88, 0, 600, 0.3);
        pl.position.set(side * colSpacing, BRIDGE.towerH + 6, tz);
        this.group.add(pl);
        this.saddlePoints.push(pl);
      }
    }

    scene.add(this.group);
  }

  update(dt: number, time: TimeState, tier: Tier): void {
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 1.0, 0, 1);
    const lightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.3, 0.6);

    const towerIntensity = lightFactor * 0.5;
    for (const pl of this.towerLights) {
      pl.intensity = towerIntensity;
    }

    const saddleIntensity = lightFactor * 0.3;
    for (const pl of this.saddlePoints) {
      pl.intensity = saddleIntensity;
    }
  }

  updateShadowBudget(_cameraPos: THREE.Vector3, _maxShadows: number): void {
    // PointLights don't use shadow budget — no-op
  }

  getTowerLightPositions(): THREE.Vector3[] {
    this._cachedPositions.length = this.towerLights.length;
    for (let i = 0; i < this.towerLights.length; i++) {
      this._cachedPositions[i] = this.towerLights[i].position;
    }
    return this._cachedPositions;
  }

  getTowerLightColors(): THREE.Color[] {
    this._cachedColors.length = this.towerLights.length;
    for (let i = 0; i < this.towerLights.length; i++) {
      this._cachedColors[i] = this.towerLights[i].color;
    }
    return this._cachedColors;
  }

  getTowerLightIntensities(): number[] {
    this._cachedIntensities.length = this.towerLights.length;
    for (let i = 0; i < this.towerLights.length; i++) {
      this._cachedIntensities[i] = this.towerLights[i].intensity;
    }
    return this._cachedIntensities;
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    for (const pl of this.towerLights) pl.dispose();
    for (const p of this.saddlePoints) p.dispose();
  }
}
