import * as THREE from 'three';
import type { BaseLandmark } from './BaseLandmark';

class LandmarkRegistry {
  private landmarks = new Map<string, BaseLandmark>();

  register(landmark: BaseLandmark) {
    this.landmarks.set(landmark.id, landmark);
  }

  get(id: string): BaseLandmark | undefined {
    return this.landmarks.get(id);
  }

  buildAll() {
    for (const lm of this.landmarks.values()) {
      lm.build();
    }
  }

  addAllTo(scene: THREE.Scene) {
    for (const lm of this.landmarks.values()) {
      lm.addTo(scene);
    }
  }

  getAll(): BaseLandmark[] {
    return [...this.landmarks.values()];
  }
}

export const landmarkRegistry = new LandmarkRegistry();
