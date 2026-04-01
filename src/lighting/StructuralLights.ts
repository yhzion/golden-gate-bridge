import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { BRIDGE } from '@/config/bridge';
import type { TimeState } from '@/atmosphere/TimeOfDay';
import type { Tier } from './QualityTier';

export class StructuralLights {
  private towerSpots: THREE.SpotLight[] = [];
  private pierRects: THREE.RectAreaLight[] = [];
  private saddlePoints: THREE.PointLight[] = [];
  private group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    RectAreaLightUniformsLib.init();
    const colSpacing = BRIDGE.deckW / 2 + 2;
    const towerZs = [0, BRIDGE.mainSpan];

    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const spot = new THREE.SpotLight(0xffb347, 0, 300, Math.PI / 8, 0.6, 1.5);
        spot.position.set(side * colSpacing, -5, tz);
        spot.target.position.set(side * colSpacing * 0.85, BRIDGE.towerH + 20, tz);
        spot.castShadow = false;
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.camera.near = 5;
        spot.shadow.camera.far = 300;
        scene.add(spot.target);
        this.group.add(spot);
        this.towerSpots.push(spot);
      }
    }

    for (const tz of towerZs) {
      const rect = new THREE.RectAreaLight(0xffb347, 0, 30, 10);
      rect.position.set(0, -2, tz);
      rect.lookAt(0, -20, tz);
      this.group.add(rect);
      this.pierRects.push(rect);
    }

    for (const tz of towerZs) {
      for (const side of [-1, 1]) {
        const pl = new THREE.PointLight(0xffcc88, 0, 50, 2);
        pl.position.set(side * colSpacing, BRIDGE.towerH + 6, tz);
        this.group.add(pl);
        this.saddlePoints.push(pl);
      }
    }

    scene.add(this.group);
  }

  update(dt: number, time: TimeState, tier: Tier): void {
    const nightFactor = 1 - THREE.MathUtils.clamp(time.sunIntensity / 0.8, 0, 1);
    const lightFactor = THREE.MathUtils.smoothstep(nightFactor, 0.3, 0.6);

    const spotIntensity = lightFactor * 1.5;
    for (const spot of this.towerSpots) {
      spot.intensity = spotIntensity;
    }

    const rectIntensity = lightFactor * 0.8;
    for (const rect of this.pierRects) {
      rect.intensity = rectIntensity;
    }

    const saddleIntensity = lightFactor * 0.5;
    for (const pl of this.saddlePoints) {
      pl.intensity = saddleIntensity;
    }

    const enableRect = tier === 'high';
    for (const rect of this.pierRects) {
      rect.visible = enableRect;
    }
  }

  updateShadowBudget(cameraPos: THREE.Vector3, maxShadows: number): void {
    const sorted = this.towerSpots
      .map((s, i) => ({ spot: s, dist: cameraPos.distanceTo(s.position), idx: i }))
      .sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].spot.castShadow = i < maxShadows;
    }
  }

  getTowerLightPositions(): THREE.Vector3[] {
    return this.towerSpots.map(s => s.position.clone());
  }

  getTowerLightColors(): THREE.Color[] {
    return this.towerSpots.map(s => s.color.clone());
  }

  getTowerLightIntensities(): number[] {
    return this.towerSpots.map(s => s.intensity);
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    for (const s of this.towerSpots) {
      s.dispose();
      s.target.parent?.remove(s.target);
    }
    for (const r of this.pierRects) r.dispose();
    for (const p of this.saddlePoints) p.dispose();
  }
}
