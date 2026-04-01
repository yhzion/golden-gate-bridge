// src/atmosphere/celestial/PlanetRenderer.ts
import * as THREE from 'three';
import type { PlanetState } from './EphemerisCalculator';

const SKY_RADIUS = 39000;

function magnitudeToSize(mag: number): number {
  return Math.max(15, 120 * Math.pow(10, -0.15 * (mag + 4.6)));
}

export class PlanetRenderer {
  private sprites: Map<string, THREE.Sprite> = new Map();
  private group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.renderOrder = 0;

    const planetNames: PlanetState['name'][] = ['venus', 'mars', 'jupiter', 'saturn'];
    for (const name of planetNames) {
      const spriteMat = new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.visible = false;
      this.group.add(sprite);
      this.sprites.set(name, sprite);
    }
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(planets: PlanetState[], nightFactor: number, overcastFactor: number): void {
    const visibility = this.smoothstep(0.10, 0.30, nightFactor) * (1 - overcastFactor);

    for (const planet of planets) {
      const sprite = this.sprites.get(planet.name);
      if (!sprite) continue;

      const mat = sprite.material as THREE.SpriteMaterial;

      if (planet.altitude < 0 || visibility < 0.01) {
        sprite.visible = false;
        mat.opacity = 0;
        continue;
      }

      sprite.visible = true;

      const cosAlt = Math.cos(planet.altitude);
      sprite.position.set(
        -Math.sin(planet.azimuth) * cosAlt * SKY_RADIUS,
        Math.sin(planet.altitude) * SKY_RADIUS,
        -Math.cos(planet.azimuth) * cosAlt * SKY_RADIUS,
      );

      const size = magnitudeToSize(planet.magnitude);
      sprite.scale.set(size, size, 1);

      mat.color.copy(planet.color);
      mat.opacity = visibility * this.smoothstep(0.0, 0.1, planet.altitude);
    }
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  dispose(): void {
    for (const sprite of this.sprites.values()) {
      (sprite.material as THREE.SpriteMaterial).dispose();
    }
  }
}
