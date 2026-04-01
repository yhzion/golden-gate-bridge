import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

export class SafetyLights {
  private aviationMaterials: THREE.MeshStandardMaterial[] = [];
  private headlightPool: THREE.PointLight[] = [];
  private elapsed = 0;

  private headlightPositionsSet = false;

  constructor(scene: THREE.Scene) {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive && mat.emissive.r > 0.8 && mat.emissive.g < 0.2 && mat.emissive.b < 0.2) {
          if (!this.aviationMaterials.includes(mat)) {
            this.aviationMaterials.push(mat);
          }
        }
      }
    });

    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffffee, 0, 250, 0.8);
      pl.visible = false;
      scene.add(pl);
      this.headlightPool.push(pl);
    }
  }

  update(dt: number, time: TimeState, tier: Tier, elapsed: number): void {
    this.elapsed = elapsed;
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 1.0, 0, 1);

    if (nightFactor > 0.2) {
      const strobePeriod = nightFactor > 0.5 ? 0.8 : 1.5;
      const strobePhase = (elapsed % strobePeriod) / strobePeriod;
      const strobeIntensity = 0.3 + 0.9 * Math.pow(Math.max(0, Math.sin(strobePhase * Math.PI * 2)), 4);
      for (const mat of this.aviationMaterials) {
        mat.emissiveIntensity = strobeIntensity * nightFactor;
      }
    } else {
      for (const mat of this.aviationMaterials) {
        mat.emissiveIntensity = 0;
      }
    }

    const headlightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.3, 0.6);
    const maxHeadlights = tier === 'high' ? 4 : tier === 'medium' ? 2 : 0;

    for (let i = 0; i < this.headlightPool.length; i++) {
      this.headlightPool[i].visible = this.headlightPositionsSet && i < maxHeadlights && headlightFactor > 0.01;
      this.headlightPool[i].intensity = headlightFactor * 0.3;
    }
  }

  setHeadlightPositions(positions: THREE.Vector3[]): void {
    this.headlightPositionsSet = positions.length > 0;
    for (let i = 0; i < this.headlightPool.length; i++) {
      if (i < positions.length) {
        this.headlightPool[i].position.copy(positions[i]);
      }
    }
  }

  dispose(): void {
    for (const pl of this.headlightPool) {
      pl.parent?.remove(pl);
      pl.dispose();
    }
  }
}
