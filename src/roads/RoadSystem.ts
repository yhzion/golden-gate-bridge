// src/roads/RoadSystem.ts
import * as THREE from 'three';
import { CircularRoad } from './CircularRoad';
import { RadialRoads } from './RadialRoads';
import { PedestrianPaths } from './PedestrianPaths';
import { CoastalPath } from './CoastalPath';
import { RoadFurniture } from './RoadFurniture';

export class RoadSystem {
  private circular = new CircularRoad();
  private radials = new RadialRoads();
  private pedestrian = new PedestrianPaths();
  private coastal = new CoastalPath();
  private furniture = new RoadFurniture();

  build(scene: THREE.Scene): void {
    this.circular.build(scene);
    this.radials.build(scene);
    this.pedestrian.build(scene);
    this.coastal.build(scene);
    this.furniture.build(scene);
  }

  update(dt: number): void {
    this.circular.update(dt);
    this.radials.update(dt);
    this.pedestrian.update(dt);
    this.coastal.update(dt);
    this.furniture.update(dt);
  }
}
