import * as THREE from 'three';

export abstract class BaseLandmark {
  group: THREE.Group;
  readonly id: string;

  constructor(id: string) {
    this.id = id;
    this.group = new THREE.Group();
  }

  abstract build(): void;

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}
